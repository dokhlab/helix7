"""Stage 90 — load the built documents into MongoDB and create indexes.

Idempotent: every collection is replaced wholesale, so re-running the pipeline
is always safe. Indexes are declared here rather than in the app so the web
process never needs write privileges on the schema.
"""

from __future__ import annotations

from pymongo import ASCENDING, DESCENDING, TEXT
from pymongo.errors import ServerSelectionTimeoutError

from common import MONGODB_DB, MONGODB_URI, get_db, read_out

BATCH = 1000


def replace_collection(db, name: str, docs: list[dict]) -> None:
    coll = db[name]
    coll.drop()
    if not docs:
        print(f"  {name}: nothing to load")
        return
    for i in range(0, len(docs), BATCH):
        coll.insert_many(docs[i : i + BATCH], ordered=False)
    print(f"  {name}: {coll.count_documents({}):,} documents")


def create_indexes(db) -> None:
    print("· creating indexes")

    db.receptors.create_index([("gene", ASCENDING)])
    db.receptors.create_index([("uniprot", ASCENDING)])
    db.receptors.create_index([("classification.classCode", ASCENDING)])
    db.receptors.create_index([("classification.grafs", ASCENDING)])
    db.receptors.create_index([("classification.familySlug", ASCENDING)])
    db.receptors.create_index([("isOlfactory", ASCENDING)])
    db.receptors.create_index([("devInterest.score", DESCENDING)])
    db.receptors.create_index([("devInterest.tdl", ASCENDING)])
    db.receptors.create_index([("organSystems", ASCENDING)])
    db.receptors.create_index([("structureCount", DESCENDING)])
    # Weighted text index powers the global search box; searchTerms carries the
    # UniProt biological/common names (see s10_synonyms.py).
    db.receptors.create_index(
        [("gene", TEXT), ("name", TEXT), ("geneSynonyms", TEXT),
         ("searchTerms", TEXT), ("uniprot", TEXT)],
        weights={"gene": 10, "name": 5, "geneSynonyms": 4, "searchTerms": 3, "uniprot": 2},
        name="receptor_search",
    )
    db.receptors.create_index([("searchCondensed", ASCENDING)])

    db.bioactivities.create_index([("receptorId", ASCENDING), ("pValue", DESCENDING)])
    db.bioactivities.create_index([("ligandId", ASCENDING)])
    db.bioactivities.create_index([("action", ASCENDING)])
    db.bioactivities.create_index([("referencePmid", ASCENDING)])

    db.ligands.create_index([("name", ASCENDING)])
    db.ligands.create_index([("isApprovedDrug", ASCENDING)])
    db.ligands.create_index([("name", TEXT), ("synonyms", TEXT)], name="ligand_search")

    print("  done")


def main() -> None:
    print("=== Helix7 ETL stage 90: load into MongoDB ===")
    print(f"· target: {MONGODB_URI}/{MONGODB_DB}")

    try:
        db = get_db()
        db.command("ping")
    except ServerSelectionTimeoutError as exc:
        raise SystemExit(
            f"cannot reach MongoDB at {MONGODB_URI}\n"
            "start it with: ./run  (or: docker-compose up -d)"
        ) from exc

    replace_collection(db, "receptors", read_out("receptors.json"))
    replace_collection(db, "ligands", read_out("ligands.json"))
    replace_collection(db, "bioactivities", read_out("bioactivities.json"))
    replace_collection(db, "tree", [read_out("tree.json")])
    replace_collection(db, "stats", [read_out("stats.json")])

    create_indexes(db)
    print("\nload complete")


if __name__ == "__main__":
    main()
