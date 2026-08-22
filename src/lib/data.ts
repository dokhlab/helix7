import "server-only";
import { getDb } from "./mongo";
import type {
  Bioactivity,
  GlobalStats,
  Receptor,
  TreeNode,
} from "./types";

/** Fields returned for list/table views — omits the heavy sequence + nested arrays. */
const LIST_PROJECTION = {
  gene: 1,
  name: 1,
  nameHtml: 1,
  uniprot: 1,
  "classification.classCode": 1,
  "classification.class": 1,
  "classification.grafs": 1,
  "classification.family": 1,
  "classification.familySlug": 1,
  isOlfactory: 1,
  isOrphan: 1,
  structureCount: 1,
  hasExperimentalStructure: 1,
  ligandCount: 1,
  approvedDrugCount: 1,
  organSystems: 1,
  diseaseCount: 1,
  "devInterest.score": 1,
  "devInterest.tdl": 1,
} as const;

export interface ReceptorListItem {
  _id: string;
  gene: string;
  name: string;
  nameHtml: string;
  uniprot: string;
  classification: {
    classCode: string;
    class: string;
    grafs: string;
    family?: string;
    familySlug?: string;
  };
  isOlfactory: boolean;
  isOrphan?: boolean;
  structureCount: number;
  hasExperimentalStructure: boolean;
  ligandCount?: number;
  approvedDrugCount?: number;
  organSystems?: string[];
  diseaseCount?: number;
  devInterest?: { score: number; tdl: string };
}

export interface ReceptorQuery {
  classCode?: string;
  grafs?: string;
  tdl?: string;
  organSystem?: string;
  hasStructure?: boolean;
  includeOlfactory?: boolean;
  orphanOnly?: boolean;
  search?: string;
  sort?: "score" | "gene" | "structures" | "ligands";
  page?: number;
  pageSize?: number;
}

export interface ReceptorListResult {
  items: ReceptorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listReceptors(
  q: ReceptorQuery = {},
): Promise<ReceptorListResult> {
  const db = await getDb();
  const filter: Record<string, unknown> = {};

  if (q.classCode) filter["classification.classCode"] = q.classCode;
  if (q.grafs) filter["classification.grafs"] = q.grafs;
  if (q.tdl) filter["devInterest.tdl"] = q.tdl;
  if (q.organSystem) filter.organSystems = q.organSystem;
  if (q.hasStructure) filter.hasExperimentalStructure = true;
  if (q.orphanOnly) filter.isOrphan = true;
  // Olfactory receptors are hidden by default, but not when the user has
  // explicitly asked for an olfactory (odorant) class — otherwise the filter
  // would be self-contradictory and always return nothing.
  const olfactoryClass = q.classCode === "O1" || q.classCode === "O2";
  if (!q.includeOlfactory && !olfactoryClass) filter.isOlfactory = false;
  if (q.search) filter.$text = { $search: q.search };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    score: { "devInterest.score": -1 },
    gene: { gene: 1 },
    structures: { structureCount: -1 },
    ligands: { ligandCount: -1 },
  };
  const sort = sortMap[q.sort ?? "score"] ?? sortMap.score;

  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));

  const coll = db.collection<Receptor>("receptors");
  const [items, total] = await Promise.all([
    coll
      .find(filter, { projection: LIST_PROJECTION })
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    coll.countDocuments(filter),
  ]);

  return {
    items: items as unknown as ReceptorListItem[],
    total,
    page,
    pageSize,
  };
}

export async function getReceptor(id: string): Promise<Receptor | null> {
  const db = await getDb();
  const doc = await db
    .collection<Receptor>("receptors")
    .findOne({ _id: id.toLowerCase() });
  return doc ? sanitize(doc) : null;
}

export interface BioactivityGroup {
  action: string;
  count: number;
  items: Bioactivity[];
}

export async function getBioactivities(
  receptorId: string,
  // Load the receptor's full ligand set (the busiest receptor has ~1,400 rows)
  // so the client can search, filter and paginate over everything, and the
  // per-action counts are exact rather than reflecting a truncated sample.
  limit = 5000,
): Promise<{ groups: BioactivityGroup[]; total: number }> {
  const db = await getDb();
  const coll = db.collection<Bioactivity>("bioactivities");
  const total = await coll.countDocuments({ receptorId });
  const rows = await coll
    .find({ receptorId })
    .sort({ pValue: -1 })
    .limit(limit)
    .toArray();

  const byAction = new Map<string, Bioactivity[]>();
  for (const r of rows) {
    const list = byAction.get(r.action) ?? [];
    list.push(sanitize(r));
    byAction.set(r.action, list);
  }

  const groups = [...byAction.entries()]
    .map(([action, items]) => ({ action, count: items.length, items }))
    .sort((a, b) => b.count - a.count);

  return { groups, total };
}

export async function getTree(): Promise<TreeNode | null> {
  const db = await getDb();
  const doc = await db.collection("tree").findOne({ _id: "classification" as never });
  return doc ? (sanitize(doc) as unknown as TreeNode) : null;
}

export async function getStats(): Promise<GlobalStats | null> {
  const db = await getDb();
  const doc = await db.collection("stats").findOne({ _id: "global" as never });
  return doc ? (sanitize(doc) as unknown as GlobalStats) : null;
}

export interface DatasetMeta {
  lastUpdated?: string;
  lastStatus?: string;
  lastDurationSec?: number;
  counts?: Record<string, number>;
  sources?: string[];
  history?: {
    startedAt: string;
    finishedAt: string;
    durationSec: number;
    status: string;
    counts: Record<string, number>;
  }[];
}

/** Dataset refresh metadata written by the scheduled updater. Never throws. */
export async function getMeta(): Promise<DatasetMeta | null> {
  try {
    const db = await getDb();
    const doc = await db.collection("meta").findOne({ _id: "dataset" as never });
    return doc ? (sanitize(doc) as unknown as DatasetMeta) : null;
  } catch {
    return null;
  }
}

export async function getTopReceptors(limit = 8): Promise<ReceptorListItem[]> {
  const { items } = await listReceptors({ sort: "score", pageSize: limit });
  return items;
}

export interface SearchHit {
  _id: string;
  gene: string;
  name: string;
  classCode: string;
  tdl?: string;
}

const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta",
  η: "eta", θ: "theta", ι: "iota", κ: "kappa", λ: "lambda", μ: "mu", ν: "nu",
  ξ: "xi", ο: "omicron", π: "pi", ρ: "rho", σ: "sigma", ς: "sigma", τ: "tau",
  υ: "upsilon", φ: "phi", χ: "chi", ψ: "psi", ω: "omega",
};

/**
 * Normalise a name/query for search: NFKC (flattens subscripts like ₂→2), Greek
 * letters spelled out (β→beta), lowercased, non-alphanumerics collapsed to
 * single spaces. MUST mirror `normalize()` in etl/s10_synonyms.py so the query
 * and the stored `searchNorm` field agree.
 */
export function normalizeSearch(s: string): string {
  if (!s) return "";
  let out = "";
  for (const ch of s.normalize("NFKC")) {
    out += GREEK[ch] ?? GREEK[ch.toLowerCase()] ?? ch;
  }
  return out
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Fuzzy in-memory search index -----------------------------------------
// The GPCRome is small (805 receptors), so we keep a normalised search index in
// memory and score every receptor against the query. This gives typo tolerance
// and partial/variant matching that a plain regex/`$text` query cannot.

interface SearchDoc {
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

let searchIndex: SearchDoc[] | null = null;
let searchIndexAt = 0;
const SEARCH_INDEX_TTL = 5 * 60 * 1000;

async function getSearchIndex(): Promise<SearchDoc[]> {
  if (searchIndex && Date.now() - searchIndexAt < SEARCH_INDEX_TTL) return searchIndex;
  const db = await getDb();
  const rows = await db
    .collection<Receptor>("receptors")
    .find(
      {},
      {
        projection: {
          gene: 1,
          name: 1,
          "classification.classCode": 1,
          "devInterest.tdl": 1,
          "devInterest.score": 1,
          searchNorm: 1,
          searchCondensed: 1,
        },
      },
    )
    .toArray();
  searchIndex = rows.map((r) => {
    const norm = r.searchNorm ?? normalizeSearch(`${r.name ?? ""} ${r.gene ?? ""}`);
    return {
      _id: r._id,
      gene: r.gene,
      name: r.name,
      classCode: r.classification?.classCode ?? "",
      tdl: r.devInterest?.tdl,
      score: r.devInterest?.score ?? 0,
      geneLc: (r.gene ?? "").toLowerCase(),
      condensed: r.searchCondensed ?? norm.replace(/ /g, ""),
      tokens: norm.split(" ").filter(Boolean),
    };
  });
  searchIndexAt = Date.now();
  return searchIndex;
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

export async function searchReceptors(
  term: string,
  limit = 10,
): Promise<SearchHit[]> {
  const norm = normalizeSearch(term);
  if (!norm) return [];
  const qCond = norm.replace(/ /g, "");
  // Each query word becomes a group of accepted alternatives (self + synonyms).
  const groups = norm
    .split(" ")
    .filter(Boolean)
    .map((w) => [w, ...(QUERY_EXPAND[w] ?? [])]);

  const index = await getSearchIndex();
  return index
    .map((d) => ({ d, s: scoreDoc(d, groups, qCond) }))
    .filter((x) => x.s >= 50)
    .sort((a, b) => b.s - a.s || b.d.score - a.d.score)
    .slice(0, limit)
    .map(({ d }) => ({
      _id: d._id,
      gene: d.gene,
      name: d.name,
      classCode: d.classCode,
      tdl: d.tdl,
    }));
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

/** Strip Mongo/BSON internals so results are plain JSON for the client. */
function sanitize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}
