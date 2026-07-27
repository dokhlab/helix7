"""Stage 6 — precomputed aggregates.

Builds the classification tree used by the radial phylogeny visualisation and
the global counters on the homepage. Doing this once at load time keeps the
tree endpoint a single document read instead of an 800-document aggregation.
"""

from __future__ import annotations

import datetime as dt
from collections import defaultdict

from common import read_out, write_out

RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

CLASS_ORDER = ["A", "B1", "B2", "C", "F", "T2", "O1", "O2", "D1", "Other"]
CLASS_LABEL = {
    "A": "Class A · Rhodopsin",
    "B1": "Class B1 · Secretin",
    "B2": "Class B2 · Adhesion",
    "C": "Class C · Glutamate",
    "D1": "Class D1 · Fungal pheromone",
    "F": "Class F · Frizzled",
    "T2": "Class T2 · Taste 2",
    "O1": "Class O1 · Odorant (fish-like)",
    "O2": "Class O2 · Odorant (tetrapod)",
    "Other": "Other GPCRs",
}


def build_tree(receptors: list[dict]) -> dict:
    """Nested class -> ligand type -> family -> receptor tree."""
    root: dict = {"slug": "000", "name": "GPCRome", "children": []}
    class_nodes: dict[str, dict] = {}
    mid_nodes: dict[str, dict] = {}

    for r in sorted(receptors, key=lambda x: x["gene"]):
        c = r["classification"]
        code = c["classCode"]

        cls = class_nodes.get(code)
        if cls is None:
            cls = {
                "slug": c["classSlug"],
                "name": CLASS_LABEL.get(code, c["class"]),
                "classCode": code,
                "grafs": c["grafs"],
                "children": [],
            }
            class_nodes[code] = cls
            root["children"].append(cls)

        # Collapse to two intermediate levels: ligand type, then family.
        parent = cls
        for key in ("ligandTypeSlug", "familySlug"):
            slug = c.get(key)
            if not slug or slug == c["classSlug"]:
                continue
            label = c.get("ligandType" if key == "ligandTypeSlug" else "family")
            node = mid_nodes.get(slug)
            if node is None:
                node = {
                    "slug": slug,
                    "name": label or slug,
                    "classCode": code,
                    "grafs": c["grafs"],
                    "children": [],
                }
                mid_nodes[slug] = node
                parent["children"].append(node)
            parent = node

        parent["children"].append(
            {
                "slug": c["slug"],
                "name": r["name"] or r["gene"],
                "classCode": code,
                "grafs": c["grafs"],
                "receptorId": r["_id"],
                "gene": r["gene"],
                "devScore": (r.get("devInterest") or {}).get("score", 0),
                "tdl": (r.get("devInterest") or {}).get("tdl", "Unknown"),
                "structureCount": r.get("structureCount", 0),
                "ligandCount": r.get("ligandCount", 0),
            }
        )

    order = {c: i for i, c in enumerate(CLASS_ORDER)}
    root["children"].sort(key=lambda n: order.get(n.get("classCode", ""), 99))
    return root


def count_leaves(node: dict) -> int:
    if "receptorId" in node:
        return 1
    return sum(count_leaves(c) for c in node.get("children", []))


def annotate_counts(node: dict) -> None:
    if "receptorId" in node:
        return
    for child in node.get("children", []):
        annotate_counts(child)
    node["leafCount"] = count_leaves(node)


def build_stats(receptors: list[dict], ligands: list[dict], acts: list[dict]) -> dict:
    by_class: dict[str, int] = defaultdict(int)
    for r in receptors:
        by_class[r["classification"]["classCode"]] += 1

    olfactory = sum(1 for r in receptors if r["isOlfactory"])
    orphan = sum(1 for r in receptors if r.get("isOrphan"))
    diseases = {
        d["diseaseId"]
        for r in receptors
        for d in (r.get("diseases") or [])
        if d.get("diseaseId")
    }

    return {
        "_id": "global",
        "receptorCount": len(receptors),
        "nonOlfactoryCount": len(receptors) - olfactory,
        "olfactoryCount": olfactory,
        "orphanCount": orphan,
        "structureCount": sum(r.get("structureCount", 0) for r in receptors),
        "receptorsWithStructure": sum(
            1 for r in receptors if r.get("hasExperimentalStructure")
        ),
        "receptorsWithLigands": sum(1 for r in receptors if r.get("ligandCount")),
        "receptorsWithExpression": sum(1 for r in receptors if r.get("expression")),
        "ligandCount": len(ligands),
        "approvedDrugCount": sum(1 for l in ligands if l.get("isApprovedDrug")),
        "bioactivityCount": len(acts),
        "quantitativeAssayCount": sum(1 for a in acts if a.get("valueNm") is not None),
        "referencedAssayCount": sum(1 for a in acts if a.get("referencePmid")),
        "diseaseCount": len(diseases),
        "byClass": [
            {
                "classCode": code,
                "label": CLASS_LABEL.get(code, code),
                "count": by_class[code],
            }
            for code in CLASS_ORDER
            if by_class.get(code)
        ],
        "byTdl": {
            tdl: sum(
                1 for r in receptors if (r.get("devInterest") or {}).get("tdl") == tdl
            )
            for tdl in ("Tclin", "Tchem", "Tbio", "Tdark")
        },
        "computedAt": RETRIEVED,
    }


def main() -> None:
    print("=== Helix7 ETL stage 6: derived aggregates ===")
    receptors = read_out("receptors.json")
    ligands = read_out("ligands.json")
    acts = read_out("bioactivities.json")

    tree = build_tree(receptors)
    annotate_counts(tree)
    tree["_id"] = "classification"
    print(f"· tree: {len(tree['children'])} classes, {count_leaves(tree)} leaves")

    stats = build_stats(receptors, ligands, acts)
    print(f"· stats: {stats['receptorCount']} receptors, {stats['byTdl']}")

    write_out("tree.json", tree)
    write_out("stats.json", stats)


if __name__ == "__main__":
    main()
