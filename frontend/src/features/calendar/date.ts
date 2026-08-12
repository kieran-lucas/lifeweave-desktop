// Native visual-regression builds pin the local date so tracked screenshots do not expire at
// midnight. Ordinary production builds never define this Vite variable and continue to use the
// user's real local timezone date.
const e2eLocalDate = import.meta.env.VITE_LIFEWEAVE_E2E_LOCAL_DATE as string | undefined;

function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nativeLocalDate(value: Date): string {
  return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

/**
 * Converts an authoritative date-only value to a UTC-noon Date for Intl formatting and arithmetic.
 * Noon plus an explicit UTC formatter avoids both DST gaps and host-timezone day drift.
 */
export function calendarDateToDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Invalid local date: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw new RangeError(`Invalid local date: ${value}`);
  return date;
}

export function addCalendarDays(value: string, amount: number): string {
  const date = calendarDateToDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Monday is zero, Sunday is six. */
export function mondayWeekdayIndex(value: string): number {
  return (calendarDateToDate(value).getUTCDay() + 6) % 7;
}

export const localToday = (): string => e2eLocalDate ?? nativeLocalDate(new Date());
export const observedLocalToday = (): string => nativeLocalDate(new Date());
