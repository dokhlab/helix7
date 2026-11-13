"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hierarchy, cluster, type HierarchyPointNode } from "d3";
import { CLASS_COLOR, CLASS_LABEL } from "@/lib/constants";
import type { TreeNode } from "@/lib/types";
import { MAX_BULK, PhyloSearch } from "./PhyloSearch";
import { isExact, matchGenes, words, type GeneOption } from "@/lib/receptorMatch";
import type { TreeSearchEntry } from "@/lib/data";
import { isBottom, point, sectorPath, spreadAngles, textArc } from "./phylo-geometry";

/* Layout, in SVG units (the viewBox is 2·HALF square). */
const HALF = 450;
const R = 388; // leaves
const BAND = [R + 9, R + 19] as const; // class colour band
const CLASS_FONT = 18;
const CLASS_TEXT_R = R + 25; // baseline of top-half class names (bottom adds a cap height)
const GENE_FONT = 15;
const GENE_TEXT_R = R - 36; // where gene callouts end, inside the ring
const HUB_R = 86;
/** Beyond this many highlighted leaves, callouts would fan into noise. */
const MAX_LABELS = 48;

interface Datum extends TreeNode {
  children?: Datum[];
}
type Node = HierarchyPointNode<Datum>;

/** Gene symbols from ?genes=ADRB2,DRD2 so a highlighted tree can be shared. */
function genesFromUrl(): string[] {
  if (typeof window === "undefined") return [];
  const raw = new URLSearchParams(window.location.search).get("genes") ?? "";
  return raw.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean);
}

const classColor = (code?: string) => CLASS_COLOR[code ?? ""] ?? "var(--color-class-other)";

/**
 * Radial dendrogram of the whole GPCRome. Leaves are receptors; a coloured
 * band names each class around the rim. Genes chosen in the search (or
 * previewed while typing) get a callout and their lineage drawn; the hub in
 * the centre reads out the hovered or selected receptor; clicking opens it.
 */
export function PhyloTree({
  tree,
  searchIndex = {},
}: {
  tree: TreeNode;
  searchIndex?: Record<string, TreeSearchEntry>;
}) {
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const { links, leaves, classes } = useMemo(() => {
    const root = hierarchy<Datum>(tree as Datum)
      .sum((d) => (d.children ? 0 : 1))
      .sort((a, b) => (a.data.name > b.data.name ? 1 : -1));
    cluster<Datum>().size([2 * Math.PI, R])(root as never);
    const pointRoot = root as unknown as Node;
    const leaves = pointRoot.leaves();
    const half = Math.PI / leaves.length; // half a leaf step, so bands meet their neighbours' gaps
    const classes = (pointRoot.children ?? []).map((n) => {
      const xs = n.leaves().map((l) => l.x);
      return { node: n, a0: Math.min(...xs) - half, a1: Math.max(...xs) + half };
    });
    return { links: pointRoot.links(), leaves, classes };
  }, [tree]);

  const leafBySlug = useMemo(() => new Map(leaves.map((l) => [l.data.slug, l])), [leaves]);

  const options: GeneOption[] = useMemo(
    () =>
      leaves
        .filter((l) => l.data.gene)
        .map((l) => {
          const entry = l.data.receptorId ? searchIndex[l.data.receptorId] : undefined;
          // Own names and synonyms, plus every ancestor (family, ligand group, class) so "dopamine" finds its members.
          const own = [l.data.gene, l.data.name, entry?.terms].filter(Boolean).join(" ");
          const group = l.ancestors().slice(1).map((a) => a.data.name).join(" ");
          return {
            slug: l.data.slug,
            gene: l.data.gene!,
            name: l.data.name,
            classCode: l.data.classCode,
            aliases: entry?.aliases ?? [],
            terms: new Set(words(own)),
            groupTerms: new Set(words(group)),
          };
        }),
    [leaves, searchIndex],
  );

  // Restore a shared selection once, then keep the URL in step with it.
  useEffect(() => {
    const wanted = new Set(genesFromUrl());
    if (wanted.size) setPicked(options.filter((o) => wanted.has(o.gene.toUpperCase())).map((o) => o.slug));
  }, [options]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const genes = picked.map((s) => leafBySlug.get(s)?.data.gene).filter(Boolean);
    if (genes.length) url.searchParams.set("genes", genes.join(","));
    else url.searchParams.delete("genes");
    window.history.replaceState(null, "", url);
  }, [picked, leafBySlug]);

  const matches = useMemo(() => matchGenes(options, query), [options, query]);

  // Chosen genes plus a live preview of what is being typed (when it is a family, not the tree).
  const highlighted = useMemo(() => {
    const set = new Set(picked);
    // A term naming one receptor outright previews just that; otherwise the whole (small) family.
    const exact = matches.filter(isExact);
    const preview = exact.length ? exact : matches.length <= MAX_BULK ? matches : [];
    preview.forEach((m) => set.add(m.option.slug));
    return set;
  }, [picked, matches]);

  // Every node on the path from a highlighted (or hovered) leaf to the root.
  const lineage = useMemo(() => {
    const set = new Set<string>();
    for (const slug of hover ? [...highlighted, hover] : highlighted) {
      let n: Node | null = leafBySlug.get(slug) ?? null;
      while (n && !set.has(n.data.slug)) {
        set.add(n.data.slug);
        n = n.parent;
      }
    }
    return set;
  }, [highlighted, hover, leafBySlug]);
  const active = lineage.size > 0;

  // Callouts: fanned out so adjacent receptors never stack their labels.
  const callouts = useMemo(() => {
    const slugs = [...highlighted].slice(0, MAX_LABELS);
    if (hover && !highlighted.has(hover)) slugs.push(hover);
    const ls = slugs.map((s) => leafBySlug.get(s)).filter((l): l is Node => !!l);
    const placed = spreadAngles(ls.map((l) => l.x), (GENE_FONT + 3) / GENE_TEXT_R);
    return ls.map((leaf, i) => ({ leaf, angle: placed[i] }));
  }, [highlighted, hover, leafBySlug]);

  const pickedOptions = picked
    .map((s) => options.find((o) => o.slug === s))
    .filter((o): o is GeneOption => !!o);

  // The hub shows the hovered leaf, else a single highlighted one.
  const focus =
    (hover && leafBySlug.get(hover)) ||
    (highlighted.size === 1 ? leafBySlug.get([...highlighted][0]) : undefined);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start gap-x-5 gap-y-3">
        <PhyloSearch
          options={options}
          query={query}
          onQuery={setQuery}
          matches={matches}
          picked={pickedOptions}
          onPick={(slugs) => setPicked((p) => [...p, ...slugs.filter((s) => !p.includes(s))])}
          onUnpick={(slug) => setPicked((p) => p.filter((s) => s !== slug))}
          onClear={() => setPicked([])}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2">
          {classes.map(({ node }) => (
            <span key={node.data.slug} className="flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted)]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: classColor(node.data.classCode) }} />
              <span className="font-semibold text-[var(--color-ink)]">{node.data.classCode ?? "—"}</span>
              {CLASS_LABEL[node.data.classCode ?? ""] ?? node.data.name}
            </span>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
        <svg
          viewBox={`${-HALF} ${-HALF} ${2 * HALF} ${2 * HALF}`}
          className="h-full w-full select-none"
          role="img"
          aria-label="Radial tree of human GPCRs grouped by class"
        >
          <defs>
            <radialGradient id={`${uid}-hub`}>
              <stop offset="0%" stopColor="var(--color-surface-2)" />
              <stop offset="100%" stopColor="var(--color-abyss)" />
            </radialGradient>
            {classes.map(({ node, a0, a1 }) => (
              <path
                key={node.data.slug}
                id={`${uid}-arc-${node.data.slug}`}
                d={textArc(a0 - 0.3, a1 + 0.3, isBottom(a0, a1) ? CLASS_TEXT_R + CLASS_FONT * 0.72 : CLASS_TEXT_R)}
              />
            ))}
          </defs>

          {/* links; highlighted lineages drawn last so they sit on top */}
          <g fill="none">
            {[...links]
              .sort((a, b) => Number(lineage.has(a.target.data.slug)) - Number(lineage.has(b.target.data.slug)))
              .map((l) => {
                const [sx, sy] = point(l.source.x, l.source.y);
                const [tx, ty] = point(l.target.x, l.target.y);
                const onPath = lineage.has(l.target.data.slug);
                return (
                  <path
                    key={l.target.data.slug}
                    d={`M${sx},${sy}L${tx},${ty}`}
                    stroke={onPath ? "var(--color-helix-bright)" : classColor(l.target.data.classCode)}
                    strokeWidth={onPath ? 2.2 : 0.6}
                    strokeOpacity={onPath ? 1 : active ? 0.08 : 0.38}
                  />
                );
              })}
          </g>

          {/* class ring: band + name curved along it (code when the arc is too short) */}
          <g>
            {classes.map(({ node, a0, a1 }) => {
              const code = node.data.classCode ?? "";
              const full = CLASS_LABEL[code] ?? node.data.name.replace(/ GPCRs$/, "");
              const arcLen = (a1 - a0) * CLASS_TEXT_R + 24; // a little overhang into the gaps is fine
              const fits = (t: string) => t.length * CLASS_FONT * 0.58 < arcLen;
              // Too short for even the code (e.g. 5 "Other" receptors): the band, its tooltip and the legend name it.
              const text = fits(full) ? full : fits(code) ? code : "";
              const lit = [...highlighted].some((s) => leafBySlug.get(s)?.parent?.parent?.parent === node) ||
                (hover && leafBySlug.get(hover)?.parent?.parent?.parent === node);
              return (
                <g key={node.data.slug}>
                  <title>{`Class ${code} · ${full} — ${node.leaves().length} receptors`}</title>
                  <path
                    d={sectorPath(a0, a1, BAND[0], BAND[1])}
                    fill={classColor(code)}
                    fillOpacity={active && !lit ? 0.25 : 0.85}
                  />
                  <text
                    style={{
                      fontSize: CLASS_FONT,
                      fontWeight: 600,
                      letterSpacing: "0.03em",
                      fill: classColor(code),
                      opacity: active && !lit ? 0.45 : 1,
                    }}
                  >
                    <textPath href={`#${uid}-arc-${node.data.slug}`} startOffset="50%" textAnchor="middle">
                      {text}
                    </textPath>
                  </text>
                </g>
              );
            })}
          </g>

          {/* leaves */}
          <g>
            {leaves.map((leaf) => {
              const [x, y] = point(leaf.x, leaf.y);
              const lit = highlighted.has(leaf.data.slug) || hover === leaf.data.slug;
              const size = 1.4 + ((leaf.data.devScore ?? 0) / 100) * 2.6;
              return (
                <circle
                  key={leaf.data.slug}
                  cx={x}
                  cy={y}
                  r={lit ? size + 2.2 : size}
                  fill={classColor(leaf.data.classCode)}
                  stroke={lit ? "var(--color-ink)" : "none"}
                  strokeWidth={1.2}
                  opacity={active && !lit ? 0.15 : 1}
                  style={{ cursor: "pointer", transition: "opacity 150ms" }}
                  onMouseEnter={() => setHover(leaf.data.slug)}
                  onMouseLeave={() => setHover((h) => (h === leaf.data.slug ? null : h))}
                  onClick={() => leaf.data.receptorId && router.push(`/receptor/${leaf.data.receptorId}`)}
                />
              );
            })}
          </g>

          {/* gene callouts: leader from the leaf, fanned inward, label in the class colour */}
          <g style={{ pointerEvents: "none" }}>
            {callouts.map(({ leaf, angle }) => {
              const color = classColor(leaf.data.classCode);
              const [x0, y0] = point(leaf.x, R - 5);
              const [x1, y1] = point(leaf.x, R - 14);
              const [x2, y2] = point(angle, GENE_TEXT_R + 6);
              const [tx, ty] = point(angle, GENE_TEXT_R);
              const deg = (angle * 180) / Math.PI - 90;
              const flip = angle > Math.PI;
              return (
                <g key={leaf.data.slug}>
                  <polyline
                    points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.8}
                  />
                  <text
                    x={tx}
                    y={ty}
                    dy="0.34em"
                    textAnchor={flip ? "start" : "end"}
                    transform={`rotate(${flip ? deg + 180 : deg}, ${tx}, ${ty})`}
                    style={{
                      fontSize: GENE_FONT,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      fill: color,
                      stroke: "var(--color-abyss)",
                      strokeWidth: 4,
                      strokeLinejoin: "round",
                      paintOrder: "stroke",
                    }}
                  >
                    {leaf.data.gene}
                  </text>
                </g>
              );
            })}
          </g>

          {/* centre hub: a readout of whatever is in focus */}
          <circle r={HUB_R} fill={`url(#${uid}-hub)`} stroke="var(--color-line-bright)" strokeWidth={1} />
          <foreignObject x={-HUB_R + 6} y={-HUB_R + 6} width={2 * HUB_R - 12} height={2 * HUB_R - 12}>
            <div className="flex h-full flex-col items-center justify-center text-center leading-tight">
              {focus ? (
                <>
                  <div
                    className="font-semibold tracking-tight"
                    style={{ fontSize: 30, color: classColor(focus.data.classCode) }}
                  >
                    {focus.data.gene}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[var(--color-ink)]" style={{ fontSize: 12.5 }}>
                    {focus.data.name}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[var(--color-ink-muted)]" style={{ fontSize: 10.5 }}>
                    {focus.parent?.data.name}
                  </div>
                  <div className="mt-1.5 text-[var(--color-ink-faint)]" style={{ fontSize: 10, letterSpacing: "0.04em" }}>
                    CLASS {focus.data.classCode} · DEV {(focus.data.devScore ?? 0).toFixed(0)}
                    {focus.data.tdl ? ` · ${focus.data.tdl.toUpperCase()}` : ""}
                  </div>
                </>
              ) : highlighted.size > 1 ? (
                <>
                  <div className="font-semibold text-[var(--color-helix-bright)]" style={{ fontSize: 40 }}>
                    {highlighted.size}
                  </div>
                  <div className="text-[var(--color-ink-muted)]" style={{ fontSize: 12 }}>
                    receptors highlighted
                  </div>
                  {highlighted.size > MAX_LABELS && (
                    <div className="mt-1 text-[var(--color-ink-faint)]" style={{ fontSize: 10 }}>
                      first {MAX_LABELS} labelled
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-semibold text-[var(--color-ink)]" style={{ fontSize: 40 }}>
                    {leaves.length}
                  </div>
                  <div className="text-[var(--color-ink-muted)]" style={{ fontSize: 12 }}>
                    human GPCRs
                  </div>
                  <div className="mt-1.5 text-[var(--color-ink-faint)]" style={{ fontSize: 10 }}>
                    search a gene or hover a leaf
                  </div>
                </>
              )}
            </div>
          </foreignObject>
        </svg>
      </div>

      <p className="mt-3 text-center text-sm text-[var(--color-ink-faint)]">
        Leaf size scales with development interest · click a leaf to open its receptor page
      </p>
    </div>
  );
}
