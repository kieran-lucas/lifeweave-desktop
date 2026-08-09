import { getLocalTimeZone, parseDate, today } from "@internationalized/date";

// Native visual-regression builds pin the local date so tracked screenshots do not expire at
// midnight. Ordinary production builds never define this Vite variable and continue to use the
// user's real local timezone date.
const e2eLocalDate = import.meta.env.VITE_LIFEWEAVE_E2E_LOCAL_DATE as string | undefined;

export const localToday = (): string => e2eLocalDate ?? today(getLocalTimeZone()).toString();
export const parseLocalDate = (value: string) => parseDate(value);
