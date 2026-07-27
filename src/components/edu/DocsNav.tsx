import Link from "next/link";

const PAGES = [
  { href: "/docs", label: "About & Methods" },
  { href: "/docs/biology", label: "GPCR Biology" },
  { href: "/docs/licenses", label: "Citation & Licenses" },
];

/** Sub-navigation shared across the documentation section. */
export function DocsNav({ current }: { current: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1.5">
      {PAGES.map((p) => {
        const active = p.href === current;
        return (
          <Link
            key={p.href}
            href={p.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: active ? "var(--color-surface-2)" : "transparent",
              color: active ? "var(--color-ink)" : "var(--color-ink-muted)",
              border: `1px solid ${active ? "var(--color-line-bright)" : "transparent"}`,
            }}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
