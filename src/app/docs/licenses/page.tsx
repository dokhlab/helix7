import Link from "next/link";
import {
  SOURCES,
  LICENSES,
  HELIX7_CITATION,
  HELIX7_LICENSE,
} from "@/lib/sources";
import { SectionTitle } from "@/components/ui";
import { DocsNav } from "@/components/edu/DocsNav";

export const metadata = {
  title: "Citation & Licenses",
  description:
    "Data sources, licences, and required attributions for Helix7, plus how to cite the resource.",
};

export default function LicensesPage() {
  const shareAlike = SOURCES.filter((s) => LICENSES[s.license].shareAlike);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <DocsNav current="/docs/licenses" />

      <div className="mono-label mb-2">Attribution</div>
      <h1 className="text-3xl font-bold tracking-tight">Citation &amp; licenses</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
        Helix7 integrates and redistributes data from established public
        resources. Each is credited below with its licence and required citation.
        Every receptor page also carries source links for the specific values it
        shows, so attribution travels with the data.
      </p>

      {/* How to cite Helix7 */}
      <section className="mt-8">
        <SectionTitle eyebrow="Reuse" title="How to cite Helix7" />
        <div className="panel p-5">
          <p className="text-sm leading-relaxed text-[var(--color-ink)]">
            {HELIX7_CITATION.text}
          </p>
          <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
            {HELIX7_CITATION.note}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--color-ink-muted)]">
              Helix7 is released under
            </span>
            <a
              href={LICENSES[HELIX7_LICENSE].url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[var(--color-line-bright)] px-2 py-0.5 font-medium text-[var(--color-helix)]"
            >
              {HELIX7_LICENSE}
            </a>
            <span className="text-[var(--color-ink-faint)]">
              — the most restrictive of the licences it builds on, to remain
              compatible with the ShareAlike sources.
            </span>
          </div>
        </div>
      </section>

      {/* Per-source table */}
      <section className="mt-10">
        <SectionTitle eyebrow="Provenance" title="Data sources & licences" />
        <div className="space-y-3">
          {SOURCES.map((s) => {
            const lic = LICENSES[s.license];
            return (
              <div key={s.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-helix)]"
                  >
                    {s.name} ↗
                  </a>
                  <a
                    href={lic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border px-2 py-0.5 text-xs font-medium"
                    style={{
                      color: lic.shareAlike
                        ? "var(--color-class-c)"
                        : "var(--color-helix)",
                      borderColor: "var(--color-line-bright)",
                    }}
                    title={lic.name}
                  >
                    {s.license}
                    {lic.shareAlike ? " · ShareAlike" : ""}
                  </a>
                </div>
                <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">{s.role}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-faint)]">
                  {s.citation}
                  {s.citationUrl && (
                    <>
                      {" "}
                      <a
                        href={s.citationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-helix)] hover:underline"
                      >
                        link
                      </a>
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ShareAlike compliance note */}
      <section className="mt-10">
        <SectionTitle eyebrow="Compliance" title="ShareAlike obligations" />
        <div className="panel p-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          <p>
            The following sources are licensed under <strong className="text-[var(--color-ink)]">CC BY-SA</strong>,
            which requires that any adaptation of their data be shared under the
            same terms and that they be attributed:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {shareAlike.map((s) => (
              <li
                key={s.id}
                className="rounded-md bg-[var(--color-surface-2)] px-2.5 py-1 text-xs text-[var(--color-ink)]"
              >
                {s.name}
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Helix7 complies by (1) attributing every source here and on each
            receptor page, (2) linking each value back to its origin, and (3)
            releasing the integrated resource under{" "}
            <strong className="text-[var(--color-ink)]">{HELIX7_LICENSE}</strong>.
            Data is used unmodified in substance — only reformatted and
            cross-linked — and is provided for research use, not clinical
            guidance.
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--color-line)] pt-6 text-sm">
        <Link
          href="/docs"
          className="rounded-lg border border-[var(--color-line-bright)] px-4 py-2 font-semibold hover:bg-[var(--color-surface-2)]"
        >
          ← Documentation
        </Link>
      </div>
    </div>
  );
}
