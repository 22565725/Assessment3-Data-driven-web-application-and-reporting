import type { MetricsResponse } from "@/lib/api";

/**
 * The single most important line on the page: is the system working?
 *
 * It sits above everything else because that is the question an operator
 * asks first. Everything below it explains the answer.
 *
 * "Healthy" here means the API answered AND its database answered - the same
 * distinction /api/health makes. A server process that is running while its
 * database is unreachable is not healthy, it is failing every request.
 */

function formatUptime(seconds: number): string {
  if (seconds < 60) return seconds + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  return hours + "h " + (minutes % 60) + "m";
}

interface HealthBannerProps {
  health: MetricsResponse["health"] | null;
  /** Set when the dashboard could not reach the API at all. */
  unreachable?: boolean;
  generatedAt?: string;
}

export default function HealthBanner({
  health,
  unreachable,
  generatedAt,
}: HealthBannerProps) {
  // Three states, not two. "Cannot reach the server" is different from "the
  // server says it is unwell", and conflating them would send someone looking
  // in the wrong place.
  const connected = health?.database.connected ?? false;
  const state = unreachable
    ? "unreachable"
    : connected
      ? "healthy"
      : "degraded";

  const config = {
    healthy: {
      label: "Healthy",
      detail: "API and database are both responding.",
      className: "border-success",
      dot: "bg-success",
      text: "text-success",
    },
    degraded: {
      label: "Degraded",
      detail: "The API is running but its database is not answering.",
      className: "border-danger",
      dot: "bg-danger",
      text: "text-danger",
    },
    unreachable: {
      label: "Unreachable",
      detail: "The dashboard could not reach the RSS Server.",
      className: "border-danger",
      dot: "bg-danger",
      text: "text-danger",
    },
  }[state];

  return (
    <section
      // Announced to screen readers when the state changes, so a status
      // change is not something you have to be looking at to notice.
      role="status"
      aria-live="polite"
      className={
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border border-border bg-surface p-4 " +
        config.className
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={"h-3 w-3 shrink-0 rounded-full " + config.dot}
        />
        <div>
          <p className={"font-semibold " + config.text}>
            RSS Server: {config.label}
          </p>
          <p className="text-sm text-muted">{config.detail}</p>
        </div>
      </div>

      {health && !unreachable && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">Database</dt>
            <dd className="tabular-nums text-foreground">
              {health.database.latencyMs}ms
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Uptime</dt>
            <dd className="tabular-nums text-foreground">
              {formatUptime(health.uptimeSeconds)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Environment</dt>
            <dd className="text-foreground">{health.environment}</dd>
          </div>
          {generatedAt && (
            <div className="flex gap-2">
              <dt className="text-muted">Updated</dt>
              <dd className="tabular-nums text-foreground">
                {new Date(generatedAt).toLocaleTimeString("en-AU")}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
