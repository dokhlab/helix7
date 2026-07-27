# Helix7 — an integrated atlas of the human GPCRome

**Helix7** brings the classification, structure, ligand pharmacology, tissue
expression, disease associations and literature of every human G protein–coupled
receptor (GPCR) together on a single receptor spine, and presents them through a
set of interactive, cross-linked visualizations.

- **Live:** https://helix7.dokhlab.org
- **A resource of the** [Dokholyan Laboratory](https://dokhlab.org), University of Virginia.

---

## What's inside

For all **805 human GPCRs** the atlas provides:

- **Dual classification** — the A–F (Kolakowski) and GRAFS (Fredriksson) systems,
  plus the full GPCRdb hierarchy and GPCR generic residue numbering.
- **Structure** — every experimental PDB structure with an interactive 3D viewer,
  falling back to AlphaFold models where none exists.
- **Pharmacology** — ligands typed by mechanism of action (agonist, partial
  agonist, antagonist, inverse agonist, allosteric modulator) with Kᵢ/IC₅₀/EC₅₀
  values and links to the primary reference for each measurement.
- **Expression** — tissue distribution across 51 tissues, on an anatomical map.
- **Disease** — scored target–disease associations with evidence datatypes.
- **Development-interest score** — a transparent 0–100 composite plus a Target
  Development Level (Tclin/Tchem/Tbio/Tdark).

Every value carries source attribution and a link back to its record.

## Architecture

```
App/
├── src/                 Next.js (App Router) + React + TypeScript frontend
│   ├── app/             pages, API route handlers
│   ├── components/      UI + visualizations (D3 tree, 3D viewer, body map, …)
│   └── lib/             data access, types, source registry
├── etl/                 Python data-integration pipeline (staged ETL)
│   ├── s01…s90_*.py     one stage per source, then derive + load
│   ├── update.py        scheduled refresh (records runs in the `meta` collection)
│   └── deploy/          cron / systemd / launchd / GitHub Actions schedules
├── docker-compose.yml   local MongoDB
└── run                  helper: ./run [start|status|stop|etl|update]
```

Data is stored in **MongoDB**; the frontend reads it server-side.

## Quick start

Requirements: Node 20+, Python 3.11+, and Docker (for local MongoDB).

```bash
# 1. install and start MongoDB + the dev server
npm install
./run            # starts Docker/MongoDB and `next dev` on :3000

# 2. build the dataset (first run downloads from the sources; then loads MongoDB)
./run etl
```

Open http://localhost:3000.

### Refreshing the data

```bash
./run update             # clears the cache, re-runs the pipeline, records the run
```

See [`etl/deploy/`](etl/deploy/) for ready-made cron, systemd, launchd and
GitHub Actions schedules (a monthly cadence matches the upstream release rate).

## Data sources & licensing

Helix7 integrates and redistributes public data from GPCRdb, the IUPHAR/BPS Guide
to PHARMACOLOGY, the Human Protein Atlas, Open Targets, ChEMBL, PubMed, the RCSB
PDB, AlphaFold DB and Pharos/TCRD. Each source is credited with its licence on the
[Citation & Licenses](https://helix7.dokhlab.org/docs/licenses) page and in
[`src/lib/sources.ts`](src/lib/sources.ts).

Because it builds on ShareAlike datasets, **Helix7 is released under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**. The data is
provided for research use, not clinical guidance.

## Citation

> Helix7: an integrated atlas of the human GPCRome. Dokholyan Laboratory,
> University of Virginia. Available at https://helix7.dokhlab.org.

Manuscript in preparation; this citation will be updated with the published
reference and DOI on release.
