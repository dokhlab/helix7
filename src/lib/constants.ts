import type { ClassCode, LigandAction, Tdl } from "./types";

/** Class metadata: colour token, short + long label. Order = display order. */
export const CLASSES: {
  code: ClassCode;
  short: string;
  label: string;
  color: string;
}[] = [
  { code: "A", short: "A", label: "Rhodopsin", color: "var(--color-class-a)" },
  { code: "B1", short: "B1", label: "Secretin", color: "var(--color-class-b1)" },
  { code: "B2", short: "B2", label: "Adhesion", color: "var(--color-class-b2)" },
  { code: "C", short: "C", label: "Glutamate", color: "var(--color-class-c)" },
  { code: "F", short: "F", label: "Frizzled", color: "var(--color-class-f)" },
  { code: "T2", short: "T2", label: "Taste 2", color: "var(--color-class-t2)" },
  { code: "O1", short: "O1", label: "Odorant (fish)", color: "var(--color-class-o1)" },
  { code: "O2", short: "O2", label: "Odorant", color: "var(--color-class-o2)" },
  { code: "D1", short: "D1", label: "Fungal pheromone", color: "var(--color-class-d1)" },
  { code: "Other", short: "—", label: "Other", color: "var(--color-class-other)" },
];

export const CLASS_COLOR: Record<string, string> = Object.fromEntries(
  CLASSES.map((c) => [c.code, c.color]),
);

export const CLASS_LABEL: Record<string, string> = Object.fromEntries(
  CLASSES.map((c) => [c.code, c.label]),
);

/** Target Development Level — description + colour. */
export const TDL_META: Record<Tdl, { label: string; color: string; blurb: string }> = {
  Tclin: {
    label: "Tclin",
    color: "var(--color-tclin)",
    blurb: "An approved drug acts on this receptor.",
  },
  Tchem: {
    label: "Tchem",
    color: "var(--color-tchem)",
    blurb: "A potent ligand exists, but no approved drug.",
  },
  Tbio: {
    label: "Tbio",
    color: "var(--color-tbio)",
    blurb: "Biology is characterised, but no potent ligand.",
  },
  Tdark: {
    label: "Tdark",
    color: "var(--color-tdark)",
    blurb: "Essentially unstudied — an opportunity target.",
  },
  Unknown: { label: "—", color: "var(--color-ink-faint)", blurb: "Unclassified." },
};

/** Pharmacological action colours, matching the CSS tokens. */
export const ACTION_COLOR: Record<string, string> = {
  Agonist: "var(--color-agonist)",
  "Partial agonist": "var(--color-partial)",
  Antagonist: "var(--color-antagonist)",
  "Inverse agonist": "var(--color-inverse)",
  "Allosteric modulator": "var(--color-allosteric)",
  "Positive allosteric modulator": "var(--color-allosteric)",
  "Negative allosteric modulator": "var(--color-allosteric)",
  Unknown: "var(--color-ink-faint)",
};

export const ACTION_ORDER: LigandAction[] = [
  "Agonist",
  "Partial agonist",
  "Antagonist",
  "Inverse agonist",
  "Positive allosteric modulator",
  "Negative allosteric modulator",
  "Allosteric modulator",
  "Unknown",
];

/** Organ systems for the body map, with a representative colour. */
export const ORGAN_SYSTEMS = [
  "Nervous",
  "Cardiovascular",
  "Digestive",
  "Respiratory",
  "Urinary",
  "Reproductive",
  "Immune",
  "Endocrine",
  "Musculoskeletal",
  "Integumentary",
  "Adipose",
] as const;

/** Format a nanomolar affinity for display (nM / µM / mM). */
export function formatAffinity(nm: number | null | undefined): string {
  if (nm == null) return "—";
  if (nm < 1) return `${(nm * 1000).toPrecision(3)} pM`;
  if (nm < 1000) return `${nm.toPrecision(3)} nM`;
  if (nm < 1_000_000) return `${(nm / 1000).toPrecision(3)} µM`;
  return `${(nm / 1_000_000).toPrecision(3)} mM`;
}

export function pdbImageUrl(pdbId: string): string {
  return `https://cdn.rcsb.org/images/structures/${pdbId.toLowerCase()}_assembly-1.jpeg`;
}
