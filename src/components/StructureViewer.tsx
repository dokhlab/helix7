"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { ligandSelection } from "@/lib/hetGroups";
import type { StructureLigand } from "@/lib/types";

declare global {
  interface Window {
    $3Dmol?: {
      createViewer: (
        el: HTMLElement,
        cfg: Record<string, unknown>,
      ) => Molstar3DViewer;
    };
  }
}

interface Molstar3DViewer {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  addSurface?: (type: unknown, cfg: Record<string, unknown>) => void;
  zoomTo: () => void;
  render: () => void;
  spin: (axis: boolean | string) => void;
  clear: () => void;
  setBackgroundColor: (c: number, a?: number) => void;
  getView: () => number[];
  setView: (view: number[]) => void;
  selectedAtoms: (sel: Record<string, unknown>) => { chain?: string; resn?: string }[];
}

type Coloring = "spectrum" | "chain";

/**
 * Cartoon in the chosen colouring; the ligand(s) as sticks when shown. Every
 * other hetero group (lipids, detergents, water, glycans…) stays hidden.
 */
function applyStyle(
  viewer: Molstar3DViewer,
  coloring: Coloring,
  ligands: boolean,
  ligandSel: Record<string, unknown>,
) {
  const cartoon =
    coloring === "spectrum"
      ? { color: "spectrum", thickness: 0.6, arrows: true }
      : { colorscheme: "chain", thickness: 0.6, arrows: true };
  viewer.setStyle({}, { cartoon });
  viewer.setStyle({ hetflag: true }, {});
  if (ligands) viewer.setStyle(ligandSel, { stick: { colorscheme: "greenCarbon", radius: 0.25 } });
  viewer.render();
}

function ControlButton({
  onClick,
  pressed,
  title,
  children,
}: {
  onClick: () => void;
  pressed?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={pressed}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
        pressed
          ? "bg-[var(--color-surface-3)] text-[var(--color-ink)]"
          : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}

const CDN = "https://3Dmol.org/build/3Dmol-min.js";
let scriptPromise: Promise<void> | null = null;

function load3Dmol(): Promise<void> {
  if (typeof window !== "undefined" && window.$3Dmol) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load 3Dmol.js"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Interactive 3D cartoon of a GPCR, rendered with 3Dmol.js. Falls back from an
 * experimental PDB structure to the AlphaFold model when no structure exists,
 * so every receptor shows something. Chain is rainbow-coloured N→C so the seven
 * transmembrane helices read clearly.
 */
export function StructureViewer({
  pdbId,
  alphafoldUrl,
  gene,
  ligands: curated = [],
}: {
  pdbId?: string;
  alphafoldUrl?: string;
  gene: string;
  /** GPCRdb's curated ligands for this structure; only these are drawn. */
  ligands?: StructureLigand[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Molstar3DViewer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [source, setSource] = useState<string>("");
  const [spinning, setSpinning] = useState(true);
  const [coloring, setColoring] = useState<Coloring>("spectrum");
  const [ligands, setLigands] = useState(true);
  const [content, setContent] = useState({ chains: 0, hasLigands: false });
  const homeView = useRef<number[] | null>(null);
  // "alprenolol (antagonist)"; GPCRdb sometimes names a ligand only by its ChEMBL id, so use the PDB code then.
  const ligandLabel = curated
    .filter((l) => l.pdbChemId)
    .map((l) => {
      const name = /^CHEMBL\d+$/i.test(l.name) ? l.pdbChemId : l.name;
      return l.function ? `${name} (${l.function.toLowerCase()})` : name;
    })
    .join(", ");
  const chemIds = curated.map((l) => l.pdbChemId ?? "").filter(Boolean).join(",");
  const ligandSel = useMemo(() => ligandSelection(chemIds ? chemIds.split(",") : []), [chemIds]);
  const styleRef = useRef({ coloring, ligands, spinning, ligandSel });
  styleRef.current = { coloring, ligands, spinning, ligandSel };

  // Respect a system-wide "reduce motion" preference: start still.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setSpinning(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      try {
        await load3Dmol();
        if (cancelled || !hostRef.current || !window.$3Dmol) return;

        // Fetch structure text: RCSB for experimental, else AlphaFold CIF.
        let data: string;
        let format: string;
        if (pdbId) {
          // Many newer/large entries have no legacy .pdb file — mmCIF is always
          // available — so try .pdb first, then fall back to .cif.
          let res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
          format = "pdb";
          if (!res.ok) {
            res = await fetch(`https://files.rcsb.org/download/${pdbId}.cif`);
            format = "cif";
          }
          if (!res.ok) throw new Error("structure fetch failed");
          data = await res.text();
          setSource(`PDB ${pdbId}`);
        } else if (alphafoldUrl) {
          const res = await fetch(alphafoldUrl);
          if (!res.ok) throw new Error("alphafold fetch failed");
          data = await res.text();
          format = "cif";
          setSource("AlphaFold model");
        } else {
          throw new Error("no structure");
        }
        if (cancelled) return;

        hostRef.current.innerHTML = "";
        const viewer = window.$3Dmol.createViewer(hostRef.current, {
          backgroundColor: "#04060a",
        });
        viewerRef.current = viewer;
        viewer.addModel(data, format);
        const { coloring: c, ligands: l, spinning: sp, ligandSel: sel } = styleRef.current;
        applyStyle(viewer, c, l, sel);
        viewer.zoomTo();
        viewer.render();
        homeView.current = viewer.getView();
        viewer.spin(sp ? "y" : false);
        const chains = new Set(viewer.selectedAtoms({}).map((a) => a.chain)).size;
        const hasLigands = viewer.selectedAtoms(sel).length > 0;
        if (!cancelled) {
          setContent({ chains, hasLigands });
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
      try {
        viewerRef.current?.clear();
      } catch {
        /* noop */
      }
    };
  }, [pdbId, alphafoldUrl]);

  useEffect(() => {
    if (status === "ready") viewerRef.current?.spin(spinning ? "y" : false);
  }, [spinning, status]);

  useEffect(() => {
    if (status === "ready" && viewerRef.current) applyStyle(viewerRef.current, coloring, ligands, ligandSel);
  }, [coloring, ligands, ligandSel, status]);

  const resetView = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (homeView.current) viewer.setView(homeView.current);
    else viewer.zoomTo();
    viewer.render();
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-void)]">
      <div
        ref={hostRef}
        className="relative h-[380px] w-full"
        style={{ position: "relative" }}
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-[var(--color-ink-muted)]">
          <Loader2 className="animate-spin text-[var(--color-helix)]" size={22} />
          Loading 3D structure…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--color-ink-faint)]">
          Structure could not be rendered for {gene}.
        </div>
      )}
      {status === "ready" && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-[color-mix(in_oklab,var(--color-void)_70%,transparent)] px-2 py-1 text-xs text-[var(--color-ink-muted)] backdrop-blur">
            {source}
            {content.hasLigands && ligandLabel && (
              <span className="text-[var(--color-ink-faint)]"> · {ligandLabel}</span>
            )}
          </div>
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-0.5 rounded-lg border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-void)_75%,transparent)] p-0.5 backdrop-blur">
            <ControlButton
              onClick={() => setSpinning((v) => !v)}
              title={spinning ? "Stop rotation" : "Start rotation"}
            >
              {spinning ? <Pause size={13} /> : <Play size={13} />}
              {spinning ? "Stop" : "Spin"}
            </ControlButton>
            <ControlButton onClick={resetView} title="Reset orientation and zoom">
              <RotateCcw size={13} />
              Reset
            </ControlButton>
            {content.chains > 1 && (
              <>
                <span className="mx-1 h-4 w-px bg-[var(--color-line)]" />
                <ControlButton
                  onClick={() => setColoring("spectrum")}
                  pressed={coloring === "spectrum"}
                  title="Rainbow from N- to C-terminus"
                >
                  Rainbow
                </ControlButton>
                <ControlButton
                  onClick={() => setColoring("chain")}
                  pressed={coloring === "chain"}
                  title="One colour per chain (receptor, G protein, antibody…)"
                >
                  Chains
                </ControlButton>
              </>
            )}
            {content.hasLigands && (
              <>
                <span className="mx-1 h-4 w-px bg-[var(--color-line)]" />
                <ControlButton
                  onClick={() => setLigands((v) => !v)}
                  pressed={ligands}
                  title={ligands ? "Hide bound ligands" : "Show bound ligands as sticks"}
                >
                  Ligands
                </ControlButton>
              </>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-md bg-[color-mix(in_oklab,var(--color-void)_70%,transparent)] px-2 py-1 text-[10px] text-[var(--color-ink-faint)] backdrop-blur sm:block">
            drag to rotate · scroll to zoom
          </div>
        </>
      )}
    </div>
  );
}
