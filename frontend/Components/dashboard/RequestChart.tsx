import type { TimeBucket } from "@/lib/api";

/**
 * Hourly request volume, drawn as an inline SVG area chart.
 *
 * Hand-built rather than pulled from a charting library: the whole chart is
 * about forty lines of geometry, and a dependency would add hundreds of
 * kilobytes to render one shape.
 *
 * Errors are drawn as a second line over the same axes rather than in a
 * separate chart, because the question being asked is "did errors rise when
 * traffic did?" - and two charts side by side cannot answer that.
 */

const WIDTH = 720;
const HEIGHT = 160;
const PADDING = { top: 12, right: 8, bottom: 20, left: 8 };

interface RequestChartProps {
  data: TimeBucket[];
}

export default function RequestChart({ data }: RequestChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted">No request data for this period.</p>
    );
  }

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  // The scale is driven by the busiest hour, with a floor of 1 so a period
  // with no traffic renders a flat line at the bottom rather than dividing
  // by zero and collapsing the chart.
  const peak = Math.max(1, ...data.map((d) => d.requests));

  const x = (index: number) =>
    PADDING.left +
    (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);

  const y = (value: number) =>
    PADDING.top + plotHeight - (value / peak) * plotHeight;

  const line = data.map((d, i) => x(i) + "," + y(d.requests)).join(" ");

  // The area is the same path closed along the baseline, which is what gives
  // the fill something to be bounded by.
  const area =
    PADDING.left +
    "," +
    (PADDING.top + plotHeight) +
    " " +
    line +
    " " +
    (PADDING.left + plotWidth) +
    "," +
    (PADDING.top + plotHeight);

  const errorLine = data
    .map((d, i) => x(i) + "," + y(d.errors))
    .join(" ");

  const hasErrors = data.some((d) => d.errors > 0);

  const totalRequests = data.reduce((sum, d) => sum + d.requests, 0);
  const firstLabel = hourLabel(data[0].bucket);
  const lastLabel = hourLabel(data[data.length - 1].bucket);

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={"0 0 " + WIDTH + " " + HEIGHT}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={
            "Requests per hour from " +
            firstLabel +
            " to " +
            lastLabel +
            ". " +
            totalRequests +
            " requests in total, peaking at " +
            peak +
            " in one hour."
          }
          className="min-w-[36rem]"
        >
          <defs>
            <linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--accent)"
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor="var(--accent)"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Faint horizontal guides at quarter intervals. Drawn behind the
              data and kept low contrast: they are for estimating a value,
              not for reading. */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              x1={PADDING.left}
              x2={PADDING.left + plotWidth}
              y1={PADDING.top + plotHeight * fraction}
              y2={PADDING.top + plotHeight * fraction}
              stroke="var(--border)"
              strokeWidth="1"
            />
          ))}

          <polyline points={area} fill="url(#requestFill)" stroke="none" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hasErrors && (
            <polyline
              points={errorLine}
              fill="none"
              stroke="var(--danger)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          )}

          {/* The most recent hour, marked. On a live dashboard "where are we
              now" is the first thing the eye looks for. */}
          <circle
            cx={x(data.length - 1)}
            cy={y(data[data.length - 1].requests)}
            r="3.5"
            fill="var(--accent)"
          />

          <text
            x={PADDING.left}
            y={HEIGHT - 4}
            fontSize="11"
            fill="var(--muted)"
          >
            {firstLabel}
          </text>
          <text
            x={PADDING.left + plotWidth}
            y={HEIGHT - 4}
            fontSize="11"
            textAnchor="end"
            fill="var(--muted)"
          >
            {lastLabel}
          </text>
          <text
            x={PADDING.left + 2}
            y={PADDING.top + 9}
            fontSize="11"
            fill="var(--muted)"
          >
            peak {peak}
          </text>
        </svg>
      </div>

      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-0.5 w-4 bg-accent"
          />
          Requests
        </span>
        {hasErrors && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4 bg-danger"
            />
            Errors
          </span>
        )}
        <span>{totalRequests} requests across {data.length} hours</span>
      </figcaption>
    </figure>
  );
}

/** "14:00" from an ISO timestamp. */
function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
