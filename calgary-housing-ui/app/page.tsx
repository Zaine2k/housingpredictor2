"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type PredictResponse = { predicted_price: number };

const YEAR_OF_CONSTRUCTION_RANGES = [
  "Pre-1900",
  "1900-1945",
  "1946-1970",
  "1971-1990",
  "1991-2010",
  "Post-2011",
] as const;

const QUADRANTS = ["NW", "NE", "SW", "SE"] as const;

const PROPERTY_TYPES = [
  "Single",
  "Duplex",
  "Apartment / Condo",
  "Townhouse",
  "Mixed Residential",
  "Secondary / Accessory",
] as const;

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: 8,
  backgroundColor: "#fff",
  color: "#000",
  border: "1px solid #ccc",
  borderRadius: 8,
  outline: "none",
};

const optionStyle: React.CSSProperties = {
  color: "#000",
  backgroundColor: "#fff",
};

export default function Page() {
  const [landSize, setLandSize] = useState<number>(500);
  const [YEAR_OF_CONSTRUCTION_RANGE, setYEAR_OF_CONSTRUCTION_RANGE] = useState<
    (typeof YEAR_OF_CONSTRUCTION_RANGES)[number]
  >(YEAR_OF_CONSTRUCTION_RANGES[3]);

  const [QUADRANT, setQUADRANT] = useState<(typeof QUADRANTS)[number]>(QUADRANTS[0]);
  const [PROPERTY_TYPE, setPROPERTY_TYPE] = useState<(typeof PROPERTY_TYPES)[number]>(
    PROPERTY_TYPES[0]
  );

  const [loading, setLoading] = useState(false);
  const [pred, setPred] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // For debouncing + canceling in-flight requests
  const debounceTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const payload = useMemo(
    () => ({
      LOG_LAND_SIZE: Math.log1p(landSize),
      YEAR_OF_CONSTRUCTION_RANGE,
      QUADRANT,
      PROPERTY_TYPE,
    }),
    [landSize, YEAR_OF_CONSTRUCTION_RANGE, QUADRANT, PROPERTY_TYPE]
  );

  // Live prediction whenever payload changes
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Debounce (adjust 250–600ms as desired)
    debounceTimerRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("http://localhost:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error (${res.status}): ${text}`);
        }

        const data = (await res.json()) as PredictResponse;
        setPred(data.predicted_price);
      } catch (e: any) {
        // Ignore abort errors (user changed input quickly)
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Unknown error");
        setPred(null);
      } finally {
        setLoading(false);
      }
    }, 200);

    // Cleanup when payload changes/unmounts
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [payload]);

  const formatted =
    pred === null
      ? "—"
      : pred.toLocaleString("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        });

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Calgary Housing Price Estimator</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Live predictions update automatically as you change inputs.
      </p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 24,
        }}
      >
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <label style={{ display: "block", fontWeight: 600 }}>
            Land Size (sqm): {landSize}
          </label>
          <input
            type="range"
            min={50}
            max={2000}
            value={landSize}
            onChange={(e) => setLandSize(parseInt(e.target.value, 10))}
            style={{ width: "100%" }}
          />

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontWeight: 600 }}>
              Year of Construction Range
            </label>
            <select
              value={YEAR_OF_CONSTRUCTION_RANGE}
              onChange={(e) =>
                setYEAR_OF_CONSTRUCTION_RANGE(
                  e.target.value as (typeof YEAR_OF_CONSTRUCTION_RANGES)[number]
                )
              }
              style={selectStyle}
            >
              {YEAR_OF_CONSTRUCTION_RANGES.map((y) => (
                <option key={y} value={y} style={optionStyle}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontWeight: 600 }}>Quadrant</label>
            <select
              value={QUADRANT}
              onChange={(e) => setQUADRANT(e.target.value as (typeof QUADRANTS)[number])}
              style={selectStyle}
            >
              {QUADRANTS.map((q) => (
                <option key={q} value={q} style={optionStyle}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontWeight: 600 }}>Property Type</label>
            <select
              value={PROPERTY_TYPE}
              onChange={(e) =>
                setPROPERTY_TYPE(e.target.value as (typeof PROPERTY_TYPES)[number])
              }
              style={selectStyle}
            >
              {PROPERTY_TYPES.map((p) => (
                <option key={p} value={p} style={optionStyle}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
          </div>
        </div>

        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#ffffff",
              border: "1px solid #e6e6e6",
              color: "#000",
              opacity: 1,
            }}
          >
            <div style={{ fontSize: 12, color: "#000", opacity: 1 }}>
              Predicted price {loading ? "(updating…)" : ""}
            </div>

            <div style={{ fontSize: 28, fontWeight: 700, color: "#000", opacity: 1 }}>
              {formatted}
            </div>

            {error && (
              <div style={{ marginTop: 8, color: "crimson", fontSize: 13, opacity: 1 }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85 }}>
            Sending features: <code>LOG_LAND_SIZE</code>,{" "}
            <code>YEAR_OF_CONSTRUCTION_RANGE</code>, <code>QUADRANT</code>,{" "}
            <code>PROPERTY_TYPE</code>
          </div>
        </div>
      </section>
    </main>
  );
}
