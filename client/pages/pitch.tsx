import React, { useState, useEffect } from "react";
import Link from "next/link";

const GRID_SIZE = 50; // 50x50 = 2500 pixels
const LOCAL_STORAGE_KEY = "pixelPitchGrid_v1";

type PixelState = {
  color: string | null;
};

const createInitialPixels = (): PixelState[] =>
  Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({ color: null }));

export default function PitchPage() {
  const [pixels, setPixels] = useState<PixelState[]>(createInitialPixels);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#ff0000");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 1) On first load, try to restore pixels from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PixelState[];

      if (Array.isArray(parsed) && parsed.length === GRID_SIZE * GRID_SIZE) {
        setPixels(parsed);
      }
    } catch (err) {
      console.error("Failed to load saved pixels:", err);
    }
  }, []);

  // 2) Whenever pixels change, save them to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(pixels)
      );
    } catch (err) {
      console.error("Failed to save pixels:", err);
    }
  }, [pixels]);

  // 3) After Stripe redirect, use URL params to mark the purchased pixel
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    const pixelIndexParam = url.searchParams.get("pixelIndex");
    const colorParam = url.searchParams.get("color");

    if (status === "success" && pixelIndexParam && colorParam) {
      const idx = parseInt(pixelIndexParam, 10);

      if (
        !Number.isNaN(idx) &&
        idx >= 0 &&
        idx < GRID_SIZE * GRID_SIZE
      ) {
        setPixels((prev) => {
          const next = [...prev];
          next[idx] = { color: colorParam };
          return next;
        });

        setSelectedIndex(idx);
        setSelectedColor(colorParam);
        setMessage("Pixel saved after purchase. Welcome to the canvas.");
      }

      // Clean the URL so refreshes don't reapply the same update
      url.searchParams.delete("status");
      url.searchParams.delete("pixelIndex");
      url.searchParams.delete("color");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handlePixelClick = (index: number) => {
    setSelectedIndex(index);
    setMessage(null);
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(event.target.value);
  };

  const handlePreviewColor = () => {
    if (selectedIndex === null) {
      setMessage("Select a pixel on the canvas first.");
      return;
    }

    const updated = [...pixels];
    updated[selectedIndex] = { color: selectedColor };
    setPixels(updated);
    setMessage("Color applied locally. Checkout to lock your pixel.");
  };

  const handleCheckout = async () => {
    if (selectedIndex === null) {
      setMessage("Select a pixel before checking out.");
      return;
    }

    setIsCheckingOut(true);
    setMessage(null);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pixelIndex: selectedIndex,
          color: selectedColor,
          pixels: 1, // always 1 for now
        }),
      });

      if (!response.ok) {
        throw new Error("Checkout request failed.");
      }

      const data = await response.json();

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setMessage("Checkout created, but no redirect URL was returned.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong starting checkout. Try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderPixel = (pixel: PixelState, index: number) => {
    const isSelected = index === selectedIndex;

    return (
      <button
        key={index}
        onClick={() => handlePixelClick(index)}
        style={{
          width: "10px",
          height: "10px",
          padding: 0,
          margin: 0,
          border: isSelected ? "1px solid #ffffff" : "1px solid #333333",
          backgroundColor: pixel.color ?? "#111111",
          cursor: "pointer",
        }}
        aria-label={`Pixel ${index}`}
      />
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "white",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold" }}>
          Pixel Pitch
        </h1>

        <Link href="/">
          <button
            style={{
              padding: "0.4rem 0.9rem",
              fontSize: "0.9rem",
              borderRadius: "9999px",
              border: "1px solid #ffffff33",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            Back to Home
          </button>
        </Link>
      </header>

      <main
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "2rem",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Canvas */}
        <section
          style={{
            flex: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_SIZE}, 10px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 10px)`,
              gap: "0px",
              backgroundColor: "#000000",
              border: "1px solid #333333",
              padding: "4px",
            }}
          >
            {pixels.map((pixel, index) => renderPixel(pixel, index))}
          </div>
        </section>

        {/* Controls */}
        <section
          style={{
            flex: 1,
            borderLeft: "1px solid #333333",
            paddingLeft: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Choose Your Color
            </h2>
            <input
              type="color"
              value={selectedColor}
              onChange={handleColorChange}
              style={{
                width: "60px",
                height: "30px",
                border: "none",
                cursor: "pointer",
                background: "transparent",
              }}
            />
          </div>

          <div>
            <button
              onClick={handlePreviewColor}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                border: "1px solid #ffffff33",
                background: "#222222",
                color: "white",
                cursor: "pointer",
                marginRight: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              Apply Color to Selected Pixel
            </button>
          </div>

          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid #333333",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Lock It In
            </h2>
            <p style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              Each pixel costs <strong>$1.00</strong>. Your choice and your
              color become part of the final artwork on this device.
            </p>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              style={{
                padding: "0.6rem 1.3rem",
                borderRadius: "9999px",
                border: "1px solid #ffffff33",
                background: isCheckingOut ? "#444444" : "white",
                color: isCheckingOut ? "#aaaaaa" : "black",
                cursor: isCheckingOut ? "default" : "pointer",
                fontWeight: "bold",
              }}
            >
              {isCheckingOut ? "Starting Checkout..." : "Checkout for $1"}
            </button>
          </div>

          {selectedIndex !== null && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
              Selected pixel index: <strong>{selectedIndex}</strong>
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.85rem",
                color: "#dddddd",
              }}
            >
              {message}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
