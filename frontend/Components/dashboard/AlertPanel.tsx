import type { Alert, AlertSeverity } from "@/lib/api";

/**
 * Active warnings, most severe first.
 *
 * Every alert here is derived from the data at read time rather than
 * configured, so the panel always describes the system as it actually is.
 *
 * An empty panel says so explicitly instead of disappearing. A section that
 * vanishes when there is nothing wrong is ambiguous: the reader cannot tell
 * "no problems" from "the check did not run".
 */

const SEVERITY: Record<
  AlertSeverity,
  { label: string; border: string; text: string }
> = {
  critical: {
    label: "Critical",
    border: "border-l-danger",
    text: "text-danger",
  },
  warning: {
    label: "Warning",
    border: "border-l-warning",
    text: "text-warning",
  },
  info: {
    label: "Info",
    border: "border-l-border",
    text: "text-muted",
  },
};

export default function AlertPanel({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warnings = alerts.filter((a) => a.severity === "warning").length;

  return (
    <section
      aria-labelledby="alerts-heading"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="alerts-heading" className="font-semibold text-foreground">
          Alerts
        </h2>
        <p className="text-sm text-muted">
          {alerts.length === 0
            ? "Nothing to report"
            : critical +
              " critical, " +
              warnings +
              " warning" +
              (warnings === 1 ? "" : "s")}
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-muted">
          No empty feeds, stale feeds, rejected payloads or server errors in
          the last hour.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map((alert, index) => {
            const style = SEVERITY[alert.severity];
            return (
              <li
                key={alert.kind + index}
                className={
                  "rounded-md border border-border border-l-4 bg-background p-3 " +
                  style.border
                }
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  {/* The severity is spelled out, not just coloured - the
                      panel has to survive greyscale and colour blindness. */}
                  <span
                    className={
                      "text-xs font-semibold uppercase tracking-wide " +
                      style.text
                    }
                  >
                    {style.label}
                  </span>
                  <span className="font-medium text-foreground">
                    {alert.title}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{alert.detail}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
