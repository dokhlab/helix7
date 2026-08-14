"""Stage 2b — Human Protein Atlas single-cell type expression.

A complementary expression layer to the tissue-level consensus RNA (stage 2):
per-cell-type expression across ~150 human cell types, so a receptor's
expression can be read at cellular resolution (e.g. which neuron subtype,
immune cell, or epithelial cell it is enriched in).

Source: https://www.proteinatlas.org  (CC BY-SA 4.0)
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

import httpx

from common import CACHE_DIR, USER_AGENT, read_out, write_out

HPA_URL = "https://www.proteinatlas.org/download/tsv/rna_single_cell_type.tsv.zip"
BULK = CACHE_DIR / "bulk"
BULK.mkdir(parents=True, exist_ok=True)
ARCHIVE = BULK / "rna_single_cell_type.tsv.zip"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

# Keep every cell type with detectable expression (the full HPA panel is ~150),
# so low-but-present populations (e.g. neurons for a mostly-peripheral receptor)
# are never hidden below a cutoff.
MAX_CELL_TYPES = 160

PROVENANCE = {
    "source": "HPA",
    "url": "https://www.proteinatlas.org",
    "licence": "CC BY-SA 4.0 — Human Protein Atlas (single-cell type)",
    "retrievedAt": RETRIEVED,
}

# Broad cell-class grouping for colour/interpretation in the UI.
CELL_CLASS: dict[str, str] = {}


def _classify(cell: str) -> str:
    c = cell.lower()
    if any(k in c for k in ("neuron", "glia", "astrocy", "oligodendro", "microglia", "purkinje", "schwann", "muller", "bipolar", "cone", "rod photoreceptor", "horizontal")):
        return "Neural"
    if any(k in c for k in ("t-cell", "b-cell", "nk-", "macrophage", "monocyte", "dendritic", "granulocyte", "kupffer", "langerhans", "plasma cell", "mast")):
        return "Immune"
    if any(k in c for k in ("cardiomyocyte", "endothel", "smooth muscle", "skeletal myocyte", "pericyte")):
        return "Muscle/vascular"
    if any(k in c for k in ("epitheli", "enterocyte", "keratinocyte", "hepatocyte", "alveolar", "club", "goblet", "basal", "secretory", "ductal", "acinar")):
        return "Epithelial"
    if any(k in c for k in ("spermato", "oocyte", "sertoli", "leydig", "granulosa", "trophoblast", "syncytio")):
        return "Reproductive"
    if any(k in c for k in ("adipocyte", "fibroblast", "melanocyte", "erythroid", "platelet")):
        return "Other"
    return "Other"


def ensure_archive() -> None:
    if ARCHIVE.exists() and ARCHIVE.stat().st_size > 1_000_000:
        return
    print("· downloading HPA single-cell dataset (~16 MB)")
    with httpx.Client(timeout=600, follow_redirects=True) as client:
        resp = client.get(HPA_URL, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        ARCHIVE.write_bytes(resp.content)


def load_single_cell(genes: set[str]) -> dict[str, list[dict]]:
    """gene -> [{cellType, cellClass, value, unit, source}], desc by value."""
    ensure_archive()
    print("· parsing HPA single-cell TSV")
    by_gene: dict[str, list[dict]] = defaultdict(list)
    with zipfile.ZipFile(ARCHIVE) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".tsv"))
        with zf.open(name) as fh:
            reader = csv.DictReader(io.TextIOWrapper(fh, "utf-8"), delimiter="\t")
            # value column is "nCPM" (normalised counts per million)
            for row in reader:
                gene = (row.get("Gene name") or "").strip()
                if gene not in genes:
                    continue
                cell = (row.get("Cell type") or "").strip()
                try:
                    value = float(row.get("nCPM") or 0)
                except ValueError:
                    continue
                by_gene[gene].append(
                    {
                        "cellType": cell,
                        "cellClass": _classify(cell),
                        "value": round(value, 2),
                        "unit": "nCPM",
                        "source": "HPA",
                    }
                )
    for rows in by_gene.values():
        rows.sort(key=lambda r: r["value"], reverse=True)
    return by_gene


def main() -> None:
    print("=== Helix7 ETL stage 2b: HPA single-cell expression ===")
    receptors = read_out("receptors.json")

    wanted: set[str] = set()
    for r in receptors:
        wanted.add(r["gene"])
        wanted.update(r.get("geneSynonyms") or [])

    sc = load_single_cell(wanted)

    matched = 0
    for r in receptors:
        rows = sc.get(r["gene"])
        if not rows:
            for syn in r.get("geneSynonyms") or []:
                if syn in sc:
                    rows = sc[syn]
                    break
        if not rows:
            r["singleCell"] = []
            continue
        matched += 1
        # keep non-zero, capped
        nonzero = [x for x in rows if x["value"] > 0][:MAX_CELL_TYPES]
        r["singleCell"] = nonzero or rows[:MAX_CELL_TYPES]

    print(f"\n{matched}/{len(receptors)} receptors have single-cell data")
    write_out("receptors.json", receptors)


if __name__ == "__main__":
    sys.exit(main())
