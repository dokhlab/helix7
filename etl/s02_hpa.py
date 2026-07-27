"""Stage 2 — Human Protein Atlas: tissue expression for the body map.

Uses the consensus RNA dataset (51 tissues, nTPM). Each tissue is rolled up into
an organ system so the anatomical view can colour whole regions.

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

HPA_URL = "https://www.proteinatlas.org/download/tsv/rna_tissue_consensus.tsv.zip"
BULK = CACHE_DIR / "bulk"
BULK.mkdir(parents=True, exist_ok=True)
ARCHIVE = BULK / "rna_tissue_consensus.tsv.zip"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

PROVENANCE = {
    "source": "HPA",
    "url": "https://www.proteinatlas.org",
    "licence": "CC BY-SA 4.0 — Human Protein Atlas",
    "retrievedAt": RETRIEVED,
}

# Tissue -> organ system, for the anatomical body map.
ORGAN_SYSTEM: dict[str, str] = {
    "amygdala": "Nervous",
    "basal ganglia": "Nervous",
    "cerebellum": "Nervous",
    "cerebral cortex": "Nervous",
    "choroid plexus": "Nervous",
    "hippocampal formation": "Nervous",
    "hypothalamus": "Nervous",
    "midbrain": "Nervous",
    "spinal cord": "Nervous",
    "retina": "Nervous",
    "heart muscle": "Cardiovascular",
    "blood vessel": "Cardiovascular",
    "appendix": "Digestive",
    "colon": "Digestive",
    "duodenum": "Digestive",
    "esophagus": "Digestive",
    "gallbladder": "Digestive",
    "liver": "Digestive",
    "pancreas": "Digestive",
    "rectum": "Digestive",
    "salivary gland": "Digestive",
    "small intestine": "Digestive",
    "stomach": "Digestive",
    "tongue": "Digestive",
    "lung": "Respiratory",
    "kidney": "Urinary",
    "urinary bladder": "Urinary",
    "breast": "Reproductive",
    "cervix": "Reproductive",
    "endometrium": "Reproductive",
    "epididymis": "Reproductive",
    "fallopian tube": "Reproductive",
    "ovary": "Reproductive",
    "placenta": "Reproductive",
    "prostate": "Reproductive",
    "seminal vesicle": "Reproductive",
    "testis": "Reproductive",
    "vagina": "Reproductive",
    "bone marrow": "Immune",
    "lymph node": "Immune",
    "spleen": "Immune",
    "thymus": "Immune",
    "tonsil": "Immune",
    "adrenal gland": "Endocrine",
    "parathyroid gland": "Endocrine",
    "pituitary gland": "Endocrine",
    "thyroid gland": "Endocrine",
    "skeletal muscle": "Musculoskeletal",
    "smooth muscle": "Musculoskeletal",
    "skin": "Integumentary",
    "adipose tissue": "Adipose",
}

# nTPM above which a tissue counts as a meaningful site of expression.
EXPRESSION_THRESHOLD = 1.0


def ensure_archive() -> None:
    if ARCHIVE.exists() and ARCHIVE.stat().st_size > 1_000_000:
        return
    print("· downloading HPA consensus dataset (~5 MB)")
    with httpx.Client(timeout=600, follow_redirects=True) as client:
        resp = client.get(HPA_URL, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        ARCHIVE.write_bytes(resp.content)


def load_expression(genes: set[str]) -> dict[str, list[dict]]:
    """gene symbol -> [{tissue, organSystem, value, unit, source}], desc by value."""
    ensure_archive()
    print("· parsing HPA consensus TSV")
    by_gene: dict[str, list[dict]] = defaultdict(list)

    with zipfile.ZipFile(ARCHIVE) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".tsv"))
        with zf.open(name) as fh:
            reader = csv.DictReader(io.TextIOWrapper(fh, "utf-8"), delimiter="\t")
            for row in reader:
                gene = (row.get("Gene name") or "").strip()
                if gene not in genes:
                    continue
                tissue = (row.get("Tissue") or "").strip()
                try:
                    value = float(row.get("nTPM") or 0)
                except ValueError:
                    continue
                by_gene[gene].append(
                    {
                        "tissue": tissue,
                        "organSystem": ORGAN_SYSTEM.get(tissue, "Other"),
                        "value": round(value, 2),
                        "unit": "nTPM",
                        "source": "HPA",
                    }
                )

    for rows in by_gene.values():
        rows.sort(key=lambda r: r["value"], reverse=True)
    return by_gene


def main() -> None:
    print("=== Helix7 ETL stage 2: Human Protein Atlas expression ===")
    receptors = read_out("receptors.json")

    # Match on primary gene symbol, falling back to synonyms.
    wanted: set[str] = set()
    for r in receptors:
        wanted.add(r["gene"])
        wanted.update(r.get("geneSynonyms") or [])

    expr = load_expression(wanted)

    matched = 0
    for r in receptors:
        rows = expr.get(r["gene"])
        if not rows:
            for syn in r.get("geneSynonyms") or []:
                if syn in expr:
                    rows = expr[syn]
                    break
        if not rows:
            continue
        matched += 1
        r["expression"] = rows
        systems = sorted(
            {
                row["organSystem"]
                for row in rows
                if row["value"] >= EXPRESSION_THRESHOLD and row["organSystem"] != "Other"
            }
        )
        r["organSystems"] = systems
        r["provenance"].append(PROVENANCE)

    print(f"\n{matched}/{len(receptors)} receptors have HPA expression data")
    non_olf = [r for r in receptors if not r["isOlfactory"]]
    non_olf_matched = sum(1 for r in non_olf if r["expression"])
    print(f"  non-olfactory coverage: {non_olf_matched}/{len(non_olf)}")

    write_out("receptors.json", receptors)


if __name__ == "__main__":
    sys.exit(main())
