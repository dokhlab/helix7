/**
 * Fuzzy receptor search and non-GPCR guidance (ported from dokhlab/helix7
 * fb63f66 "Add fuzzy search and non-GPCR guidance", Mongo → MariaDB).
 *
 * Pure functions with no database access, so the client (tree search) can use
 * `nonGpcrNote` too; `data.ts` builds the index from SQL and calls `rankReceptors`.
 */

const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta",
  η: "eta", θ: "theta", ι: "iota", κ: "kappa", λ: "lambda", μ: "mu", ν: "nu",
  ξ: "xi", ο: "omicron", π: "pi", ρ: "rho", σ: "sigma", ς: "sigma", τ: "tau",
  υ: "upsilon", φ: "phi", χ: "chi", ψ: "psi", ω: "omega",
};

/** Keep query normalisation identical to etl/s10_synonyms.py. */
export function normalizeSearch(value: string): string {
  if (!value) return "";
  let normalized = "";
  for (const ch of value.normalize("NFKC")) {
    normalized += GREEK[ch] ?? GREEK[ch.toLowerCase()] ?? ch;
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Fuzzy in-memory search ------------------------------------------------
// The GPCRome is small (805 receptors), so every receptor is scored against the
// query. This gives typo tolerance and partial/variant matching that a
// LIKE/full-text query cannot.

export interface SearchDoc {
  _id: string;
  gene: string;
  name: string;
  classCode: string;
  tdl?: string;
  score: number;
  geneLc: string;
  condensed: string;
  tokens: string[];
}

export function makeSearchDoc(r: {
  id: string;
  gene: string;
  name: string;
  classCode: string;
  tdl?: string;
  devScore?: number | null;
  searchNorm?: string | null;
  searchCondensed?: string | null;
}): SearchDoc {
  const norm = r.searchNorm || normalizeSearch(`${r.name ?? ""} ${r.gene ?? ""}`);
  return {
    _id: r.id,
    gene: r.gene,
    name: r.name,
    classCode: r.classCode,
    tdl: r.tdl,
    score: r.devScore ?? 0,
    geneLc: (r.gene ?? "").toLowerCase(),
    condensed: r.searchCondensed || norm.replace(/ /g, ""),
    tokens: norm.split(" ").filter(Boolean),
  };
}

/** Colloquial ligand/receptor names → the terms UniProt/GPCRdb actually use. */
const QUERY_EXPAND: Record<string, string[]> = {
  adrenaline: ["adrenergic", "adrenoceptor"],
  epinephrine: ["adrenergic", "adrenoceptor"],
  noradrenaline: ["adrenergic", "adrenoceptor"],
  norepinephrine: ["adrenergic", "adrenoceptor"],
  acetylcholine: ["muscarinic", "cholinergic"],
  serotonin: ["hydroxytryptamine", "ht"],
  cannabis: ["cannabinoid"],
  marijuana: ["cannabinoid"],
  weed: ["cannabinoid"],
  thc: ["cannabinoid"],
  opiate: ["opioid"],
  morphine: ["opioid"],
  melatonin: ["melatonin"],
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Similarity of a query token to a receptor token, 0..1 (1 = exact/prefix). */
function tokenSim(q: string, t: string): number {
  if (t === q) return 1;
  if (q.length <= 2) return 0; // 2-char tokens (e.g. "2a") must match exactly
  if (t.startsWith(q)) return 0.92;
  if (q.length >= 3 && t.includes(q)) return 0.78;
  if (q.length >= 4 && q.startsWith(t) && t.length >= 3) return 0.72;
  // Edit-distance fuzzing (typos) only for longer tokens — a single edit on a
  // 3–4 char token is too loose and matches unrelated genes.
  if (q.length < 5 || t.length < 4) return 0;
  return 1 - levenshtein(q, t) / Math.max(q.length, t.length);
}

function scoreDoc(doc: SearchDoc, groups: string[][], qCond: string): number {
  let score = 0;
  if (qCond.length >= 2) {
    if (doc.geneLc === qCond) score += 1000;
    else if (doc.geneLc.startsWith(qCond)) score += 500;
    else if (qCond.length >= 3 && doc.geneLc.includes(qCond)) score += 160;
  }
  if (qCond.length >= 3 && doc.condensed.includes(qCond)) score += 220;

  let matched = 0;
  for (const alts of groups) {
    let best = 0;
    for (const qt of alts) {
      if (qt.length < 2) continue;
      for (const rt of doc.tokens) {
        const s = tokenSim(qt, rt);
        if (s > best) best = s;
        if (best === 1) break;
      }
      if (best === 1) break;
    }
    if (best >= 0.7) {
      score += best * 100;
      matched++;
    } else if (best >= 0.55) {
      score += best * 35;
    }
  }
  // A result must actually match at least one query word well; otherwise a bare
  // condensed-substring coincidence (e.g. "5ht3" grazing an olfactory gene)
  // would leak weak, confusing hits.
  if (matched === 0) return 0;
  if (groups.length) score *= 0.35 + 0.65 * (matched / groups.length);
  score += Math.min(doc.score, 100) * 0.01; // dev-interest tiebreak
  return score;
}

/** Best receptors for a free-text query, typo-tolerant. */
export function rankReceptors(index: SearchDoc[], term: string, limit = 10): SearchDoc[] {
  const norm = normalizeSearch(term);
  if (!norm) return [];
  const qCond = norm.replace(/ /g, "");
  // Each query word becomes a group of accepted alternatives (self + synonyms).
  const groups = norm
    .split(" ")
    .filter(Boolean)
    .map((w) => [w, ...(QUERY_EXPAND[w] ?? [])]);
  return index
    .map((d) => ({ d, s: scoreDoc(d, groups, qCond) }))
    .filter((x) => x.s >= 50)
    .sort((a, b) => b.s - a.s || b.d.score - a.d.score)
    .slice(0, limit)
    .map(({ d }) => d);
}

// --- Non-GPCR namesakes ----------------------------------------------------
// The atlas is the GPCRome, so ionotropic receptors that share a ligand with a
// GPCR (5-HT3, nicotinic ACh, GABA-A, NMDA/AMPA…) are legitimately absent. When
// a query looks like one of these, explain why and point to the GPCR relatives.

const NON_GPCR_NOTES: { test: RegExp; note: string }[] = [
  {
    test: /(5ht3|htr3|serotonin3)/,
    note:
      "The 5-HT₃ receptor is a ligand-gated ion channel (Cys-loop family), not a GPCR, so it isn't part of the GPCRome. The other serotonin receptors — 5-HT₁, 5-HT₂, 5-HT₄, 5-HT₅, 5-HT₆ and 5-HT₇ — are all GPCRs and are included.",
  },
  {
    test: /(nicotinic|nachr|chrn[ab]|chrng|chrnd|chrne)/,
    note:
      "Nicotinic acetylcholine receptors are ligand-gated ion channels, not GPCRs. The muscarinic acetylcholine receptors (CHRM1–CHRM5) are the GPCRs — search “muscarinic”.",
  },
  {
    test: /(gabaa|gabra|gabrb|gabrg|gabac|gabrr)/,
    note:
      "GABA-A / GABA-C receptors are ligand-gated chloride channels, not GPCRs. GABA-B (GABBR1/GABBR2) is the metabotropic GPCR and is included — search “GABA-B”.",
  },
  {
    test: /(nmda|grin\d|ampa|gria\d|glur|kainate|grik\d|ionotropicglutamate)/,
    note:
      "NMDA, AMPA and kainate receptors are ionotropic glutamate channels, not GPCRs. The metabotropic glutamate receptors (mGlu / GRM1–GRM8) are the GPCRs — search “metabotropic glutamate”.",
  },
  {
    test: /(glycinereceptor|glra\d|glrb)/,
    note: "Glycine receptors are ligand-gated chloride channels, not GPCRs, so they aren't part of the GPCRome.",
  },
  {
    test: /(p2x|p2rx\d)/,
    note:
      "P2X receptors are ATP-gated ion channels, not GPCRs. The P2Y receptors (P2RY…) are the GPCRs and are included — search “P2Y”.",
  },
];

/** An explanatory note when the query names a non-GPCR receptor, else null. */
export function nonGpcrNote(term: string): string | null {
  const condensed = normalizeSearch(term).replace(/ /g, "");
  if (condensed.length < 3) return null;
  for (const { test, note } of NON_GPCR_NOTES) {
    if (test.test(condensed)) return note;
  }
  return null;
}
