import { getTree } from "@/lib/data";
import { CLASS_COLOR } from "@/lib/constants";
import type { TreeNode } from "@/lib/types";
import { GpcromeMapClient, type Petal } from "./GpcromeMapClient";
import { CENTER, INNER } from "./gpcrome-geometry";

// Round to 2 decimals so the SVG coordinate strings are stable and identical
// across the server render and client hydration.
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Server component: flattens the classification tree into one ring of receptors
 * grouped by class, then hands the geometry to a light client component for
 * hover interaction. Rendering the geometry on the server keeps the ~800-node
 * SVG out of the client bundle.
 */
export async function GpcromeMap() {
  const tree = await getTree();
  if (!tree) return <MapFallback />;

  const leaves = collectLeaves(tree);
  if (!leaves.length) return <MapFallback />;

  // Group by class, preserving the class order from the tree.
  const classOrder: string[] = [];
  const byClass = new Map<string, TreeNode[]>();
  for (const leaf of leaves) {
    const code = leaf.classCode ?? "Other";
    if (!byClass.has(code)) {
      byClass.set(code, []);
      classOrder.push(code);
    }
    byClass.get(code)!.push(leaf);
  }

  // Lay receptors on a ring, leaving a small gap between classes.
  const total = leaves.length;
  const gap = 0.004; // fraction of the circle per class boundary
  const gapTotal = gap * classOrder.length;
  const usable = 1 - gapTotal;

  const petals: Petal[] = [];
  let cursor = -0.25; // start at top (12 o'clock)

  for (const code of classOrder) {
    const group = byClass.get(code)!;
    const color = CLASS_COLOR[code] ?? "var(--color-ink-faint)";
    for (const leaf of group) {
      const frac = 1 / total;
      const angle = (cursor + frac / 2) * Math.PI * 2;
      // Petal length scales gently with development interest.
      const score = leaf.devScore ?? 0;
      const len = 30 + (score / 100) * 46;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const outer = INNER + len;
      petals.push({
        id: leaf.receptorId!,
        gene: leaf.gene ?? "",
        name: leaf.name,
        classCode: code,
        color,
        score,
        x1: r2(CENTER + cos * INNER),
        y1: r2(CENTER + sin * INNER),
        x2: r2(CENTER + cos * outer),
        y2: r2(CENTER + sin * outer),
      });
      cursor += frac;
    }
    cursor += gap;
  }

  return <GpcromeMapClient petals={petals} classes={classOrder} />;
}

function collectLeaves(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  if (node.receptorId) out.push(node);
  for (const c of node.children ?? []) collectLeaves(c, out);
  return out;
}

function MapFallback() {
  return (
    <div className="panel flex aspect-square w-full max-w-md items-center justify-center text-sm text-[var(--color-ink-faint)]">
      GPCRome map unavailable — is the database loaded?
    </div>
  );
}
