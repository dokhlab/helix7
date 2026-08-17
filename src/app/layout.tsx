import type { Metadata } from "next";
import Link from "next/link";
import { GlobalSearch } from "@/components/GlobalSearch";
import { getMeta } from "@/lib/data";
import "./globals.css";

// If these differ from the lab's live URLs, update them here in one place.
const SITE_URL = "https://helix7.dokhlab.org";
const DOKHLAB_URL = "https://dokhlab.org";
const UVA_URL = "https://www.virginia.edu";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Helix7 — the human GPCRome atlas",
    template: "%s · Helix7",
  },
  description:
    "A high-fidelity atlas of all human G protein-coupled receptors: classification, structures, ligand pharmacology, tissue expression, disease associations, and development-interest scoring.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Helix7",
    title: "Helix7 — the human GPCRome atlas",
    description:
      "An integrated atlas of all human G protein-coupled receptors from the Dokholyan Laboratory.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject
          attributes on <body> before React hydrates, which would otherwise
          trip a benign hydration mismatch warning. */}
      <body className="relative min-h-screen" suppressHydrationWarning>
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

function SiteHeader() {
  const nav = [
    { href: "/browse", label: "Browse" },
    { href: "/tree", label: "Phylogeny" },
    { href: "/classes", label: "Classes" },
    { href: "/docs", label: "Docs" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-void)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Helix7 home" className="flex items-center">
            <HelixMark size={40} />
          </Link>
          <span className="flex flex-col justify-center leading-none">
            <Link href="/" className="text-[19px] font-semibold leading-tight tracking-tight">
              Helix<span className="text-[var(--color-helix)]">7</span>
            </Link>
            <a
              href={DOKHLAB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-[11px] leading-tight tracking-wide text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-helix)]"
            >
              Dokholyan Laboratory
            </a>
          </span>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto w-full max-w-xs">
          <GlobalSearch />
        </div>
      </div>
    </header>
  );
}

async function SiteFooter() {
  const meta = await getMeta();
  const updated = meta?.lastUpdated
    ? new Date(meta.lastUpdated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-abyss)]">
      <div className="mx-auto max-w-[1400px] px-5 py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <HelixMark />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">
                Helix<span className="text-[var(--color-helix)]">7</span>
                <span className="ml-2 font-normal text-[var(--color-ink-faint)]">
                  · the human GPCRome
                </span>
              </span>
              <span className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
                A resource of the{" "}
                <a
                  href={DOKHLAB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-ink-muted)] underline decoration-[var(--color-line-bright)] underline-offset-2 hover:text-[var(--color-helix)]"
                >
                  Dokholyan Laboratory
                </a>
                .
              </span>
              {updated && (
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-tclin)]" />
                  Data updated {updated}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <a
              href={DOKHLAB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-helix)]"
            >
              Dokholyan Laboratory ↗
            </a>
            <a
              href={UVA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-helix)]"
            >
              University of Virginia ↗
            </a>
            <Link
              href="/docs"
              className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-helix)]"
            >
              Documentation
            </Link>
            <Link
              href="/docs/licenses"
              className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-helix)]"
            >
              Citation &amp; Licenses
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Helix7 mark — the coiled-ribbon "b7" logo on a transparent ground so it sits
 * cleanly on the dark chrome. The white backdrop of the source art is knocked
 * out; the raster lives at /helix7-logo.png (favicon: src/app/icon.png). `size`
 * is the rendered height in px; width follows the logo's aspect ratio.
 */
export function HelixMark({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/helix7-logo.png"
      alt="Helix7"
      height={size}
      style={{ height: size, width: "auto" }}
      className="shrink-0"
    />
  );
}
