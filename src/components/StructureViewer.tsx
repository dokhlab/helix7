"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

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
}: {
  pdbId?: string;
  alphafoldUrl?: string;
  gene: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Molstar3DViewer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      try {
        await load3Dmol();
        if (cancelled || !hostRef.current || !window.$3Dmol) return;

        // Fetch structure text: PDB from RCSB, else AlphaFold CIF.
        let data: string;
        let format: string;
        if (pdbId) {
          const res = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
          if (!res.ok) throw new Error("pdb fetch failed");
          data = await res.text();
          format = "pdb";
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
        viewer.setStyle(
          {},
          {
            cartoon: {
              color: "spectrum",
              thickness: 0.6,
              arrows: true,
            },
          },
        );
        viewer.zoomTo();
        viewer.render();
        viewer.spin("y");
        if (!cancelled) setStatus("ready");
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
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-[color-mix(in_oklab,var(--color-void)_70%,transparent)] px-2 py-1 text-[10px] text-[var(--color-ink-faint)] backdrop-blur">
            drag to rotate · scroll to zoom
          </div>
        </>
      )}
    </div>
  );
}
