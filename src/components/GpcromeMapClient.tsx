"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLASS_LABEL } from "@/lib/constants";
import { SIZE, CENTER, INNER } from "./gpcrome-geometry";

export interface Petal {
  id: string;
  gene: string;
  name: string;
  classCode: string;
  color: string;
  score: number;
  /** Spoke endpoints, precomputed and rounded on the server so that the SSR
   *  and client-hydration renders emit byte-identical SVG (Math.sin/cos can
   *  differ in the last ULP between Node and the browser, which otherwise
   *  triggers a React hydration mismatch). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}


/**
 * Radial "GPCRome" — one spoke per receptor, grouped and coloured by class,
 * length keyed to development interest. Hovering reveals the receptor; clicking
 * opens it. Doubles as a legend + entry point on the homepage.
 */
export function GpcromeMapClient({
  petals,
  classes,
}: {
  petals: Petal[];
  classes: string[];
}) {
  const router = useRouter();
  const [hover, setHover] = useState<Petal | null>(null);

  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label="Radial map of the human GPCRome, grouped by receptor class"
      >
        <defs>
          <radialGradient id="helixCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-helix)" stopOpacity="0.35" />
            <stop offset="55%" stopColor="var(--color-helix-deep)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-void)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* core glow */}
        <circle cx={CENTER} cy={CENTER} r={INNER + 30} fill="url(#helixCore)" />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER - 6}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="1"
        />

        {/* spokes */}
        <g>
          {petals.map((p) => {
            const active = hover?.id === p.id;
            const dim = hover && hover.classCode !== p.classCode;
            return (
              <line
                key={p.id}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={p.color}
                strokeWidth={active ? 3 : 1.4}
                strokeLinecap="round"
                opacity={dim ? 0.18 : active ? 1 : 0.82}
                style={{ cursor: "pointer", transition: "opacity 150ms, stroke-width 150ms" }}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover((h) => (h?.id === p.id ? null : h))}
                onClick={() => router.push(`/receptor/${p.id}`)}
              />
            );
          })}
        </g>

        {/* center label */}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          className="fill-[var(--color-ink)]"
          style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          {petals.length}
        </text>
        <text
          x={CENTER}
          y={CENTER + 14}
          textAnchor="middle"
          className="fill-[var(--color-ink-faint)]"
          style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}
        >
          receptors
        </text>
      </svg>

      {/* hover readout */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center">
        {hover && (
          <div className="panel px-3 py-1.5 text-sm shadow-xl">
            <span className="font-semibold">{hover.gene}</span>
            <span className="ml-2 text-[var(--color-ink-muted)]">
              Class {hover.classCode} · {CLASS_LABEL[hover.classCode]}
            </span>
            <span className="numeric ml-2 text-[var(--color-helix)]">
              {hover.score.toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {classes.map((code) => (
          <span key={code} className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `var(--color-class-${code.toLowerCase()})` }}
            />
            {CLASS_LABEL[code] ?? code}
          </span>
        ))}
      </div>
    </div>
  );
}
