"use client";

import { useState } from "react";
import type { SingleCellExpression, TissueExpression } from "@/lib/types";
import { BodyMap } from "./BodyMap";
import { SingleCellChart } from "./SingleCellChart";

/**
 * Expression tab: switches between the tissue layer (HPA consensus RNA, body
 * map + ranked tissues + organ systems) and the single-cell layer (HPA
 * single-cell type expression). Presented identically for every receptor.
 */
export function ExpressionPanel({
  expression,
  singleCell,
}: {
  expression: TissueExpression[];
  singleCell: SingleCellExpression[];
}) {
  const hasCells = singleCell.length > 0;
  const [layer, setLayer] = useState<"tissue" | "cell">("tissue");

  return (
    <div>
      <div className="mb-5 inline-flex rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
        <Tab active={layer === "tissue"} onClick={() => setLayer("tissue")}>
          Tissue
        </Tab>
        <Tab
          active={layer === "cell"}
          disabled={!hasCells}
          onClick={() => hasCells && setLayer("cell")}
        >
          Single cell{!hasCells && " (n/a)"}
        </Tab>
      </div>

      {layer === "tissue" ? (
        <BodyMap expression={expression} />
      ) : (
        <SingleCellChart cells={singleCell} />
      )}
    </div>
  );
}

function Tab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--color-surface-3)] text-[var(--color-ink)]"
          : disabled
            ? "cursor-not-allowed text-[var(--color-ink-faint)]"
            : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </button>
  );
}
