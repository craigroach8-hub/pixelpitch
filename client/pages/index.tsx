import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "black",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
        Pixel Pitch
      </h1>

      <p
        style={{
          maxWidth: "600px",
          textAlign: "center",
          fontSize: "1.25rem",
          marginBottom: "3rem",
          lineHeight: "1.5",
        }}
      >
        The largest collaborative digital art experiment.  
        One pixel at a time. One choice at a time.
      </p>

      <section
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Link href="/pitch/">
          <button
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "9999px",
              border: "1px solid #ffffff33",
              background: "white",
              color: "black",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Enter the Canvas
          </button>
        </Link>
      </section>
    </div>
  );
}

