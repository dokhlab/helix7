"use client";

import { useMemo, useState } from "react";

/**
 * Interactive dose–response comparison of the pharmacological mechanisms.
 * Toggle each ligand class to see how it shapes receptor response relative to
 * the constitutive (basal) activity of the receptor.
 */

interface Mechanism {
  id: string;
  label: string;
  color: string;
  blurb: string;
  /** response(logDose) as a fraction 0..1 of system maximum. */
  curve: (x: number) => number;
}

const BASAL = 0.18; // constitutive activity of a receptor with some basal tone
const EC50 = 0; // log units, centred

function sigmoid(x: number, top: number, bottom: number, ec50 = EC50, n = 1) {
  return bottom + (top - bottom) / (1 + Math.pow(10, (ec50 - x) * n));
}

const MECHANISMS: Mechanism[] = [
  {
    id: "full",
    label: "Full agonist",
    color: "var(--color-agonist)",
    blurb:
      "Binds the orthosteric site and drives the receptor to its maximal response. Endogenous transmitters are usually full agonists.",
    curve: (x) => sigmoid(x, 1.0, BASAL),
  },
  {
    id: "partial",
    label: "Partial agonist",
    color: "var(--color-partial)",
    blurb:
      "Binds the same site but stabilises the active state less efficiently — a submaximal ceiling however high the dose. Can behave as a functional antagonist in the presence of a full agonist.",
    curve: (x) => sigmoid(x, 0.5, BASAL),
  },
  {
    id: "antagonist",
    label: "Antagonist",
    color: "var(--color-antagonist)",
    blurb:
      "Occupies the pocket without changing activity. Alone it does nothing to response; it works by blocking agonists (neutral antagonist).",
    curve: () => BASAL,
  },
  {
    id: "inverse",
    label: "Inverse agonist",
    color: "var(--color-inverse)",
    blurb:
      "Stabilises the inactive state, suppressing activity below basal. Only visible when the receptor has constitutive (agonist-independent) activity.",
    curve: (x) => sigmoid(x, 0.02, BASAL),
  },
  {
    id: "pam",
    label: "Positive allosteric mod.",
    color: "var(--color-allosteric)",
    blurb:
      "Binds a separate allosteric site and amplifies the response to the endogenous agonist — increasing potency and/or efficacy without activating the receptor on its own.",
    curve: (x) => sigmoid(x, 1.0, BASAL, -1.0, 1.3),
  },
];

const W = 560;
const H = 300;
const PAD = { l: 54, r: 20, t: 20, b: 46 };
const X_MIN = -3;
const X_MAX = 3;

export function DoseResponse() {
  const [active, setActive] = useState<Set<string>>(
    new Set(["full", "partial", "antagonist", "inverse"]),
  );

  const toggle = (id: string) =>
    setActive((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const px = (x: number) =>
    PAD.l + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.l - PAD.r);
  const py = (y: number) => H - PAD.b - y * (H - PAD.t - PAD.b);

  const paths = useMemo(() => {
    const N = 80;
    return MECHANISMS.map((m) => {
      const pts: string[] = [];
      for (let i = 0; i <= N; i++) {
        const x = X_MIN + (i / N) * (X_MAX - X_MIN);
        pts.push(`${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(m.curve(x)).toFixed(1)}`);
      }
      return { ...m, d: pts.join(" ") };
    });
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <figure className="panel overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* basal line */}
          <line
            x1={PAD.l}
            y1={py(BASAL)}
            x2={W - PAD.r}
            y2={py(BASAL)}
            stroke="var(--color-line-bright)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text x={W - PAD.r} y={py(BASAL) - 5} textAnchor="end" style={{ fontSize: 10, fill: "var(--color-ink-faint)" }}>
            basal activity
          </text>

          {/* axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--color-line)" />
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--color-line)" />

          {/* y ticks */}
          {[0, 0.5, 1].map((y) => (
            <g key={y}>
              <text x={PAD.l - 8} y={py(y) + 3} textAnchor="end" style={{ fontSize: 10, fill: "var(--color-ink-faint)" }}>
                {y * 100}
              </text>
            </g>
          ))}
          <text
            transform={`rotate(-90 16 ${H / 2})`}
            x={16}
            y={H / 2}
            textAnchor="middle"
            style={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
          >
            Response (% max)
          </text>
          <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} textAnchor="middle" style={{ fontSize: 11, fill: "var(--color-ink-muted)" }}>
            log [ligand] →
          </text>

          {/* curves */}
          {paths.map((p) => {
            const on = active.has(p.id);
            return (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={on ? 2.6 : 1}
                opacity={on ? 1 : 0.12}
                style={{ transition: "opacity 200ms, stroke-width 200ms" }}
              />
            );
          })}
        </svg>
      </figure>

      <div className="space-y-2">
        {MECHANISMS.map((m) => {
          const on = active.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className="w-full rounded-lg border p-3 text-left transition-colors"
              style={{
                borderColor: on ? m.color : "var(--color-line)",
                background: on
                  ? `color-mix(in oklab, ${m.color} 10%, transparent)`
                  : "transparent",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: m.color, opacity: on ? 1 : 0.4 }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: on ? "var(--color-ink)" : "var(--color-ink-faint)" }}
                >
                  {m.label}
                </span>
              </div>
              {on && (
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  {m.blurb}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
