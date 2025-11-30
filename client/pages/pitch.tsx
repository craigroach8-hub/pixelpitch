import React, { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type PixelResult = {
  color?: string;
  id?: string;
  position?: number;
  x?: number;
  y?: number;
  error?: string;
  [key: string]: any;
} | null;

type Stage = "select" | "pay" | "processing" | "done";

const stepLabels: { stage: Stage; label: string }[] = [
  { stage: "select", label: "Choose Color" },
  { stage: "pay", label: "Checkout" },
  { stage: "processing", label: "Assign Pixel" },
  { stage: "done", label: "Complete" },
];

// Mirror server-side pricing logic
const RARE_PRICE_MAP: Record<string, number> = {
  "#ffd700": 500, // Gold
  "#00ffff": 200, // Cyan
  "#ff00ff": 200, // Magenta
};

function getPriceForColor(color: string): number {
  if (!color) return 50;
  const c = color.toLowerCase();
  return RARE_PRICE_MAP[c] || 50;
}

const RARE_COLORS_DISPLAY = [
  { hex: "#ffd700", label: "Gold (Rare)", cents: 500 },
  { hex: "#00ffff", label: "Cyan (Featured)", cents: 200 },
  { hex: "#ff00ff", label: "Magenta (Featured)", cents: 200 },
];

export default function Pitch() {
  const [selectedColor, setSelectedColor] = useState("#ff0000");
  const [stage, setStage] = useState<Stage>("select");
  const [result, setResult] = useState<PixelResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Detect return from Stripe
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const canceled = params.get("canceled");
    const returnedColor = params.get("color");

    if (success === "true" && returnedColor) {
      setStage("processing");
      assignPixelAfterPayment(returnedColor);
    } else if (canceled === "true") {
      setStage("select");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function safeJsonParse(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("Non-JSON response from server:", text);
      throw new Error("Server returned invalid (non-JSON) response.");
    }
  }

  async function assignPixelAfterPayment(color: string) {
    try {
      setError(null);

      const res = await fetch(`${API_BASE}/api/pixel-pitch/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ color }),
      });

      const data = await safeJsonParse(res);
      setResult(data);
      setStage("done");
    } catch (err: any) {
      console.error("Assignment error:", err);
      setResult({ error: err.message || "Error assigning pixel after payment" });
      setStage("done");
    }
  }

  async function handleCheckout() {
    try {
      setError(null);
      setIsRedirecting(true);

      const res = await fetch(
        `${API_BASE}/api/pixel-pitch/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ color: selectedColor }),
        }
      );

      const data = await safeJsonParse(res);

      if (!res.ok || !data.url) {
        console.error("Checkout session error:", data);
        setIsRedirecting(false);
        setError(data.error || "Error creating checkout session");
        return;
      }

      if (typeof window !== "undefined") {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Checkout error");
      setIsRedirecting(false);
    }
  }

  function resetForAnotherPurchase() {
    setStage("select");
    setError(null);
    setResult(null);
    setIsRedirecting(false);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("color");
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.toString());
    }
  }

  function renderStepHeader() {
    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
          fontSize: 12,
          textTransform: "uppercase",
        }}
      >
        {stepLabels.map((step, index) => {
          const current = stepLabels.findIndex((s) => s.stage === stage);
          const isActive = index === current;
          const isDone = index < current;

          return (
            <div
              key={step.stage}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: isActive ? "#000" : isDone ? "#ccc" : "#fff",
                  border: "1px solid #888",
                }}
              ></div>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const priceCents = getPriceForColor(selectedColor);
  const priceLabel = `$${(priceCents / 100).toFixed(2)}`;
  const isRare = priceCents > 50;

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: 4 }}>Pixel Pitch – Buy a Pixel</h1>
      <p style={{ marginTop: 0, marginBottom: 16, color: "#555", fontSize: 14 }}>
        Choose a color, pay securely with Stripe, and we&apos;ll assign your
        color to a random pixel on the live canvas.
      </p>

      {renderStepHeader()}

      {error && (
        <p style={{ color: "red", marginBottom: 16 }}>Error: {error}</p>
      )}

      {/* SELECT COLOR */}
      {stage === "select" && (
        <>
          <h2>Step 1 — Choose Your Color</h2>

          <div
            style={{
              display: "flex",
              gap: 16,
              margin: "16px 0",
              alignItems: "center",
            }}
          >
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{ width: 50, height: 50, border: "none" }}
            />
            <div>
              <div style={{ fontFamily: "monospace" }}>{selectedColor}</div>
              <div
                style={{
                  marginTop: 6,
                  width: 60,
                  height: 20,
                  borderRadius: 4,
                  background: selectedColor,
                  border: "1px solid #ccc",
                }}
              ></div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
                Price: <strong>{priceLabel}</strong>{" "}
                {isRare && <span>(rare color)</span>}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fafafa",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>Rare & Featured Colors</strong>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {RARE_COLORS_DISPLAY.map((rc) => (
                <button
                  key={rc.hex}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    borderRadius: 4,
                    border:
                      selectedColor.toLowerCase() === rc.hex.toLowerCase()
                        ? "2px solid #000"
                        : "1px solid #ccc",
                    background: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  type="button"
                  onClick={() => setSelectedColor(rc.hex)}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: "1px solid #ccc",
                      background: rc.hex,
                    }}
                  />
                  <span>
                    {rc.label} — ${(rc.cents / 100).toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            style={{ padding: "10px 20px" }}
            onClick={() => setStage("pay")}
          >
            Continue ({priceLabel})
          </button>
        </>
      )}

      {/* CHECKOUT */}
      {stage === "pay" && (
        <>
          <h2>Step 2 — Secure Stripe Checkout</h2>

          <p>
            You are purchasing <strong>1 pixel</strong> with color{" "}
            <span style={{ fontFamily: "monospace" }}>{selectedColor}</span> for{" "}
            <strong>{priceLabel}</strong>.
          </p>

          <button
            style={{ padding: "10px 20px", marginTop: 16 }}
            onClick={handleCheckout}
            disabled={isRedirecting}
          >
            {isRedirecting ? "Redirecting…" : "Go to Checkout"}
          </button>

          <button
            style={{
              padding: "10px 20px",
              marginLeft: 10,
              marginTop: 16,
              background: "#eee",
            }}
            onClick={() => setStage("select")}
            disabled={isRedirecting}
          >
            Back
          </button>
        </>
      )}

      {/* PROCESSING */}
      {stage === "processing" && (
        <>
          <h2>Assigning Your Pixel…</h2>
          <p>Please wait while we apply your color to a random pixel.</p>
        </>
      )}

      {/* DONE */}
      {stage === "done" && (
        <>
          <h2>Pixel Assigned</h2>

          {result && !result.error ? (
            <>
              <p>Your purchase was successful!</p>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  padding: 12,
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  background: "#fafafa",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: result.color,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                ></div>
                <div style={{ fontSize: 14 }}>
                  <div>
                    <strong>Color:</strong>{" "}
                    <span style={{ fontFamily: "monospace" }}>
                      {result.color}
                    </span>
                  </div>
                  <div>
                    <strong>Pixel ID:</strong>{" "}
                    <span style={{ fontFamily: "monospace" }}>
                      {result.id}
                    </span>
                  </div>
                  {typeof result.position === "number" &&
                    typeof result.x === "number" &&
                    typeof result.y === "number" && (
                      <>
                        <div>
                          <strong>Position (index):</strong>{" "}
                          <span style={{ fontFamily: "monospace" }}>
                            {result.position}
                          </span>
                        </div>
                        <div>
                          <strong>Canvas coordinates:</strong>{" "}
                          <span style={{ fontFamily: "monospace" }}>
                            ({result.x}, {result.y})
                          </span>
                        </div>
                      </>
                    )}
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#555" }}>
                You can now view the live canvas and see your pixel as part of
                the evolving artwork.
              </p>
            </>
          ) : (
            <p style={{ color: "red" }}>
              Error assigning pixel: {result?.error}
            </p>
          )}

          <pre
            style={{
              background: "#eee",
              padding: 10,
              marginTop: 16,
              borderRadius: 6,
              whiteSpace: "pre-wrap",
              fontSize: 12,
              maxHeight: 220,
              overflow: "auto",
            }}
          >
{JSON.stringify(result, null, 2)}
          </pre>

          <button
            style={{ padding: "8px 16px", marginTop: 16, marginRight: 10 }}
            onClick={resetForAnotherPurchase}
          >
            Buy another pixel
          </button>

          <Link href="/" style={{ color: "blue" }}>
            View canvas
          </Link>
        </>
      )}
    </div>
  );
}
