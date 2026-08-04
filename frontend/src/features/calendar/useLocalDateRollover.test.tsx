import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { millisecondsUntilNextLocalDate, useLocalDateRollover } from "./useLocalDateRollover";

describe("useLocalDateRollover", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 7, 4, 23, 59, 59)); });
  afterEach(() => vi.useRealTimers());

  it("initializes before midnight and rolls at the next local midnight plus one second", () => {
    const { result } = renderHook(() => useLocalDateRollover());
    expect(result.current).toBe("2026-08-04");
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current).toBe("2026-08-05");
  });

  it("refreshes after focus and visible restoration across sleeping midnight", () => {
    const { result } = renderHook(() => useLocalDateRollover());
    vi.setSystemTime(new Date(2026, 7, 6, 9));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(result.current).toBe("2026-08-06");
    vi.setSystemTime(new Date(2026, 7, 7, 9));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe("2026-08-07");
  });

  it("cleans its timer and listeners", () => {
    const clear = vi.spyOn(globalThis, "clearTimeout"); const removeWindow = vi.spyOn(window, "removeEventListener"); const removeDocument = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useLocalDateRollover()); unmount();
    expect(clear).toHaveBeenCalled(); expect(removeWindow).toHaveBeenCalledWith("focus", expect.any(Function)); expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("computes each next local midnight rather than a fixed 24-hour interval", () => {
    const now = new Date(2026, 2, 28, 12, 30); const delay = millisecondsUntilNextLocalDate(now);
    expect(delay).toBe(new Date(2026, 2, 29, 0, 0, 1).getTime() - now.getTime());
  });
});
