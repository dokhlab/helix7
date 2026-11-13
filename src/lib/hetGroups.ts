/**
 * Which hetero groups in a PDB file count as "the ligand" in the 3D viewer.
 *
 * Preferred: the ligands GPCRdb curates for that structure (their PDB chem
 * ids), so only the drug/agonist/antagonist is drawn. Fallback, for structures
 * with no curated small molecule: every hetero group except water and the
 * membrane-mimetic and crystallisation components below.
 */

export const WATER = ["HOH", "WAT", "DOD"];

/** Lipids and sterols from the membrane, LCP crystallisation or nanodiscs. */
const LIPIDS = [
  "CLR", "Y01", "CHS", // cholesterol, cholesteryl hemisuccinate
  "OLA", "OLB", "OLC", "MPG", "MYS", "PLM", "STE", "MYR", "LNL", "ELA", "PAM", "DAO", "LAU",
  "LFA", "D10", "D12", "UND", "HEX", "OCT", "DD9", "R16", "C14", "TRD", "HP6",
  "POV", "PCW", "PEE", "PEF", "PGW", "PEV", "LBN", "PSF", "PC1", "P5S", "6PL", "CDL", "PGT", "LHG",
  "1WV", "8K6", "9Z9",
];

/** Detergents and amphipols used to solubilise the receptor. */
const DETERGENTS = [
  "LMT", "LMU", "DMU", "BOG", "HTG", "BNG", "LDA", "SOG", "C8E", "UMQ", "NG7",
  "LMN", "AV0", // lauryl maltose neopentyl glycol
  "AJP", "J40", // digitonin, glyco-diosgenin (GDN)
  "CPS", "DDQ", "SDS", "TWT", "B7G",
];

/** Cryoprotectants, buffers, precipitants and N-glycans: present, but not ligands. */
const ADDITIVES = [
  "GOL", "EDO", "PEG", "PG4", "PGE", "1PE", "P6G", "12P", "15P", "2PE", "P33", "PE4", "PE8", "MPD",
  "SO4", "PO4", "ACT", "FMT", "CIT", "TRS", "MES", "EPE", "IMD", "DMS", "BU3", "PG0", "ACY", "TAR",
  "NAG", "NDG", "BMA", "MAN", "FUC", "GAL", "GLC",
];

export const NOT_LIGANDS = [...WATER, ...LIPIDS, ...DETERGENTS, ...ADDITIVES];

/** 3Dmol atom selection for the ligand(s) to draw. */
export function ligandSelection(curatedChemIds: string[]): Record<string, unknown> {
  const ids = curatedChemIds.map((id) => id.trim().toUpperCase()).filter(Boolean);
  return ids.length ? { resn: ids } : { hetflag: true, not: { resn: NOT_LIGANDS } };
}
