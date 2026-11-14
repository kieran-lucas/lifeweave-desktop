import { describe, expect, it } from "vitest";
import { countdown, dateAtX, dateX, daysBetween, fitDayWidth, initialRange, LABEL_WIDTH, monthStart, monthsInRange, packLabels, rangeWidth, TIMELINE_INSET, validMilestoneDate } from "./timeline";

describe("Milestones calendar geometry", () => {
  it("keeps a bounded scroll buffer around a twelve-month viewport", () => {
    const range = initialRange("2026-11-14");
    expect(range).toEqual({ start: "2025-09-01", end: "2028-09-01" });
    expect(monthsInRange(range)).toHaveLength(36);
  });
  it("uses equal day distances through leap February and year boundaries", () => {
    expect(daysBetween("2024-02-01", "2024-03-01")).toBe(29);
    expect(daysBetween("2023-02-01", "2023-03-01")).toBe(28);
    expect(dateX("2027-01-01", "2026-12-01") - dateX("2026-12-31", "2026-12-01")).toBe(8);
    expect(dateX("2024-03-01", "2024-02-01") - dateX("2024-02-29", "2024-02-01")).toBe(8);
    expect(dateAtX(dateX("2026-12-17", "2026-09-01"), "2026-09-01")).toBe("2026-12-17");
  });
  it("never uses timezone offsets or elapsed DST hours for calendar arithmetic", () => {
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
    expect(monthStart("2027-01-31", -1)).toBe("2026-12-01");
  });
  it("describes past dates without assigning completion", () => {
    expect(countdown("2026-12-17", "2026-11-14")).toBe("33 days left");
    expect(countdown("2026-11-14", "2026-11-14")).toBe("Today");
    expect(countdown("2026-11-13", "2026-11-14")).toBe("1 day ago");
    expect(countdown("2026-11-15", "2026-11-14")).toBe("1 day left");
    expect(countdown("2026-11-12", "2026-11-14")).toBe("2 days ago");
  });
  it.each(["2026-02-29", "2026-13-01", "2026-11-31", "2026-1-01", "", "0000-01-01"])("rejects invalid date %s", date => expect(validMilestoneDate(date)).toBe(false));
  it("packs dozens of duplicate and nearby dates without dropping labels or intersecting rectangles", () => {
    const range = initialRange("2026-11-14");
    const items = Array.from({ length: 60 }, (_, i) => ({ id: String(i), date: i < 30 ? "2026-12-17" : "2026-12-18" }));
    const labels = packLabels(items, range);
    expect(labels).toHaveLength(60);
    for (const a of labels) {
      expect(a.left).toBeGreaterThanOrEqual(0);
      expect(a.left + LABEL_WIDTH).toBeLessThanOrEqual(rangeWidth(range));
      for (const b of labels) if (a.item.id !== b.item.id && a.lane === b.lane) expect(Math.abs(a.left - b.left)).toBeGreaterThanOrEqual(LABEL_WIDTH + 12);
    }
    expect(labels.filter(label => label.item.date === "2026-12-17").every(label => label.x === dateX("2026-12-17", range.start))).toBe(true);
  });
  it("packs near the last date within canvas bounds and reuses free lanes", () => {
    const range = initialRange("2026-11-14");
    const labels = packLabels([{ id: "last", date: "2027-09-30" }, { id: "first", date: "2026-09-01" }], range);
    expect(labels.map(label => label.lane)).toEqual([0, 0]);
    expect(labels[1]!.left + LABEL_WIDTH).toBeLessThan(rangeWidth(range));
  });
  it("keeps windows ordered at the supported calendar bounds and retains the last day", () => {
    const first = initialRange("0100-01-01");
    expect(first.start).toBe("0100-01-01");
    const last = initialRange("9999-12-31");
    expect(last).toEqual({ start: "9998-10-01", end: "9999-12-31" });
    expect(packLabels([{ id: "last", date: "9999-12-31" }], last)).toHaveLength(1);
    expect(monthsInRange(last)).toHaveLength(15);
  });
  it.each([432, 852, 983, 1280])("fits twelve whole months at width %s without distorting days", width => {
    const start = "2026-09-01";
    const scale = fitDayWidth(width, start);
    expect(dateX("2027-09-01", start, scale) - dateX(start, start, scale)).toBeCloseTo(width - TIMELINE_INSET * 2);
    expect(dateX("2027-03-01", start, scale) - dateX("2027-02-01", start, scale)).toBeCloseTo(28 * scale);
    expect(dateX("2026-12-17", start, scale) - dateX("2026-12-16", start, scale)).toBeCloseTo(scale);
  });
  it("limits dense callouts to three lanes and keeps every milestone in a selectable group", () => {
    const range = initialRange("2026-11-14");
    const input = Array.from({ length: 60 }, (_, i) => ({ id: String(i), date: i < 30 ? "2026-12-17" : "2026-12-18" }));
    const labels = packLabels(input, range, fitDayWidth(852, "2026-09-01"), 3);
    expect(labels).toHaveLength(3);
    expect(labels.flatMap(label => label.items)).toHaveLength(60);
    expect(new Set(labels.flatMap(label => label.items.map(item => item.id))).size).toBe(60);
    expect(Math.max(...labels.map(label => label.lane))).toBe(2);
  });
});
