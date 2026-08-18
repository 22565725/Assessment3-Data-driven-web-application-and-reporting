"use client";

import type { ReactNode } from "react";

/**
 * A ranked table with an inline proportion bar behind each row's label.
 *
 * One reusable component serves both "requests per feed" and "requests per
 * client", because the two are the same shape: a name, a count, and how that
 * count compares to the largest.
 *
 * The bar is drawn as a positioned div rather than an SVG - it is a single
 * rectangle, and a percentage width does the job with no geometry at all.
 */

export interface BreakdownRow {
  key: string;
  label: ReactNode;
  /** The number the ranking is based on. */
  value: number;
  /** Optional second column, e.g. error count or post count. */
  secondary?: ReactNode;
  /** Optional trailing detail, e.g. a status chip or timestamp. */
  trailing?: ReactNode;
}

interface BreakdownTableProps {
  title: string;
  caption: string;
  valueLabel: string;
  secondaryLabel?: string;
  rows: BreakdownRow[];
  emptyMessage: string;
}

export default function BreakdownTable({
  title,
  caption,
  valueLabel,
  secondaryLabel,
  rows,
  emptyMessage,
}: BreakdownTableProps) {
  // Proportions are relative to the busiest row, not to the total, so the
  // top row always fills the bar. With small numbers a share-of-total bar
  // would render as a sliver and communicate nothing.
  const peak = Math.max(1, ...rows.map((r) => r.value));
  const headingId = "breakdown-" + title.replace(/\s+/g, "-").toLowerCase();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 id={headingId} className="font-semibold text-foreground">
        {title}
      </h2>
      <p className="mb-3 text-sm text-muted">{caption}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Name
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  {valueLabel}
                </th>
                {secondaryLabel && (
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    {secondaryLabel}
                  </th>
                )}
                <th scope="col" className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border">
                  <th
                    scope="row"
                    className="relative py-2 pr-3 text-left font-normal"
                  >
                    {/* Sits behind the label so the row reads as one unit.
                        aria-hidden because the number beside it already
                        states the value exactly. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 rounded-sm bg-accent/10"
                      style={{
                        width: Math.max(2, (row.value / peak) * 100) + "%",
                      }}
                    />
                    <span className="relative text-foreground">
                      {row.label}
                    </span>
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums text-foreground">
                    {row.value.toLocaleString("en-AU")}
                  </td>
                  {secondaryLabel && (
                    <td className="py-2 pr-3 text-right tabular-nums text-muted">
                      {row.secondary ?? "—"}
                    </td>
                  )}
                  <td className="py-2 text-right">{row.trailing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
