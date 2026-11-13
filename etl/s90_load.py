"""Stage 90 — load the generated Helix7 dataset into MariaDB."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from common import MYSQL_DATABASE, MYSQL_HOST, get_db, read_out

BATCH = 1000


def compact_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def receptor_row(doc: dict) -> tuple:
    classification = doc.get("classification") or {}
    dev = doc.get("devInterest") or {}
    search_terms = doc.get("searchTerms") or []
    search_norm = doc.get("searchNorm") or ""
    search_condensed = doc.get("searchCondensed") or ""
    gene_synonyms = " ".join(doc.get("geneSynonyms") or [])
    if not search_terms:
        search_terms = [
            value for value in (
                doc.get("gene"), doc.get("name"),
                *(doc.get("geneSynonyms") or []), doc.get("uniprot"),
            ) if value
        ]
    if not search_norm:
        search_norm = " ".join(str(value) for value in search_terms)
    if not search_condensed:
        search_condensed = search_norm.replace(" ", "")
    return (
        doc.get("_id", ""), doc.get("gene", ""), doc.get("name", ""),
        doc.get("nameHtml", ""), doc.get("uniprot", ""),
        classification.get("classCode", ""), classification.get("class", ""),
        classification.get("grafs", ""), classification.get("family"),
        classification.get("familySlug"), int(bool(doc.get("isOlfactory"))),
        int(bool(doc.get("isOrphan"))), int(doc.get("structureCount") or 0),
        int(bool(doc.get("hasExperimentalStructure"))), doc.get("ligandCount"),
        doc.get("approvedDrugCount"), compact_json(doc.get("organSystems", [])),
        doc.get("diseaseCount"), dev.get("score"), dev.get("tdl"),
        " ".join(str(value) for value in (doc.get("gene"), doc.get("name"), gene_synonyms, doc.get("uniprot")) if value),
        " ".join(str(value) for value in search_terms), search_norm,
        search_condensed,
        compact_json(doc), doc.get("updatedAt"),
    )


def ligand_row(doc: dict) -> tuple:
    return (doc.get("_id", ""), doc.get("name", ""),
            int(bool(doc.get("isApprovedDrug"))), compact_json(doc))


def bioactivity_row(doc: dict) -> tuple:
    return (doc.get("_id", ""), doc.get("receptorId", ""),
            doc.get("ligandId"), doc.get("action"), doc.get("pValue"),
            doc.get("referencePmid"), compact_json(doc))


def replace_table(cursor, table: str, columns: str, rows: list[tuple]) -> None:
    cursor.execute(f"DELETE FROM {table}")
    if rows:
        placeholders = ",".join(["%s"] * len(rows[0]))
        cursor.executemany(
            f"INSERT INTO {table} ({columns}) VALUES ({placeholders})",
            rows,
        )
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"  {table}: {count:,} rows")


def main() -> None:
    print(f"=== Helix7 ETL stage 90: load into {MYSQL_HOST}/{MYSQL_DATABASE} ===")
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        receptors = read_out("receptors.json")
        ligands = read_out("ligands.json")
        bioactivities = read_out("bioactivities.json")
        replace_table(
            cursor, "receptors",
            "id, gene, name, name_html, uniprot, class_code, class_name, grafs, "
            "family, family_slug, is_olfactory, is_orphan, structure_count, "
            "has_experimental_structure, ligand_count, approved_drug_count, "
            "organ_systems_json, disease_count, dev_score, dev_tdl, "
            "gene_synonyms_text, search_terms_text, search_norm, "
            "search_condensed, payload_json, updated_at",
            [receptor_row(doc) for doc in receptors],
        )
        replace_table(
            cursor, "ligands", "id, name, is_approved_drug, payload_json",
            [ligand_row(doc) for doc in ligands],
        )
        replace_table(
            cursor, "bioactivities",
            "id, receptor_id, ligand_id, action, p_value, reference_pmid, payload_json",
            [bioactivity_row(doc) for doc in bioactivities],
        )
        for key, filename in (("tree", "tree.json"), ("stats", "stats.json")):
            cursor.execute(
                "INSERT INTO singleton_json (id, payload_json) VALUES (%s, %s) "
                "ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)",
                (key, compact_json(read_out(filename))),
            )

        counts = {}
        for table in ("receptors", "ligands", "bioactivities"):
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = int(cursor.fetchone()[0])
        metadata = {
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "lastStatus": "success",
            "counts": counts,
            "sources": [
                "GPCRdb", "Human Protein Atlas", "HPA single-cell",
                "Guide to PHARMACOLOGY", "Open Targets", "ChEMBL", "PubChem",
                "UniProt",
            ],
            "sourceSnapshot": "helix7-v3",
        }
        cursor.execute(
            "INSERT INTO dataset_meta (id, payload_json) VALUES (%s, %s) "
            "ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json)",
            ("dataset", compact_json(metadata)),
        )
        conn.commit()
        print("\nload complete")
    except Exception:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    main()
