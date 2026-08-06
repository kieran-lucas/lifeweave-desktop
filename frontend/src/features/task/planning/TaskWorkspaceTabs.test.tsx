import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { TaskWorkspaceTabs } from "./TaskWorkspaceTabs";

describe("TaskWorkspaceTabs", () => {
  it("starts with Today selected and uses complete manual tab relations", async () => {
    const { container } = render(<><TaskWorkspaceTabs active="today" onActivate={vi.fn()} /><div id="task-panel-today" role="tabpanel" aria-labelledby="task-tab-today" /><div id="task-panel-upcoming" role="tabpanel" aria-labelledby="task-tab-upcoming" /><div id="task-panel-overdue" role="tabpanel" aria-labelledby="task-tab-overdue" /><div id="task-panel-deadlines" role="tabpanel" aria-labelledby="task-tab-deadlines" /><div id="task-panel-views" role="tabpanel" aria-labelledby="task-tab-views" /></>);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Today", "Upcoming", "Overdue", "Deadlines", "Views"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-controls", "task-panel-today");
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("moves focus with wrap/Home/End without activating", () => {
    const activate = vi.fn();
    render(<TaskWorkspaceTabs active="today" onActivate={activate} />);
    const today = screen.getByRole("tab", { name: "Today" });
    today.focus();
    fireEvent.keyDown(today, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Views" })).toHaveFocus();
    expect(activate).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(today).toHaveFocus();
    fireEvent.keyDown(today, { key: "End" });
    expect(screen.getByRole("tab", { name: "Views" })).toHaveFocus();
  });

  it("activates only through click, Enter, or Space", () => {
    const activate = vi.fn();
    render(<TaskWorkspaceTabs active="today" onActivate={activate} />);
    const upcoming = screen.getByRole("tab", { name: "Upcoming" });
    fireEvent.click(upcoming);
    fireEvent.keyDown(upcoming, { key: "Enter" });
    fireEvent.keyDown(upcoming, { key: " " });
    expect(activate).toHaveBeenCalledTimes(3);
    expect(activate).toHaveBeenLastCalledWith("upcoming");

    fireEvent.click(screen.getByRole("tab", { name: "Deadlines" }));
    expect(activate).toHaveBeenLastCalledWith("deadlines");
    fireEvent.click(screen.getByRole("tab", { name: "Views" }));
    expect(activate).toHaveBeenLastCalledWith("views");
  });
});
