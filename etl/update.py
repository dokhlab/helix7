"""Scheduled data refresh for Helix7.

Clears the fetch cache so the pipeline pulls fresh data from every source, runs
the full ETL, and records the run in the `meta` collection so the site can show
when the dataset was last updated and whether the last refresh succeeded.

  python update.py                # full refresh (fresh downloads from all sources)
  python update.py --keep-cache   # reuse the on-disk cache (fast; for testing)
  python update.py --stages s03_gtopdb s04_opentargets   # refresh only some sources

Designed to be driven by cron / systemd / launchd / GitHub Actions — see
etl/deploy/ for ready-made schedules.
"""

from __future__ import annotations

import argparse
import datetime as dt
import shutil
import time
import traceback

from common import CACHE_DIR, get_db
import run_all

COUNT_COLLECTIONS = ["receptors", "ligands", "bioactivities"]

SOURCE_LABELS = [
    "GPCRdb",
    "Human Protein Atlas",
    "Guide to PHARMACOLOGY",
    "Open Targets",
    "PubMed",
]


def clear_cache(stages: list[str] | None) -> None:
    """Drop cached responses so the next run fetches fresh data.

    A full refresh wipes everything; a targeted refresh only removes the bulk
    downloads (GtoPdb / HPA), which are the large periodically-updated files.
    """
    if not CACHE_DIR.exists():
        return
    if stages:
        bulk = CACHE_DIR / "bulk"
        if bulk.exists():
            shutil.rmtree(bulk)
        print("· cleared bulk download cache (targeted refresh)")
    else:
        for p in CACHE_DIR.glob("*.json"):
            p.unlink()
        bulk = CACHE_DIR / "bulk"
        if bulk.exists():
            shutil.rmtree(bulk)
        print("· cleared full fetch cache")
    CACHE_DIR.mkdir(exist_ok=True)


def record_run(status: str, started: dt.datetime, duration: float, error: str | None) -> None:
    """Write the run outcome to the `meta` collection (id: 'dataset')."""
    try:
        db = get_db()
        counts = {c: db[c].count_documents({}) for c in COUNT_COLLECTIONS}
    except Exception as exc:  # noqa: BLE001
        print(f"  ! could not record run (DB unreachable): {exc}")
        return

    entry = {
        "startedAt": started.isoformat(),
        "finishedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "durationSec": round(duration, 1),
        "status": status,
        "counts": counts,
        "error": error,
    }

    db.meta.update_one(
        {"_id": "dataset"},
        {
            "$set": {
                "lastUpdated": entry["finishedAt"],
                "lastStatus": status,
                "lastDurationSec": entry["durationSec"],
                "counts": counts,
                "sources": SOURCE_LABELS,
            },
            # keep the trailing 24 runs
            "$push": {"history": {"$each": [entry], "$slice": -24}},
            "$setOnInsert": {"_id": "dataset"},
        },
        upsert=True,
    )
    print(f"· recorded run in meta: {status}, {counts}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--keep-cache", action="store_true", help="reuse the fetch cache")
    ap.add_argument(
        "--stages",
        nargs="+",
        choices=[s for s, _ in run_all.STAGES],
        help="refresh only these stages (always re-runs derive + load)",
    )
    args = ap.parse_args()

    started = dt.datetime.now(dt.timezone.utc)
    t0 = time.time()
    print(f"=== Helix7 data refresh — {started.isoformat()} ===")

    if not args.keep_cache:
        clear_cache(args.stages)

    # Decide which stages to run. A targeted refresh still needs the derive +
    # load stages so aggregates and the DB reflect the new data.
    if args.stages:
        wanted = set(args.stages) | {"s05_score", "s06_derive", "s90_load"}
        names = [s for s, _ in run_all.STAGES if s in wanted]
    else:
        names = [s for s, _ in run_all.STAGES]

    status, error = "success", None
    try:
        code = run_all.run(names)
        if code != 0:
            status, error = "failed", f"pipeline exited with code {code}"
    except Exception as exc:  # noqa: BLE001
        status = "failed"
        error = f"{type(exc).__name__}: {exc}"
        traceback.print_exc()
        code = 1

    record_run(status, started, time.time() - t0, error)
    print(f"=== refresh {status} in {time.time() - t0:.0f}s ===")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
