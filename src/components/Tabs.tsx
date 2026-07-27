"use client";

import { useState } from "react";

export interface Tab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

/** Simple client-side tab switcher; all panels are rendered by the server. */
export function Tabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-5 mb-6 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-void)_88%,transparent)] px-5 backdrop-blur">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`relative whitespace-nowrap px-3.5 py-3 text-sm font-medium transition-colors ${
                active === t.id
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-muted)]"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className="ml-1.5 text-xs text-[var(--color-ink-faint)]">
                  {t.count}
                </span>
              )}
              {active === t.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-helix)]" />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="animate-rise" key={current?.id}>
        {current?.content}
      </div>
    </div>
  );
}
