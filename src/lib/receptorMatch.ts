/**
 * Client-side receptor matching for the tree search: gene symbols, previous
 * symbols, and free-text names ("dopamine D2", "mu opioid", "serotonin 2a").
 */

export interface GeneOption {
  slug: string;
  gene: string;
  name: string;
  classCode?: string;
  aliases: string[];
  /** Normalised words from the receptor's own symbol, names and synonyms. */
  terms: Set<string>;
  /** Normalised words from its family, ligand group and class ("dopamine", "peptide"). */
  groupTerms: Set<string>;
}

export interface GeneMatch {
  option: GeneOption;
  /** Set when the hit came from an alias rather than the official symbol. */
  via?: string;
  rank: number;
}

const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", κ: "kappa", μ: "mu", µ: "mu",
};

/** Lowercase words with Greek spelled out and subscripts folded (β₂ → beta 2). */
export function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[αβγδεκμµ]/gi, (c) => ` ${GREEK[c.toLowerCase()] ?? c} `)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Words too generic to narrow anything down; dropped unless they are all the user typed. */
const STOP = new Set(["receptor", "receptors", "human", "type", "the", "of", "and", "family", "subtype"]);

/** Everyday names that the source vocabularies spell differently. */
const SYNONYMS: Record<string, string[]> = {
  serotonin: ["serotonin", "hydroxytryptamine", "5ht"],
  serotonergic: ["serotonin", "hydroxytryptamine"],
  adrenergic: ["adrenergic", "adrenoceptor", "adrenoreceptor"],
  adrenaline: ["adrenergic", "adrenoceptor"],
  noradrenaline: ["adrenergic", "adrenoceptor"],
  epinephrine: ["adrenergic", "adrenoceptor"],
  norepinephrine: ["adrenergic", "adrenoceptor"],
  dopaminergic: ["dopamine"],
  opiate: ["opiate", "opioid"],
  opioid: ["opioid", "opiate"],
  orexin: ["orexin", "hypocretin"],
  hypocretin: ["hypocretin", "orexin"],
  acetylcholine: ["acetylcholine", "muscarinic"],
  cholinergic: ["muscarinic", "acetylcholine"],
  glutamate: ["glutamate", "metabotropic"],
  gaba: ["gaba", "aminobutyric"],
  cannabinoid: ["cannabinoid", "cannabinoids"],
  smell: ["olfactory", "odorant"],
  olfactory: ["olfactory", "odorant"],
  bitter: ["bitter", "tas2r"],
};

/** Rank of a query that spells the receptor's official name ("D2", "mu", "5-HT2A"). */
const EXACT_NAME = 3.5;

/** A typed term that names one receptor outright: its symbol, an alias, or its official name. */
export const isExact = (m: GeneMatch) => m.rank === 0 || m.rank === 2 || m.rank === EXACT_NAME;

function tokenMatches(token: string, terms: Set<string>): 0 | 1 | 2 {
  const alts = SYNONYMS[token] ?? [token];
  let best: 0 | 1 | 2 = 0;
  for (const alt of alts) {
    if (terms.has(alt)) return 2;
    const stem = alt.length > 4 && alt.endsWith("s") ? alt.slice(0, -1) : alt;
    for (const term of terms) {
      if (term.startsWith(alt) || (stem !== alt && term.startsWith(stem))) {
        best = 1;
        break;
      }
    }
  }
  return best;
}

/**
 * Rank receptors against a typed term. Every word must match. Order: exact
 * symbol, symbol prefix, exact alias, alias prefix, the receptor's own names
 * as whole words ("D2" → DRD2), symbol substring, own names by prefix, then
 * words only its family or class carries ("rhodopsin" → RHO before Class A).
 */
export function matchGenes(options: GeneOption[], term: string): GeneMatch[] {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const all = words(q);
  const meaningful = all.filter((w) => !STOP.has(w));
  const tokens = meaningful.length ? meaningful : all;
  // One stray letter would prefix-match half the vocabulary.
  const useNames = tokens.length > 0 && !(tokens.length === 1 && tokens[0].length < 2);

  const out: GeneMatch[] = [];
  for (const option of options) {
    const gene = option.gene.toLowerCase();
    let rank = -1;
    let via: string | undefined;
    if (gene === q) rank = 0;
    else if (gene.startsWith(q)) rank = 1;
    else {
      const exact = option.aliases.find((a) => a.toLowerCase() === q);
      const prefix = exact ? undefined : option.aliases.find((a) => a.toLowerCase().startsWith(q));
      if (exact) [rank, via] = [2, exact];
      else if (prefix) [rank, via] = [3, prefix];
      else {
        const own = useNames ? tokens.map((t) => tokenMatches(t, option.terms)) : [];
        const official = words(option.name).filter((w) => !STOP.has(w));
        if (official.length && official.join(" ") === tokens.join(" ")) rank = EXACT_NAME;
        else if (own.length && own.every((s) => s === 2)) rank = 4;
        else if (gene.includes(q)) rank = 5;
        else if (own.length && own.every((s) => s > 0)) rank = 6;
        else if (useNames) {
          const any = tokens.map((t, i) => Math.max(own[i], tokenMatches(t, option.groupTerms)));
          if (any.every((s) => s > 0)) rank = any.every((s) => s === 2) ? 7 : 8;
        }
      }
    }
    if (rank >= 0) out.push({ option, via, rank });
  }
  return out.sort(
    (a, b) => a.rank - b.rank || a.option.gene.localeCompare(b.option.gene, "en", { numeric: true }),
  );
}
