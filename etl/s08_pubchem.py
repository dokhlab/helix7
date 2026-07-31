"""Stage 8 — PubChem BioAssay: ligands and assays beyond GtoPdb/ChEMBL.

PubChem aggregates literature bioactivities (including much of ChEMBL) *and*
carries large deposited high-throughput screens and compounds that appear in no
other source. This stage pulls PubChem's target-mapped bioactivity for each
human receptor, keeps the quantitative measurements, and merges them with the
GtoPdb (stage 3) and ChEMBL (stage 7) data — resolving duplicates at two levels:

  * ligand   — deduplicated across sources by InChIKey, then name;
  * assay row — a PubChem measurement is dropped when an equivalent
                (same receptor, ligand, assay type and potency) already exists,
                so the heavy ChEMBL/PubChem overlap is not double-counted.

Source: https://pubchem.ncbi.nlm.nih.gov  (NCBI/NLM, public domain)
"""

from __future__ import annotations

import datetime as dt

from common import fetch_json, read_out, write_out
from s07_chembl import infer_action, recompute_rollups

PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

# PubChem activity names we keep, mapped to Helix7 assay types.
ASSAY_FROM_PC = {
    "Ki": "Ki",
    "IC50": "IC50",
    "EC50": "EC50",
    "Kd": "Kd",
    "AC50": "EC50",
    "Kb": "Other",
    "Potency": "Other",
}

MAX_CIDS_PER_RECEPTOR = 400
PC_DELAY = 0.25  # PubChem asks for <= 5 requests/second

PROVENANCE = {
    "source": "PubChem",
    "url": "https://pubchem.ncbi.nlm.nih.gov",
    "licence": "Public domain — NCBI/NLM PubChem",
    "retrievedAt": RETRIEVED,
}


def fetch_concise(accession: str) -> list[dict]:
    """Target-mapped bioactivity rows for a UniProt accession (concise table)."""
    data = fetch_json(
        f"{PUG}/protein/accession/{accession}/concise/JSON",
        timeout=120,
        delay=PC_DELAY,
    )
    if not data or "Table" not in data:
        return []
    tbl = data["Table"]
    cols = tbl["Columns"]["Column"]
    ix = {c: i for i, c in enumerate(cols)}
    out = []
    for row in tbl.get("Row", []):
        c = row["Cell"]
        atype = c[ix["Activity Name"]]
        if atype not in ASSAY_FROM_PC:
            continue
        raw = c[ix["Activity Value [uM]"]]
        if raw in ("", None):
            continue
        try:
            val_um = float(raw)
        except (TypeError, ValueError):
            continue
        cid = c[ix["CID"]]
        if not cid:
            continue
        out.append(
            {
                "cid": cid,
                "assayType": ASSAY_FROM_PC[atype],
                "valueNm": val_um * 1000.0,
                "pmid": (c[ix["PubMed ID"]] or "").strip() or None,
                "assayName": c[ix["Assay Name"]] or "",
                "outcome": c[ix["Activity Outcome"]],
            }
        )
    return out


def fetch_props(cids: list[str]) -> dict[str, dict]:
    """CID -> {title, inchikey, smiles} in batches."""
    props: dict[str, dict] = {}
    for i in range(0, len(cids), 100):
        chunk = cids[i : i + 100]
        data = fetch_json(
            f"{PUG}/compound/cid/{','.join(chunk)}/property/Title,InChIKey,CanonicalSMILES/JSON",
            timeout=90,
            delay=PC_DELAY,
        )
        for p in (data or {}).get("PropertyTable", {}).get("Properties", []):
            props[str(p["CID"])] = {
                "title": p.get("Title"),
                "inchikey": p.get("InChIKey"),
                "smiles": p.get("CanonicalSMILES"),
            }
    return props


def main() -> None:
    print("=== Helix7 ETL stage 8: PubChem ===")
    receptors = read_out("receptors.json")
    ligands = read_out("ligands.json")
    bioactivities = read_out("bioactivities.json")

    # Dedup indexes over the ligands already present (GtoPdb + ChEMBL).
    by_inchikey: dict[str, str] = {}
    by_name: dict[str, str] = {}
    by_cid: dict[str, str] = {}
    for lig in ligands:
        if lig.get("inchiKey"):
            by_inchikey[lig["inchiKey"]] = lig["_id"]
        if lig.get("name"):
            by_name.setdefault(lig["name"].strip().lower(), lig["_id"])
    ligand_by_id = {lig["_id"]: lig for lig in ligands}

    # Existing measurements, to drop PubChem duplicates of ChEMBL/GtoPdb rows.
    def sig(b) -> tuple:
        v = b.get("valueNm")
        return (b["receptorId"], b["ligandId"], b.get("assayType"),
                round(v, 1) if isinstance(v, (int, float)) else None)

    existing_sigs = {sig(b) for b in bioactivities}

    targets = [r for r in receptors if r.get("uniprot") and not r["isOlfactory"]]
    print(f"· querying PubChem for {len(targets)} receptors")

    # Pass 1: gather kept (receptor, cid, best-per-type) rows and all CIDs.
    per_receptor: dict[str, list[dict]] = {}
    all_cids: set[str] = set()
    for i, r in enumerate(targets, 1):
        rows = fetch_concise(r["uniprot"])
        if not rows:
            continue
        # keep the most potent measurement per (cid, assay type)
        best: dict[tuple[str, str], dict] = {}
        for row in rows:
            key = (row["cid"], row["assayType"])
            if key not in best or row["valueNm"] < best[key]["valueNm"]:
                best[key] = row
        # cap to the most potent distinct CIDs
        cid_best: dict[str, float] = {}
        for (cid, _), row in best.items():
            cid_best[cid] = min(cid_best.get(cid, 9e18), row["valueNm"])
        keep = set(sorted(cid_best, key=lambda c: cid_best[c])[:MAX_CIDS_PER_RECEPTOR])
        kept = [row for (cid, _), row in best.items() if cid in keep]
        per_receptor[r["_id"]] = kept
        all_cids.update(keep)
        if i % 40 == 0 or i == len(targets):
            print(f"  [{i}/{len(targets)}] {len(per_receptor)} receptors with data, {len(all_cids)} CIDs")

    # Compound names/structures for every kept CID.
    print(f"· resolving names for {len(all_cids)} PubChem compounds")
    props = fetch_props(sorted(all_cids))

    # Pass 2: build ligands + bioactivities with duplicate resolution.
    receptor_by_id = {r["_id"]: r for r in receptors}
    added_acts = 0
    added_ligs = 0
    receptors_hit = 0

    for rid, kept in per_receptor.items():
        r = receptor_by_id[rid]
        got = 0
        for row in kept:
            cid = row["cid"]
            p = props.get(cid, {})
            name = p.get("title") or f"CID {cid}"
            inchikey = p.get("inchikey")

            # ---- ligand dedup: InChIKey -> name -> prior PubChem CID ----
            lig_id = (
                (by_inchikey.get(inchikey) if inchikey else None)
                or by_name.get(name.strip().lower())
                or by_cid.get(cid)
            )
            if lig_id is None:
                lig_id = f"pubchem:{cid}"
                lig = {
                    "_id": lig_id,
                    "name": name,
                    "smiles": p.get("smiles"),
                    "inchiKey": inchikey,
                    "pubchemCid": cid,
                    "isApprovedDrug": False,
                    "source": "PubChem",
                }
                ligands.append(lig)
                ligand_by_id[lig_id] = lig
                added_ligs += 1
                by_cid[cid] = lig_id
                if inchikey:
                    by_inchikey[inchikey] = lig_id
                by_name.setdefault(name.strip().lower(), lig_id)

            value_nm = round(row["valueNm"], 4)
            s = (rid, lig_id, row["assayType"], round(value_nm, 1))
            if s in existing_sigs:  # equivalent measurement already ingested
                continue
            existing_sigs.add(s)

            p_val = None
            if value_nm and value_nm > 0:
                import math
                p_val = round(9 - math.log10(value_nm), 2)

            bioactivities.append(
                {
                    "_id": f"pubchem:{rid}:{cid}:{row['assayType']}",
                    "receptorId": rid,
                    "receptorUniprot": r["uniprot"],
                    "receptorGene": r["gene"],
                    "ligandId": lig_id,
                    "ligandName": name,
                    "action": infer_action(row["assayName"]),
                    "assayType": row["assayType"],
                    "valueNm": value_nm,
                    "pValue": p_val,
                    "relation": "=",
                    "assayDescription": (row["assayName"] or "")[:400] or None,
                    "referencePmid": row["pmid"],
                    "source": "PubChem",
                }
            )
            added_acts += 1
            got += 1
        if got:
            receptors_hit += 1
            r["provenance"].append(PROVENANCE)

    recompute_rollups(receptors, bioactivities, ligand_by_id)

    print(
        f"\nadded {added_acts} PubChem activities ({added_ligs} new ligands) "
        f"across {receptors_hit} receptors after de-duplication"
    )
    print(f"  totals: {len(ligands)} ligands, {len(bioactivities)} bioactivities")
    write_out("receptors.json", receptors)
    write_out("ligands.json", ligands)
    write_out("bioactivities.json", bioactivities)


if __name__ == "__main__":
    main()
