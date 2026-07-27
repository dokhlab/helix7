"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hierarchy, cluster, type HierarchyPointNode } from "d3";
import { CLASS_COLOR, CLASS_LABEL } from "@/lib/constants";
import type { TreeNode } from "@/lib/types";

const SIZE = 900;
const R = SIZE / 2 - 90;

interface Datum extends TreeNode {
  children?: Datum[];
}

/**
 * Radial dendrogram of the whole GPCRome. Leaves are receptors, coloured by
 * class; internal nodes are the classification hierarchy. Hovering a leaf
 * highlights it and its lineage; clicking opens the receptor.
 */
export function PhyloTree({ tree }: { tree: TreeNode }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const { links, nodes, leaves } = useMemo(() => {
    const root = hierarchy<Datum>(tree as Datum)
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (a.data.name > b.data.name ? 1 : -1));

    cluster<Datum>().size([2 * Math.PI, R])(root as never);

    const pointRoot = root as unknown as HierarchyPointNode<Datum>;
    return {
      links: pointRoot.links(),
      nodes: pointRoot.descendants(),
      leaves: pointRoot.leaves(),
    };
  }, [tree]);

  const match = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      leaves
        .filter(
          (l) =>
            l.data.gene?.toLowerCase().includes(q) ||
            l.data.name?.toLowerCase().includes(q),
        )
        .map((l) => l.data.slug),
    );
  }, [query, leaves]);

  // Lineage of the hovered leaf, to highlight the path to the root.
  const hoveredPath = useMemo(() => {
    if (!hover) return new Set<string>();
    const leaf = leaves.find((l) => l.data.slug === hover);
    if (!leaf) return new Set<string>();
    const set = new Set<string>();
    let n: HierarchyPointNode<Datum> | null = leaf;
    while (n) {
      set.add(n.data.slug);
      n = n.parent;
    }
    return set;
  }, [hover, leaves]);

  useEffect(() => {
    if (match.size === 1) {
      // Auto-focus a unique search hit.
      setHover([...match][0]);
    }
  }, [match]);

  const radial = (angle: number, radius: number): [number, number] => [
    radius * Math.cos(angle - Math.PI / 2),
    radius * Math.sin(angle - Math.PI / 2),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Highlight a gene…"
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-helix-deep)]"
        />
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.keys(CLASS_LABEL)
            .filter((c) => !["D1", "Other"].includes(c))
            .map((c) => (
              <span
                key={c}
                className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: CLASS_COLOR[c] }}
                />
                {CLASS_LABEL[c]}
              </span>
            ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="panel overflow-hidden"
        style={{ aspectRatio: "1 / 1" }}
      >
        <svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} className="h-full w-full">
          {/* links */}
          <g fill="none">
            {links.map((l, i) => {
              const [sx, sy] = radial(l.source.x, l.source.y);
              const [tx, ty] = radial(l.target.x, l.target.y);
              const onPath =
                hoveredPath.has(l.source.data.slug) &&
                hoveredPath.has(l.target.data.slug);
              const color =
                CLASS_COLOR[l.target.data.classCode ?? ""] ?? "var(--color-line)";
              return (
                <path
                  key={i}
                  d={`M${sx},${sy}L${tx},${ty}`}
                  stroke={onPath ? "var(--color-helix-bright)" : color}
                  strokeWidth={onPath ? 1.8 : 0.5}
                  strokeOpacity={hover && !onPath ? 0.12 : 0.4}
                />
              );
            })}
          </g>

          {/* leaves */}
          <g>
            {leaves.map((leaf) => {
              const [x, y] = radial(leaf.x, leaf.y);
              const color =
                CLASS_COLOR[leaf.data.classCode ?? ""] ?? "var(--color-ink-faint)";
              const isMatch = match.has(leaf.data.slug);
              const isHover = hover === leaf.data.slug;
              const dim = (hover && !isHover) || (match.size > 0 && !isMatch);
              const size = leaf.data.devScore
                ? 1.3 + (leaf.data.devScore / 100) * 2.4
                : 1.3;
              return (
                <circle
                  key={leaf.data.slug}
                  cx={x}
                  cy={y}
                  r={isHover || isMatch ? size + 1.5 : size}
                  fill={color}
                  opacity={dim ? 0.15 : 1}
                  style={{ cursor: "pointer", transition: "opacity 150ms" }}
                  onMouseEnter={() => setHover(leaf.data.slug)}
                  onMouseLeave={() =>
                    setHover((h) => (h === leaf.data.slug ? null : h))
                  }
                  onClick={() =>
                    leaf.data.receptorId &&
                    router.push(`/receptor/${leaf.data.receptorId}`)
                  }
                />
              );
            })}
          </g>

          {/* class labels on outer ring */}
          <g>
            {nodes
              .filter((n) => n.depth === 1)
              .map((n) => {
                const angle = n.x;
                const [x, y] = radial(angle, R + 34);
                const deg = (angle * 180) / Math.PI - 90;
                const flip = angle > Math.PI;
                return (
                  <text
                    key={n.data.slug}
                    x={x}
                    y={y}
                    textAnchor={flip ? "end" : "start"}
                    transform={`rotate(${flip ? deg + 180 : deg}, ${x}, ${y})`}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fill: CLASS_COLOR[n.data.classCode ?? ""] ?? "var(--color-ink)",
                    }}
                  >
                    {CLASS_LABEL[n.data.classCode ?? ""] ?? n.data.name}
                  </text>
                );
              })}
          </g>

          <circle r="3" fill="var(--color-plasma-bright)" />
        </svg>
      </div>

      <div className="mt-3 h-6 text-center text-sm">
        {hover ? (
          (() => {
            const leaf = leaves.find((l) => l.data.slug === hover);
            return leaf?.data.receptorId ? (
              <span>
                <span className="font-semibold text-[var(--color-ink)]">
                  {leaf.data.gene}
                </span>{" "}
                <span className="text-[var(--color-ink-muted)]">
                  · Class {leaf.data.classCode} · dev interest{" "}
                  {(leaf.data.devScore ?? 0).toFixed(0)} — click to open
                </span>
              </span>
            ) : null;
          })()
        ) : (
          <span className="text-[var(--color-ink-faint)]">
            {leaves.length} receptors · hover to trace lineage, click to open
          </span>
        )}
      </div>
    </div>
  );
}
