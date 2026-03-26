// SolutionDisplay.jsx
// ───────────────────
// Renders AI-generated solutions with inline visuals (SVG, Chart.js, HTML tables)
//
// Usage:
//   import SolutionDisplay from './SolutionDisplay';
//   <SolutionDisplay question={q} solutionImages={q.answer_images} />

import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Chart.js renderer ────────────────────────────────────────────────
function ChartVisual({ configJson }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let config;
    try {
      config = typeof configJson === "string" ? JSON.parse(configJson) : configJson;
    } catch {
      return;
    }

    // Load Chart.js dynamically if not already loaded
    const loadChart = async () => {
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
          script.onload  = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Destroy previous chart if exists
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new window.Chart(canvasRef.current, config);
    };

    loadChart().catch(console.error);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [configJson]);

  return (
    <div style={{ maxWidth: 600, margin: "16px auto" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// ── SVG renderer ─────────────────────────────────────────────────────
function SvgVisual({ svgContent }) {
  return (
    <div
      style={{ maxWidth: 500, margin: "16px auto", textAlign: "center" }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

// ── Table renderer ────────────────────────────────────────────────────
function TableVisual({ htmlContent }) {
  return (
    <div
      style={{ overflowX: "auto", margin: "16px 0" }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

// ── Image renderer (scraped images) ──────────────────────────────────
function ScrapedImage({ path }) {
  const url = `${API_BASE}/images/${path.replace(/^images\//, "")}`;
  return (
    <div style={{ textAlign: "center", margin: "12px 0" }}>
      <img
        src={url}
        alt="Solution diagram"
        style={{ maxWidth: "100%", border: "1px solid #e5e7eb", borderRadius: 8 }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    </div>
  );
}

// ── Solution text renderer ────────────────────────────────────────────
function SolutionText({ text }) {
  // Convert newlines to paragraphs, preserve math notation
  const paragraphs = text.split("\n").filter(l => l.trim());
  return (
    <div style={{ lineHeight: 1.8 }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: "6px 0", fontFamily: "Georgia, serif" }}>
          {para}
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function SolutionDisplay({
  question,
  questionImages = [],
  markingScheme  = null,
  answerImages   = [],
  examType       = "waec",
  year           = "",
}) {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [solution, setSolution] = useState(null);

  const fetchSolution = async () => {
    setState("loading");
    try {
      const res = await fetch(`${API_BASE}/api/solution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          question_images: questionImages,
          marking_scheme:  markingScheme,
          answer_images:   answerImages,
          exam_type:       examType,
          year,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSolution(data);
      setState("done");
    } catch (err) {
      console.error("Solution fetch failed:", err);
      setState("error");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "20px 24px",
      marginTop: 16,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#1e3a5f" }}>
          Solution
        </h3>
        {state === "idle" && (
          <button
            onClick={fetchSolution}
            style={{
              background: "#1e3a5f",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Show Solution
          </button>
        )}
      </div>

      {/* Loading */}
      {state === "loading" && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#6b7280" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Generating solution...
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div style={{ color: "#dc2626", padding: "12px 0" }}>
          Failed to generate solution. Please try again.
          <button
            onClick={fetchSolution}
            style={{ marginLeft: 12, color: "#1e3a5f", cursor: "pointer",
                     background: "none", border: "none", textDecoration: "underline" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Solution */}
      {state === "done" && solution && (
        <div>
          {/* Scraped answer images first (if any) */}
          {answerImages.map((img, i) => (
            <ScrapedImage key={i} path={img} />
          ))}

          {/* Solution text */}
          <SolutionText text={solution.solution_text} />

          {/* AI-generated visual */}
          {solution.visual?.type === "chartjs" && solution.visual.content && (
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 16, marginBottom: 4 }}>
                📊 Graph
              </div>
              <ChartVisual configJson={solution.visual.content} />
            </div>
          )}

          {solution.visual?.type === "svg" && solution.visual.content && (
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 16, marginBottom: 4 }}>
                📐 Diagram
              </div>
              <SvgVisual svgContent={solution.visual.content} />
            </div>
          )}

          {solution.visual?.type === "table" && solution.visual.content && (
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 16, marginBottom: 4 }}>
                📋 Table
              </div>
              <TableVisual htmlContent={solution.visual.content} />
            </div>
          )}

          {/* Regenerate button */}
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              onClick={fetchSolution}
              style={{
                background: "none",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
