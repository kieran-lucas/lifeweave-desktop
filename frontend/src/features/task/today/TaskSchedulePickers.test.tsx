import axe from "axe-core";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TaskDatePicker, TaskTimeWheelPicker } from "./TaskSchedulePickers";

function Harness() {
  const [start, setStart] = useState(480);
  const [end, setEnd] = useState(540);
  return (
    <div>
      <TaskTimeWheelPicker label="Start" value={start} onChange={setStart} />
      <TaskTimeWheelPicker label="End" value={end} onChange={setEnd} />
    </div>
  );
}

function DateHarness() {
  const [date, setDate] = useState("2026-08-11");
  return <TaskDatePicker value={date} today="2026-08-13" onChange={(next) => { if (next) setDate(next); }} />;
}

describe("Task schedule pickers", () => {
  it("locks exact hour and minute values through the scroll-wheel controls", () => {
    const view = render(<Harness />);
    expect(view.container.querySelector('input[type="time"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const dialog = screen.getByRole("dialog", { name: "Choose start time" });
    fireEvent.click(within(within(dialog).getByRole("listbox", { name: "Hours" })).getByRole("option", { name: "09" }));
    fireEvent.click(within(within(dialog).getByRole("listbox", { name: "Minutes" })).getByRole("option", { name: "15" }));
    expect(screen.getByRole("button", { name: "Start time, 09:15" })).toBeInTheDocument();
  });

  it("supports holding and dragging the hour wheel by one locked step", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("listbox", { name: "Hours" });
    const initialTop = hours.scrollTop;
    hours.setPointerCapture = () => undefined;
    fireEvent.pointerDown(hours, { pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(hours, { pointerId: 1, clientY: 80 });
    expect(hours.scrollTop).toBe(initialTop + 20);
    fireEvent.pointerUp(hours, { pointerId: 1, clientY: 80 });
    expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument();
  });

  it("limits one large wheel gesture to one time step", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("listbox", { name: "Hours" });

    fireEvent.wheel(hours, { deltaY: 900 });

    expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument();
  });

  it("settles wheel and keyboard steps through one smooth fixed-row movement", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("listbox", { name: "Hours" });
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => { hours.scrollTop = Number(top); });
    Object.defineProperty(hours, "scrollTo", { configurable: true, value: scrollTo });

    fireEvent.wheel(hours, { deltaY: 120 });

    expect(scrollTo).toHaveBeenCalledWith({ top: 200, behavior: "smooth" });
    expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument();
    expect(within(hours).getByRole("option", { name: "09" })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard stepping without tabbing through every option", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("listbox", { name: "Hours" });
    fireEvent.keyDown(hours, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument();
    const selectedHour = within(hours).getByRole("option", { name: "09" });
    expect(selectedHour).toHaveAttribute("tabindex", "-1");
    expect(selectedHour).toHaveAttribute("aria-selected", "true");
  });

  it("exposes 24:00 only for an end time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "End time, 09:00" }));
    const dialog = screen.getByRole("dialog", { name: "Choose end time" });
    fireEvent.click(within(within(dialog).getByRole("listbox", { name: "Hours" })).getByRole("option", { name: "24" }));
    expect(screen.getByRole("button", { name: "End time, 24:00" })).toBeInTheDocument();
    expect(within(within(dialog).getByRole("listbox", { name: "Minutes" })).getAllByRole("option")).toHaveLength(1);
  });

  it("uses a stable six-week date grid with precise keyboard selection", async () => {
    render(<DateHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Task date, Tuesday, August 11, 2026" }));
    const dialog = screen.getByRole("dialog", { name: "Choose task date" });
    const grid = within(dialog).getByRole("grid", { name: "August 2026" });
    expect(within(grid).getAllByRole("row")).toHaveLength(6);
    const selected = within(grid).getByRole("gridcell", { name: "Tuesday, August 11, 2026" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(selected, { key: "ArrowRight" });
    const next = within(grid).getByRole("gridcell", { name: "Wednesday, August 12, 2026" });
    await waitFor(() => expect(next).toHaveFocus());
    fireEvent.keyDown(next, { key: "Enter" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Task date, Wednesday, August 12, 2026" })).toHaveFocus());
  });

  it("dismisses a time picker with Escape and restores trigger focus", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Start time, 08:00" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Choose start time" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Choose start time" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps the open wheel free of automated accessibility violations", async () => {
    const view = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    expect((await axe.run(view.container)).violations).toEqual([]);
  });

  it("keeps the open calendar free of automated accessibility violations", async () => {
    const view = render(<DateHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Task date, Tuesday, August 11, 2026" }));
    expect((await axe.run(view.container)).violations).toEqual([]);
  });
});
