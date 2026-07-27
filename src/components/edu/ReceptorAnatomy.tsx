/**
 * Structural anatomy of a GPCR — a detailed, labelled cross-section through the
 * plasma membrane. Cylindrical seven-transmembrane helices sit in a
 * phospholipid bilayer; the extracellular face carries the N-terminus and the
 * orthosteric/allosteric ligand pockets; the intracellular face couples to the
 * heterotrimeric G protein and, once the C-terminal tail is phosphorylated, to
 * β-arrestin.
 *
 * Pure SVG so it renders on the server. The bundle is centred in the canvas and
 * all callout labels sit clear of the drawing with dedicated leader lines.
 */

const VB_W = 900;
const VB_H = 520;

const MEM_TOP = 165;
const MEM_BOT = 300;
const MEM_MID = 232;
const HELIX_TOP = 151;
const HELIX_BOT = 313;

// Seven helices, centred in the canvas.
const HELIX_W = 44;
const STEP = 60;
const HX = Array.from({ length: 7 }, (_, i) => 280 + i * STEP); // 280..640, centre 460
const CAP_DY = [0, -6, 3, -5, 3, -6, 0];

const C = {
  extra: "var(--color-class-b1)", // blue — extracellular elements
  tm: "var(--color-helix)", // teal — transmembrane helices
  intra: "var(--color-plasma-bright)", // purple — intracellular elements
  gA: "var(--color-plasma)", // Gα
  gB: "var(--color-class-b1)", // Gβ
  gG: "var(--color-class-c)", // Gγ
  ligand: "#fb923c", // orange — orthosteric ligand (distinct from teal helices)
  allo: "#f472b6", // pink — allosteric modulator
  phos: "var(--color-class-c)", // yellow — phosphate
  arr: "var(--color-class-t2)", // lime — β-arrestin
  faint: "var(--color-ink-faint)",
};

const ORTHO_X = (HX[3] + HX[4]) / 2; // pocket centre between TM4 and TM5

export function ReceptorAnatomy() {
  return (
    <figure className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full min-w-[680px]">
          <defs>
            <linearGradient id="tmCyl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-helix-deep)" />
              <stop offset="28%" stopColor="var(--color-helix)" />
              <stop offset="60%" stopColor="var(--color-helix-bright)" />
              <stop offset="100%" stopColor="var(--color-helix)" />
            </linearGradient>
            <radialGradient id="gAlpha" cx="38%" cy="34%" r="70%">
              <stop offset="0%" stopColor="var(--color-plasma-bright)" />
              <stop offset="100%" stopColor="var(--color-plasma)" />
            </radialGradient>
            <radialGradient id="arrGrad" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#bef264" />
              <stop offset="100%" stopColor="var(--color-class-t2)" />
            </radialGradient>
          </defs>

          {/* region washes */}
          <rect x="0" y="0" width={VB_W} height={MEM_TOP} fill="color-mix(in oklab, var(--color-class-b1) 6%, transparent)" />
          <rect x="0" y={MEM_BOT} width={VB_W} height={VB_H - MEM_BOT} fill="color-mix(in oklab, var(--color-plasma) 6%, transparent)" />

          {/* phospholipid bilayer */}
          <Bilayer />

          {/* intracellular loops (drawn under helices) */}
          <g fill="none" stroke={C.intra} strokeWidth="4" strokeLinecap="round">
            <path d={loopBelow(HX[1], HX[2])} />
            <path d={loopBelow(HX[3], HX[4])} />
            <path d={loopBelow(HX[5], HX[6])} />
          </g>

          {/* extracellular loops */}
          <g fill="none" stroke={C.extra} strokeWidth="4" strokeLinecap="round">
            <path d={loopAbove(HX[0], HX[1])} />
            <path d={loopAbove(HX[2], HX[3])} />
            <path d={loopAbove(HX[4], HX[5])} />
          </g>

          {/* N-terminus (kept well inside the left margin) */}
          <path
            d={`M${HX[0]},${HELIX_TOP + CAP_DY[0]} C ${HX[0] - 26},${HELIX_TOP - 28} ${HX[0] - 6},${HELIX_TOP - 52} ${HX[0] - 40},${HELIX_TOP - 56} C ${HX[0] - 60},${HELIX_TOP - 58} ${HX[0] - 56},${HELIX_TOP - 36} ${HX[0] - 70},${HELIX_TOP - 40}`}
            fill="none"
            stroke={C.extra}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <Label x={HX[0] - 74} y={HELIX_TOP - 50} color={C.extra} anchor="end">
            N-terminus
          </Label>

          {/* helices */}
          {HX.map((x, i) => (
            <Helix key={i} x={x} n={i + 1} capDy={CAP_DY[i]} />
          ))}

          {/* orthosteric pocket (between TM4–TM5) with leader up to a clear label */}
          <ellipse cx={ORTHO_X} cy={MEM_MID - 4} rx="13" ry="16" fill={C.ligand} opacity="0.95" />
          <circle cx={ORTHO_X} cy={MEM_MID - 4} r="21" fill="none" stroke={C.ligand} strokeWidth="1" strokeDasharray="2 3" opacity="0.55" />
          <line x1={ORTHO_X} y1={MEM_MID - 21} x2={ORTHO_X + 40} y2="84" stroke={C.ligand} strokeWidth="1" opacity="0.6" />
          <Label x={ORTHO_X + 44} y="80" color={C.ligand}>
            Orthosteric pocket
          </Label>

          {/* allosteric pocket — on the RIGHT flank of TM7, clear of the "7" label */}
          <ellipse cx={HX[6] + 26} cy={MEM_MID + 4} rx="10" ry="13" fill={C.allo} opacity="0.95" />
          <line x1={HX[6] + 30} y1={MEM_MID - 8} x2={HX[6] + 96} y2="106" stroke={C.allo} strokeWidth="1" opacity="0.6" />
          <Label x={HX[6] + 100} y="102" color={C.allo}>
            Allosteric pocket
          </Label>

          {/* 7-TM helices callout on the bare membrane to the right */}
          <line x1={HX[6] + 60} y1={MEM_MID} x2={HX[6] + 96} y2={MEM_MID} stroke={C.tm} strokeWidth="1" opacity="0.6" />
          <Label x={HX[6] + 100} y={MEM_MID + 4} color={C.tm}>
            7-TM helices
          </Label>

          {/* coupling from the intracellular loops down to the G protein */}
          <path
            d={`M${HX[3]},${HELIX_BOT + 8} C ${HX[3]},${HELIX_BOT + 34} ${455},${348} ${455},${340}`}
            fill="none"
            stroke={C.intra}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* heterotrimeric G protein — below the bundle (intracellular side) */}
          <g>
            <circle cx="512" cy="360" r="24" fill={C.gB} />
            <text x="512" y="366" textAnchor="middle" style={sub(13)}>β</text>
            <circle cx="524" cy="404" r="17" fill={C.gG} />
            <text x="524" y="409" textAnchor="middle" style={sub(11)}>γ</text>
            <circle cx="452" cy="382" r="40" fill="url(#gAlpha)" />
            <text x="452" y="389" textAnchor="middle" style={sub(18)}>α</text>
          </g>
          {/* label centred directly beneath the G protein, clear of every line */}
          <text x="466" y="446" textAnchor="middle" style={{ fontSize: 12, fill: C.intra }}>
            Heterotrimeric G protein (α, β, γ)
          </text>

          {/* phosphorylated C-terminal tail → β-arrestin */}
          <path
            d={`M${HX[6]},${HELIX_BOT + 6} C ${HX[6] + 34},${HELIX_BOT + 40} ${700},${404} ${724},${430}`}
            fill="none"
            stroke={C.intra}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {[
            [672, 388],
            [692, 404],
            [712, 420],
          ].map(([px, py], i) => (
            <g key={i}>
              <circle cx={px} cy={py} r="8" fill={C.phos} />
              <text x={px} y={py + 3} textAnchor="middle" style={sub(9, "var(--color-void)")}>P</text>
            </g>
          ))}
          {/* β-arrestin */}
          <ellipse cx="760" cy="446" rx="34" ry="20" fill="url(#arrGrad)" />
          <text x="760" y="451" textAnchor="middle" style={sub(12, "var(--color-void)")}>β-arrestin</text>
          <Label x="800" y="440" color={C.intra}>
            Phosphorylated
          </Label>
          <Label x="800" y="456" color={C.intra}>
            C-terminal tail
          </Label>

          {/* region labels */}
          <text x="18" y="30" style={region()}>EXTRACELLULAR</text>
          <text x="18" y={VB_H - 14} style={region()}>INTRACELLULAR</text>
        </svg>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--color-line)] px-4 py-3">
        {[
          ["Transmembrane helices", C.tm],
          ["Extracellular elements", C.extra],
          ["Intracellular elements", C.intra],
          ["G-protein subunits", C.gA],
          ["Orthosteric ligand", C.ligand],
          ["Allosteric modulator", C.allo],
          ["Phosphate", C.phos],
          ["β-arrestin", C.arr],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <figcaption className="border-t border-[var(--color-line)] px-4 py-2.5 text-xs text-[var(--color-ink-muted)]">
        The canonical GPCR fold: seven α-helices (1–7) thread the membrane; the
        extracellular N-terminus and loops shape the orthosteric and allosteric
        pockets; the intracellular face couples to a heterotrimeric G protein
        (α/β/γ), and the phosphorylated C-terminal tail recruits β-arrestin.
      </figcaption>
    </figure>
  );
}

/* ---- helpers ---------------------------------------------------------- */

function Helix({ x, n, capDy }: { x: number; n: number; capDy: number }) {
  const top = HELIX_TOP + capDy;
  const w = HELIX_W;
  return (
    <g>
      <rect x={x - w / 2} y={top} width={w} height={HELIX_BOT - top} rx="8" fill="url(#tmCyl)" stroke="var(--color-helix-deep)" strokeWidth="1" />
      <ellipse cx={x} cy={top} rx={w / 2} ry="6" fill="var(--color-helix-bright)" />
      <ellipse cx={x} cy={top} rx={w / 2 - 4} ry="4" fill="color-mix(in oklab, var(--color-helix-bright) 60%, white)" opacity="0.5" />
      <text x={x} y={MEM_MID + 5} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: "var(--color-void)" }}>
        {n}
      </text>
    </g>
  );
}

function Bilayer() {
  const heads: number[] = [];
  for (let x = 30; x <= 876; x += 13) heads.push(x);
  return (
    <g>
      <rect x="0" y={MEM_TOP} width={VB_W} height={MEM_BOT - MEM_TOP} fill="color-mix(in oklab, var(--color-surface-3) 45%, transparent)" />
      {heads.map((x, i) => (
        <g key={i} stroke="var(--color-line-bright)" strokeWidth="1.4" opacity="0.5">
          <line x1={x} y1={MEM_TOP + 5} x2={x} y2={MEM_MID - 3} />
          <line x1={x} y1={MEM_BOT - 5} x2={x} y2={MEM_MID + 3} />
        </g>
      ))}
      {heads.map((x, i) => (
        <g key={`h${i}`}>
          <circle cx={x} cy={MEM_TOP + 4} r="3.6" fill="var(--color-line-bright)" opacity="0.65" />
          <circle cx={x} cy={MEM_BOT - 4} r="3.6" fill="var(--color-line-bright)" opacity="0.65" />
        </g>
      ))}
    </g>
  );
}

function loopAbove(x1: number, x2: number): string {
  const y = HELIX_TOP - 2;
  return `M${x1},${y} Q${(x1 + x2) / 2},${y - 34} ${x2},${y}`;
}

function loopBelow(x1: number, x2: number): string {
  const y = HELIX_BOT + 2;
  return `M${x1},${y} Q${(x1 + x2) / 2},${y + 30} ${x2},${y}`;
}

function Label({
  x,
  y,
  color,
  anchor = "start",
  children,
}: {
  x: number | string;
  y: number | string;
  color: string;
  anchor?: "start" | "middle" | "end";
  children: React.ReactNode;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} style={{ fontSize: 12, fill: color }}>
      {children}
    </text>
  );
}

function sub(size: number, fill = "white"): React.CSSProperties {
  return { fontSize: size, fontWeight: 700, fill };
}

function region(): React.CSSProperties {
  return { fontSize: 10, letterSpacing: "0.14em", fill: "var(--color-ink-faint)" };
}
