"""Stage 3 — IUPAC/BPS Guide to Pharmacology: ligands and quantitative assay data.

GtoPdb is the authority for *how* a ligand acts (agonist / partial agonist /
antagonist / inverse agonist / allosteric modulator), which ChEMBL does not
annotate consistently. Each interaction carries an affinity and, usually, the
PubMed ID of the paper it was measured in — this is what powers both the
pharmacology tab and the per-receptor reference library.

Source: https://www.guidetopharmacology.org  (CC BY-SA 4.0)
"""

from __future__ import annotations

import csv
import datetime as dt
import hashlib
from collections import defaultdict
from pathlib import Path

import httpx

from common import CACHE_DIR, USER_AGENT, read_out, strip_html, write_out

BULK = CACHE_DIR / "bulk"
BULK.mkdir(parents=True, exist_ok=True)
INTERACTIONS_URL = "https://www.guidetopharmacology.org/DATA/interactions.csv"
LIGANDS_URL = "https://www.guidetopharmacology.org/DATA/ligands.csv"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

PROVENANCE = {
    "source": "GtoPdb",
    "url": "https://www.guidetopharmacology.org",
    "licence": "CC BY-SA 4.0 — IUPHAR/BPS Guide to PHARMACOLOGY",
    "retrievedAt": RETRIEVED,
}

# (Type, Action) -> normalised pharmacological action.
ACTION_FROM_ACTION = {
    "full agonist": "Agonist",
    "agonist": "Agonist",
    "partial agonist": "Partial agonist",
    "inverse agonist": "Inverse agonist",
    "antagonist": "Antagonist",
    "inhibition": "Antagonist",
    "activation": "Agonist",
    "positive": "Positive allosteric modulator",
    "negative": "Negative allosteric modulator",
}
ACTION_FROM_TYPE = {
    "agonist": "Agonist",
    "antagonist": "Antagonist",
    "inhibitor": "Antagonist",
    "activator": "Agonist",
    "allosteric modulator": "Allosteric modulator",
    "channel blocker": "Antagonist",
}

ASSAY_FROM_UNITS = {
    "pki": "Ki",
    "pic50": "IC50",
    "pec50": "EC50",
    "pkd": "Kd",
    "pa2": "pA2",
    "pkb": "Other",
}


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 100_000:
        return dest
    print(f"· downloading {dest.name}")
    with httpx.Client(timeout=600, follow_redirects=True) as client:
        resp = client.get(url, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    return dest


def read_gtopdb_csv(path: Path) -> list[dict]:
    """GtoPdb CSVs put a version banner on line 1 and the header on line 2."""
    with path.open(newline="", encoding="utf-8-sig") as fh:
        first = fh.readline()
        if not first.startswith('"# GtoPdb'):
            fh.seek(0)
        return list(csv.DictReader(fh))


def classify_action(type_: str, action: str) -> str:
    a = (action or "").strip().lower()
    t = (type_ or "").strip().lower()
    if a in ACTION_FROM_ACTION:
        # "Positive"/"Negative" only mean allosteric in an allosteric context.
        if a in ("positive", "negative") and "allosteric" not in t:
            return "Agonist" if a == "positive" else "Antagonist"
        return ACTION_FROM_ACTION[a]
    if t in ACTION_FROM_TYPE:
        return ACTION_FROM_TYPE[t]
    return "Unknown"


def to_float(value: str | None) -> float | None:
    if not value or value in ("-", ""):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def load_ligand_catalogue() -> dict[str, dict]:
    path = download(LIGANDS_URL, BULK / "ligands.csv")
    rows = read_gtopdb_csv(path)
    catalogue: dict[str, dict] = {}
    for row in rows:
        lid = (row.get("Ligand ID") or "").strip()
        if not lid:
            continue
        catalogue[lid] = {
            "_id": f"gtopdb:{lid}",
            "name": (row.get("Name") or "").strip(),
            "smiles": (row.get("SMILES") or "").strip() or None,
            "inchiKey": (row.get("InChIKey") or "").strip() or None,
            "chemblId": (row.get("ChEMBL ID") or "").strip() or None,
            "gtopdbId": lid,
            "ligandClass": (row.get("Type") or "").strip() or None,
            # GtoPdb writes "yes"/"" in these flag columns, not true/false.
            "isApprovedDrug": (row.get("Approved") or "").strip().lower() == "yes",
            "isWithdrawn": (row.get("Withdrawn") or "").strip().lower() == "yes",
            "synonyms": [s for s in (row.get("Synonyms") or "").split("|") if s][:8],
            "innName": (row.get("INN") or "").strip() or None,
            "source": "GtoPdb",
        }
    print(f"  ligand catalogue: {len(catalogue)} entries")
    return catalogue


def main() -> None:
    print("=== Helix7 ETL stage 3: Guide to Pharmacology ===")
    receptors = read_out("receptors.json")
    by_uniprot = {r["uniprot"]: r for r in receptors if r.get("uniprot")}

    catalogue = load_ligand_catalogue()

    path = download(INTERACTIONS_URL, BULK / "interactions.csv")
    rows = read_gtopdb_csv(path)
    print(f"  {len(rows)} interaction records")

    bioactivities: list[dict] = []
    used_ligands: dict[str, dict] = {}
    per_receptor: dict[str, set[str]] = defaultdict(set)
    refs_per_receptor: dict[str, set[str]] = defaultdict(set)
    approved_per_receptor: dict[str, set[str]] = defaultdict(set)

    for idx, row in enumerate(rows):
        if (row.get("Target Species") or "").strip() != "Human":
            continue
        uniprot = (row.get("Target UniProt ID") or "").strip()
        # Multi-subunit targets list several accessions; take any that we know.
        receptor = None
        for acc in uniprot.split("|"):
            if acc.strip() in by_uniprot:
                receptor = by_uniprot[acc.strip()]
                break
        if receptor is None:
            continue

        lid = (row.get("Ligand ID") or "").strip()
        ligand = catalogue.get(lid)
        ligand_name = strip_html(
            (row.get("Ligand") or "").strip() or (ligand["name"] if ligand else "")
        )
        if not ligand_name:
            continue

        units = (row.get("Affinity Units") or "").strip().lower()
        p_value = to_float(row.get("Affinity Median"))
        # GtoPdb affinities are p-scale (-log10 M); convert to nanomolar.
        value_nm = round(10 ** (9 - p_value), 4) if p_value is not None else None

        pmid = (row.get("PubMed ID") or "").strip() or None
        action = classify_action(row.get("Type", ""), row.get("Action", ""))

        rid = receptor["_id"]
        # Row index guarantees uniqueness: GtoPdb occasionally carries genuine
        # near-duplicate rows that would otherwise collide on a content hash.
        digest = hashlib.sha1(
            f"{idx}|{rid}|{lid}|{units}|{p_value}|{pmid}".encode()
        ).hexdigest()[:20]

        bioactivities.append(
            {
                "_id": digest,
                "receptorId": rid,
                "receptorUniprot": receptor["uniprot"],
                "receptorGene": receptor["gene"],
                "ligandId": ligand["_id"] if ligand else f"gtopdb:name:{ligand_name}",
                "ligandName": ligand_name,
                "ligandType": (row.get("Ligand Type") or "").strip() or None,
                "action": action,
                "actionRaw": (row.get("Action") or "").strip() or None,
                "typeRaw": (row.get("Type") or "").strip() or None,
                "assayType": ASSAY_FROM_UNITS.get(units, "Other"),
                "valueNm": value_nm,
                "pValue": round(p_value, 2) if p_value is not None else None,
                "relation": (row.get("Original Affinity Relation") or "").strip() or "=",
                "assayDescription": (row.get("Assay Description") or "").strip()[:400] or None,
                "isEndogenous": (row.get("Endogenous") or "").lower() == "true",
                "isPrimaryTarget": (row.get("Primary Target") or "").lower() == "true",
                "isApprovedDrug": (row.get("Approved") or "").lower() == "true",
                "selectivity": (row.get("Selectivity") or "").strip() or None,
                "referencePmid": pmid,
                "source": "GtoPdb",
            }
        )

        if ligand:
            used_ligands[ligand["_id"]] = ligand
        per_receptor[rid].add(ligand["_id"] if ligand else ligand_name)
        if pmid:
            refs_per_receptor[rid].add(pmid)
        if (row.get("Approved") or "").lower() == "true":
            approved_per_receptor[rid].add(ligand_name)

    print(f"\n{len(bioactivities)} interactions mapped onto {len(per_receptor)} receptors")
    print(f"  {len(used_ligands)} distinct ligands")
    print(f"  {sum(1 for b in bioactivities if b['valueNm'] is not None)} with a quantitative affinity")
    print(f"  {sum(1 for b in bioactivities if b['referencePmid'])} with a PubMed reference")

    # Fold per-receptor rollups back onto the receptor documents.
    for r in receptors:
        rid = r["_id"]
        r["ligandCount"] = len(per_receptor.get(rid, ()))
        r["approvedDrugCount"] = len(approved_per_receptor.get(rid, ()))
        r["approvedDrugs"] = sorted(approved_per_receptor.get(rid, ()))[:25]
        r["gtopdbReferenceCount"] = len(refs_per_receptor.get(rid, ()))
        # Seed the key-reference library; stage 5 tops it up from PubMed.
        r["keyReferences"] = sorted(refs_per_receptor.get(rid, ()))[:40]
        if per_receptor.get(rid):
            r["provenance"].append(PROVENANCE)

    write_out("receptors.json", receptors)
    write_out("ligands.json", list(used_ligands.values()))
    write_out("bioactivities.json", bioactivities)


if __name__ == "__main__":
    main()
