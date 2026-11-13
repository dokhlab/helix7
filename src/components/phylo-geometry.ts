/**
 * Geometry for the radial GPCRome tree. Angles run clockwise from 12 o'clock,
 * in radians, matching d3.cluster's x when its size is [2π, R].
 */

export const point = (angle: number, radius: number): [number, number] => [
  radius * Math.cos(angle - Math.PI / 2),
  radius * Math.sin(angle - Math.PI / 2),
];

const fmt = (n: number) => n.toFixed(2);

/** Filled annular sector between two angles — one class's band on the ring. */
export function sectorPath(a0: number, a1: number, r0: number, r1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [ox0, oy0] = point(a0, r1);
  const [ox1, oy1] = point(a1, r1);
  const [ix1, iy1] = point(a1, r0);
  const [ix0, iy0] = point(a0, r0);
  return (
    `M${fmt(ox0)},${fmt(oy0)}A${r1},${r1} 0 ${large} 1 ${fmt(ox1)},${fmt(oy1)}` +
    `L${fmt(ix1)},${fmt(iy1)}A${r0},${r0} 0 ${large} 0 ${fmt(ix0)},${fmt(iy0)}Z`
  );
}

/** True when text along this arc would read upside down, so the path must run backwards. */
export const isBottom = (a0: number, a1: number) => {
  const mid = (a0 + a1) / 2;
  return mid > Math.PI / 2 && mid < (3 * Math.PI) / 2;
};

/**
 * Arc for <textPath>. Top half runs clockwise with glyphs pointing outward;
 * bottom half runs anticlockwise so the text stays upright (glyphs then
 * point inward, so the caller puts the baseline a cap-height further out).
 */
export function textArc(a0: number, a1: number, radius: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const bottom = isBottom(a0, a1);
  const [sx, sy] = point(bottom ? a1 : a0, radius);
  const [ex, ey] = point(bottom ? a0 : a1, radius);
  return `M${fmt(sx)},${fmt(sy)}A${radius},${radius} 0 ${large} ${bottom ? 0 : 1} ${fmt(ex)},${fmt(ey)}`;
}

/**
 * Spread label angles so neighbours sit at least `gap` radians apart while
 * staying as close as possible to their leaves: overlapping labels merge into
 * groups, each centred on the mean of its members' true angles.
 */
export function spreadAngles(angles: number[], gap: number): number[] {
  const order = angles.map((a, i) => ({ a, i })).sort((p, q) => p.a - q.a);
  type Group = { members: number[]; mean: number };
  let groups: Group[] = order.map((o) => ({ members: [o.i], mean: o.a }));
  const start = (g: Group) => g.mean - (gap * (g.members.length - 1)) / 2;
  const end = (g: Group) => g.mean + (gap * (g.members.length - 1)) / 2;

  for (let changed = true; changed; ) {
    changed = false;
    const next: Group[] = [];
    for (const g of groups) {
      const prev = next[next.length - 1];
      if (prev && start(g) - end(prev) < gap) {
        const members = [...prev.members, ...g.members];
        const mean = members.reduce((s, i) => s + angles[i], 0) / members.length;
        next[next.length - 1] = { members, mean };
        changed = true;
      } else next.push(g);
    }
    groups = next;
  }

  const out = new Array<number>(angles.length);
  for (const g of groups) g.members.forEach((idx, k) => (out[idx] = start(g) + k * gap));
  return out;
}
