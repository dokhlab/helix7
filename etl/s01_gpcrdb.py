"""Stage 1 — GPCRdb: the receptor spine.

Pulls every human GPCR across all classes, its position in the classification
hierarchy, its sequence, and every experimental structure solved for it.
This stage defines the _id space (`entry_name`) that all later stages join on.

Source: https://gpcrdb.org/services/  (cite Kooistra et al., NAR 2021)
"""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from common import fetch_json, strip_html, write_out

BASE = "https://gpcrdb.org/services"
SPECIES = "Homo sapiens"
RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

# GPCRdb class slug -> (short code, GRAFS grouping)
CLASS_MAP: dict[str, tuple[str, str]] = {
    "001": ("A", "Rhodopsin"),
    "002": ("B1", "Secretin"),
    "003": ("B2", "Adhesion"),
    "004": ("C", "Glutamate"),
    "005": ("D1", "Other"),
    "006": ("F", "Frizzled"),
    "007": ("O1", "Olfactory"),
    "008": ("O2", "Olfactory"),
    "009": ("T2", "Taste2"),
    "010": ("Other", "Other"),
}

# GPCRdb designates orphan receptors with dedicated family nodes: a receptor
# whose lineage passes through one of these has no known endogenous ligand.
ORPHAN_FAMILY_SLUGS = {"001_010", "004_004", "010_001"}

PROVENANCE = {
    "source": "GPCRdb",
    "url": "https://gpcrdb.org",
    "licence": "CC BY 4.0 — cite Kooistra et al. Nucleic Acids Res 2021",
    "retrievedAt": RETRIEVED,
}


def load_family_tree() -> dict[str, dict]:
    """slug -> {slug, name, parent_slug} for all 1000+ classification nodes."""
    print("· fetching classification hierarchy")
    raw = fetch_json(f"{BASE}/proteinfamily/") or []
    nodes: dict[str, dict] = {}
    for node in raw:
        nodes[node["slug"]] = {
            "slug": node["slug"],
            "name": strip_html(node["name"]),
            "nameHtml": node["name"],
            "parent": (node.get("parent") or {}).get("slug"),
        }
    print(f"  {len(nodes)} family nodes")
    return nodes


def lineage_for(slug: str, nodes: dict[str, dict]) -> list[dict]:
    """Ancestry from the top-level class down to this node."""
    chain: list[dict] = []
    cur = slug
    seen = set()
    while cur and cur in nodes and cur not in seen and cur != "000":
        seen.add(cur)
        chain.append({"slug": cur, "name": nodes[cur]["name"]})
        cur = nodes[cur].get("parent")
    return list(reversed(chain))


def load_structures() -> dict[str, list[dict]]:
    """All GPCR structures, grouped by receptor entry_name."""
    print("· fetching structures")
    raw = fetch_json(f"{BASE}/structure/") or []
    by_protein: dict[str, list[dict]] = defaultdict(list)
    for s in raw:
        entry = s.get("protein")
        if not entry:
            continue
        ligands = []
        for lig in s.get("ligands") or []:
            ligands.append(
                {
                    "name": strip_html(lig.get("name")),
                    "type": lig.get("type"),
                    "function": lig.get("function"),
                    "pdbChemId": lig.get("PDB"),
                    "smiles": lig.get("SMILES"),
                }
            )
        by_protein[entry].append(
            {
                "pdbId": s.get("pdb_code"),
                "method": s.get("type"),
                "resolutionA": s.get("resolution"),
                "state": s.get("state"),
                "publicationDate": s.get("publication_date"),
                "publicationUrl": s.get("publication"),
                "preferredChain": s.get("preferred_chain"),
                "ligands": ligands,
            }
        )
    for entries in by_protein.values():
        # Best resolution first; cryo-EM entries with null resolution sort last.
        entries.sort(key=lambda x: (x["resolutionA"] is None, x["resolutionA"] or 99))
    print(f"  {len(raw)} structures across {len(by_protein)} receptors")
    return by_protein


def load_receptors(nodes: dict[str, dict]) -> list[dict]:
    """Human receptors for every top-level class."""
    receptors: list[dict] = []
    for class_slug in CLASS_MAP:
        url = f"{BASE}/proteinfamily/proteins/{class_slug}/{SPECIES}/"
        data = fetch_json(url) or []
        label = nodes.get(class_slug, {}).get("name", class_slug)
        print(f"· class {class_slug} ({label}): {len(data)} human receptors")
        for p in data:
            p["_class_slug"] = class_slug
        receptors.extend(data)
    return receptors


def build_documents() -> list[dict]:
    nodes = load_family_tree()
    structures = load_structures()
    raw_receptors = load_receptors(nodes)

    docs: list[dict] = []
    seen: set[str] = set()

    for p in raw_receptors:
        entry = p.get("entry_name")
        if not entry or entry in seen:
            continue
        seen.add(entry)

        class_slug = p["_class_slug"]
        code, grafs = CLASS_MAP[class_slug]
        family_slug = p.get("family") or class_slug
        lineage = lineage_for(family_slug, nodes)

        # lineage[0] is the class; [1] ligand type; [2] family; [3] the receptor node.
        def level(i: int) -> dict | None:
            return lineage[i] if len(lineage) > i else None

        ligand_type = level(1)
        family = level(2)

        is_orphan = any(node["slug"] in ORPHAN_FAMILY_SLUGS for node in lineage)

        genes = p.get("genes") or []
        gene = genes[0] if genes else entry.split("_")[0].upper()
        uniprot = p.get("accession") or ""
        sequence = p.get("sequence") or ""
        struct_list = structures.get(entry, [])

        docs.append(
            {
                "_id": entry,
                "entryName": entry,
                "gene": gene,
                "geneSynonyms": genes[1:],
                "uniprot": uniprot,
                "name": strip_html(p.get("name")),
                "nameHtml": p.get("name") or "",
                "sequence": sequence,
                "seqLength": len(sequence),
                "classification": {
                    "classSlug": class_slug,
                    "class": nodes.get(class_slug, {}).get("name", ""),
                    "classCode": code,
                    "grafs": grafs,
                    "ligandTypeSlug": ligand_type["slug"] if ligand_type else None,
                    "ligandType": ligand_type["name"] if ligand_type else None,
                    "familySlug": family["slug"] if family else None,
                    "family": family["name"] if family else None,
                    "slug": family_slug,
                    "lineage": lineage,
                },
                "isOlfactory": code in ("O1", "O2"),
                "isSensory": code in ("O1", "O2", "T2"),
                "isOrphan": is_orphan,
                "structures": struct_list,
                "structureCount": len(struct_list),
                "hasExperimentalStructure": bool(struct_list),
                "alphafoldUrl": (
                    f"https://alphafold.ebi.ac.uk/files/AF-{uniprot}-F1-model_v4.cif"
                    if uniprot
                    else None
                ),
                "gProteinCoupling": [],
                "expression": [],
                "organSystems": [],
                "diseases": [],
                "mutations": [],
                "keyReferences": [],
                "provenance": [PROVENANCE],
                "updatedAt": RETRIEVED,
            }
        )

    return docs


def main() -> None:
    print("=== Helix7 ETL stage 1: GPCRdb ===")
    docs = build_documents()

    olfactory = sum(1 for d in docs if d["isOlfactory"])
    with_struct = sum(1 for d in docs if d["hasExperimentalStructure"])
    print(
        f"\n{len(docs)} human receptors "
        f"({len(docs) - olfactory} non-olfactory, {olfactory} olfactory); "
        f"{with_struct} have an experimental structure"
    )
    write_out("receptors.json", docs)


if __name__ == "__main__":
    main()
