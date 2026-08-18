import type { ReactNode } from "react";

/**
 * One headline number.
 *
 * Tiles are the top layer of the dashboard: an operator should be able to
 * read the state of the system from this row alone, and only look further
 * down when a tile says something is wrong.
 *
 * The value uses tabular figures so digits occupy equal width. Without it,
 * numbers that update on a timer jitter sideways as the shapes change, which
 * makes a live dashboard feel unstable.
 */

interface MetricTileProps {
  label: string;
  value: ReactNode;
  /** Secondary context: what the number means, or how it is trending. */
  hint?: string;
  /** Draws attention when the value itself is the problem. */
  tone?: "default" | "success" | "warning" | "danger";
}

const TONES = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

export default function MetricTile({
  label,
  value,
  hint,
  tone = "default",
}: MetricTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={
          "text-2xl font-semibold tabular-nums " + TONES[tone]
        }
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
