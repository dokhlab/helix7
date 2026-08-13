/**
 * Helix7 data model.
 *
 * One document per receptor in `receptors`, with tightly-coupled data embedded
 * (classification, expression, coupling) and high-cardinality data in separate
 * collections (`bioactivities`, `ligands`, `references`).
 *
 * Every record carries `provenance` so the UI can attribute each value to its
 * source database and satisfy the share-alike licences of GtoPdb / ChEMBL / HPA.
 */

/** GPCRdb top-level class codes. */
export type ClassCode = "A" | "B1" | "B2" | "C" | "D1" | "F" | "T2" | "O1" | "O2" | "Other";

/** Fredriksson GRAFS grouping. Olfactory/taste sit outside the classic five. */
export type GrafsGroup =
  | "Rhodopsin"
  | "Secretin"
  | "Adhesion"
  | "Glutamate"
  | "Frizzled"
  | "Taste2"
  | "Olfactory"
  | "Other";

export type SourceName =
  | "GPCRdb"
  | "UniProt"
  | "GtoPdb"
  | "ChEMBL"
  | "PubChem"
  | "HPA"
  | "OpenTargets"
  | "ClinVar"
  | "gnomAD"
  | "PDB"
  | "AlphaFold"
  | "PubMed"
  | "ClinicalTrials"
  | "Pharos";

export interface Provenance {
  source: SourceName;
  url?: string;
  licence?: string;
  retrievedAt: string; // ISO-8601
}

/* ------------------------------------------------------------------ *
 * Classification
 * ------------------------------------------------------------------ */

export interface Classification {
  /** GPCRdb slug of the top-level class, e.g. "001". */
  classSlug: string;
  /** Human-readable class, e.g. "Class A (Rhodopsin)". */
  class: string;
  classCode: ClassCode;
  grafs: GrafsGroup;
  /** Second level, e.g. "Aminergic receptors". */
  ligandTypeSlug?: string;
  ligandType?: string;
  /** Third level, e.g. "Dopamine receptors". */
  familySlug?: string;
  family?: string;
  /** Full slug of the receptor's own family node, e.g. "001_001_004_002". */
  slug: string;
  /** Ancestry from class down to the receptor's own node. */
  lineage: { slug: string; name: string }[];
}

/* ------------------------------------------------------------------ *
 * Structures
 * ------------------------------------------------------------------ */

export interface StructureLigand {
  name: string;
  type?: string;
  /** GPCRdb annotates the pharmacological role of the bound ligand. */
  function?: string;
  pdbChemId?: string;
  smiles?: string;
}

export interface Structure {
  pdbId: string;
  method?: string;
  resolutionA?: number | null;
  /** Receptor activation state: "Active" | "Inactive" | "Intermediate". */
  state?: string;
  publicationDate?: string;
  publicationUrl?: string;
  preferredChain?: string;
  ligands: StructureLigand[];
}

/* ------------------------------------------------------------------ *
 * Signalling
 * ------------------------------------------------------------------ */

export interface GProteinCoupling {
  /** "Gs" | "Gi/Go" | "Gq/G11" | "G12/G13" */
  family: string;
  primary: boolean;
  source: SourceName;
}

/* ------------------------------------------------------------------ *
 * Expression
 * ------------------------------------------------------------------ */

export interface TissueExpression {
  tissue: string;
  /** Organ system this tissue rolls up into, for the body map. */
  organSystem?: string;
  /** Normalised expression (nTPM from HPA). */
  value: number;
  unit: string;
  source: SourceName;
}

/** HPA single-cell type expression — a complementary, cell-resolution layer. */
export interface SingleCellExpression {
  cellType: string;
  /** Broad grouping (Neural, Immune, Epithelial, …) for colour/interpretation. */
  cellClass?: string;
  /** Normalised expression (nCPM from HPA single-cell). */
  value: number;
  unit: string;
  source: SourceName;
}

/* ------------------------------------------------------------------ *
 * Disease and variation
 * ------------------------------------------------------------------ */

export interface DiseaseAssociation {
  name: string;
  diseaseId?: string; // EFO / MONDO
  /** Open Targets overall association score, 0-1. */
  score?: number;
  therapeuticAreas?: string[];
  source: SourceName;
}

export type ClinicalSignificance =
  | "Pathogenic"
  | "Likely pathogenic"
  | "Uncertain significance"
  | "Likely benign"
  | "Benign"
  | "Conflicting"
  | "Other";

export interface Mutation {
  /** HGVS protein change where available, e.g. "p.Ala215Thr". */
  proteinChange?: string;
  hgvsC?: string;
  rsId?: string;
  clinvarId?: string;
  significance: ClinicalSignificance;
  /** Condition(s) the variant is reported against. */
  conditions: string[];
  /** gnomAD population allele frequency. */
  alleleFrequency?: number | null;
  reviewStatus?: string;
  source: SourceName;
}

/* ------------------------------------------------------------------ *
 * Development-interest score
 * ------------------------------------------------------------------ */

/** Pharos Target Development Level. */
export type Tdl = "Tclin" | "Tchem" | "Tbio" | "Tdark" | "Unknown";

export interface DevInterest {
  /** Composite 0-100. */
  score: number;
  tdl: Tdl;
  components: {
    /** log-scaled PubMed hits — raw counts let a few famous receptors dominate. */
    literature: number;
    clinicalTrials: number;
    ligands: number;
    structures: number;
    approvedDrugs: number;
  };
  raw: {
    citationCount: number;
    trialCount: number;
    ligandCount: number;
    structureCount: number;
    approvedDrugCount: number;
  };
  computedAt: string;
}

/* ------------------------------------------------------------------ *
 * Receptor — the core document
 * ------------------------------------------------------------------ */

export interface Receptor {
  /** GPCRdb entry name, e.g. "drd2_human". Used as the Mongo _id and URL slug. */
  _id: string;
  entryName: string;
  gene: string;
  geneSynonyms: string[];
  uniprot: string;
  /** Display name with HTML subscripts stripped, e.g. "D2 receptor". */
  name: string;
  /** GPCRdb name retaining <sub> markup. */
  nameHtml: string;
  sequence: string;
  seqLength: number;
  classification: Classification;
  /** Olfactory and taste receptors have sparse pharmacology; flag for the UI. */
  isOlfactory: boolean;
  isSensory: boolean;
  /** GPCRdb orphan family — no known endogenous ligand. */
  isOrphan: boolean;
  structures: Structure[];
  structureCount: number;
  hasExperimentalStructure: boolean;
  /** AlphaFold model URL, always present as a fallback for the 3D viewer. */
  alphafoldUrl?: string;
  gProteinCoupling: GProteinCoupling[];
  expression: TissueExpression[];
  singleCell?: SingleCellExpression[];
  organSystems: string[];
  diseases: DiseaseAssociation[];
  mutations: Mutation[];
  devInterest?: DevInterest;
  /** PubMed IDs for the curated key-reference library. */
  keyReferences: string[];
  provenance: Provenance[];
  updatedAt: string;

  /* Rollups added by enrichment stages. */
  ensemblId?: string;
  ligandCount?: number;
  approvedDrugCount?: number;
  approvedDrugs?: string[];
  diseaseCount?: number;
  therapeuticAreas?: string[];
  tractability?: { modality?: string; bucket?: string }[];
}

/* ------------------------------------------------------------------ *
 * Ligands and assay data
 * ------------------------------------------------------------------ */

export type LigandAction =
  | "Agonist"
  | "Partial agonist"
  | "Antagonist"
  | "Inverse agonist"
  | "Allosteric modulator"
  | "Positive allosteric modulator"
  | "Negative allosteric modulator"
  | "Unknown";

export interface Ligand {
  _id: string; // ChEMBL id or GtoPdb id
  name: string;
  smiles?: string;
  inchiKey?: string;
  chemblId?: string;
  gtopdbId?: string;
  /** Highest clinical phase reached, 0-4. */
  maxPhase?: number | null;
  isApprovedDrug: boolean;
  source: SourceName;
}

export type AssayType = "Ki" | "IC50" | "EC50" | "Kd" | "pA2" | "Other";

export interface Bioactivity {
  _id?: string;
  /** Joins to Receptor._id. */
  receptorId: string;
  receptorUniprot: string;
  ligandId: string;
  ligandName: string;
  action: LigandAction;
  actionRaw?: string;
  assayType: AssayType;
  isApprovedDrug?: boolean;
  isEndogenous?: boolean;
  isPrimaryTarget?: boolean;
  selectivity?: string | null;
  /** Normalised to nanomolar. */
  valueNm: number | null;
  /** -log10(M), the standard comparable potency scale. */
  pValue?: number | null;
  relation?: string; // "=", ">", "<"
  assayDescription?: string;
  /** PubMed ID of the paper the measurement came from. */
  referencePmid?: string;
  referenceDoi?: string;
  source: SourceName;
}

export interface Reference {
  _id: string; // PMID
  pmid: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  doi?: string;
  /** Receptor ids this reference is cited for. */
  receptorIds: string[];
}

/* ------------------------------------------------------------------ *
 * Precomputed aggregates
 * ------------------------------------------------------------------ */

/** A node in the classification/phylogeny tree, precomputed for the viz. */
export interface TreeNode {
  slug: string;
  name: string;
  classCode?: ClassCode;
  grafs?: GrafsGroup;
  /** Present only on leaves. */
  receptorId?: string;
  gene?: string;
  devScore?: number;
  children?: TreeNode[];
}

export interface GlobalStats {
  _id: string;
  receptorCount: number;
  nonOlfactoryCount: number;
  olfactoryCount: number;
  orphanCount: number;
  structureCount: number;
  receptorsWithStructure: number;
  receptorsWithLigands?: number;
  receptorsWithExpression?: number;
  ligandCount: number;
  approvedDrugCount: number;
  bioactivityCount: number;
  quantitativeAssayCount?: number;
  referencedAssayCount?: number;
  diseaseCount: number;
  byClass: { classCode: ClassCode; label: string; count: number }[];
  byTdl?: Record<string, number>;
  computedAt: string;
}

export const COLLECTIONS = {
  receptors: "receptors",
  ligands: "ligands",
  bioactivities: "bioactivities",
  references: "references",
  tree: "tree",
  stats: "stats",
} as const;
