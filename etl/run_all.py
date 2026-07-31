"""Run the full Helix7 pipeline, in order.

Every stage is cached on disk, so re-running is cheap and network failures are
recoverable — fix the problem and run again; completed work is not repeated.

  python run_all.py                 run every stage
  python run_all.py --from s04      resume from a stage
  python run_all.py --only s03 s90  run specific stages
"""

from __future__ import annotations

import argparse
import importlib
import sys
import time

STAGES = [
    ("s01_gpcrdb", "GPCRdb receptors, classification, structures"),
    ("s02_hpa", "Human Protein Atlas tissue expression"),
    ("s03_gtopdb", "Guide to Pharmacology ligands and assays"),
    ("s07_chembl", "ChEMBL bioactivities and ligands"),
    ("s08_pubchem", "PubChem bioactivities and ligands"),
    ("s04_opentargets", "Open Targets disease associations"),
    ("s05_score", "Development-interest score"),
    ("s06_derive", "Classification tree and global stats"),
    ("s90_load", "Load into MongoDB"),
]


def run(names: list[str]) -> int:
    started = time.time()
    for name in names:
        desc = dict(STAGES).get(name, "")
        print(f"\n{'=' * 70}\n{name} — {desc}\n{'=' * 70}")
        stage_start = time.time()
        try:
            module = importlib.import_module(name)
            module.main()
        except SystemExit as exc:
            if exc.code:
                print(f"\n! {name} stopped: {exc}")
                return int(exc.code)
        except Exception as exc:  # noqa: BLE001
            print(f"\n! {name} failed: {type(exc).__name__}: {exc}")
            return 1
        print(f"[{name} took {time.time() - stage_start:.1f}s]")

    print(f"\n{'=' * 70}")
    print(f"pipeline complete in {time.time() - started:.1f}s")
    return 0


def main() -> int:
    order = [s for s, _ in STAGES]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from", dest="start", choices=order, help="resume from a stage")
    ap.add_argument("--only", nargs="+", choices=order, help="run only these stages")
    args = ap.parse_args()

    if args.only:
        names = [s for s in order if s in set(args.only)]
    elif args.start:
        names = order[order.index(args.start) :]
    else:
        names = order

    return run(names)


if __name__ == "__main__":
    sys.exit(main())
