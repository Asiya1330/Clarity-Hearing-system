"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Last-resort boundary: replaces the root layout, so no Tailwind CSS.
// Uses minimal inline styles aligned to OViz brand colors.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#44525E",
            }}
          >
            OViz by OtoVantage
          </p>
          <h1
            style={{
              margin: "0 0 0.75rem",
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "#002147",
              lineHeight: 1.3,
            }}
          >
            An unexpected error occurred
          </h1>
          <p
            style={{
              margin: "0 0 1.5rem",
              fontSize: "0.9375rem",
              color: "#44525E",
              lineHeight: 1.6,
            }}
          >
            OViz could not load this page. Reload to try again. If the problem
            continues, contact your clinic administrator.
          </p>

          {error.digest && (
            <p
              style={{
                margin: "0 0 1.25rem",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "#44525E",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#008B8B",
              color: "#ffffff",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
