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
│   ├── schema.sql       MariaDB tables (applied when the local database is created)
│   ├── update.py        scheduled refresh (records each run in `dataset_meta`)
│   └── deploy/          cron / systemd / launchd / GitHub Actions schedules
├── docker-compose.yml   local MariaDB
├── .env.example         database settings for the app and ./run
└── run                  helper: ./run [start|status|stop|etl|update]
```

Data is stored in **MariaDB**; the frontend reads it server-side through a
`mysql2` pool (`src/lib/mongo.ts`, named for its MongoDB past).

## Quick start

Requirements: Node 20+ and Docker. The ETL runs in a throwaway Python
container, so no local Python is needed.

```bash
# 1. start MariaDB and the dev server
npm install
./run            # creates .env.local, starts MariaDB on :3307, `next dev` on :3000

# 2. build the dataset (first run downloads from the sources; then loads MariaDB)
./run etl        # in a second terminal
```

Open http://localhost:3000.

`./run` copies `.env.example` to `.env.local` on first use. The defaults match
the MariaDB container in `docker-compose.yml` (database, user and password
`helix7`, host port 3307); edit `.env.local` to point the app somewhere else.
The tables are created from `etl/schema.sql` when the database volume is first
initialised. To start again from an empty database, run
`docker compose down -v`.

### Deploying against an existing MariaDB

Point the app at the server's database with `DBHOST`, `DBPORT`,
`HELIX7_DBNAME`, `HELIX7_DBUSER` and `HELIX7_DBPASS` (the last two fall back
to `DBUSER`/`DBPASS`), and create the tables once from `etl/schema.sql`. To run
the ETL there, put a `run.env` next to `run` (git-ignored; it takes precedence
over `.env.local`):

```bash
HELIX7_DBNAME=helix7
HELIX7_DB_CONTAINER=my-mariadb        # existing container: ./run will not start/stop it
HELIX7_ETL_NETWORK=my-docker-network  # network that container is on
HELIX7_ETL_DBHOST=my-mariadb          # its host name on that network
HELIX7_ETL_ENV_FILE=/path/to/db.env   # file with HELIX7_DBUSER/HELIX7_DBPASS (or DBUSER/DBPASS)
```

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and the data-source history.

## Citation

> Helix7: an integrated atlas of the human GPCRome. Dokholyan Laboratory,
> University of Virginia. Available at https://helix7.dokhlab.org.

Manuscript in preparation; this citation will be updated with the published
reference and DOI on release.
