import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeadlineQueuePanel from "./DeadlineQueuePanel";

const commands = vi.hoisted(() => ({ getDeadlineQueue: vi.fn() }));
vi.mock("../../../ipc/commands", () => commands);

const item = (
  id: string,
  title: string,
  scheduled: string,
  deadline: string,
  state: "overdue" | "due_today" | "upcoming",
  conflict = false,
) => ({
  id,
  title,
  description: "",
  scheduled_local_date: scheduled,
  start_minute: 600,
  end_minute: 660,
  deadline_local_date: deadline,
  deadline_state: state,
  scheduled_after_deadline: conflict,
  category_id: "general",
  category_name: "General",
  category_icon_key: "category-general",
  category_color_key: "blue",
  priority: "high",
  life_area: null,
  focus_plan: null,
  tags: [],
});

const projection = {
  anchor_local_date: "2026-08-06",
  range_start_local_date: "2026-07-07",
  range_end_local_date: "2026-08-20",
  total_item_count: 3,
  groups: [
    {
      state: "overdue" as const,
      item_count: 1,
      items: [item("t1", "Late essay", "2026-08-01", "2026-08-04", "overdue")],
    },
    {
      state: "due_today" as const,
      item_count: 1,
      items: [item("t2", "Report", "2026-08-06", "2026-08-06", "due_today")],
    },
    {
      state: "upcoming" as const,
      item_count: 1,
      items: [
        item("t3", "Slides", "2026-08-15", "2026-08-12", "upcoming", true),
      ],
    },
  ],
};

const empty = { ...projection, total_item_count: 0, groups: [] };

function renderPanel(open = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    open,
    ...render(
      <QueryClientProvider client={client}>
        <DeadlineQueuePanel anchorLocalDate="2026-08-06" onOpenItem={open} />
      </QueryClientProvider>,
    ),
  };
}

describe("DeadlineQueuePanel", () => {
  beforeEach(() =>
    commands.getDeadlineQueue.mockReset().mockResolvedValue(projection),
  );

  it("queries the exact anchor and renders the three deadline groups", async () => {
    renderPanel();
    expect(await screen.findByText("Late essay")).toBeInTheDocument();
    expect(commands.getDeadlineQueue).toHaveBeenCalledWith({
      anchor_local_date: "2026-08-06",
    });
    for (const heading of [
      "Overdue deadlines · 1",
      "Due today · 1",
      "Upcoming deadlines · 1",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("states a schedule conflict in text, not colour alone", async () => {
    renderPanel();
    await screen.findByText("Slides");
    const upcoming = screen
      .getByRole("heading", { name: "Upcoming deadlines · 1" })
      .closest("section")!;
    expect(
      within(upcoming).getByText("Scheduled after deadline"),
    ).toBeInTheDocument();
  });

  it("navigates to the scheduled date and the exact one-off task", async () => {
    const { open } = renderPanel();
    await screen.findByText("Slides");
    // The deadline is 2026-08-12 but the Task lives on its scheduled day.
    fireEvent.click(screen.getByRole("button", { name: /Open Slides/ }));
    expect(open).toHaveBeenCalledWith({
      localDate: "2026-08-15",
      taskId: "t3",
      seriesId: null,
    });
  });

  it("exposes machine-readable dates and stays axe clean", async () => {
    const { container } = renderPanel();
    await screen.findByText("Late essay");
    const times = container.querySelectorAll("time[datetime]");
    expect(times.length).toBeGreaterThan(0);
    expect(
      container.querySelector('time[datetime="2026-08-04"]'),
    ).toBeInTheDocument();
    await waitFor(async () =>
      expect((await axe.run(container)).violations).toEqual([]),
    );
  });

  it("renders a bounded empty state naming the window", async () => {
    commands.getDeadlineQueue.mockResolvedValue(empty);
    renderPanel();
    expect(await screen.findByText(/No deadlines between/)).toBeInTheDocument();
    expect(
      screen.getByText("2026-07-07").closest("time"),
    ).toHaveAttribute("datetime", "2026-07-07");
  });

  it("keeps Today available when the queue fails and retries", async () => {
    commands.getDeadlineQueue
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(projection);
    renderPanel();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Today is still available",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Late essay");
    expect(commands.getDeadlineQueue).toHaveBeenCalledTimes(2);
  });
});
