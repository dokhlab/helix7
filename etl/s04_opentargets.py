"""Stage 4 — Open Targets Platform: disease associations and tractability.

Gives each receptor its ranked disease list (with the evidence datatypes behind
each score) plus a tractability read-out that feeds the development-interest
score in stage 6.

Ensembl gene IDs are recovered from the HPA consensus file downloaded in stage 2,
which avoids a second ID-mapping round trip.

Source: https://platform.opentargets.org  (CC0 1.0)
"""

from __future__ import annotations

import csv
import datetime as dt
import io
import zipfile
from collections import defaultdict

from common import CACHE_DIR, post_json, read_out, write_out

API = "https://api.platform.opentargets.org/api/v4/graphql"
ARCHIVE = CACHE_DIR / "bulk" / "rna_tissue_consensus.tsv.zip"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()
BATCH_SIZE = 20
TOP_DISEASES = 25

PROVENANCE = {
    "source": "OpenTargets",
    "url": "https://platform.opentargets.org",
    "licence": "CC0 1.0 — Open Targets Platform",
    "retrievedAt": RETRIEVED,
}

QUERY = """
query Targets($ids: [String!]!, $size: Int!) {
  targets(ensemblIds: $ids) {
    id
    approvedSymbol
    tractability { label modality value }
    associatedDiseases(page: { index: 0, size: $size }) {
      count
      rows {
        score
        datatypeScores { id score }
        disease { id name therapeuticAreas { name } }
      }
    }
  }
}
"""


def ensembl_map() -> dict[str, str]:
    """gene symbol -> Ensembl gene id, from the HPA consensus file."""
    if not ARCHIVE.exists():
        raise SystemExit("HPA archive missing; run s02_hpa.py first")
    mapping: dict[str, str] = {}
    with zipfile.ZipFile(ARCHIVE) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".tsv"))
        with zf.open(name) as fh:
            reader = csv.DictReader(io.TextIOWrapper(fh, "utf-8"), delimiter="\t")
            for row in reader:
                sym = (row.get("Gene name") or "").strip()
                ens = (row.get("Gene") or "").strip()
                if sym and ens and sym not in mapping:
                    mapping[sym] = ens
    return mapping


def main() -> None:
    print("=== Helix7 ETL stage 4: Open Targets ===")
    receptors = read_out("receptors.json")
    symbol_to_ens = ensembl_map()
    print(f"· Ensembl map: {len(symbol_to_ens)} symbols")

    # Resolve an Ensembl id per receptor.
    ens_for: dict[str, str] = {}
    for r in receptors:
        ens = symbol_to_ens.get(r["gene"])
        if not ens:
            for syn in r.get("geneSynonyms") or []:
                if syn in symbol_to_ens:
                    ens = symbol_to_ens[syn]
                    break
        if ens:
            ens_for[r["_id"]] = ens
            r["ensemblId"] = ens
    print(f"· resolved Ensembl ids for {len(ens_for)}/{len(receptors)} receptors")

    unique_ids = sorted(set(ens_for.values()))
    results: dict[str, dict] = {}

    for i in range(0, len(unique_ids), BATCH_SIZE):
        batch = unique_ids[i : i + BATCH_SIZE]
        data = post_json(
            API,
            {"query": QUERY, "variables": {"ids": batch, "size": TOP_DISEASES}},
        )
        got = 0
        if data and data.get("data") and data["data"].get("targets"):
            for t in data["data"]["targets"]:
                if t:
                    results[t["id"]] = t
                    got += 1
        done = min(i + BATCH_SIZE, len(unique_ids))
        print(f"  [{done}/{len(unique_ids)}] batch returned {got} targets")

    # Attach to receptor documents.
    with_disease = 0
    for r in receptors:
        ens = ens_for.get(r["_id"])
        target = results.get(ens) if ens else None
        if not target:
            r["diseases"] = []
            r["diseaseCount"] = 0
            continue

        assoc = target.get("associatedDiseases") or {}
        rows = assoc.get("rows") or []
        diseases = []
        for row in rows:
            d = row.get("disease") or {}
            diseases.append(
                {
                    "name": d.get("name"),
                    "diseaseId": d.get("id"),
                    "score": round(row.get("score") or 0, 4),
                    "therapeuticAreas": [
                        ta["name"] for ta in (d.get("therapeuticAreas") or [])
                    ],
                    "evidence": {
                        ds["id"]: round(ds["score"], 3)
                        for ds in (row.get("datatypeScores") or [])
                    },
                    "source": "OpenTargets",
                }
            )
        r["diseases"] = diseases
        r["diseaseCount"] = assoc.get("count") or len(diseases)

        tract = [t for t in (target.get("tractability") or []) if t.get("value")]
        r["tractability"] = [
            {"modality": t.get("modality"), "bucket": t.get("label")} for t in tract
        ]
        r["therapeuticAreas"] = sorted(
            {ta for d in diseases for ta in (d.get("therapeuticAreas") or [])}
        )
        if diseases:
            with_disease += 1
            r["provenance"].append(PROVENANCE)

    print(f"\n{with_disease}/{len(receptors)} receptors have disease associations")
    write_out("receptors.json", receptors)


if __name__ == "__main__":
    main()
