import { SectionTitle } from "@/components/ui";

/**
 * Explains the GPCR-specific generic residue-numbering conventions
 * (Ballesteros–Weinstein for class A, the GPCRdb structure-based scheme, and the
 * class-specific systems), with a visual decoder and the conserved anchors.
 */

// Most-conserved (".50") anchor per transmembrane helix, class A.
const ANCHORS = [
  { bw: "1.50", res: "Asn (N)", note: "Anchor of TM1" },
  { bw: "2.50", res: "Asp (D)", note: "Sodium-pocket aspartate" },
  { bw: "3.50", res: "Arg (R)", note: "Arginine of the D[E]RY motif" },
  { bw: "4.50", res: "Trp (W)", note: "Buried tryptophan of TM4" },
  { bw: "5.50", res: "Pro (P)", note: "Proline kink in TM5" },
  { bw: "6.50", res: "Pro (P)", note: "Proline of the CWxP motif" },
  { bw: "7.50", res: "Pro (P)", note: "Proline of the NPxxY motif" },
];

const SCHEMES = [
  { cls: "A", name: "Ballesteros–Weinstein", grafs: "Rhodopsin" },
  { cls: "B", name: "Wootten", grafs: "Secretin / Adhesion" },
  { cls: "C", name: "Pin", grafs: "Glutamate" },
  { cls: "F", name: "Wang", grafs: "Frizzled" },
];

export function ResidueNumbering() {
  return (
    <section className="mt-10">
      <SectionTitle eyebrow="Notation" title="GPCR residue numbering" />
      <p className="mb-5 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
        GPCRs of the same class share a common seven-helix fold but differ widely
        in length, so a raw sequence position (e.g. &ldquo;Arg135&rdquo;) means
        something different in every receptor. To talk about{" "}
        <em>equivalent</em> positions across the family, GPCR pharmacology uses a{" "}
        <strong className="text-[var(--color-ink)]">generic residue-numbering</strong>{" "}
        scheme that indexes a residue by its transmembrane helix and its position
        relative to the most conserved residue in that helix.
      </p>

      {/* Ballesteros–Weinstein decoder */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="panel p-5">
          <div className="mono-label mb-3">Ballesteros–Weinstein (class A)</div>

          {/* the format decoder */}
          <div className="flex items-center justify-center gap-2 py-3">
            <NumBlock value="3" label="TM helix" color="var(--color-helix)" />
            <span className="text-3xl font-bold text-[var(--color-ink-faint)]">.</span>
            <NumBlock value="50" label="position" color="var(--color-plasma-bright)" />
          </div>

          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            The first number is the transmembrane helix (1–7). The second is the
            residue&rsquo;s position within that helix, where the{" "}
            <strong className="text-[var(--color-ink)]">most conserved residue
            is assigned .50</strong>. Positions count down toward the
            N-terminus (…, 3.49, 3.48) and up toward the C-terminus (3.51,
            3.52, …). So <span className="numeric text-[var(--color-ink)]">3.50</span>{" "}
            denotes the conserved arginine of the D[E]RY motif in{" "}
            <em>every</em> class A receptor, whatever its absolute residue number.
          </p>
        </div>

        {/* helix bead diagram */}
        <div className="panel flex items-center justify-center p-4">
          <HelixNumberingDiagram />
        </div>
      </div>

      {/* conserved anchors */}
      <div className="panel mt-4 overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-2.5">
          <span className="mono-label">Conserved .50 anchor residues (class A)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left">
                <th className="mono-label px-4 py-2 font-normal">Position</th>
                <th className="mono-label py-2 font-normal">Residue</th>
                <th className="mono-label px-4 py-2 font-normal">Landmark</th>
              </tr>
            </thead>
            <tbody>
              {ANCHORS.map((a) => (
                <tr key={a.bw} className="border-b border-[var(--color-line)]/50">
                  <td className="numeric px-4 py-2 font-semibold text-[var(--color-helix)]">
                    {a.bw}
                  </td>
                  <td className="py-2 text-[var(--color-ink)]">{a.res}</td>
                  <td className="px-4 py-2 text-[var(--color-ink-muted)]">{a.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPCRdb generic numbering + class schemes */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <h3 className="font-semibold">GPCRdb structure-based numbering</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Real helices contain bulges and constrictions, so the sequence-based
            position can drift out of structural register. GPCRdb therefore adds a
            second, structure-based index — written after an{" "}
            <span className="numeric text-[var(--color-ink)]">x</span>, as in{" "}
            <span className="numeric text-[var(--color-ink)]">3.50x50</span>. The
            part before the <span className="numeric">x</span> is the classic
            (sequence) number; the part after it is aligned to a common structural
            reference, keeping equivalent 3D positions in step even where a helix
            inserts or deletes a residue. Loop residues use an analogous scheme
            keyed to the flanking helices (e.g. ECL2, ICL3).
          </p>
        </div>

        <div className="panel p-5">
          <h3 className="font-semibold">Class-specific schemes</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Each GPCR class has its own historical numbering, all built on the
            same &ldquo;.50 = most conserved&rdquo; idea. GPCRdb unifies them under
            one structure-based generic numbering so positions can be compared
            across classes.
          </p>
          <div className="mt-3 space-y-1.5">
            {SCHEMES.map((s) => (
              <div key={s.cls} className="flex items-center gap-3 text-sm">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-[var(--color-void)]"
                  style={{ background: `var(--color-class-${s.cls.toLowerCase()})` }}
                >
                  {s.cls}
                </span>
                <span className="font-medium text-[var(--color-ink)]">{s.name}</span>
                <span className="ml-auto text-xs text-[var(--color-ink-faint)]">
                  {s.grafs}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-faint)]">
        Helix7 stores GPCRdb generic numbering with each receptor, so a residue
        such as 6.48 (the &ldquo;toggle switch&rdquo; tryptophan) or 3.50 can be
        located in any receptor and compared across the family.
      </p>
    </section>
  );
}

function NumBlock({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="numeric rounded-lg px-4 py-2 text-3xl font-bold"
        style={{
          color,
          background: `color-mix(in oklab, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
        }}
      >
        {value}
      </span>
      <span className="mono-label mt-1.5">{label}</span>
    </div>
  );
}

/** A single TM helix drawn as a bead chain, with the .50 anchor highlighted. */
function HelixNumberingDiagram() {
  const beads = [
    { n: "3.46", y: 24 },
    { n: "3.47", y: 52 },
    { n: "3.48", y: 80 },
    { n: "3.49", y: 108 },
    { n: "3.50", y: 136, anchor: true },
    { n: "3.51", y: 164 },
    { n: "3.52", y: 192 },
    { n: "3.53", y: 220 },
    { n: "3.54", y: 248 },
  ];
  const cx = (y: number) => 70 + 16 * Math.sin((y / 28) * 1.1); // gentle helical sway

  return (
    <svg viewBox="0 0 220 280" className="w-full max-w-[240px]">
      {/* helix backbone */}
      <path
        d={`M${cx(24)},24 ${beads.map((b) => `L${cx(b.y)},${b.y}`).join(" ")}`}
        fill="none"
        stroke="var(--color-helix-deep)"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* direction hints */}
      <text x="150" y="20" style={{ fontSize: 9, fill: "var(--color-ink-faint)" }}>
        ← N-terminus
      </text>
      <text x="150" y="272" style={{ fontSize: 9, fill: "var(--color-ink-faint)" }}>
        → C-terminus
      </text>

      {beads.map((b) => (
        <g key={b.n}>
          <circle
            cx={cx(b.y)}
            cy={b.y}
            r={b.anchor ? 11 : 7}
            fill={b.anchor ? "var(--color-plasma-bright)" : "var(--color-helix)"}
            stroke={b.anchor ? "var(--color-plasma-bright)" : "var(--color-helix-deep)"}
            strokeWidth="1"
          />
          <text
            x={cx(b.y) + (b.anchor ? 20 : 16)}
            y={b.y + 4}
            style={{
              fontSize: b.anchor ? 12 : 10,
              fontWeight: b.anchor ? 700 : 400,
              fill: b.anchor ? "var(--color-plasma-bright)" : "var(--color-ink-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {b.n}
          </text>
        </g>
      ))}
      <text x="12" y="140" style={{ fontSize: 9, fill: "var(--color-ink-faint)" }} transform="rotate(-90 12 140)">
        TM3
      </text>
    </svg>
  );
}
