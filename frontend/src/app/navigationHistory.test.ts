import { describe, expect, it, vi } from "vitest";

import {
  pushAppHistoryRoute,
  readAppHistoryEntry,
  readAppHistoryRoute,
  replaceAppHistoryRoute,
  sameAppHistoryRoute,
  type AppHistoryRoute,
} from "./navigationHistory";

const today: AppHistoryRoute = {
  destination: "today",
  settingsView: "general",
  selectedDate: "2026-08-11",
};

describe("application navigation history", () => {
  it("round-trips only versioned Lifeweave route states", () => {
    const history = {
      replaceState: vi.fn(),
      pushState: vi.fn(),
    } as unknown as History;

    replaceAppHistoryRoute(history, today, 0);
    pushAppHistoryRoute(history, { ...today, destination: "life" }, 1);

    const initial = vi.mocked(history.replaceState).mock.calls[0]![0];
    const next = vi.mocked(history.pushState).mock.calls[0]![0];
    expect(readAppHistoryRoute(initial)).toEqual(today);
    expect(readAppHistoryRoute(next)).toEqual({ ...today, destination: "life" });
    expect(readAppHistoryEntry(initial)).toEqual({ route: today, index: 0 });
    expect(readAppHistoryEntry(next)).toEqual({
      route: { ...today, destination: "life" },
      index: 1,
    });
  });

  it("rejects unrelated, malformed, and future history states", () => {
    expect(readAppHistoryRoute(null)).toBeNull();
    expect(readAppHistoryRoute({ destination: "life" })).toBeNull();
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 2,
      lifeweaveHistoryIndex: 0,
      destination: "life",
      settingsView: "general",
      selectedDate: "2026-08-11",
    })).toBeNull();
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 1,
      lifeweaveHistoryIndex: 0,
      destination: "unknown",
      settingsView: "general",
      selectedDate: "2026-08-11",
    })).toBeNull();
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 1,
      lifeweaveHistoryIndex: -1,
      ...today,
    })).toBeNull();
  });

  it("compares every route field so duplicate entries can be skipped", () => {
    expect(sameAppHistoryRoute(today, { ...today })).toBe(true);
    expect(sameAppHistoryRoute(today, { ...today, destination: "calendar" })).toBe(false);
    expect(sameAppHistoryRoute(today, { ...today, settingsView: "analytics" })).toBe(false);
    expect(sameAppHistoryRoute(today, { ...today, selectedDate: "2026-08-12" })).toBe(false);
  });
});
