import React, { useEffect, useState } from "react";

type Pixel = {
  _id: string;
  color?: string;
  [key: string]: any;
};

const REFRESH_MS = 5000; // refresh every 5 seconds

const SimpleCanvas: React.FC = () => {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPixels() {
      try {
        const res = await fetch("http://localhost:4000/api/pixel-pitch/all", {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Error loading pixels");
        }
        if (!cancelled) {
          setPixels(data);
          setError(null);
          setFirstLoad(false);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || "Error loading pixels");
          setFirstLoad(false);
        }
      }
    }

    // initial load
    loadPixels();

    // periodic refresh
    const id = setInterval(loadPixels, REFRESH_MS);

    // cleanup
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (firstLoad) {
    return <div>Loading canvas…</div>;
  }

  if (error) {
    return (
      <div style={{ color: "red" }}>
        Error loading canvas: {error}
      </div>
    );
  }

  if (!pixels.length) {
    return <div>No pixels found.</div>;
  }

  const total = pixels.length;
  const size = Math.ceil(Math.sqrt(total));

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${size}, 8px)`,
          gridAutoRows: "8px",
          gap: 1,
          background: "#ddd",
          padding: 4,
        }}
      >
        {pixels.map((p) => (
          <div
            key={p._id}
            style={{
              width: 8,
              height: 8,
              background: p.color || "#ffffff",
            }}
          />
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "#555",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Auto-refreshing every {REFRESH_MS / 1000} seconds
        {lastUpdated && <> • Last updated at {lastUpdated}</>}
      </div>
    </div>
  );
};

export default SimpleCanvas;

