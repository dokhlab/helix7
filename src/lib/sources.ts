import type { SourceName } from "./types";

/**
 * Single source of truth for data provenance and licensing.
 *
 * Every dataset Helix7 redistributes is registered here with its licence, the
 * required attribution, and the primary citation. This drives the /docs/licenses
 * page, per-record attribution in the UI, and satisfies the share-alike terms of
 * the CC BY-SA sources by keeping attribution visible wherever their data appears.
 */

export type LicenseId =
  | "CC BY 4.0"
  | "CC BY-SA 4.0"
  | "CC0 1.0"
  | "CC BY-NC-SA 4.0"
  | "Public domain";

export interface LicenseInfo {
  id: LicenseId;
  name: string;
  url: string;
  /** Does the licence require derivative works to share alike? */
  shareAlike: boolean;
  /** Does it require attribution? */
  attribution: boolean;
}

export const LICENSES: Record<LicenseId, LicenseInfo> = {
  "CC BY 4.0": {
    id: "CC BY 4.0",
    name: "Creative Commons Attribution 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    shareAlike: false,
    attribution: true,
  },
  "CC BY-SA 4.0": {
    id: "CC BY-SA 4.0",
    name: "Creative Commons Attribution-ShareAlike 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    shareAlike: true,
    attribution: true,
  },
  "CC BY-NC-SA 4.0": {
    id: "CC BY-NC-SA 4.0",
    name: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    shareAlike: true,
    attribution: true,
  },
  "CC0 1.0": {
    id: "CC0 1.0",
    name: "Creative Commons Zero (public domain dedication)",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    shareAlike: false,
    attribution: false,
  },
  "Public domain": {
    id: "Public domain",
    name: "Public domain (U.S. Government work)",
    url: "https://www.usa.gov/government-works",
    shareAlike: false,
    attribution: false,
  },
};

export interface SourceRecord {
  id: SourceName;
  name: string;
  url: string;
  /** What Helix7 uses from this source. */
  role: string;
  license: LicenseId;
  /** Primary citation to include in the resource paper and on the site. */
  citation: string;
  /** DOI or stable link for the citation, if available. */
  citationUrl?: string;
}

export const SOURCES: SourceRecord[] = [
  {
    id: "GPCRdb",
    name: "GPCRdb",
    url: "https://gpcrdb.org",
    role: "Receptor list, classification hierarchy, sequences, experimental structures, orphan designations",
    license: "CC BY 4.0",
    citation:
      "Pándy-Szekeres G, et al. GPCRdb in 2023. Nucleic Acids Res. 2023;51(D1):D395–D402.",
    citationUrl: "https://doi.org/10.1093/nar/gkac1013",
  },
  {
    id: "GtoPdb",
    name: "IUPHAR/BPS Guide to PHARMACOLOGY",
    url: "https://www.guidetopharmacology.org",
    role: "Ligands typed by pharmacological action, affinities, and primary references",
    license: "CC BY-SA 4.0",
    citation:
      "Harding SD, et al. The IUPHAR/BPS Guide to PHARMACOLOGY in 2024. Nucleic Acids Res. 2024;52(D1):D1438–D1449.",
    citationUrl: "https://doi.org/10.1093/nar/gkad944",
  },
  {
    id: "HPA",
    name: "Human Protein Atlas",
    url: "https://www.proteinatlas.org",
    role: "Consensus tissue RNA expression (nTPM) across 50 tissues",
    license: "CC BY-SA 4.0",
    citation:
      "Uhlén M, et al. Tissue-based map of the human proteome. Science. 2015;347(6220):1260419.",
    citationUrl: "https://doi.org/10.1126/science.1260419",
  },
  {
    id: "OpenTargets",
    name: "Open Targets Platform",
    url: "https://platform.opentargets.org",
    role: "Scored target–disease associations and target tractability",
    license: "CC0 1.0",
    citation:
      "Ochoa D, et al. The next-generation Open Targets Platform. Nucleic Acids Res. 2023;51(D1):D1353–D1359.",
    citationUrl: "https://doi.org/10.1093/nar/gkac1046",
  },
  {
    id: "ChEMBL",
    name: "ChEMBL",
    url: "https://www.ebi.ac.uk/chembl/",
    role: "Quantitative ligand bioactivities (Ki/IC50/EC50/Kd) and compounds, target-mapped to human receptors",
    license: "CC BY-SA 4.0",
    citation:
      "Zdrazil B, et al. The ChEMBL Database in 2023. Nucleic Acids Res. 2024;52(D1):D1180–D1192.",
    citationUrl: "https://doi.org/10.1093/nar/gkad1004",
  },
  {
    id: "PubChem",
    name: "PubChem BioAssay",
    url: "https://pubchem.ncbi.nlm.nih.gov",
    role: "Additional target-mapped bioassays and compounds, including deposited high-throughput screens",
    license: "Public domain",
    citation:
      "Kim S, et al. PubChem 2023 update. Nucleic Acids Res. 2023;51(D1):D1373–D1380.",
    citationUrl: "https://doi.org/10.1093/nar/gkac956",
  },
  {
    id: "PubMed",
    name: "PubMed / NCBI E-utilities",
    url: "https://pubmed.ncbi.nlm.nih.gov",
    role: "Literature counts for the development-interest score and the reference library",
    license: "Public domain",
    citation: "National Library of Medicine. PubMed. Bethesda (MD): NLM.",
    citationUrl: "https://pubmed.ncbi.nlm.nih.gov",
  },
  {
    id: "PDB",
    name: "RCSB Protein Data Bank",
    url: "https://www.rcsb.org",
    role: "Experimental 3D structure coordinates rendered in the viewer",
    license: "CC0 1.0",
    citation:
      "Berman HM, et al. The Protein Data Bank. Nucleic Acids Res. 2000;28(1):235–242.",
    citationUrl: "https://doi.org/10.1093/nar/28.1.235",
  },
  {
    id: "AlphaFold",
    name: "AlphaFold Protein Structure Database",
    url: "https://alphafold.ebi.ac.uk",
    role: "Predicted structure models used when no experimental structure exists",
    license: "CC BY 4.0",
    citation:
      "Jumper J, et al. Highly accurate protein structure prediction with AlphaFold. Nature. 2021;596:583–589.",
    citationUrl: "https://doi.org/10.1038/s41586-021-03819-9",
  },
  {
    id: "Pharos",
    name: "Pharos / TCRD",
    url: "https://pharos.nih.gov",
    role: "Target Development Level (TDL) convention informing the illumination score",
    license: "CC BY-SA 4.0",
    citation:
      "Kelleher KJ, et al. Pharos 2023. Nucleic Acids Res. 2023;51(D1):D1405–D1416.",
    citationUrl: "https://doi.org/10.1093/nar/gkac1033",
  },
];

export const SOURCE_BY_ID: Record<string, SourceRecord> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
);

/** Convenience: the licence that applies to a given source. */
export function licenseForSource(id: string): LicenseInfo | undefined {
  const src = SOURCE_BY_ID[id];
  return src ? LICENSES[src.license] : undefined;
}

/** Public address of the resource. */
export const HELIX7_URL = "https://helix7.dokhlab.org";

/** How to cite Helix7 itself, once published. */
export const HELIX7_CITATION = {
  text: "Helix7: an integrated atlas of the human GPCRome. Dokholyan Laboratory, University of Virginia. Available at https://helix7.dokhlab.org.",
  note: "Manuscript in preparation — update with the published reference and DOI on release.",
};

/**
 * Helix7's own licence. Because it redistributes ShareAlike datasets, the
 * combined resource is offered under the most restrictive compatible terms.
 */
export const HELIX7_LICENSE: LicenseId = "CC BY-SA 4.0";
