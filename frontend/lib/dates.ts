/**
 * Australian date formatting, in one place.
 *
 * The database stores timestamps in UTC. Formatting them without an explicit
 * timeZone uses whatever zone the machine happens to be in - and the EC2
 * instance runs on UTC, so a post published late in the evening Melbourne
 * time would display with the previous day's date.
 */

const DATE = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Australia/Melbourne",
});

const DATE_TIME = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Australia/Melbourne",
});

/** 12/08/2026 */
export function formatAuDate(value: string | Date): string {
  return DATE.format(new Date(value));
}

/** 12 August 2026 at 7:00 pm */
export function formatAuDateTime(value: string | Date): string {
  return DATE_TIME.format(new Date(value));
}
