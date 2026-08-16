import { describe, expect, it, vi } from "vitest";

import {
  appHistoryScreenKey,
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
  plansView: { portfolio: "active", planId: null },
  lifeView: { mode: "browse", nodeId: null, readerId: null, page: 0 },
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
      lifeweaveRouteVersion: 3,
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
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 2,
      lifeweaveHistoryIndex: 1,
      ...today,
      plansView: { portfolio: "unknown", planId: null },
    })).toBeNull();
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 2,
      lifeweaveHistoryIndex: 1,
      ...today,
      lifeView: { mode: "reader", nodeId: "branch-1", readerId: null, page: 0 },
    })).toBeNull();
  });

  it("upgrades version 1 entries to the default Plans overview", () => {
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 1,
      lifeweaveHistoryIndex: 2,
      destination: "plans",
      settingsView: "general",
      selectedDate: "2026-08-11",
    })).toEqual({
      ...today,
      destination: "plans",
    });
  });

  it("hydrates early version 2 entries that predate Life snapshots", () => {
    const { lifeView: _lifeView, ...withoutLife } = today;
    expect(readAppHistoryRoute({
      lifeweaveRouteVersion: 2,
      lifeweaveHistoryIndex: 3,
      ...withoutLife,
    })).toEqual(today);
  });

  it("keeps Plans overview and detail as consecutive restorable snapshots", () => {
    const history = {
      replaceState: vi.fn(),
      pushState: vi.fn(),
    } as unknown as History;
    const overview: AppHistoryRoute = { ...today, destination: "plans" };
    const detail: AppHistoryRoute = {
      ...overview,
      plansView: { portfolio: "active", planId: "plan-1" },
    };

    replaceAppHistoryRoute(history, { ...today, destination: "today" }, 0);
    pushAppHistoryRoute(history, overview, 1);
    pushAppHistoryRoute(history, detail, 2);

    const overviewState = vi.mocked(history.pushState).mock.calls[0]![0];
    const detailState = vi.mocked(history.pushState).mock.calls[1]![0];
    expect(readAppHistoryEntry(detailState)).toEqual({ route: detail, index: 2 });
    expect(readAppHistoryEntry(overviewState)).toEqual({ route: overview, index: 1 });
  });

  it("restores branch and sibling Readers as distinct Life snapshots", () => {
    const branch: AppHistoryRoute = {
      ...today,
      destination: "life",
      lifeView: { mode: "browse", nodeId: "branch-1", readerId: null, page: 0 },
    };
    const leafOne: AppHistoryRoute = {
      ...branch,
      lifeView: { mode: "reader", nodeId: "branch-1", readerId: "leaf-1", page: 0 },
    };
    const leafTwo: AppHistoryRoute = {
      ...branch,
      lifeView: { mode: "reader", nodeId: "branch-1", readerId: "leaf-2", page: 0 },
    };
    const history = { replaceState: vi.fn(), pushState: vi.fn() } as unknown as History;
    replaceAppHistoryRoute(history, branch, 1);
    pushAppHistoryRoute(history, leafOne, 2);
    pushAppHistoryRoute(history, leafTwo, 3);

    const firstReaderState = vi.mocked(history.pushState).mock.calls[0]![0];
    const secondReaderState = vi.mocked(history.pushState).mock.calls[1]![0];
    expect(readAppHistoryEntry(secondReaderState)).toEqual({ route: leafTwo, index: 3 });
    expect(readAppHistoryEntry(firstReaderState)).toEqual({ route: leafOne, index: 2 });
    expect(readAppHistoryEntry(vi.mocked(history.replaceState).mock.calls[0]![0]))
      .toEqual({ route: branch, index: 1 });
  });

  it("compares every route field so duplicate entries can be skipped", () => {
    expect(sameAppHistoryRoute(today, { ...today })).toBe(true);
    expect(sameAppHistoryRoute(today, { ...today, destination: "calendar" })).toBe(false);
    expect(sameAppHistoryRoute(today, { ...today, settingsView: "analytics" })).toBe(false);
    expect(sameAppHistoryRoute(today, { ...today, selectedDate: "2026-08-12" })).toBe(false);
    expect(sameAppHistoryRoute({ ...today, destination: "plans" }, {
      ...today,
      destination: "plans",
      plansView: { portfolio: "active", planId: "plan-1" },
    })).toBe(false);
    expect(sameAppHistoryRoute({ ...today, destination: "plans" }, {
      ...today,
      destination: "plans",
      plansView: { portfolio: "paused", planId: null },
    })).toBe(false);
    expect(sameAppHistoryRoute(today, {
      ...today,
      plansView: { portfolio: "paused", planId: "hidden-outside-plans" },
    })).toBe(true);
    expect(sameAppHistoryRoute({ ...today, destination: "life" }, {
      ...today,
      destination: "life",
      lifeView: { mode: "reader", nodeId: "branch-1", readerId: "leaf-1", page: 0 },
    })).toBe(false);
  });

  it("defines one transition boundary per meaningful screen snapshot", () => {
    const overview = { ...today, destination: "plans" as const };
    const detail = { ...overview, plansView: { portfolio: "active" as const, planId: "plan-1" } };
    expect(appHistoryScreenKey(overview)).toBe("plans:active:overview");
    expect(appHistoryScreenKey(detail)).toBe("plans:active:plan-1");
    expect(appHistoryScreenKey({ ...today, selectedDate: "2026-08-12" })).toBe("today");
    expect(appHistoryScreenKey({
      ...today,
      destination: "life",
      lifeView: { mode: "reader", nodeId: "branch-1", readerId: "leaf-1", page: 0 },
    })).toBe("life:reader:branch-1:leaf-1:0");
  });
});
