require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Stripe = require("stripe");

// ----- Stripe -----
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY in environment");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// ----- Models -----
const Pixel = require("./models/pixel");
let Assignment;

// Try to load Assignment model if it exists, otherwise define a simple one
try {
  Assignment = require("./models/assignment");
} catch (e) {
  const assignmentSchema = new mongoose.Schema(
    {
      pixelId: String,
      color: String,
      position: Number,
    },
    { timestamps: true }
  );
  Assignment = mongoose.model("Assignment", assignmentSchema);
}

const app = express();
const PORT = process.env.PORT || 4000;

// ---------- Middleware ----------
app.use(
  cors({
    origin: ["http://localhost:3000", process.env.FRONTEND_ORIGIN].filter(
      Boolean
    ),
    credentials: true,
  })
);
app.use(express.json());

// ---------- Rare color pricing ----------
// cents: 50 = $0.50, 200 = $2.00, 500 = $5.00
const RARE_PRICE_MAP = {
  "#ffd700": 500, // Gold
  "#00ffff": 200, // Cyan
  "#ff00ff": 200, // Magenta
};

function getPriceForColor(color) {
  if (!color || typeof color !== "string") return 50;
  const c = color.toLowerCase();
  return RARE_PRICE_MAP[c] || 50;
}

// ---------- MongoDB Connection ----------
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("Missing MONGODB_URI in .env / environment");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Listening on http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

// ---------- Routes ----------

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Pixel Pitch server running" });
});

// Return all pixels (for canvas)
app.get("/api/pixel-pitch/all", async (req, res) => {
  try {
    const pixels = await Pixel.find().sort({ position: 1 }).lean();
    res.json(pixels);
  } catch (err) {
    console.error("Error loading pixels:", err);
    res.status(500).json({ error: "Error loading pixels" });
  }
});

// Assign a random pixel for a given color
app.post("/api/pixel-pitch/assign", async (req, res) => {
  try {
    const { color } = req.body;

    if (!color || typeof color !== "string") {
      return res
        .status(400)
        .json({ error: 'Color is required (e.g. "#FF0000")' });
    }

    const total = await Pixel.countDocuments();
    if (total === 0) {
      return res.status(500).json({ error: "No pixels in database" });
    }

    // Choose random pixel
    const randomIndex = Math.floor(Math.random() * total);
    const pixel = await Pixel.findOne().skip(randomIndex);

    if (!pixel) {
      return res
        .status(500)
        .json({ error: "Could not find random pixel" });
    }

    // Compute coordinates based on position
    const side = Math.round(Math.sqrt(total));
    const x = pixel.position % side;
    const y = Math.floor(pixel.position / side);

    // Update pixel color
    pixel.color = color;
    await pixel.save();

    // Log assignment
    await Assignment.create({
      pixelId: pixel._id.toString(),
      color: pixel.color,
      position: pixel.position,
    });

    return res.json({
      color: pixel.color,
      id: pixel._id,
      position: pixel.position,
      x,
      y,
    });
  } catch (err) {
    console.error("Error assigning pixel:", err);
    return res
      .status(500)
      .json({ error: "Server error while assigning pixel" });
  }
});

// Recent assignment activity
app.get("/api/pixel-pitch/recent-assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json(assignments);
  } catch (err) {
    console.error("Error loading recent assignments:", err);
    res
      .status(500)
      .json({ error: "Error loading recent assignments" });
  }
});

// Create Stripe Checkout session for 1 pixel
app.post("/api/pixel-pitch/create-checkout-session", async (req, res) => {
  try {
    const { color } = req.body;

    if (!color || typeof color !== "string") {
      return res
        .status(400)
        .json({ error: 'Color is required (e.g. "#FF0000")' });
    }

    const priceCents = getPriceForColor(color);
    const isRare = priceCents > 50;

    const successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      "http://localhost:3000/pitch?success=true";
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL ||
      "http://localhost:3000/pitch?canceled=true";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isRare
                ? "Pixel Pitch – Rare Pixel"
                : "Pixel Pitch – 1 Pixel",
              description: isRare
                ? `Rare pixel with color ${color}`
                : `One pixel with color ${color}`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}&color=${encodeURIComponent(color)}`,
      cancel_url: cancelUrl,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error("Error creating Stripe Checkout session:", err);
    return res
      .status(500)
      .json({ error: "Error creating Stripe Checkout session" });
  }
});

// ---------- Start the server ----------
start();
