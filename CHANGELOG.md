# Changelog

All notable changes to Helix7 are recorded here. Dates are ISO‑8601.

## [Unreleased]

### Added
- **Fuzzy, typo-tolerant search.** Receptor search now scores every receptor in
  memory (Levenshtein + token/prefix matching with colloquial-name expansion),
  so misspellings ("dopmaine", "seratonin", "hisstamine") and lay terms
  ("adrenaline receptor", "beta blocker", "cannabis") resolve to the right GPCRs.
- **"Not a GPCR" guidance.** Queries for ionotropic namesakes that aren't in the
  GPCRome — 5-HT₃, nicotinic ACh, GABA-A, NMDA/AMPA/kainate, glycine, P2X —
  return an explanation of why they're absent and which GPCR relatives to search
  instead, shown inline in the search box.
- **Name-variant receptor search.** The global search box now matches gene
  symbols and their aliases, the systematic GPCRdb name, and the biological and
  common names curated by UniProt (e.g. "beta-2 adrenergic receptor",
  "serotonin 2A", "mu opioid"). Queries are normalised so Greek letters and
  subscripts ("β₂"), spacing ("beta 2" / "beta2") and condensed forms ("5ht2a")
  all resolve. New ETL stage `etl/s10_synonyms.py`.
- **Pharmacology table search, filters and pagination.** A search box (ligand
  name), an assay-type selector, and a binding-affinity (nM) range filter sit
  above the ligand table; results are paginated at 100 rows per page with
  Previous / Next and a go-to-page control. The full ligand set is now loaded
  (previously capped at 400), so the per-action counts are exact.
- **Resizable Pharmacology table columns** — drag the divider on any column
  header in the receptor Pharmacology tab to widen it, so long ligand names
  (e.g. IUPAC chemical names) can be read without truncation.
- **Primary G-protein coupling** (`etl/s09_coupling.py`) — curated canonical
  transducer (Gs/Gi-Go/Gq-G11/G12-13) for the well-characterised receptor
  families; the Signalling panel now shows real coupling with a GPCRdb link
  instead of a placeholder.
- **HPA single-cell expression layer** (`etl/s02b_hpa_singlecell.py`). A
  cell-resolution complement to tissue RNA: per-cell-type nCPM across ~150 human
  cell types, coloured by broad cell class. The receptor Expression tab now has
  a Tissue / Single-cell toggle.
- **Organ-system summary** on the tissue view and an expandable full tissue
  list, so finely-subdivided regions (e.g. brain subregions) are never hidden
  below a top-N cutoff.

- **ChEMBL as a ligand/assay source** (`etl/s07_chembl.py`). Resolves each
  receptor's ChEMBL single‑protein human target from its UniProt accession and
  ingests standardised, pChEMBL‑qualified activities (Ki/IC50/EC50/Kd/AC50),
  capped at 500 molecules per receptor and linked to their PubMed references.
- **PubChem BioAssay as a ligand/assay source** (`etl/s08_pubchem.py`).
  Ingests target‑mapped bioassays and deposited high‑throughput screens,
  including compounds present in no other source.
- **Cross‑source de‑duplication.** Ligands are unified across GtoPdb, ChEMBL and
  PubChem by InChIKey then name; equivalent measurements (same receptor, ligand,
  assay type and potency) are dropped so overlap is not double‑counted.
- **`etl/md_to_docx.mjs`** — regenerates the NAR manuscript `.docx` from the
  markdown source of truth (with embedded figures).
- Provenance de‑duplication in the derive step; per‑record source attribution
  now lists GPCRdb · HPA · GtoPdb · Open Targets · ChEMBL · PubChem.

### Fixed
- Silenced a benign React hydration warning caused by browser extensions
  (e.g. Grammarly) injecting attributes on `<body>` before hydration, via
  `suppressHydrationWarning` on the root `<html>`/`<body>`.
- Browsing by the Odorant classes (O1/O2) no longer returns "No receptors
  match": olfactory receptors are hidden by default, but that exclusion is now
  skipped when the user explicitly selects an olfactory class.
- Renamed class O1 from the misleading "Odorant (fish)" to "Odorant (class I)"
  and O2 to "Odorant (class II)", clarifying in the class descriptions that
  these are human class I ("fish-like", OR51/52/56) and class II ("tetrapod")
  odorant receptors — not fish genes.
- 3D structure viewer now falls back to mmCIF for entries without a legacy
  `.pdb` file (e.g. 7B6W), which previously failed to render.
- Docs → GPCR Biology: the PAM mechanism card now spells out "Positive
  allosteric modulator" instead of abbreviating "mod.".

### Changed
- Data coverage expanded from **4,117 → 128,044 distinct ligands** and
  **7,995 → 174,958 interactions** (GtoPdb 7,995 · ChEMBL 91,365 · PubChem
  75,598). Example: dihydrexidine now resolves under DRD1 (Ki 6.2 nM,
  EC50 7.2 nM).
- Source registry (`src/lib/sources.ts`), docs "Ligands & pharmacology" prose,
  Citation & Licenses page, and the NAR manuscript updated for the new sources
  and counts.

## [0.1.0] — 2026‑07‑24

### Added
- Initial Helix7 release: an integrated atlas of the 805 human GPCRs.
- Next.js + TypeScript frontend with MongoDB data layer.
- Staged Python ETL integrating GPCRdb (classification, sequences, structures,
  orphan flags, generic residue numbering), IUPHAR/BPS Guide to PHARMACOLOGY,
  Human Protein Atlas (tissue expression), Open Targets (disease associations),
  PubMed (literature), PDB and AlphaFold (structures), and Pharos (TDL).
- Transparent 0–100 development‑interest score and Target Development Level.
- Interactive visualizations: radial GPCRome map, phylogenetic dendrogram,
  3D structure viewer, anatomical expression map, mechanism‑annotated potency
  plots, and a GPCR structure‑and‑function primer.
- Scheduled data‑refresh service (cron / systemd / launchd / GitHub Actions)
  recording each run in the `meta` collection.
- Data licensing and per‑record attribution; released under CC BY‑SA 4.0.
