import type { AnalyticsActualTimeSummaryView } from "../../ipc/generated/AnalyticsActualTimeSummaryView";

/** Scheduled time is whole minutes owned by Rust; the renderer only formats it. */
export const scheduledDuration = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

/** Focus Plan scheduled totals arrive as `i64`, so they cross the boundary as `bigint`. */
export const planScheduledDuration = (minutes: bigint) => scheduledDuration(Number(minutes));

export function formatActualTime(seconds: bigint) {
  const value = BigInt(seconds);
  const hours = value / 3_600n;
  const minutes = (value % 3_600n) / 60n;
  const remainingSeconds = value % 60n;
  if (hours > 0n) {
    return `${hours}h ${minutes}m${remainingSeconds > 0n ? ` ${remainingSeconds}s` : ""}`;
  }
  if (minutes > 0n) {
    return `${minutes}m${remainingSeconds > 0n ? ` ${remainingSeconds}s` : ""}`;
  }
  return `${remainingSeconds}s`;
}

/** Variance is always spelled out, never conveyed by a sign or a colour alone. */
export function actualTimeVariance(summary: AnalyticsActualTimeSummaryView) {
  const actual = BigInt(summary.actual_seconds);
  const tracked = BigInt(summary.tracked_scheduled_seconds);
  if (actual > tracked) {
    return `Over tracked plan by ${formatActualTime(summary.variance_seconds)}`;
  }
  if (actual < tracked) {
    return `Under tracked plan by ${formatActualTime(-summary.variance_seconds)}`;
  }
  return "Matched tracked plan";
}
