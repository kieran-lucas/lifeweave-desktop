import { getLocalTimeZone, parseDate, today } from "@internationalized/date";

export const localToday = (): string => today(getLocalTimeZone()).toString();
export const parseLocalDate = (value: string) => parseDate(value);
