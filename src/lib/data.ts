import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "./mongo";
import type { Bioactivity, GlobalStats, Receptor, TreeNode } from "./types";
import { makeSearchDoc, normalizeSearch, rankReceptors, type SearchDoc } from "./fuzzySearch";

// mysql2's generic execute overload varies between driver minor versions.
// Keep the typed row shapes local while using the stable runtime API.
const sqlPool: any = pool;

type ReceptorRow = RowDataPacket & {
  id: string;
  gene: string;
  name: string;
  name_html: string;
  uniprot: string;
  class_code: string;
  class_name: string;
  grafs: string;
  family: string | null;
  family_slug: string | null;
  is_olfactory: number;
  is_orphan: number;
  structure_count: number;
  has_experimental_structure: number;
  ligand_count: number | null;
  approved_drug_count: number | null;
  organ_systems_json: string | null;
  disease_count: number | null;
  dev_score: number | null;
  dev_tdl: string | null;
  payload_json: string;
};

type BioactivityRow = RowDataPacket & { payload_json: string };

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Normalisation and fuzzy scoring live in fuzzySearch.ts (pure, also used client-side).
export { normalizeSearch };
export { nonGpcrNote } from "./fuzzySearch";

function booleanSearch(value: string): string {
  return normalizeSearch(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => `+${token}*`)
    .join(" ");
}

function toListItem(row: ReceptorRow): ReceptorListItem {
  return {
    _id: row.id,
    gene: row.gene,
    name: row.name,
    nameHtml: row.name_html,
    uniprot: row.uniprot,
    classification: {
      classCode: row.class_code,
      class: row.class_name,
      grafs: row.grafs,
      ...(row.family ? { family: row.family } : {}),
      ...(row.family_slug ? { familySlug: row.family_slug } : {}),
    },
    isOlfactory: Boolean(row.is_olfactory),
    isOrphan: Boolean(row.is_orphan),
    structureCount: row.structure_count,
    hasExperimentalStructure: Boolean(row.has_experimental_structure),
    ligandCount: row.ligand_count ?? undefined,
    approvedDrugCount: row.approved_drug_count ?? undefined,
    organSystems: parseJson<string[]>(row.organ_systems_json, []),
    diseaseCount: row.disease_count ?? undefined,
    ...(row.dev_score == null
      ? {}
      : { devInterest: { score: Number(row.dev_score), tdl: row.dev_tdl ?? "Unknown" } }),
  };
}

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

export async function listReceptors(q: ReceptorQuery = {}): Promise<ReceptorListResult> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (q.classCode) { where.push("class_code = ?"); params.push(q.classCode); }
  if (q.grafs) { where.push("grafs = ?"); params.push(q.grafs); }
  if (q.tdl) { where.push("dev_tdl = ?"); params.push(q.tdl); }
  if (q.organSystem) {
    where.push("JSON_CONTAINS(organ_systems_json, JSON_QUOTE(?))");
    params.push(q.organSystem);
  }
  if (q.hasStructure) where.push("has_experimental_structure = 1");
  if (q.orphanOnly) where.push("is_orphan = 1");
  // O1/O2 are the human odorant classes themselves; do not let the default
  // non-olfactory filter hide them when a class filter is selected.
  const olfactoryClass = q.classCode === "O1" || q.classCode === "O2";
  if (!q.includeOlfactory && !olfactoryClass) where.push("is_olfactory = 0");
  if (q.search) {
    const normalized = normalizeSearch(q.search);
    const condensed = normalized.replace(/ /g, "");
    const fullText = booleanSearch(q.search) || q.search;
    where.push(`(
      gene LIKE CONCAT(?, '%')
      OR MATCH(gene, name, gene_synonyms_text, search_terms_text, search_norm, uniprot)
         AGAINST (? IN BOOLEAN MODE)
      OR search_norm LIKE CONCAT('%', ?, '%')
      OR search_condensed LIKE CONCAT('%', ?, '%')
    )`);
    params.push(q.search, fullText, normalized, condensed);
  }

  const sortMap = {
    score: "dev_score DESC",
    gene: "gene ASC",
    structures: "structure_count DESC",
    ligands: "ligand_count DESC",
  } as const;
  const orderBy = sortMap[q.sort ?? "score"] ?? sortMap.score;
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await sqlPool.execute(
    `SELECT id, gene, name, name_html, uniprot, class_code, class_name, grafs,
            family, family_slug, is_olfactory, is_orphan, structure_count,
            has_experimental_structure, ligand_count, approved_drug_count,
            organ_systems_json, disease_count, dev_score, dev_tdl, payload_json
       FROM receptors ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  const [countRows] = await sqlPool.execute(
    `SELECT COUNT(*) AS total FROM receptors ${whereSql}`,
    params,
  );

  return {
    items: rows.map(toListItem),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function getReceptor(id: string): Promise<Receptor | null> {
  const [rows] = await sqlPool.execute(
    "SELECT payload_json FROM receptors WHERE id = ? LIMIT 1",
    [id.toLowerCase()],
  );
  return rows[0] ? parseJson<Receptor>((rows[0] as { payload_json: string }).payload_json, null as never) : null;
}

export interface BioactivityGroup {
  action: string;
  count: number;
  items: Bioactivity[];
}

export async function getBioactivities(
  receptorId: string,
  limit = 5000,
): Promise<{ groups: BioactivityGroup[]; total: number }> {
  const [rows] = await sqlPool.execute(
    `SELECT payload_json FROM bioactivities
      WHERE receptor_id = ? ORDER BY p_value DESC LIMIT ?`,
    [receptorId, Math.min(5000, Math.max(1, limit))],
  );
  const [countRows] = await sqlPool.execute(
    "SELECT COUNT(*) AS total FROM bioactivities WHERE receptor_id = ?",
    [receptorId],
  );
  const byAction = new Map<string, Bioactivity[]>();
  for (const row of rows) {
    const item = parseJson<Bioactivity>(row.payload_json, null as never);
    if (!item) continue;
    const list = byAction.get(item.action) ?? [];
    list.push(item);
    byAction.set(item.action, list);
  }
  const groups = [...byAction.entries()]
    .map(([action, items]) => ({ action, count: items.length, items }))
    .sort((a, b) => b.count - a.count);
  return { groups, total: Number(countRows[0]?.total ?? 0) };
}

export async function getTree(): Promise<TreeNode | null> {
  const [rows] = await sqlPool.execute(
    "SELECT payload_json FROM singleton_json WHERE id = 'tree' LIMIT 1",
  );
  return rows[0] ? parseJson<TreeNode>((rows[0] as { payload_json: string }).payload_json, null as never) : null;
}

export interface TreeSearchEntry {
  /** Previous/alias gene symbols (payload.geneSynonyms; gene_synonyms_text also holds name words and accessions). */
  aliases: string[];
  /** Normalised name words: UniProt/IUPHAR names and synonyms ("mu opioid", "dopamine d2", "serotonin"). */
  terms: string;
}

/** Per-receptor search vocabulary for the tree's gene/name search, keyed by receptor id. */
export async function getTreeSearchIndex(): Promise<Record<string, TreeSearchEntry>> {
  try {
    const [rows] = await sqlPool.execute(
      "SELECT id, JSON_EXTRACT(payload_json, '$.geneSynonyms') AS syn, search_norm FROM receptors",
    );
    const out: Record<string, TreeSearchEntry> = {};
    for (const row of rows as { id: string; syn: string | string[] | null; search_norm: string | null }[]) {
      const syn = typeof row.syn === "string" ? parseJson<string[]>(row.syn, []) : row.syn;
      out[row.id] = {
        aliases: Array.isArray(syn) ? syn.filter((s) => typeof s === "string" && s) : [],
        terms: row.search_norm ?? "",
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function getStats(): Promise<GlobalStats | null> {
  const [rows] = await sqlPool.execute(
    "SELECT payload_json FROM singleton_json WHERE id = 'stats' LIMIT 1",
  );
  return rows[0] ? parseJson<GlobalStats>((rows[0] as { payload_json: string }).payload_json, null as never) : null;
}

export interface DatasetMeta {
  lastUpdated?: string;
  lastStatus?: string;
  lastDurationSec?: number;
  counts?: Record<string, number>;
  sources?: string[];
  history?: { startedAt: string; finishedAt: string; durationSec: number; status: string; counts: Record<string, number> }[];
}

export async function getMeta(): Promise<DatasetMeta | null> {
  try {
    const [rows] = await sqlPool.execute(
      "SELECT payload_json FROM dataset_meta WHERE id = 'dataset' LIMIT 1",
    );
    return rows[0] ? parseJson<DatasetMeta>((rows[0] as { payload_json: string }).payload_json, null as never) : null;
  } catch {
    return null;
  }
}

export async function getTopReceptors(limit = 8): Promise<ReceptorListItem[]> {
  return (await listReceptors({ sort: "score", pageSize: limit })).items;
}

export interface SearchHit {
  _id: string;
  gene: string;
  name: string;
  classCode: string;
  tdl?: string;
}

let searchIndex: SearchDoc[] | null = null;
let searchIndexAt = 0;
const SEARCH_INDEX_TTL = 5 * 60 * 1000;

/** All 805 receptors' search vocabulary, cached in memory for fuzzy scoring. */
async function getSearchIndex(): Promise<SearchDoc[]> {
  if (searchIndex && Date.now() - searchIndexAt < SEARCH_INDEX_TTL) return searchIndex;
  const [rows] = await sqlPool.execute(
    "SELECT id, gene, name, class_code, dev_tdl, dev_score, search_norm, search_condensed FROM receptors",
  );
  searchIndex = (rows as (ReceptorRow & { search_norm: string | null; search_condensed: string | null })[]).map(
    (row) =>
      makeSearchDoc({
        id: row.id,
        gene: row.gene,
        name: row.name,
        classCode: row.class_code ?? "",
        tdl: row.dev_tdl ?? undefined,
        devScore: row.dev_score == null ? null : Number(row.dev_score),
        searchNorm: row.search_norm,
        searchCondensed: row.search_condensed,
      }),
  );
  searchIndexAt = Date.now();
  return searchIndex;
}

export async function searchReceptors(term: string, limit = 10): Promise<SearchHit[]> {
  if (!normalizeSearch(term)) return [];
  const index = await getSearchIndex();
  return rankReceptors(index, term, Math.min(50, Math.max(1, limit))).map((d) => ({
    _id: d._id,
    gene: d.gene,
    name: d.name,
    classCode: d.classCode,
    tdl: d.tdl,
  }));
}
