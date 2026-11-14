import { addCalendarDays, calendarDateToDate } from "../calendar/date";

export const DAY_WIDTH = 8;
export const TIMELINE_INSET = 24;
export const LABEL_WIDTH = 168;
export const LANE_HEIGHT = 56;
export const VISIBLE_MONTHS = 12;
const DAY_MS = 86_400_000;
export type TimelineRange = { start: string; end: string };

export function daysBetween(start: string, end: string): number {
  return Math.round((calendarDateToDate(end).getTime() - calendarDateToDate(start).getTime()) / DAY_MS);
}
export function monthStart(date: string, offset = 0): string {
  const parsed = calendarDateToDate(date);
  const month = Math.max(100 * 12, Math.min(9999 * 12 + 11, parsed.getUTCFullYear() * 12 + parsed.getUTCMonth() + offset));
  return `${String(Math.floor(month / 12)).padStart(4, "0")}-${String(month % 12 + 1).padStart(2, "0")}-01`;
}
// The largest representable calendar day is included when an exclusive year-10000 boundary
// cannot be represented by the application's four-digit local-date contract.
export function windowEnd(date: string, offset: number): string {
  const parsed = calendarDateToDate(date);
  return parsed.getUTCFullYear() * 12 + parsed.getUTCMonth() + offset > 9999 * 12 + 11 ? "9999-12-31" : monthStart(date, offset);
}
export function containsDate(range: TimelineRange, date: string): boolean {
  return date >= range.start && (date < range.end || range.end === "9999-12-31" && date === range.end);
}
export function initialRange(today: string): TimelineRange {
  return { start: monthStart(today, -14), end: windowEnd(today, 22) };
}
export function fitDayWidth(width: number, visibleStart: string): number {
  return Math.max(1, width - TIMELINE_INSET * 2) / Math.max(1, daysBetween(visibleStart, windowEnd(visibleStart, VISIBLE_MONTHS)));
}
export function dateX(date: string, start: string, dayWidth = DAY_WIDTH): number {
  return TIMELINE_INSET + daysBetween(start, date) * dayWidth;
}
export function dateAtX(x: number, start: string, dayWidth = DAY_WIDTH): string {
  const offset = Math.max(0, Math.min(daysBetween(start, "9999-12-31"), Math.floor((x - TIMELINE_INSET) / dayWidth + 0.00001)));
  return addCalendarDays(start, offset);
}
export function rangeWidth(range: TimelineRange, dayWidth = DAY_WIDTH): number {
  return (daysBetween(range.start, range.end) + (range.end === "9999-12-31" ? 1 : 0)) * dayWidth + TIMELINE_INSET * 2;
}
export function monthsInRange(range: TimelineRange): string[] {
  const months: string[] = [];
  for (let date = range.start; date < range.end; date = monthStart(date, 1)) {
    months.push(date);
    if (months.length > 48 || date === "9999-12-01") break;
  }
  return months;
}
export const formatMilestoneDate = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(calendarDateToDate(date));
export function countdown(date: string, today: string): string {
  const days = daysBetween(today, date);
  return days === 0 ? "Today" : days > 0 ? `${days} ${days === 1 ? "day" : "days"} left` : `${-days} ${days === -1 ? "day" : "days"} ago`;
}
export function validMilestoneDate(date: string): boolean {
  try { calendarDateToDate(date); return date >= "0100-01-01" && date <= "9999-12-31"; }
  catch { return false; }
}

/** Fixed, bounded label rectangles make packing independent of fonts and scroll events. */
export function packLabels<T extends { id: string; date: string }>(items: T[], range: TimelineRange, dayWidth = DAY_WIDTH, maxLanes = Infinity) {
  const ends: number[] = [];
  const width = rangeWidth(range, dayWidth);
  const labels: { item: T; items: T[]; x: number; left: number; lane: number }[] = [];
  for (const item of [...items].filter(item => containsDate(range, item.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
      const x = dateX(item.date, range.start, dayWidth);
      const left = Math.max(8, Math.min(x - 12, width - LABEL_WIDTH - 8));
      let lane = ends.findIndex(end => end + 12 <= left);
      if (lane === -1 && ends.length >= maxLanes) {
        const nearest = labels.reduce((best, label) => Math.abs(label.x - x) < Math.abs(best.x - x) ? label : best);
        nearest.items.push(item);
        continue;
      }
      if (lane === -1) lane = ends.length;
      ends[lane] = left + LABEL_WIDTH;
      labels.push({ item, items: [item], x, left, lane });
  }
  return labels;
}
