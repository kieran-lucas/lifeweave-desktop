import { fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import * as commands from "../../ipc/commands";
import { LinkedWorkPanel } from "./LinkedWorkPanel";

vi.mock("../../ipc/commands");

const work = {
  one_off_count: 1,
  series_count: 1,
  items: [
    {
      id: "task-1",
      kind: "one_off" as const,
      title: "Write the essay",
      group: "active",
      navigation_local_date: "2026-08-10",
      series_id: null,
      tags: [],
    },
    {
      id: "series-1",
      kind: "recurring" as const,
      title: "Weekly review",
      group: "active",
      navigation_local_date: "2026-08-13",
      series_id: "series-1",
      tags: [],
    },
  ],
};

describe("LinkedWorkPanel", () => {
  it("lists linked work with counts and navigates to the projected date", async () => {
    vi.mocked(commands.getFocusPlanLinkedWork).mockResolvedValue(work);
    const navigate = vi.fn();
    const { container } = render(
      <LinkedWorkPanel
        planId="plan-1"
        anchorLocalDate="2026-08-06"
        onTaskNavigate={navigate}
      />,
    );

    const list = await screen.findByRole("list", { name: "Linked work" });
    expect(commands.getFocusPlanLinkedWork).toHaveBeenCalledWith({
      plan_id: "plan-1",
      anchor_local_date: "2026-08-06",
    });
    expect(screen.getByText(/1 task · 1 recurring series/)).toBeInTheDocument();

    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /Write the essay/ }));
    expect(navigate).toHaveBeenCalledWith("2026-08-10", "task-1", null);

    fireEvent.click(screen.getByRole("button", { name: /Weekly review/ }));
    expect(navigate).toHaveBeenCalledWith("2026-08-13", null, "series-1");

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("shows an empty state and announces a load failure", async () => {
    vi.mocked(commands.getFocusPlanLinkedWork).mockResolvedValue({
      one_off_count: 0,
      series_count: 0,
      items: [],
    });
    const view = render(
      <LinkedWorkPanel planId="plan-1" anchorLocalDate="2026-08-06" />,
    );
    expect(await screen.findByText("No linked work yet.")).toBeInTheDocument();
    view.unmount();

    vi.mocked(commands.getFocusPlanLinkedWork).mockRejectedValue(new Error("nope"));
    render(<LinkedWorkPanel planId="plan-1" anchorLocalDate="2026-08-06" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Linked work could not be loaded.",
    );
  });
});
