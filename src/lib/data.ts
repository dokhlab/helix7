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
  if (!q.includeOlfactory) filter.isOlfactory = false;
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

export async function searchReceptors(
  term: string,
  limit = 10,
): Promise<SearchHit[]> {
  const t = term.trim();
  if (!t) return [];
  const db = await getDb();
  const coll = db.collection<Receptor>("receptors");

  // Prefer a fast prefix match on the gene symbol, then fall back to full text.
  const prefix = await coll
    .find(
      { gene: { $regex: `^${escapeRegex(t)}`, $options: "i" } },
      { projection: { gene: 1, name: 1, "classification.classCode": 1, "devInterest.tdl": 1 } },
    )
    .limit(limit)
    .toArray();

  let hits = prefix;
  if (hits.length < limit) {
    const text = await coll
      .find(
        { $text: { $search: t } },
        {
          projection: {
            gene: 1,
            name: 1,
            "classification.classCode": 1,
            "devInterest.tdl": 1,
            score: { $meta: "textScore" },
          },
        },
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .toArray();
    const seen = new Set(hits.map((h) => h._id));
    hits = [...hits, ...text.filter((h) => !seen.has(h._id))].slice(0, limit);
  }

  return hits.map((h) => ({
    _id: h._id,
    gene: h.gene,
    name: h.name,
    classCode: h.classification?.classCode ?? "",
    tdl: h.devInterest?.tdl,
  }));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip Mongo/BSON internals so results are plain JSON for the client. */
function sanitize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}
