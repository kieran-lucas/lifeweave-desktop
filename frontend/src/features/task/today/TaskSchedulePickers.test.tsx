import axe from "axe-core";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

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
  it("opens with the exact controlled hour and minute, and keeps Done and reopen state", async () => {
    const view = render(<Harness />);
    expect(view.container.querySelector('input[type="time"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const dialog = screen.getByRole("dialog", { name: "Choose start time" });
    const hours = within(dialog).getByRole("spinbutton", { name: "Hours" });
    const minutes = within(dialog).getByRole("spinbutton", { name: "Minutes" });
    expect(hours).toHaveAttribute("aria-valuenow", "8");
    expect(minutes).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(hours, { key: "ArrowDown" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument());
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(dialog).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start time, 09:00" }));
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveAttribute("aria-valuenow", "9");
  });

  it("drags the hour wheel and snaps to one valid value", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("spinbutton", { name: "Hours" });
    fireEvent.mouseDown(hours, { clientY: 100 });
    fireEvent.mouseMove(document, { clientY: 60 });
    fireEvent.mouseUp(document, { clientY: 60 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument());
    expect(hours).toHaveAttribute("aria-valuenow", "9");
  });

  it("drags the minute wheel independently of hours", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
    fireEvent.mouseDown(minutes, { clientY: 100 });
    fireEvent.mouseMove(document, { clientY: 60 });
    fireEvent.mouseUp(document, { clientY: 60 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Start time, 08:01" })).toBeInTheDocument());
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveAttribute("aria-valuenow", "8");
  });

  it("limits one large mouse wheel gesture to one time step without page scrolling", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("spinbutton", { name: "Hours" });

    const gesture = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 900 });
    fireEvent(hours, gesture);

    expect(gesture.defaultPrevented).toBe(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument());
  });

  it("coalesces a precision touchpad delta stream into one step", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("spinbutton", { name: "Hours" });
    for (let index = 0; index < 24; index++) {
      const delta = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 7, deltaMode: 0 });
      fireEvent(hours, delta);
      expect(delta.defaultPrevented).toBe(true);
    }
    await waitFor(() => expect(hours).toHaveAttribute("aria-valuenow", "9"));
  });

  it("keeps a fast precision gesture to one step and accepts a conventional 100-pixel notch", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("spinbutton", { name: "Hours" });
    for (const deltaY of [121, 50, 18, 7, 3]) {
      fireEvent.wheel(hours, { deltaY, deltaMode: 0 });
    }
    await waitFor(() => expect(hours).toHaveAttribute("aria-valuenow", "9"));
    await new Promise((resolve) => setTimeout(resolve, 200));
    fireEvent.wheel(hours, { deltaY: 100, deltaMode: 0 });
    await waitFor(() => expect(hours).toHaveAttribute("aria-valuenow", "10"));
  });

  it("steps minutes by one and exposes the selected two-digit value", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const minutes = screen.getByRole("spinbutton", { name: "Minutes" });
    fireEvent.wheel(minutes, { deltaY: 120 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Start time, 08:01" })).toBeInTheDocument());
    expect(minutes).toHaveAttribute("aria-valuetext", "01");
  });

  it("supports keyboard stepping without tabbing through every option", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("spinbutton", { name: "Hours" });
    fireEvent.keyDown(hours, { key: "ArrowDown" });
    await waitFor(() => expect(hours).toHaveAttribute("aria-valuenow", "9"));
    expect(hours).toHaveAttribute("tabindex", "0");
  });

  it("exposes 24:00 only for an end time and restricts its minute to 00", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "End time, 09:00" }));
    const dialog = screen.getByRole("dialog", { name: "Choose end time" });
    const hours = within(dialog).getByRole("spinbutton", { name: "Hours" });
    expect(hours).toHaveAttribute("aria-valuemax", "24");
    fireEvent.keyDown(hours, { key: "End" });
    await waitFor(() => expect(screen.getByRole("button", { name: "End time, 24:00" })).toBeInTheDocument(), { timeout: 3000 });
    expect(within(dialog).getByRole("spinbutton", { name: "Minutes" })).toHaveAttribute("aria-valuemax", "0");
  });

  it("accepts external value updates and preserves 04:00, 23:59, and 24:00 boundaries", () => {
    const onChange = () => undefined;
    const view = render(<TaskTimeWheelPicker label="Start" value={240} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 04:00" }));
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveAttribute("aria-valuenow", "4");
    view.rerender(<TaskTimeWheelPicker label="Start" value={1439} onChange={onChange} />);
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveAttribute("aria-valuenow", "23");
    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveAttribute("aria-valuenow", "59");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    view.rerender(<TaskTimeWheelPicker label="End" value={1440} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "End time, 24:00" }));
    expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveAttribute("aria-valuemax", "24");
    expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveAttribute("aria-valuemax", "0");
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

  it("dismisses on an outside pointer press without changing the selected time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Choose start time" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start time, 08:00" })).toBeInTheDocument();
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
