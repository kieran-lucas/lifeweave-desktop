import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeekStrip } from "./WeekStrip";

describe("WeekStrip", () => {
  it("renders exactly seven date buttons and separates today from selection", () => {
    render(<WeekStrip selectedDate="2026-08-04" today="2026-08-03" onSelectDate={vi.fn()}/>);
    const navigation=screen.getByRole("navigation",{name:"Week navigation"});
    const dates=within(navigation).getAllByRole("button").filter(button=>button.hasAttribute("aria-pressed"));
    expect(dates).toHaveLength(7);
    expect(dates.filter(button=>button.getAttribute("aria-current")==="date")).toHaveLength(1);
    expect(dates.filter(button=>button.getAttribute("aria-pressed")==="true")).toHaveLength(1);
    const current=dates.find(button=>button.getAttribute("aria-current")==="date")!;
    expect(current).not.toBe(dates.find(button=>button.getAttribute("aria-pressed")==="true"));
    expect(within(current).getByText("Today")).toBeVisible();
  });

  it("moves by exactly seven days", () => {
    const select=vi.fn();
    render(<WeekStrip selectedDate="2026-08-04" today="2026-08-03" onSelectDate={select}/>);
    fireEvent.click(screen.getByRole("button",{name:"Previous week"}));
    fireEvent.click(screen.getByRole("button",{name:"Next week"}));
    expect(select).toHaveBeenNthCalledWith(1,"2026-07-28");
    expect(select).toHaveBeenNthCalledWith(2,"2026-08-11");
  });

  it("handles a week crossing a month boundary", () => {
    render(<WeekStrip selectedDate="2026-08-01" today="2026-08-02" onSelectDate={vi.fn()}/>);
    const labels=within(screen.getByRole("navigation",{name:"Week navigation"})).getAllByRole("button").map(button=>button.getAttribute("aria-label")??"");
    expect(labels.some(label=>label.includes("July"))).toBe(true);
    expect(labels.some(label=>label.includes("August"))).toBe(true);
  });
});
