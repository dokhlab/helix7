"""Stage 9 — primary G-protein coupling (curated, canonical).

Neither the GPCRdb REST API nor the GtoPdb CSVs expose G-protein coupling in an
ingestible form, so Helix7 assigns the *primary* transducer for the
well-characterised receptor families from canonical pharmacology (the coupling
of, e.g., β-adrenoceptors to Gs or µ-opioid to Gi/o is textbook and stable).
Receptors outside the curated set are left unannotated rather than guessed, and
the UI links out to GPCRdb for those.

Assignments are per gene symbol, plus a few prefix rules (chemokine, opioid).
Many receptors couple to more than one family; the list gives the primary
transducer(s).
"""

from __future__ import annotations

import datetime as dt

from common import read_out, write_out

RETRIEVED = dt.datetime.now(dt.timezone.utc).isoformat()

PROVENANCE = {
    "source": "GtoPdb",
    "url": "https://www.guidetopharmacology.org",
    "licence": "Curated from canonical pharmacology (IUPHAR/BPS)",
    "retrievedAt": RETRIEVED,
}

# gene -> [primary G-protein families]
COUPLING: dict[str, list[str]] = {}


def _add(genes: str, families: list[str]) -> None:
    for g in genes.split():
        COUPLING[g] = families


# --- Aminergic (class A) ---
_add("ADRB1 ADRB2 ADRB3", ["Gs"])
_add("ADRA2A ADRA2B ADRA2C", ["Gi/Go"])
_add("ADRA1A ADRA1B ADRA1D", ["Gq/G11"])
_add("DRD1 DRD5", ["Gs"])
_add("DRD2 DRD3 DRD4", ["Gi/Go"])
_add("HTR1A HTR1B HTR1D HTR1E HTR1F HTR5A", ["Gi/Go"])
_add("HTR2A HTR2B HTR2C", ["Gq/G11"])
_add("HTR4 HTR6 HTR7", ["Gs"])
_add("CHRM1 CHRM3 CHRM5", ["Gq/G11"])
_add("CHRM2 CHRM4", ["Gi/Go"])
_add("HRH1", ["Gq/G11"])
_add("HRH2", ["Gs"])
_add("HRH3 HRH4", ["Gi/Go"])
_add("TAAR1", ["Gs"])

# --- Lipid / nucleotide / opioid (class A) ---
_add("OPRM1 OPRD1 OPRK1 OPRL1", ["Gi/Go"])
_add("ADORA1 ADORA3", ["Gi/Go"])
_add("ADORA2A ADORA2B", ["Gs"])
_add("CNR1 CNR2", ["Gi/Go"])
_add("MTNR1A MTNR1B", ["Gi/Go"])
_add("P2RY1 P2RY2 P2RY4 P2RY6 P2RY11", ["Gq/G11"])
_add("P2RY12 P2RY13 P2RY14", ["Gi/Go"])
_add("S1PR1", ["Gi/Go"])
_add("LPAR1 LPAR2 LPAR3", ["Gi/Go", "Gq/G11", "G12/G13"])

# --- Peptide (class A) ---
_add("AGTR1", ["Gq/G11"])
_add("AGTR2", ["Gi/Go"])
_add("BDKRB1 BDKRB2", ["Gq/G11"])
_add("EDNRA EDNRB", ["Gq/G11"])
_add("OXTR AVPR1A AVPR1B", ["Gq/G11"])
_add("AVPR2", ["Gs"])
_add("NPY1R NPY2R NPY4R NPY5R", ["Gi/Go"])
_add("GHSR", ["Gq/G11"])
_add("MC1R MC2R MC3R MC4R MC5R", ["Gs"])
_add("F2R F2RL1 F2RL2 F2RL3", ["Gq/G11", "Gi/Go"])
_add("GNRHR", ["Gq/G11"])
_add("TACR1 TACR2 TACR3", ["Gq/G11"])
_add("CCKAR CCKBR", ["Gq/G11"])

# --- Prostanoid (class A) ---
_add("PTGER2 PTGER4 PTGIR PTGDR", ["Gs"])
_add("PTGER1 PTGFR TBXA2R", ["Gq/G11"])
_add("PTGER3", ["Gi/Go"])

# --- Secretin (class B1) — Gs ---
_add(
    "GLP1R GLP2R GCGR GIPR SCTR ADCYAP1R1 VIPR1 VIPR2 PTH1R PTH2R "
    "CRHR1 CRHR2 CALCR CALCRL GHRHR",
    ["Gs"],
)

# --- Glutamate (class C) ---
_add("GRM1 GRM5", ["Gq/G11"])
_add("GRM2 GRM3 GRM4 GRM6 GRM7 GRM8", ["Gi/Go"])
_add("GABBR1 GABBR2", ["Gi/Go"])
_add("CASR", ["Gq/G11", "Gi/Go"])

# prefix rules (checked when no explicit gene match)
PREFIX_RULES: list[tuple[tuple[str, ...], list[str]]] = [
    (("CCR", "CXCR", "CX3CR", "XCR", "CCRL", "ACKR"), ["Gi/Go"]),  # chemokine
    (("MRGPR",), ["Gq/G11"]),
    (("SSTR",), ["Gi/Go"]),  # somatostatin
    (("GPR15", "GPR183"), ["Gi/Go"]),
]


def couple_for(gene: str) -> list[str] | None:
    if gene in COUPLING:
        return COUPLING[gene]
    for prefixes, fams in PREFIX_RULES:
        if any(gene.startswith(p) for p in prefixes):
            return fams
    return None


def main() -> None:
    print("=== Helix7 ETL stage 9: G-protein coupling (curated) ===")
    receptors = read_out("receptors.json")
    n = 0
    for r in receptors:
        fams = couple_for(r["gene"])
        if not fams:
            r["gProteinCoupling"] = []
            continue
        r["gProteinCoupling"] = [
            {"family": f, "primary": True, "source": "GtoPdb"} for f in fams
        ]
        if PROVENANCE not in r["provenance"]:
            r["provenance"].append(PROVENANCE)
        n += 1
    print(f"annotated primary coupling for {n}/{len(receptors)} receptors")
    write_out("receptors.json", receptors)


if __name__ == "__main__":
    main()
