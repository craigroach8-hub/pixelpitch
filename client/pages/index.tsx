import React, { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

type Pixel = {
  _id: string;
  position: number;
  color: string;
};

type Assignment = {
  _id: string;
  pixelId: string;
  color: string;
  createdAt?: string;
};

export default function Home() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setError(null);

        const [pixelsRes, activityRes] = await Promise.all([
          fetch(`${API_BASE}/api/pixel-pitch/all`),
          fetch(`${API_BASE}/api/pixel-pitch/recent-assignments`),
        ]);

        const pixelsData = await pixelsRes.json();
        const activityData = await activityRes.json();

        if (!isMounted) return;

        setPixels(pixelsData || []);
        setAssignments(activityData || []);
        setLastUpdated(new Date());
        setLoading(false);
      } catch (err) {
        console.error("Error loading canvas data:", err);
        if (!isMounted) return;
        setError("Error loading canvas data from server.");
        setLoading(false);
      }
    }

    loadData();
    const intervalId = setInterval(loadData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const side = Math.round(Math.sqrt(pixels.length || 0)) || 0;

  function renderCanvas() {
    if (loading) {
      return <p>Loading canvas…</p>;
    }
    if (error) {
      return <p style={{ color: "red" }}>{error}</p>;
    }
    if (!pixels.length || side === 0) {
      return <p>No pixels found in the database.</p>;
    }

    return (
      <div
        style={{
          border: "1px solid #ccc",
          padding: 8,
          display: "inline-block",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${side}, 8px)`,
            gridTemplateRows: `repeat(${side}, 8px)`,
          }}
        >
          {pixels.map((p) => {
            const x = p.position % side;
            const y = Math.floor(p.position / side);

            return (
              <div
                key={p._id}
                title={`Pixel ${p._id}\nPosition: ${p.position}\nCoordinates: (${x}, ${y})\nColor: ${p.color}`}
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: p.color || "#ffffff",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  function renderActivity() {
    if (!assignments.length) {
      return <p>No recent pixel activity yet.</p>;
    }

    return (
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {assignments.map((a) => (
          <li
            key={a._id}
            style={{
              padding: "6px 0",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                border: "1px solid #ccc",
                background: a.color || "#ffffff",
              }}
            />
            <span>
              Pixel{" "}
              <span style={{ fontFamily: "monospace" }}>{a.pixelId}</span>{" "}
              set to{" "}
              <span style={{ fontFamily: "monospace" }}>{a.color}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        fontFamily: "system-ui, sans-serif",
        background:
          "radial-gradient(circle at top, #ffffff 0, #f5f5f5 40%, #e9ecf1 100%)",
      }}
    >
      <header
        style={{
          maxWidth: 960,
          margin: "0 auto 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Pixel Pitch</h1>
          <p style={{ margin: "4px 0 0", color: "#555", fontSize: 14 }}>
            A live, collaborative pixel canvas. Watch it evolve as people buy
            and color pixels.
          </p>
        </div>
        <a
          href="/pitch"
          style={{
            padding: "8px 16px",
            background: "#000",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          Buy a Pixel
        </a>
      </header>

      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
        }}
      >
        <section>
          <h2 style={{ marginTop: 0 }}>Canvas</h2>
          {renderCanvas()}
          {lastUpdated && (
            <p style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
              Auto-refreshing every 5s. Last updated{" "}
              {lastUpdated.toLocaleTimeString()}.
            </p>
          )}
        </section>

        <section>
          <h2 style={{ marginTop: 0 }}>Recent Activity</h2>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
            Latest pixel assignments (most recent first).
          </p>
          {renderActivity()}
        </section>
      </main>
    </div>
  );
}
