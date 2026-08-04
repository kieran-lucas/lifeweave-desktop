import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { App, settleNavigationEnvelope } from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";

const appApi = vi.hoisted(() => ({
  listTodayItems: vi.fn(),
  getLifeBrowseProjection: vi.fn(),
  getRelatedTasksForLifeNode: vi.fn(),
  anchorLocalDate: "2026-08-04",
}));

vi.mock("../features/calendar/date", () => ({
  localToday: () => "2026-08-04",
}));
vi.mock("../features/calendar/useLocalDateRollover", () => ({
  useLocalDateRollover: () => appApi.anchorLocalDate,
}));

const renderApp = () => {
  const client = new QueryClient();
  return {
    ...render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
    ),
    client,
  };
};

vi.mock("../ipc/commands", () => ({
  healthCheck: vi.fn().mockResolvedValue({ status: "ok" }),
  listFoundationRecords: vi.fn().mockResolvedValue([]),
  listArchivedFoundationRecords: vi.fn().mockResolvedValue([]),
  listBackups: vi.fn().mockResolvedValue([]),
  createFoundationRecord: vi.fn(),
  updateFoundationRecord: vi.fn(),
  archiveFoundationRecord: vi.fn(),
  restoreFoundationRecord: vi.fn(),
  backupDatabase: vi.fn(),
  restoreDatabase: vi.fn(),
  listTasksForDate: vi.fn().mockResolvedValue([]),
  listTodayItems: appApi.listTodayItems,
  listTaskCategories: vi.fn().mockResolvedValue([]),
  listTaskLifeTargets: vi.fn().mockResolvedValue([]),
  getMonthProjection: vi
    .fn()
    .mockResolvedValue({ month: "2026-08", algorithm_version: 1, days: [] }),
  listCompletionStates: vi.fn().mockResolvedValue([]),
  evaluateTask: vi.fn(),
  undoTaskEvaluation: vi.fn(),
  getAnalyticsProjection: vi
    .fn()
    .mockResolvedValue({
      period_kind: "week",
      period_start: "2026-07-27",
      period_end: "2026-08-02",
      is_complete: true,
      algorithm_version: 1,
      computed_at: "1",
      source_revision: "0",
      scheduled_minutes: 0,
      task_count: 0,
      evaluated_count: 0,
      missed_count: 0,
      categories: [],
      completion_distribution: [],
      streaks: [],
    }),
  updateCategoryGoals: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getLifeBrowseProjection: appApi.getLifeBrowseProjection,
  getRelatedTasksForLifeNode: appApi.getRelatedTasksForLifeNode,
  getPinnedLifeNodes: vi.fn().mockResolvedValue([]),
  pinLifeNode: vi.fn(),
  unpinLifeNode: vi.fn(),
  saveLifeNavigationPreference: vi.fn().mockResolvedValue({}),
}));

const rootProjection = {
      root_id: "life-root",
      selected: {
        id: "life-root",
        title: "Life",
        short_description: "Your personal structure begins here.",
        icon_key: "life-root",
        branch_theme_id: "neutral",
        child_count: 0,
        is_leaf: true,
        is_pinned: false,
        revision: 0,
      },
      parent: null,
      children: [],
      breadcrumb: [],
      selected_is_pinned: false,
      child_page: 0,
      child_page_count: 1,
      tree_revision: 0,
      resolved_from_fallback: false,
      preferred_mode: "browse",
      viewport_anchor: null,
};

describe("App shell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    appApi.listTodayItems.mockReset().mockResolvedValue([]);
    appApi.getLifeBrowseProjection.mockReset().mockResolvedValue(rootProjection);
    appApi.getRelatedTasksForLifeNode.mockReset().mockResolvedValue([]);
    appApi.anchorLocalDate = "2026-08-04";
  });

  it("passes fixed local today to Life and focuses the backend-provided recurring navigation date", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    const leaf = {
      ...rootProjection.selected,
      id: "life-area",
      title: "Area",
    };
    appApi.getLifeBrowseProjection.mockResolvedValue({
      ...rootProjection,
      selected: leaf,
      breadcrumb: [rootProjection.selected, leaf],
    });
    appApi.getRelatedTasksForLifeNode.mockResolvedValue([
      {
        id: "series-1",
        kind: "recurring",
        title: "Weekly review",
        group: "active",
        navigation_local_date: "2026-08-06",
        series_id: "series-1",
      },
    ]);
    appApi.listTodayItems.mockImplementation((date: string) =>
      Promise.resolve(
        date === "2026-08-06"
          ? [
              {
                kind: "recurring",
                id: "series-1:2026-08-06",
                occurrence_id: "series-1:2026-08-06",
                series_id: "series-1",
                original_local_date: "2026-08-06",
                local_date: "2026-08-06",
                start_minute: 480,
                end_minute: 540,
                title: "Weekly review",
                description: "",
                category_id: "general",
                category_name: "General",
                category_icon_key: "category-general",
                category_color_key: "blue",
                priority: "medium",
                is_override: false,
                evaluation: null,
                life_area: { id: "life-area", title: "Area", breadcrumb: "Area", archived: false },
              },
            ]
          : [],
      ),
    );
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    expect(await screen.findByRole("button", { name: "Weekly review" })).toBeInTheDocument();
    expect(appApi.getRelatedTasksForLifeNode).toHaveBeenCalledWith(
      "life-area",
      "2026-08-04",
    );
    fireEvent.click(screen.getByRole("button", { name: "Weekly review" }));
    await screen.findByRole("heading", { name: "Today" });
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("data-series-id", "series-1"),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    await screen.findByRole("heading", { name: "Calendar" });
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Primary navigation" }))
        .getByRole("button", { name: "Today" }),
    );
    expect(await screen.findByRole("tab", { name: "Today" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("guards settlement by request ID so a late A cannot clear B", () => {
    const requestA = {
      requestId: "a",
      target: {
        kind: "today" as const,
        local_date: "2026-08-04",
        task_id: "task-a",
        series_id: null,
        original_local_date: null,
      },
    };
    const requestB = {
      ...requestA,
      requestId: "b",
      target: { ...requestA.target, task_id: "task-b" },
    };
    expect(settleNavigationEnvelope(requestB, requestA.requestId)).toBe(
      requestB,
    );
    expect(settleNavigationEnvelope(requestB, requestB.requestId)).toBeNull();
  });

  it("acknowledges Today-to-Life navigation so a route remount cannot replay it", async () => {
    const area = {
      ...rootProjection.selected,
      id: "life-area",
      title: "Area",
      is_leaf: false,
      child_count: 1,
    };
    appApi.getLifeBrowseProjection.mockImplementation(
      ({ node_id }: { node_id: string | null }) =>
        Promise.resolve(
          node_id === area.id
            ? {
                ...rootProjection,
                selected: area,
                breadcrumb: [rootProjection.selected, area],
              }
            : rootProjection,
        ),
    );
    appApi.listTodayItems.mockResolvedValue([
      {
        kind: "one_off",
        id: "task-life",
        occurrence_id: null,
        series_id: null,
        original_local_date: null,
        local_date: "2026-08-04",
        start_minute: 480,
        end_minute: 540,
        title: "Linked work",
        description: "",
        category_id: "general",
        category_name: "General",
        category_icon_key: "category-general",
        category_color_key: "blue",
        priority: "medium",
        is_override: false,
        evaluation: null,
        life_area: {
          id: area.id,
          title: area.title,
          breadcrumb: area.title,
          archived: false,
        },
      },
    ]);
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: /Area/ }));
    expect(await screen.findByRole("heading", { name: "Area" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Settings" });
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    expect(await screen.findByRole("heading", { name: "Life" })).toBeInTheDocument();
  });

  it("preserves an exact pending Today date through midnight rollover", async () => {
    let resolveToday!: (items: unknown[]) => void;
    appApi.listTodayItems.mockReturnValue(
      new Promise((resolve) => {
        resolveToday = resolve;
      }),
    );
    const leaf = {
      ...rootProjection.selected,
      id: "life-area",
      title: "Area",
    };
    appApi.getLifeBrowseProjection.mockResolvedValue({
      ...rootProjection,
      selected: leaf,
      breadcrumb: [rootProjection.selected, leaf],
    });
    appApi.getRelatedTasksForLifeNode.mockResolvedValue([
      {
        id: "task-pending",
        kind: "one_off",
        title: "Pending exact day",
        group: "active",
        navigation_local_date: "2026-08-04",
        series_id: null,
      },
    ]);
    const view = renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Life System" }));
    fireEvent.click(await screen.findByRole("button", { name: "Pending exact day" }));
    expect(await screen.findByText(/2026-08-04/)).toBeInTheDocument();
    appApi.anchorLocalDate = "2026-08-05";
    view.rerender(
      <QueryClientProvider client={view.client}>
        <App />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/2026-08-04/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tuesday, August 4, 2026" }),
    ).toHaveAttribute("aria-pressed", "true");
    resolveToday([]);
  });

  it("defaults to Today and exposes the locked navigation order", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.getAllByRole("navigation")[0]).toHaveAccessibleName(
      "Primary navigation",
    );
    expect(
      screen.getByRole("button", { name: "Create task" }),
    ).toBeInTheDocument();
  });

  it("navigates destinations and exposes the active item", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(
      await screen.findByRole("heading", { name: "Calendar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens objective Analytics instead of the former placeholder", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));
    expect(
      await screen.findByRole("heading", { name: "Analytics" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Scheduled time")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Analytics placeholder"),
    ).not.toBeInTheDocument();
  });

  it("persists collapse and restores the task preference after Life System", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("lifeweave.task-sidebar-mode.v1")).toBe(
      "collapsed",
    );
  });

  it("opens the real two-level Life Browse instead of a placeholder", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    expect(
      await screen.findByRole("heading", { name: "Life" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pinned" })).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Life System placeholder"),
    ).not.toBeInTheDocument();
  });

  it("keeps Foundation tools under Settings", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    expect(
      screen.queryByRole("heading", { name: "Foundation Records" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Foundation Records" }),
    ).toBeInTheDocument();
  });

  it("keeps selected-day state in the shell and defaults create to it", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    const week = screen.getByRole("navigation", { name: "Week navigation" });
    const other = within(week)
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-pressed") === "false")!;
    fireEvent.click(other);
    const selectedLabel = await screen.findByText(/Selected day ·/);
    const selectedIso = selectedLabel.textContent!.split(" · ")[1]!;
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(screen.getByLabelText("Date")).toHaveValue(selectedIso);
  });

  it("advances a selected Today date when the local anchor rolls over", async () => {
    const view = renderApp();
    expect(await screen.findByText("Today · 2026-08-04")).toBeInTheDocument();
    appApi.anchorLocalDate = "2026-08-05";
    view.rerender(
      <QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>,
    );
    expect(await screen.findByText("Today · 2026-08-05")).toBeInTheDocument();
  });

  it("preserves an intentionally selected date when the local anchor rolls over", async () => {
    const view = renderApp();
    await screen.findByText("Today · 2026-08-04");
    const week = screen.getByRole("navigation", { name: "Week navigation" });
    const other = within(week).getAllByRole("button").find((button) => button.getAttribute("aria-pressed") === "false")!;
    fireEvent.click(other);
    const selected = (await screen.findByText(/Selected day ·/)).textContent;
    appApi.anchorLocalDate = "2026-08-05";
    view.rerender(
      <QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>,
    );
    expect(await screen.findByText(selected!)).toBeInTheDocument();
  });

  it("activates a Calendar cell by returning to the day timeline", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    const grid = await screen.findByRole("grid");
    fireEvent.click(within(grid).getAllByRole("button")[10]!);
    expect(
      await screen.findByRole("heading", { name: "Today" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it.each([
    ["Today", "Today"],
    ["Calendar", "Calendar"],
    ["Analytics", "Analytics"],
    ["Life System", "Life"],
    ["Settings", "Settings"],
  ])(
    "has no automated WCAG violations in the %s route fixture",
    async (button, heading) => {
      const { container } = renderApp();
      await screen.findByRole("heading", { name: "Today" });
      if (button !== "Today")
        fireEvent.click(screen.getByRole("button", { name: button }));
      await screen.findByRole("heading", { name: heading });
      const result = await axe.run(container, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      expect(result.violations).toEqual([]);
    },
  );
});
