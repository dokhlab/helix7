/**
 * Compact GPCR schematic used in the functional-cycle steps. A small membrane
 * with the seven transmembrane helices and the α/β/γ G protein on the
 * intracellular (bottom) side, decorated per activation state.
 */

const MEM_TOP = 40;
const MEM_BOT = 86;
const MEM_MID = (MEM_TOP + MEM_BOT) / 2;
const H_TOP = 34;
const H_BOT = 94;

export type CycleVariant = "inactive" | "binding" | "activation" | "signaling";

const C = {
  tm: "var(--color-helix)",
  extra: "var(--color-class-b1)",
  intra: "var(--color-plasma-bright)",
  gA: "var(--color-plasma)",
  gB: "var(--color-class-b1)",
  gG: "var(--color-class-c)",
  ligand: "#fb923c", // orange — distinct from the teal receptor
  phos: "var(--color-class-c)",
};

// Seven helices, centred; a small outward stagger when activated.
const BASE_HX = [40, 60, 80, 100, 120, 140, 160];
const SPREAD_HX = [36, 57, 78, 100, 122, 143, 164];

export function MiniReceptor({ variant }: { variant: CycleVariant }) {
  const spread = variant === "activation" || variant === "signaling";
  const dissociated = variant === "signaling";
  const hx = spread ? SPREAD_HX : BASE_HX;
  const pocketX = hx[3];

  return (
    <svg viewBox="0 0 220 168" className="w-full">
      <defs>
        <linearGradient id="miniTm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-helix-deep)" />
          <stop offset="45%" stopColor="var(--color-helix)" />
          <stop offset="100%" stopColor="var(--color-helix-bright)" />
        </linearGradient>
      </defs>

      {/* membrane */}
      <rect x="0" y={MEM_TOP} width="220" height={MEM_BOT - MEM_TOP} fill="color-mix(in oklab, var(--color-surface-3) 45%, transparent)" />
      {Array.from({ length: 22 }, (_, i) => 6 + i * 9.6).map((x, i) => (
        <g key={i} opacity="0.4">
          <circle cx={x} cy={MEM_TOP + 3} r="2.2" fill="var(--color-line-bright)" />
          <circle cx={x} cy={MEM_BOT - 3} r="2.2" fill="var(--color-line-bright)" />
        </g>
      ))}

      {/* intracellular loops */}
      <g fill="none" stroke={C.intra} strokeWidth="2.2" strokeLinecap="round">
        <path d={`M${hx[1]},${H_BOT} Q${(hx[1] + hx[2]) / 2},${H_BOT + 11} ${hx[2]},${H_BOT}`} />
        <path d={`M${hx[3]},${H_BOT} Q${(hx[3] + hx[4]) / 2},${H_BOT + 11} ${hx[4]},${H_BOT}`} />
      </g>
      {/* extracellular loops */}
      <g fill="none" stroke={C.extra} strokeWidth="2.2" strokeLinecap="round">
        <path d={`M${hx[0]},${H_TOP} Q${(hx[0] + hx[1]) / 2},${H_TOP - 11} ${hx[1]},${H_TOP}`} />
        <path d={`M${hx[2]},${H_TOP} Q${(hx[2] + hx[3]) / 2},${H_TOP - 11} ${hx[3]},${H_TOP}`} />
        <path d={`M${hx[4]},${H_TOP} Q${(hx[4] + hx[5]) / 2},${H_TOP - 11} ${hx[5]},${H_TOP}`} />
      </g>

      {/* seven helices */}
      {hx.map((x, i) => (
        <g key={i}>
          <rect x={x - 7} y={H_TOP} width="14" height={H_BOT - H_TOP} rx="4.5" fill="url(#miniTm)" stroke="var(--color-helix-deep)" strokeWidth="0.6" />
          <ellipse cx={x} cy={H_TOP} rx="7" ry="2.4" fill="var(--color-helix-bright)" />
        </g>
      ))}

      {/* conformational-spread arrows */}
      {spread && (
        <g stroke={C.intra} strokeWidth="1.4" fill="none" opacity="0.8">
          <path d={`M${hx[0] - 5},${MEM_MID} l-9,0 m3,-3 l-3,3 l3,3`} />
          <path d={`M${hx[6] + 5},${MEM_MID} l9,0 m-3,-3 l3,3 l-3,3`} />
        </g>
      )}

      {/* ligand (orange) */}
      {variant === "binding" && (
        <>
          <path d={`M${pocketX + 30},16 Q${pocketX + 18},16 ${pocketX + 5},30`} fill="none" stroke="var(--color-ink-faint)" strokeWidth="1.3" markerEnd="url(#mArrow)" />
          <circle cx={pocketX + 32} cy="14" r="5" fill={C.ligand} />
          <circle cx={pocketX} cy={MEM_MID - 2} r="5" fill={C.ligand} opacity="0.35" />
        </>
      )}
      {(variant === "activation" || variant === "signaling") && (
        <circle cx={pocketX} cy={MEM_MID - 2} r="5.5" fill={C.ligand} />
      )}

      {/* G protein — always on the intracellular (bottom) side */}
      {!dissociated ? (
        <g>
          <circle cx="120" cy={H_BOT + 26} r="11" fill={C.gB} />
          <text x="120" y={H_BOT + 30} textAnchor="middle" style={sub(9)}>β</text>
          <circle cx="128" cy={H_BOT + 44} r="8" fill={C.gG} />
          <text x="128" y={H_BOT + 47} textAnchor="middle" style={sub(8)}>γ</text>
          <circle cx="94" cy={H_BOT + 34} r="17" fill={C.gA} />
          <text x="94" y={H_BOT + 31} textAnchor="middle" style={sub(11)}>α</text>
          <text x="94" y={H_BOT + 44} textAnchor="middle" style={sub(8, "var(--color-void)")}>GDP</text>
        </g>
      ) : (
        <g>
          {/* βγ stays near the receptor, below the membrane */}
          <circle cx="132" cy={H_BOT + 24} r="11" fill={C.gB} />
          <text x="132" y={H_BOT + 28} textAnchor="middle" style={sub(9)}>β</text>
          <circle cx="140" cy={H_BOT + 42} r="8" fill={C.gG} />
          <text x="140" y={H_BOT + 45} textAnchor="middle" style={sub(8)}>γ</text>
          {/* Gα-GTP dissociates, still on the intracellular side */}
          <g transform={`translate(74, ${H_BOT + 42})`}>
            {starBurst(0, 0)}
            <circle cx="0" cy="0" r="17" fill={C.gA} />
            <text x="0" y="-3" textAnchor="middle" style={sub(11)}>α</text>
            <text x="0" y="9" textAnchor="middle" style={sub(8, "var(--color-void)")}>GTP</text>
          </g>
        </g>
      )}

      {/* phosphorylated C-terminal tail */}
      {variant === "signaling" && (
        <g>
          <path d={`M${hx[6]},${H_BOT} Q${hx[6] + 22},${H_BOT + 18} ${hx[6] + 38},${H_BOT + 32}`} fill="none" stroke={C.intra} strokeWidth="2" strokeLinecap="round" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <circle cx={hx[6] + 18 + i * 11} cy={H_BOT + 18 + i * 7} r="4.5" fill={C.phos} />
              <text x={hx[6] + 18 + i * 11} y={H_BOT + 21 + i * 7} textAnchor="middle" style={sub(6.5, "var(--color-void)")}>P</text>
            </g>
          ))}
        </g>
      )}

      <defs>
        <marker id="mArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="var(--color-ink-faint)" />
        </marker>
      </defs>
    </svg>
  );
}

function starBurst(cx: number, cy: number) {
  const spikes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `M${cx + Math.cos(a) * 20},${cy + Math.sin(a) * 20} L${cx + Math.cos(a) * 27},${cy + Math.sin(a) * 27}`;
  }).join(" ");
  return <path d={spikes} stroke="var(--color-class-c)" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />;
}

function sub(size: number, fill = "white"): React.CSSProperties {
  return { fontSize: size, fontWeight: 700, fill };
}
