"""Stage 5 — development-interest score.

Combines five signals into a transparent 0-100 composite. Every component is
stored alongside the total so the receptor page can show *why* a target scores
what it does rather than presenting a black box.

Literature counts come from PubMed E-utilities and are log-scaled: raw counts
are dominated by a handful of famous receptors (the opioid and adrenoceptor
families alone would flatten everything else).

Target Development Level follows the Pharos convention:
  Tclin  an approved drug acts on it
  Tchem  a potent ligand exists (<= 1 uM) but no approved drug
  Tbio   biology is known (disease links / expression) but no potent ligand
  Tdark  essentially unstudied
"""

from __future__ import annotations

import datetime as dt
import math
from collections import defaultdict

from common import fetch_json, read_out, write_out

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

# NCBI permits 3 requests/second without an API key.
NCBI_DELAY = 0.36

WEIGHTS = {
    "literature": 0.30,
    "ligands": 0.20,
    "approvedDrugs": 0.20,
    "structures": 0.15,
    "disease": 0.15,
}

# Potency (pKi/pIC50/pEC50) at or above which a ligand counts as "potent".
POTENT_P = 6.0


def pubmed_count(gene: str, name: str) -> int:
    """Publications mentioning this receptor in title/abstract."""
    terms = [f'"{gene}"[Title/Abstract]']
    if name and name.lower() != gene.lower():
        clean = name.replace('"', "").strip()
        if clean:
            terms.append(f'"{clean}"[Title/Abstract]')
    query = " OR ".join(terms)

    data = fetch_json(
        EUTILS,
        {"db": "pubmed", "term": query, "rettype": "count", "retmode": "json"},
        delay=NCBI_DELAY,
        timeout=45,
    )
    try:
        return int(data["esearchresult"]["count"])
    except (TypeError, KeyError, ValueError):
        return 0


def normalise(values: dict[str, float]) -> dict[str, float]:
    """Min-max a dict of raw values onto 0-1."""
    if not values:
        return {}
    lo, hi = min(values.values()), max(values.values())
    span = hi - lo
    if span <= 0:
        return {k: 0.0 for k in values}
    return {k: (v - lo) / span for k, v in values.items()}


def main() -> None:
    print("=== Helix7 ETL stage 5: development-interest score ===")
    receptors = read_out("receptors.json")
    bioactivities = read_out("bioactivities.json")

    # Potency evidence per receptor.
    potent: dict[str, int] = defaultdict(int)
    best_p: dict[str, float] = {}
    for b in bioactivities:
        p = b.get("pValue")
        if p is None:
            continue
        rid = b["receptorId"]
        if p >= POTENT_P:
            potent[rid] += 1
        if p > best_p.get(rid, -99):
            best_p[rid] = p

    print(f"· fetching PubMed counts for {len(receptors)} receptors (~5 min, cached)")
    citations: dict[str, int] = {}
    for i, r in enumerate(receptors, 1):
        citations[r["_id"]] = pubmed_count(r["gene"], r.get("name", ""))
        if i % 100 == 0 or i == len(receptors):
            print(f"  [{i}/{len(receptors)}]")

    # Raw signals, log-scaled where counts are heavy-tailed.
    raw_lit = {r["_id"]: math.log10(1 + citations[r["_id"]]) for r in receptors}
    raw_lig = {r["_id"]: math.log10(1 + (r.get("ligandCount") or 0)) for r in receptors}
    raw_drg = {
        r["_id"]: math.log10(1 + (r.get("approvedDrugCount") or 0)) for r in receptors
    }
    raw_str = {
        r["_id"]: math.log10(1 + (r.get("structureCount") or 0)) for r in receptors
    }
    raw_dis = {
        r["_id"]: max((d.get("score") or 0) for d in (r.get("diseases") or [{}]))
        if r.get("diseases")
        else 0.0
        for r in receptors
    }

    n_lit, n_lig = normalise(raw_lit), normalise(raw_lig)
    n_drg, n_str = normalise(raw_drg), normalise(raw_str)
    n_dis = normalise(raw_dis)

    for r in receptors:
        rid = r["_id"]
        comps = {
            "literature": round(n_lit.get(rid, 0), 4),
            "ligands": round(n_lig.get(rid, 0), 4),
            "approvedDrugs": round(n_drg.get(rid, 0), 4),
            "structures": round(n_str.get(rid, 0), 4),
            "disease": round(n_dis.get(rid, 0), 4),
        }
        score = sum(comps[k] * WEIGHTS[k] for k in WEIGHTS) * 100

        if (r.get("approvedDrugCount") or 0) > 0:
            tdl = "Tclin"
        elif potent.get(rid, 0) > 0:
            tdl = "Tchem"
        elif r.get("diseases") or r.get("expression"):
            tdl = "Tbio"
        else:
            tdl = "Tdark"

        r["devInterest"] = {
            "score": round(score, 1),
            "tdl": tdl,
            "components": comps,
            "weights": WEIGHTS,
            "raw": {
                "citationCount": citations[rid],
                "ligandCount": r.get("ligandCount") or 0,
                "approvedDrugCount": r.get("approvedDrugCount") or 0,
                "structureCount": r.get("structureCount") or 0,
                "potentLigandCount": potent.get(rid, 0),
                "bestPotency": round(best_p[rid], 2) if rid in best_p else None,
                "topDiseaseScore": round(raw_dis.get(rid, 0), 4),
            },
            "computedAt": RETRIEVED,
        }

    ranked = sorted(receptors, key=lambda r: r["devInterest"]["score"], reverse=True)
    print("\nTop 12 by development interest:")
    for r in ranked[:12]:
        d = r["devInterest"]
        print(
            f"  {d['score']:5.1f}  {d['tdl']:6s} {r['gene']:10s} "
            f"{d['raw']['citationCount']:>6} refs  "
            f"{d['raw']['ligandCount']:>4} ligands  "
            f"{d['raw']['structureCount']:>3} structures"
        )

    tdl_counts: dict[str, int] = defaultdict(int)
    for r in receptors:
        tdl_counts[r["devInterest"]["tdl"]] += 1
    print("\nTDL distribution:", dict(tdl_counts))

    write_out("receptors.json", receptors)


if __name__ == "__main__":
    main()
