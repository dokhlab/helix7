import { ReceptorAnatomy } from "./ReceptorAnatomy";
import { MiniReceptor, type CycleVariant } from "./MiniReceptor";

/**
 * "GPCR — Structure and Function" infographic. Reproduces a single cohesive
 * poster: an intro + key features, the labelled structure diagram, the five-step
 * functional cycle with mini schematics, and the common Gα subfamilies.
 */

const KEY_FEATURES = [
  "Seven transmembrane (7-TM) helices span the membrane",
  "Orthosteric pocket binds the natural (endogenous) ligand",
  "Allosteric pocket binds modulators away from the main site",
  "Couples to heterotrimeric G proteins (α, β, γ)",
  "Intracellular loops interact with the G protein",
  "C-terminal tail is phosphorylated and recruits β-arrestin",
];

const CYCLE: {
  n: number;
  title: string;
  variant: CycleVariant | "biased";
  body: string;
  accent: string;
}[] = [
  {
    n: 1,
    title: "Inactive state",
    variant: "inactive",
    accent: "var(--color-class-b1)",
    body:
      "Without a ligand, the receptor rests in an inactive conformation. The G protein is bound to GDP and stays associated with the receptor.",
  },
  {
    n: 2,
    title: "Ligand binding",
    variant: "binding",
    accent: "var(--color-agonist)",
    body:
      "An extracellular ligand binds the orthosteric pocket, stabilising the active conformation of the receptor.",
  },
  {
    n: 3,
    title: "G-protein activation",
    variant: "activation",
    accent: "var(--color-helix)",
    body:
      "Binding triggers a structural rearrangement that lets the intracellular loops engage the G protein and promote GDP release from Gα.",
  },
  {
    n: 4,
    title: "Signalling & phosphorylation",
    variant: "signaling",
    accent: "var(--color-class-c)",
    body:
      "Gα exchanges GDP for GTP and dissociates from βγ. Both Gα-GTP and βγ regulate downstream effectors. GRKs phosphorylate the C-terminal tail.",
  },
  {
    n: 5,
    title: "Biased signalling",
    variant: "biased",
    accent: "var(--color-plasma-bright)",
    body:
      "G-protein and β-arrestin pathways can be engaged to different extents, producing distinct signalling outputs — biased signalling.",
  },
];

const G_SUBFAMILIES = [
  { name: "Gαs", color: "var(--color-plasma-bright)", effect: "Activates adenylyl cyclase", second: "↑ cAMP" },
  { name: "Gαi/o", color: "var(--color-agonist)", effect: "Inhibits adenylyl cyclase", second: "↓ cAMP" },
  { name: "Gαq/11", color: "var(--color-class-c)", effect: "Activates PLCβ", second: "↑ IP₃, DAG, Ca²⁺" },
  { name: "Gα12/13", color: "var(--color-class-b1)", effect: "Activates RhoGEFs", second: "Cytoskeletal responses" },
];

export function GpcrInfographic() {
  return (
    <div className="panel overflow-hidden">
      {/* header band */}
      <div className="border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_60%,transparent)] p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              GPCR ·{" "}
              <span className="text-[var(--color-helix)]">Structure &amp; Function</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              G protein-coupled receptors are seven-transmembrane (7-TM) receptors
              that sense extracellular signals and activate heterotrimeric G
              proteins to initiate intracellular signalling cascades.
            </p>
          </div>

          {/* key features */}
          <div className="rounded-xl border border-[var(--color-line)] p-4">
            <div className="mono-label mb-2.5">Key features</div>
            <ul className="grid gap-1.5">
              {KEY_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-muted)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-helix)]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* main structure diagram */}
      <div className="border-b border-[var(--color-line)] p-6">
        <div className="mono-label mb-3">GPCR structure</div>
        <ReceptorAnatomy />
      </div>

      {/* functional cycle */}
      <div className="border-b border-[var(--color-line)] p-6">
        <div className="mono-label mb-4">Functional cycle</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CYCLE.map((s) => (
            <div key={s.n} className="flex flex-col rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 aspect-square items-center justify-center rounded-full text-xs font-bold text-[var(--color-void)]"
                  style={{ background: s.accent }}
                >
                  {s.n}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {s.title}
                </span>
              </div>
              <div className="mb-2 rounded-lg bg-[var(--color-void)]/40 p-1.5">
                {s.variant === "biased" ? (
                  <BiasedFlow />
                ) : (
                  <MiniReceptor variant={s.variant} />
                )}
              </div>
              <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Gα subfamilies */}
      <div className="p-6">
        <div className="mono-label mb-4">Common Gα subfamilies &amp; effects</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {G_SUBFAMILIES.map((g) => (
            <div key={g.name} className="rounded-xl border-l-2 pl-3" style={{ borderColor: g.color }}>
              <div className="text-lg font-bold" style={{ color: g.color }}>
                {g.name}
              </div>
              <div className="mt-1 text-sm text-[var(--color-ink-muted)]">{g.effect}</div>
              <div className="mt-0.5 text-sm font-medium text-[var(--color-ink)]">
                {g.second}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Step 5 — three parallel signalling outputs. */
function BiasedFlow() {
  const rows = [
    { label: "α", sub: "GTP", color: "var(--color-plasma)", to: "Effector proteins" },
    { label: "βγ", sub: "", color: "var(--color-class-b1)", to: "Effector proteins" },
    { label: "β-arr", sub: "", color: "var(--color-class-t2)", to: "Signalling pathways" },
  ];
  return (
    <svg viewBox="0 0 220 168" className="w-full">
      {rows.map((r, i) => {
        const y = 34 + i * 46;
        return (
          <g key={i}>
            <circle cx="34" cy={y} r="17" fill={r.color} />
            <text x="34" y={r.sub ? y - 2 : y + 4} textAnchor="middle" style={{ fontSize: r.label.length > 2 ? 9 : 12, fontWeight: 700, fill: "var(--color-void)" }}>
              {r.label}
            </text>
            {r.sub && (
              <text x="34" y={y + 9} textAnchor="middle" style={{ fontSize: 8, fontWeight: 700, fill: "var(--color-void)" }}>
                {r.sub}
              </text>
            )}
            <path d={`M56,${y} L96,${y}`} stroke="var(--color-ink-faint)" strokeWidth="1.6" markerEnd="url(#bArrow)" />
            <rect x="100" y={y - 15} width="104" height="30" rx="7" fill="var(--color-surface-2)" stroke="var(--color-line-bright)" strokeWidth="1" />
            <text x="152" y={y + 4} textAnchor="middle" style={{ fontSize: 10, fill: "var(--color-ink)" }}>
              {r.to}
            </text>
          </g>
        );
      })}
      <defs>
        <marker id="bArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--color-ink-faint)" />
        </marker>
      </defs>
    </svg>
  );
}
