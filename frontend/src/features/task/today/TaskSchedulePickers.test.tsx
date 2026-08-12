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
    fireEvent.click(within(dialog).getByRole("option", { name: "09 hours" }));
    fireEvent.click(within(dialog).getByRole("option", { name: "15 minutes" }));
    expect(screen.getByRole("button", { name: "Start time, 09:15" })).toBeInTheDocument();
  });

  it("supports holding and dragging the hour wheel by one locked step", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Start time, 08:00" }));
    const hours = screen.getByRole("listbox", { name: "Hours" });
    fireEvent.pointerDown(hours, { pointerId: 1, clientY: 100 });
    fireEvent.pointerMove(hours, { pointerId: 1, clientY: 62 });
    fireEvent.pointerUp(hours, { pointerId: 1, clientY: 62 });
    expect(screen.getByRole("button", { name: "Start time, 09:00" })).toBeInTheDocument();
  });

  it("exposes 24:00 only for an end time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "End time, 09:00" }));
    const dialog = screen.getByRole("dialog", { name: "Choose end time" });
    fireEvent.click(within(dialog).getByRole("option", { name: "24 hours" }));
    expect(screen.getByRole("button", { name: "End time, 24:00" })).toBeInTheDocument();
    expect(within(dialog).getAllByRole("option", { name: /minutes/ })).toHaveLength(1);
  });
});
