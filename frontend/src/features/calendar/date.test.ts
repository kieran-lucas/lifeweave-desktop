import { describe, expect, it } from "vitest";

import { addCalendarDays, calendarDateToDate, mondayWeekdayIndex } from "./date";

describe("date-only startup utilities", () => {
  it("crosses month, year, and leap-day boundaries without host-timezone drift", () => {
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addCalendarDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("uses Monday-zero weekday indexing for week navigation", () => {
    expect(mondayWeekdayIndex("2026-08-03")).toBe(0);
    expect(mondayWeekdayIndex("2026-08-09")).toBe(6);
  });

  it("rejects malformed and impossible dates instead of normalizing them", () => {
    expect(() => calendarDateToDate("2026-02-29")).toThrow(RangeError);
    expect(() => calendarDateToDate("not-a-date")).toThrow(RangeError);
  });
});
