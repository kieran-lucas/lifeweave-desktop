import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { TaskWorkspaceTabs } from "./TaskWorkspaceTabs";

describe("TaskWorkspaceTabs", () => {
  it("keeps only Today and Upcoming in the primary tab strip", async () => {
    const { container } = render(
      <>
        <TaskWorkspaceTabs active="today" onActivate={vi.fn()} />
        <div id="task-panel-today" role="tabpanel" aria-labelledby="task-tab-today" />
        <div id="task-panel-upcoming" role="tabpanel" aria-labelledby="task-tab-upcoming" />
      </>,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Today", "Upcoming"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-controls", "task-panel-today");
    expect(screen.getByText("More")).toBeInTheDocument();
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("moves focus only across the two frequent views", () => {
    const activate = vi.fn();
    render(<TaskWorkspaceTabs active="today" onActivate={activate} />);
    const today = screen.getByRole("tab", { name: "Today" });
    const upcoming = screen.getByRole("tab", { name: "Upcoming" });
    today.focus();
    fireEvent.keyDown(today, { key: "ArrowLeft" });
    expect(upcoming).toHaveFocus();
    expect(activate).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(today).toHaveFocus();
    fireEvent.keyDown(today, { key: "End" });
    expect(upcoming).toHaveFocus();
  });

  it("activates frequent views directly and secondary views from More", () => {
    const activate = vi.fn();
    render(<TaskWorkspaceTabs active="today" onActivate={activate} />);

    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    expect(activate).toHaveBeenLastCalledWith("upcoming");

    fireEvent.click(screen.getByText("More"));
    fireEvent.click(screen.getByRole("button", { name: "Deadlines" }));
    expect(activate).toHaveBeenLastCalledWith("deadlines");

    fireEvent.click(screen.getByText("More"));
    fireEvent.click(screen.getByRole("button", { name: "Saved views" }));
    expect(activate).toHaveBeenLastCalledWith("views");
  });
});
