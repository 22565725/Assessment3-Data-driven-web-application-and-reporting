import type { FeedHealth } from "@/lib/api";

/**
 * A feed's state, as a chip.
 *
 * State is carried by the WORD as well as the colour. A dashboard that
 * encodes meaning in colour alone is unreadable to anyone with a colour
 * vision deficiency, and unreadable to everyone in a greyscale screenshot -
 * which is exactly how dashboards end up in reports and slide decks.
 */

const STYLES: Record<FeedHealth, { label: string; className: string }> = {
  healthy: {
    label: "Healthy",
    className: "border-success text-success",
  },
  stale: {
    label: "Stale",
    className: "border-warning text-warning",
  },
  empty: {
    label: "Empty",
    className: "border-warning text-warning",
  },
  paused: {
    label: "Paused",
    className: "border-border text-muted",
  },
};

export default function StatusChip({ status }: { status: FeedHealth }) {
  const { label, className } = STYLES[status];

  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium " +
        className
      }
    >
      {label}
    </span>
  );
}
