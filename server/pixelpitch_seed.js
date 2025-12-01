// pixelpitch_seed.js
require("dotenv").config();
const mongoose = require("mongoose");

const Pixel = require("./models/pixel");
const Canvas = require("./models/canvas");
const { canvasSize } = require("./utils/common");

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("Missing MONGODB_URI in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Find or create a canvas
    let canvas = await Canvas.findOne();
    if (!canvas) {
      canvas = await Canvas.create({});
      console.log("🖼  Created new Canvas:", canvas._id);
    } else {
      console.log("🖼  Using existing Canvas:", canvas._id);
    }

    // Check if pixels already exist for this canvas
    const existing = await Pixel.countDocuments({ canvas: canvas._id });
    if (existing > 0) {
      console.log(`ℹ️  Pixels already exist for this canvas: ${existing}`);
      process.exit(0);
    }

    const total = canvasSize * canvasSize;
    console.log(`🚧 Seeding ${total} pixels (canvasSize=${canvasSize})...`);

    const docs = [];
    for (let pos = 0; pos < total; pos++) {
      docs.push({
        position: pos,
        color: "#ffffff", // all white to start
        canvas: canvas._id,
      });
    }

    const inserted = await Pixel.insertMany(docs);
    console.log(`✅ Inserted ${inserted.length} pixels`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

run();

