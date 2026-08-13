import axe from "axe-core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TaskTimeWheelPicker } from "./TaskSchedulePickers";

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

  it("keeps the open wheel free of automated accessibility violations", async () => {
    const view = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    expect((await axe.run(view.container)).violations).toEqual([]);
  });
});
