"""Stage 7 — ChEMBL: bioactivities and ligands (coverage beyond GtoPdb).

The Guide to PHARMACOLOGY is expertly curated but selective; many well-studied
ligands with quantitative human data are absent from it (e.g. dihydrexidine at
the D1 receptor). ChEMBL is the comprehensive, structured medicinal-chemistry
bioactivity database and target-maps cleanly to human GPCRs, so it fills those
gaps. This stage resolves each receptor's ChEMBL single-protein target from its
UniProt accession, pulls the most potent standardised activities, and merges
them with the GtoPdb ligands/bioactivities from stage 3 — deduplicating ligands
across sources by InChIKey / ChEMBL id.

Source: https://www.ebi.ac.uk/chembl/  (CC BY-SA 3.0)
"""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from common import fetch_json, read_out, write_out

API = "https://www.ebi.ac.uk/chembl/api/data"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

# Standardised potency types we keep, mapped to Helix7 assay types.
ASSAY_FROM_TYPE = {
    "Ki": "Ki",
    "IC50": "IC50",
    "EC50": "EC50",
    "Kd": "Kd",
    "AC50": "EC50",
    "Kb": "Other",
    "Potency": "Other",
}

# How many distinct molecules to keep per receptor (most potent first). Keeps the
# resource curated and performant rather than a full ChEMBL mirror.
MAX_MOLECULES_PER_RECEPTOR = 500

PROVENANCE = {
    "source": "ChEMBL",
    "url": "https://www.ebi.ac.uk/chembl/",
    "licence": "CC BY-SA 3.0 — ChEMBL, EMBL-EBI",
    "retrievedAt": RETRIEVED,
}


def resolve_target(accession: str) -> str | None:
    """UniProt accession -> ChEMBL SINGLE PROTEIN human target id."""
    data = fetch_json(
        f"{API}/target.json",
        {
            "target_components__accession": accession,
            "target_type": "SINGLE PROTEIN",
            "organism": "Homo sapiens",
            "limit": 5,
        },
        timeout=45,
    )
    if not data or not data.get("targets"):
        return None
    return data["targets"][0]["target_chembl_id"]


def infer_action(desc: str | None) -> str:
    d = (desc or "").lower()
    if "inverse agonist" in d:
        return "Inverse agonist"
    if "partial agonist" in d:
        return "Partial agonist"
    if "positive allosteric" in d:
        return "Positive allosteric modulator"
    if "negative allosteric" in d:
        return "Negative allosteric modulator"
    if "allosteric" in d:
        return "Allosteric modulator"
    if "antagonist" in d:
        return "Antagonist"
    if "agonist" in d:
        return "Agonist"
    return "Unknown"


def fetch_activities(target_id: str) -> list[dict]:
    """Most-potent standardised activities for a target (paged until the cap)."""
    kept: list[dict] = []
    seen_mol: set[str] = set()
    offset = 0
    page = 1000
    types = ",".join(ASSAY_FROM_TYPE)

    while True:
        data = fetch_json(
            f"{API}/activity.json",
            {
                "target_chembl_id": target_id,
                "standard_type__in": types,
                "pchembl_value__isnull": "false",
                "order_by": "-pchembl_value",
                "limit": page,
                "offset": offset,
            },
            timeout=90,
        )
        if not data or not data.get("activities"):
            break
        for a in data["activities"]:
            mol = a.get("molecule_chembl_id")
            if not mol:
                continue
            seen_mol.add(mol)
            kept.append(a)
        # stop once we've seen enough distinct molecules, or no more pages
        if len(seen_mol) >= MAX_MOLECULES_PER_RECEPTOR:
            break
        meta = data.get("page_meta") or {}
        if not meta.get("next"):
            break
        offset += page
    return kept


def main() -> None:
    print("=== Helix7 ETL stage 7: ChEMBL ===")
    receptors = read_out("receptors.json")
    ligands = read_out("ligands.json")
    bioactivities = read_out("bioactivities.json")

    # Index existing (GtoPdb) ligands so we can dedupe across sources.
    by_inchikey: dict[str, str] = {}
    by_chembl: dict[str, str] = {}
    for lig in ligands:
        if lig.get("inchiKey"):
            by_inchikey[lig["inchiKey"]] = lig["_id"]
        if lig.get("chemblId"):
            by_chembl[lig["chemblId"]] = lig["_id"]
    ligand_by_id = {lig["_id"]: lig for lig in ligands}

    added_acts = 0
    receptors_hit = 0

    # Only non-olfactory receptors carry meaningful ChEMBL data; skip the rest to
    # save thousands of empty lookups.
    targets = [r for r in receptors if r.get("uniprot") and not r["isOlfactory"]]
    print(f"· querying ChEMBL for {len(targets)} receptors")

    for i, r in enumerate(targets, 1):
        target_id = resolve_target(r["uniprot"])
        if not target_id:
            continue
        r["chemblTargetId"] = target_id
        acts = fetch_activities(target_id)
        if not acts:
            continue

        # Keep the single most-potent activity per (molecule, assay type).
        best: dict[tuple[str, str], dict] = {}
        for a in acts:
            mol = a["molecule_chembl_id"]
            atype = ASSAY_FROM_TYPE.get(a.get("standard_type"), "Other")
            key = (mol, atype)
            p = a.get("pchembl_value")
            if p is None:
                continue
            if key not in best or float(p) > float(best[key].get("pchembl_value") or 0):
                best[key] = a

        # Respect the per-receptor molecule cap (most potent molecules first).
        mol_best_p: dict[str, float] = {}
        for (mol, _), a in best.items():
            mol_best_p[mol] = max(mol_best_p.get(mol, 0), float(a.get("pchembl_value") or 0))
        keep_mols = set(
            sorted(mol_best_p, key=lambda m: mol_best_p[m], reverse=True)[
                :MAX_MOLECULES_PER_RECEPTOR
            ]
        )

        rid = r["_id"]
        for (mol, atype), a in best.items():
            if mol not in keep_mols:
                continue

            # Resolve / create the ligand, deduping against existing entries.
            inchikey = a.get("standard_inchi_key")
            lig_id = by_chembl.get(mol) or (by_inchikey.get(inchikey) if inchikey else None)
            name = a.get("molecule_pref_name") or mol
            if lig_id is None:
                lig_id = f"chembl:{mol}"
                if lig_id not in ligand_by_id:
                    lig = {
                        "_id": lig_id,
                        "name": name,
                        "smiles": a.get("canonical_smiles"),
                        "inchiKey": inchikey,
                        "chemblId": mol,
                        "gtopdbId": None,
                        "isApprovedDrug": False,
                        "source": "ChEMBL",
                    }
                    ligands.append(lig)
                    ligand_by_id[lig_id] = lig
                    by_chembl[mol] = lig_id
                    if inchikey:
                        by_inchikey[inchikey] = lig_id

            p = a.get("pchembl_value")
            value_nm = a.get("standard_value")
            try:
                value_nm = float(value_nm) if value_nm is not None else None
            except (TypeError, ValueError):
                value_nm = None

            bioactivities.append(
                {
                    "_id": f"chembl:{a['activity_id']}",
                    "receptorId": rid,
                    "receptorUniprot": r["uniprot"],
                    "receptorGene": r["gene"],
                    "ligandId": lig_id,
                    "ligandName": name,
                    "action": infer_action(a.get("assay_description")),
                    "assayType": atype,
                    "valueNm": round(value_nm, 4) if value_nm is not None else None,
                    "pValue": round(float(p), 2) if p is not None else None,
                    "relation": a.get("standard_relation") or "=",
                    "assayDescription": (a.get("assay_description") or "")[:400] or None,
                    "referencePmid": None,  # resolved below in bulk
                    "referenceDoc": a.get("document_chembl_id"),
                    "referenceYear": a.get("document_year"),
                    "source": "ChEMBL",
                }
            )
            added_acts += 1

        receptors_hit += 1
        if i % 40 == 0 or i == len(targets):
            print(f"  [{i}/{len(targets)}] {receptors_hit} with data, {added_acts} activities so far")

    # Resolve PubMed IDs for the ChEMBL documents we kept (batched).
    resolve_pmids(bioactivities)

    # Recompute per-receptor rollups from the COMBINED bioactivity set.
    recompute_rollups(receptors, bioactivities, ligand_by_id)

    for r in receptors:
        if r.get("chemblTargetId"):
            r["provenance"].append(PROVENANCE)

    print(
        f"\nadded {added_acts} ChEMBL activities across {receptors_hit} receptors; "
        f"{len(ligands)} total ligands, {len(bioactivities)} total bioactivities"
    )
    write_out("receptors.json", receptors)
    write_out("ligands.json", ligands)
    write_out("bioactivities.json", bioactivities)


def resolve_pmids(bioactivities: list[dict]) -> None:
    """Fill referencePmid for ChEMBL rows by resolving their documents in bulk."""
    docs = sorted(
        {
            b["referenceDoc"]
            for b in bioactivities
            if b.get("source") == "ChEMBL" and b.get("referenceDoc")
        }
    )
    if not docs:
        return
    print(f"· resolving PubMed IDs for {len(docs)} ChEMBL documents")
    pmid_of: dict[str, str] = {}
    for i in range(0, len(docs), 50):
        chunk = docs[i : i + 50]
        data = fetch_json(
            f"{API}/document.json",
            {"document_chembl_id__in": ",".join(chunk), "limit": 50},
            timeout=60,
        )
        for d in (data or {}).get("documents", []):
            if d.get("pubmed_id"):
                pmid_of[d["document_chembl_id"]] = str(d["pubmed_id"])
    for b in bioactivities:
        if b.get("source") == "ChEMBL" and b.get("referenceDoc") in pmid_of:
            b["referencePmid"] = pmid_of[b["referenceDoc"]]


def recompute_rollups(receptors, bioactivities, ligand_by_id) -> None:
    """Recompute ligand/reference/drug counts per receptor over all sources."""
    ligs = defaultdict(set)
    refs = defaultdict(set)
    approved = defaultdict(set)
    for b in bioactivities:
        rid = b["receptorId"]
        ligs[rid].add(b["ligandId"])
        if b.get("referencePmid"):
            refs[rid].add(b["referencePmid"])
        lig = ligand_by_id.get(b["ligandId"])
        if (lig and lig.get("isApprovedDrug")) or b.get("isApprovedDrug"):
            approved[rid].add(b["ligandName"])

    for r in receptors:
        rid = r["_id"]
        r["ligandCount"] = len(ligs.get(rid, ()))
        r["approvedDrugCount"] = len(approved.get(rid, ()))
        r["approvedDrugs"] = sorted(approved.get(rid, ()))[:25]
        # Union of references (GtoPdb + ChEMBL), capped.
        r["keyReferences"] = sorted(refs.get(rid, ()))[:60]
        # De-duplicate provenance by source (stages may run more than once).
        seen: set[str] = set()
        r["provenance"] = [
            p for p in r.get("provenance", [])
            if not (p["source"] in seen or seen.add(p["source"]))
        ]


if __name__ == "__main__":
    main()
