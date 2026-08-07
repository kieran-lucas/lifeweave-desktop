import axe from "axe-core";
import { act, render, renderHook, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveTimerStrip } from "./ActiveTimerStrip";
import {
  durationAttribute,
  elapsedSeconds,
  formatElapsed,
  spokenElapsed,
  useActualTimeTick,
} from "./actualTime";

const STARTED = new Date(2026, 7, 7, 10, 0, 0).getTime();

const active = {
  session_id: "session-1",
  task_id: "task-1",
  task_title: "Write the report",
  task_local_date: "2026-08-07",
  started_at_ms: BigInt(STARTED),
  completed_seconds_before_active: BigInt(0),
};

describe("actual time formatting", () => {
  it("derives elapsed seconds from timestamps and never goes negative", () => {
    expect(elapsedSeconds(1000, 4999)).toBe(3);
    expect(elapsedSeconds(1000, 1000)).toBe(0);
    // A backwards clock must floor at zero rather than render a negative stopwatch.
    expect(elapsedSeconds(5000, 1000)).toBe(0);
  });

  it("formats minutes below an hour and hours above it", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9)).toBe("0:09");
    expect(formatElapsed(75)).toBe("1:15");
    expect(formatElapsed(3599)).toBe("59:59");
    expect(formatElapsed(3600)).toBe("1:00:00");
    expect(formatElapsed(3725)).toBe("1:02:05");
  });

  it("emits a machine-readable duration and a spoken label", () => {
    expect(durationAttribute(0)).toBe("PT0S");
    expect(durationAttribute(3725)).toBe("PT3725S");
    expect(spokenElapsed(0)).toBe("0 seconds");
    expect(spokenElapsed(1)).toBe("1 second");
    expect(spokenElapsed(75)).toBe("1 minute 15 seconds");
    expect(spokenElapsed(3725)).toBe("1 hour 2 minutes 5 seconds");
  });
});

describe("useActualTimeTick", () => {
  beforeEach(() => {
    // Selective faking: TodayScreen relies on queueMicrotask, which must stay real.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    vi.setSystemTime(new Date(2026, 7, 7, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("registers no timer at all while inactive", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    renderHook(() => useActualTimeTick(false));
    expect(spy).not.toHaveBeenCalled();
  });

  it("ticks once a second while active and clears everything on unmount", () => {
    const clear = vi.spyOn(globalThis, "clearInterval");
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    const { result, unmount } = renderHook(() => useActualTimeTick(true));

    const first = result.current;
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBe(first + 3000);

    unmount();
    expect(clear).toHaveBeenCalled();
    expect(removeWindow).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("tears the interval down as soon as the session stops", () => {
    const clear = vi.spyOn(globalThis, "clearInterval");
    const { rerender } = renderHook(({ active }) => useActualTimeTick(active), {
      initialProps: { active: true },
    });
    expect(clear).not.toHaveBeenCalled();
    rerender({ active: false });
    expect(clear).toHaveBeenCalled();
  });

  it("is StrictMode-safe: a double mount leaves exactly one live interval", () => {
    const set = vi.spyOn(globalThis, "setInterval");
    const clear = vi.spyOn(globalThis, "clearInterval");
    function Probe() {
      useActualTimeTick(true);
      return null;
    }
    render(<StrictMode><Probe /></StrictMode>);
    // StrictMode mounts, unmounts, and remounts the effect; every setup is balanced by a teardown
    // except the final one.
    expect(set.mock.calls.length - clear.mock.calls.length).toBe(1);
  });
});

describe("ActiveTimerStrip", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    vi.setSystemTime(new Date(2026, 7, 7, 10, 0, 30));
  });
  afterEach(() => vi.useRealTimers());

  const mount = (props: Partial<Parameters<typeof ActiveTimerStrip>[0]> = {}) =>
    render(
      <ActiveTimerStrip
        active={active}
        pending={false}
        onStop={vi.fn()}
        onDiscard={vi.fn()}
        {...props}
      />,
    );

  it("names the task, its scheduled date, and the running elapsed time", () => {
    mount();
    expect(screen.getByText("Write the report")).toBeInTheDocument();
    expect(screen.getByText("Scheduled 2026-08-07")).toBeInTheDocument();
    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent("0:30");
    expect(timer).toHaveAttribute("datetime", "PT30S");
    expect(timer).toHaveAccessibleName("Elapsed 30 seconds");
  });

  it("derives elapsed from the start timestamp rather than counting ticks", () => {
    mount();
    expect(screen.getByRole("timer")).toHaveTextContent("0:30");

    // Simulate a throttled tab: the wall clock jumps far further than the ticks that fired.
    act(() => {
      vi.setSystemTime(new Date(2026, 7, 7, 11, 2, 4));
      vi.advanceTimersByTime(1000);
    });
    // Tick-counting would show 0:31; deriving from the timestamp shows the true elapsed time.
    expect(screen.getByRole("timer")).toHaveTextContent("1:02:05");
  });

  it("shows a combined total only when earlier segments exist", () => {
    mount();
    expect(screen.queryByText(/^Total/)).not.toBeInTheDocument();
    mount({ active: { ...active, completed_seconds_before_active: BigInt(90) } });
    expect(screen.getAllByText("Total 2:00").length).toBeGreaterThan(0);
  });

  it("does not announce the ticking counter to screen readers", () => {
    const { container } = mount();
    const timer = screen.getByRole("timer");
    expect(timer).not.toHaveAttribute("aria-live");
    // Nothing wrapping the counter may turn it into a once-per-second announcement either.
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
  });

  it("offers Stop and Discard, and disables both while a mutation is in flight", () => {
    const onStop = vi.fn();
    const onDiscard = vi.fn();
    const { rerender } = mount({ onStop, onDiscard });
    screen.getByRole("button", { name: "Stop timer" }).click();
    screen.getByRole("button", { name: "Discard segment" }).click();
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);

    rerender(
      <ActiveTimerStrip active={active} pending onStop={onStop} onDiscard={onDiscard} />,
    );
    expect(screen.getByRole("button", { name: "Stop timer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard segment" })).toBeDisabled();
  });

  it("conveys the running state as text, not colour alone, with no axe violations", async () => {
    const { container } = mount();
    // axe drives its own scheduling; hand the clock back before running it.
    vi.useRealTimers();
    expect(screen.getByText("Timing")).toBeInTheDocument();
    for (const button of container.querySelectorAll("button")) {
      expect(button).toHaveAccessibleName();
    }
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
