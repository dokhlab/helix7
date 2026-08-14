"""Stage 10 — searchable name synonyms (biological + common names).

The global search box should find a receptor from any of the names people
actually type: the gene symbol and its aliases, the systematic GPCRdb name
(β₂-adrenoceptor), and the biological/common names curated by UniProt
(«Beta-2 adrenergic receptor», «Serotonin receptor 2A», short forms, CD
antigens…). We pull UniProt's protein-name block per accession and fold every
variant into two search fields on each receptor:

  searchTerms      – the readable list (kept for reference/debug)
  searchNorm       – all terms normalised to lowercase latin words, Greek
                     letters spelled out and subscripts flattened, space-joined
  searchCondensed  – searchNorm with spaces removed, so "beta2" matches
                     "beta 2" and "5ht2a" matches "5-HT2A"

Normalisation here MUST mirror `normalizeSearch()` in src/lib/data.ts.
"""

from __future__ import annotations

import re
import unicodedata

from common import fetch_json, read_out, write_out

UNIPROT_URL = "https://rest.uniprot.org/uniprotkb/{acc}.json"

GREEK = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
    "ζ": "zeta", "η": "eta", "θ": "theta", "ι": "iota", "κ": "kappa",
    "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi", "ο": "omicron",
    "π": "pi", "ρ": "rho", "σ": "sigma", "ς": "sigma", "τ": "tau",
    "υ": "upsilon", "φ": "phi", "χ": "chi", "ψ": "psi", "ω": "omega",
}


def normalize(s: str | None) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)  # subscripts/superscripts -> digits
    out = []
    for ch in s:
        g = GREEK.get(ch) or GREEK.get(ch.lower())
        out.append(g if g else ch)
    s = "".join(out).lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def uniprot_names(acc: str) -> list[str]:
    """Recommended, alternative, short and CD-antigen names from UniProt."""
    data = fetch_json(UNIPROT_URL.format(acc=acc))
    if not data:
        return []
    names: list[str] = []
    desc = data.get("proteinDescription") or {}

    def take(block: dict) -> None:
        full = (block.get("fullName") or {}).get("value")
        if full:
            names.append(full)
        for sh in block.get("shortNames") or []:
            if sh.get("value"):
                names.append(sh["value"])

    if desc.get("recommendedName"):
        take(desc["recommendedName"])
    for alt in desc.get("alternativeNames") or []:
        take(alt)
    for cd in desc.get("cdAntigenNames") or []:
        if cd.get("value"):
            names.append(cd["value"])
    # gene-level names/synonyms too
    for gene in data.get("genes") or []:
        gn = (gene.get("geneName") or {}).get("value")
        if gn:
            names.append(gn)
        for syn in gene.get("synonyms") or []:
            if syn.get("value"):
                names.append(syn["value"])
    return names


def main() -> None:
    print("=== Helix7 ETL stage 10: search synonyms (UniProt) ===")
    receptors = read_out("receptors.json")
    enriched = 0
    for i, r in enumerate(receptors, 1):
        terms: list[str] = [r.get("gene", ""), r.get("name", ""), r.get("entryName", ""),
                            r.get("uniprot", "")]
        terms += r.get("geneSynonyms") or []
        acc = r.get("uniprot")
        if acc:
            terms += uniprot_names(acc)
            enriched += 1

        # unique, order-preserving readable list
        seen, readable = set(), []
        for t in terms:
            t = (t or "").strip()
            if t and t.lower() not in seen:
                seen.add(t.lower())
                readable.append(t)

        # normalised word set (deduped) and condensed form
        words: list[str] = []
        wseen = set()
        for t in readable:
            for w in normalize(t).split(" "):
                if w and w not in wseen:
                    wseen.add(w)
                    words.append(w)
        r["searchTerms"] = readable
        r["searchNorm"] = " ".join(words)
        r["searchCondensed"] = "".join(words)

        if i % 100 == 0:
            print(f"  {i}/{len(receptors)}")

    print(f"built search synonyms for {len(receptors)} receptors "
          f"({enriched} enriched from UniProt)")
    write_out("receptors.json", receptors)


if __name__ == "__main__":
    main()
