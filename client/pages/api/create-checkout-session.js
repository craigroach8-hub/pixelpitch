import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY environment variable. Set it in .env.local or in Vercel."
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/create-checkout-session
 *
 * Expects JSON body:
 * {
 *   pixelIndex: number,
 *   color: string,
 *   pixels: number   // how many pixels, default 1
 * }
 *
 * Returns: { url: string } for Stripe Checkout redirect
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pixelIndex, color, pixels } = req.body || {};

    const pixelCount =
      typeof pixels === "number" && pixels > 0 ? pixels : 1;

    if (typeof pixelIndex !== "number" || !color) {
      return res
        .status(400)
        .json({ error: "Missing pixelIndex or color in request body." });
    }

    // 1 pixel = $1.00 => 100 cents per pixel
    const amountInCents = pixelCount * 100;

    const origin =
      req.headers.origin || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountInCents,
            product_data: {
              name: "Pixel on Pixel Pitch",
              description: `Pixel #${pixelIndex} – color ${color}`,
              metadata: {
                pixelIndex: String(pixelIndex),
                color,
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        pixelIndex: String(pixelIndex),
        color,
        pixelCount: String(pixelCount),
      },
      // Include pixel info in the success URL so the client can persist it
      success_url: `${origin}/pitch?status=success&pixelIndex=${encodeURIComponent(
        String(pixelIndex)
      )}&color=${encodeURIComponent(color)}`,
      cancel_url: `${origin}/pitch?status=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return res
      .status(500)
      .json({ error: "Failed to create Stripe Checkout Session." });
  }
}
