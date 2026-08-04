import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskPlanningPanel from "./TaskPlanningPanel";

const commands = vi.hoisted(() => ({ getTaskPlanningProjection: vi.fn() }));
vi.mock("../../../ipc/commands", () => commands);

const item = {
  kind: "recurring" as const,
  id: "series:2026-08-01",
  occurrence_id: "series:2026-08-01",
  series_id: "series",
  original_local_date: "2026-08-01",
  local_date: "2026-08-05",
  start_minute: 480,
  end_minute: 570,
  title: "Weekly review",
  description: "Review the plan",
  category_id: "general",
  category_name: "General",
  category_icon_key: "category-general",
  category_color_key: "blue",
  priority: "high",
  is_override: true,
  life_area: { id: "study", title: "Study", breadcrumb: "Study", archived: false },
};
const projection = {
  mode: "upcoming" as const,
  algorithm_version: 1,
  anchor_local_date: "2026-08-04",
  range_start_local_date: "2026-08-05",
  range_end_local_date: "2026-08-18",
  total_item_count: 1,
  scheduled_minutes: 90,
  groups: [{ local_date: "2026-08-05", scheduled_minutes: 90, items: [item] }],
};
function renderPanel(mode: "upcoming" | "overdue" = "upcoming", open = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { open, ...render(
    <QueryClientProvider client={client}>
      <TaskPlanningPanel mode={mode} anchorLocalDate="2026-08-04" onOpenItem={open} />
    </QueryClientProvider>,
  ) };
}

describe("TaskPlanningPanel", () => {
  beforeEach(() => commands.getTaskPlanningProjection.mockReset().mockResolvedValue(projection));

  it("queries the exact mode/anchor and opens recurring identity on its displayed date", async () => {
    const { open } = renderPanel();
    expect(await screen.findByText("Weekly review")).toBeInTheDocument();
    expect(commands.getTaskPlanningProjection).toHaveBeenCalledWith({ mode: "upcoming", anchor_local_date: "2026-08-04" });
    expect(screen.getByText("1 tasks · 1 h 30 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open day for Weekly review/ }));
    expect(open).toHaveBeenCalledWith({ localDate: "2026-08-05", taskId: null, seriesId: "series" });
  });

  it("shows visible needs-review text and an item-specific Review action", async () => {
    commands.getTaskPlanningProjection.mockResolvedValue({ ...projection, mode: "overdue" });
    renderPanel("overdue");
    expect(await screen.findByText("Needs review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review for Weekly review/ })).toBeInTheDocument();
  });

  it("renders locked empty copy", async () => {
    commands.getTaskPlanningProjection.mockResolvedValue({ ...projection, total_item_count: 0, scheduled_minutes: 0, groups: [] });
    renderPanel();
    expect(await screen.findByText("No upcoming tasks in the next 14 days.")).toBeInTheDocument();
  });

  it("keeps Today available on error and retries", async () => {
    commands.getTaskPlanningProjection.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(projection);
    renderPanel();
    expect(await screen.findByRole("alert")).toHaveTextContent("Today is still available");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Weekly review");
    expect(commands.getTaskPlanningProjection).toHaveBeenCalledTimes(2);
  });

  it("is axe clean", async () => {
    const { container } = renderPanel();
    await screen.findByText("Weekly review");
    await waitFor(async () => expect((await axe.run(container)).violations).toEqual([]));
  });
});
