import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsActualTimeSummaryView } from "../../ipc/generated/AnalyticsActualTimeSummaryView";
import * as commands from "../../ipc/commands";
import {
  actualTimeVariance,
  AnalyticsScreen,
  formatActualTime,
} from "./AnalyticsScreen";
import { CategoryGoals } from "./CategoryGoals";

vi.mock("../../ipc/commands", () => ({
  getAnalyticsProjection: vi.fn(),
  getFocusPlanAnalyticsProjection: vi.fn(),
  listTaskCategories: vi.fn(),
  updateCategoryGoals: vi.fn(),
}));

const zeroActual: AnalyticsActualTimeSummaryView = {
  actual_seconds: 0n,
  tracked_scheduled_seconds: 0n,
  tracked_task_count: 0n,
  completed_session_count: 0n,
  variance_seconds: 0n,
};

const projection = {
  period_kind: "week" as const,
  period_start: "2026-07-27",
  period_end: "2026-08-02",
  is_complete: true,
  algorithm_version: 2,
  computed_at: "1",
  source_revision: "4",
  scheduled_minutes: 180,
  task_count: 3,
  evaluated_count: 2,
  missed_count: 1,
  actual_time: zeroActual,
  categories: [
    {
      category_id: "general",
      category_name: "General",
      category_icon_key: "category-general",
      category_color_key: "blue",
      scheduled_minutes: 180,
      weekly_minimum_minutes: 120,
      weekly_target_minutes: 150,
      minimum_attained_minutes: 120,
      target_attained_minutes: 150,
      minimum_shortfall_minutes: 0,
      target_shortfall_minutes: 0,
      minimum_overage_minutes: 60,
      target_overage_minutes: 30,
      eligible_week_count: 1,
      minimum_week_count: 1,
      target_week_count: 1,
      actual_time: zeroActual,
    },
    {
      category_id: "open",
      category_name: "Open",
      category_icon_key: "category-general",
      category_color_key: "blue",
      scheduled_minutes: 30,
      weekly_minimum_minutes: null,
      weekly_target_minutes: null,
      minimum_attained_minutes: 0,
      target_attained_minutes: 0,
      minimum_shortfall_minutes: 0,
      target_shortfall_minutes: 0,
      minimum_overage_minutes: 30,
      target_overage_minutes: 30,
      eligible_week_count: 0,
      minimum_week_count: 0,
      target_week_count: 0,
      actual_time: zeroActual,
    },
  ],
  completion_distribution: [
    {
      state_id: "completion-met",
      label: "Met expectation",
      visual_token: "met",
      count: 2,
    },
  ],
  streaks: [
    {
      category_id: "general",
      threshold_kind: "minimum",
      current_length: 2,
      longest_length: 4,
      current_start: "2026-07-20",
      longest_start: "2026-06-01",
      last_break_week: "2026-07-13",
    },
    {
      category_id: "general",
      threshold_kind: "target",
      current_length: 1,
      longest_length: 3,
      current_start: "2026-07-27",
      longest_start: "2026-06-08",
      last_break_week: "2026-07-20",
    },
  ],
};

const renderWithClient = (node: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      {node}
    </QueryClientProvider>,
  );

const actual = (
  actualSeconds: bigint,
  trackedSeconds: bigint,
  trackedTasks = 1n,
  completedSessions = 1n,
): AnalyticsActualTimeSummaryView => ({
  actual_seconds: actualSeconds,
  tracked_scheduled_seconds: trackedSeconds,
  tracked_task_count: trackedTasks,
  completed_session_count: completedSessions,
  variance_seconds: actualSeconds - trackedSeconds,
});

const projectionWithActual = (
  overall: AnalyticsActualTimeSummaryView,
  category = overall,
) => ({
  ...projection,
  actual_time: overall,
  categories: [
    { ...projection.categories[0]!, actual_time: category },
    projection.categories[1]!,
  ],
});

const focusPlanProjection = {
  period_start: "2026-07-27",
  period_end: "2026-08-02",
  plan_count: 1,
  scheduled_minutes: 60n,
  work_item_count: 1,
  evaluated_count: 1,
  missed_count: 0,
  review_count: 0,
  actual_time: zeroActual,
  plans: [
    {
      plan_id: "plan-1",
      title: "AI Foundations",
      lifecycle: "active" as const,
      archived: false,
      scheduled_minutes: 60n,
      work_item_count: 1,
      one_off_task_count: 1,
      recurring_occurrence_count: 0,
      evaluated_count: 1,
      missed_count: 0,
      review_count: 0,
      latest_reviewed_local_date: null,
      actual_time: zeroActual,
    },
  ],
};

describe("objective Analytics", () => {
  beforeEach(() => {
    vi.mocked(commands.getAnalyticsProjection).mockResolvedValue(projection);
    vi.mocked(commands.getFocusPlanAnalyticsProjection).mockResolvedValue(focusPlanProjection);
    vi.mocked(commands.listTaskCategories).mockResolvedValue([]);
  });

  it("replaces the placeholder with fixed accessible period tabs", async () => {
    renderWithClient(<AnalyticsScreen />);
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((item) => item.textContent)).toEqual([
      "Week",
      "Month",
      "Year",
    ]);
  });

  it("navigates adjacent and current periods through bounded queries", async () => {
    renderWithClient(<AnalyticsScreen />);
    await screen.findByText("Scheduled time");
    fireEvent.click(screen.getByRole("button", { name: "Previous period" }));
    fireEvent.click(screen.getByRole("tab", { name: "Month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next period" }));
    fireEvent.click(screen.getByRole("button", { name: "Current period" }));
    await waitFor(() =>
      expect(vi.mocked(commands.getAnalyticsProjection).mock.calls.length).toBeGreaterThanOrEqual(4),
    );
  });

  it("keeps scheduled time primary and never renders a score or AI insight", async () => {
    renderWithClient(<AnalyticsScreen />);
    expect(await screen.findByText("3h 0m")).toBeInTheDocument();
    expect(screen.getByText("Scheduled time")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Category scheduled time" })).toBeInTheDocument();
    expect(screen.queryByText(/score|AI insight/i)).not.toBeInTheDocument();
  });

  it("renders configured scheduled attainment and a clear unconfigured state", async () => {
    renderWithClient(<AnalyticsScreen />);
    expect(await screen.findByText("1h 0m over minimum")).toBeInTheDocument();
    expect(screen.getByText("0h 30m over target")).toBeInTheDocument();
    expect(screen.getByText("Weekly minimum and target not configured.")).toBeInTheDocument();
  });

  it("renders objective streaks and visual plus table distribution equivalents", async () => {
    renderWithClient(<AnalyticsScreen />);
    expect(await screen.findByText(/minimum: current 2 weeks; longest 4 weeks/)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Evaluation counts" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("shows completed-week attainment for Month and Year", async () => {
    renderWithClient(<AnalyticsScreen />);
    await screen.findByText("Scheduled time");
    fireEvent.click(screen.getByRole("tab", { name: "Year" }));
    expect(await screen.findByText(/1 of 1 completed weeks met minimum/)).toBeInTheDocument();
  });

  it("keeps loading and error states accessible", async () => {
    vi.mocked(commands.getAnalyticsProjection).mockRejectedValueOnce(new Error("failure"));
    renderWithClient(<AnalyticsScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load objective Analytics.");
  });

  it("shows the explicit empty state while retaining all five zero facts", async () => {
    renderWithClient(<AnalyticsScreen />);
    const section = await screen.findByRole("region", { name: "Recorded actual time" });
    expect(within(section).getByText("No completed actual-time sessions for one-off Tasks scheduled in this period.")).toBeInTheDocument();
    for (const fact of [
      "Recorded time",
      "Tracked plan",
      "Variance",
      "Tracked Tasks",
      "Completed segments",
    ]) {
      expect(within(section).getByText(fact)).toBeInTheDocument();
    }
  });

  it("renders five populated facts and keeps a non-zero sub-minute duration visible", async () => {
    vi.mocked(commands.getAnalyticsProjection).mockResolvedValue(
      projectionWithActual(actual(1n, 3_600n, 1n, 2n)),
    );
    renderWithClient(<AnalyticsScreen />);
    const section = await screen.findByRole("region", { name: "Recorded actual time" });
    expect(within(section).getByText("1s")).toBeInTheDocument();
    expect(within(section).getByText("1h 0m")).toBeInTheDocument();
    expect(within(section).getByText("Under tracked plan by 59m 59s")).toBeInTheDocument();
    expect(within(section).getByText("1", { selector: "dd" })).toBeInTheDocument();
    expect(within(section).getByText("2", { selector: "dd" })).toBeInTheDocument();
  });

  it.each([
    [actual(3_601n, 3_600n), "Over tracked plan by 1s"],
    [actual(3_599n, 3_600n), "Under tracked plan by 1s"],
    [actual(3_600n, 3_600n), "Matched tracked plan"],
  ])("renders textual variance rather than sign or color alone", async (summary, wording) => {
    vi.mocked(commands.getAnalyticsProjection).mockResolvedValue(projectionWithActual(summary));
    renderWithClient(<AnalyticsScreen />);
    expect(await screen.findByText(wording, { selector: "dd" })).toBeInTheDocument();
  });

  it("adds an actual line only to categories with tracked work", async () => {
    vi.mocked(commands.getAnalyticsProjection).mockResolvedValue(
      projectionWithActual(actual(60n, 3_600n)),
    );
    renderWithClient(<AnalyticsScreen />);
    const general = (await screen.findByRole("heading", { name: /General/ })).closest("li")!;
    const open = screen.getByRole("heading", { name: /Open/ }).closest("li")!;
    expect(within(general).getByText(/Recorded 1m · tracked plan 1h 0m/)).toBeInTheDocument();
    expect(within(open).queryByText(/Recorded .* tracked plan/)).not.toBeInTheDocument();
  });

  it("states that running time is excluded until Stop commits completed source", async () => {
    renderWithClient(<AnalyticsScreen />);
    expect(
      await screen.findByText(
        /Only completed sessions count.*running timers are excluded until stopped/,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0s")).toHaveLength(2);
  });

  it("lazily renders the Focus Plan activity section inside the one Analytics destination", async () => {
    renderWithClient(<AnalyticsScreen />);
    expect(
      await screen.findByRole("heading", { name: "Focus Plan activity" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: /Focus Plan activity in this period/ }))
      .toBeInTheDocument();
    // Analytics is still one destination: no second heading level 1 and no new route.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("asks both projections for exactly the same period", async () => {
    renderWithClient(<AnalyticsScreen />);
    await screen.findByRole("heading", { name: "Focus Plan activity" });
    fireEvent.click(screen.getByRole("tab", { name: "Month" }));
    await waitFor(() =>
      expect(vi.mocked(commands.getFocusPlanAnalyticsProjection)).toHaveBeenCalledWith(
        expect.objectContaining({ period_kind: "month" }),
      ),
    );
    // Objective Analytics additionally prefetches the adjacent periods, so the proof is that the
    // Focus Plan input is one of the periods Objective Analytics itself asked for, field for field.
    const plans = vi.mocked(commands.getFocusPlanAnalyticsProjection).mock.calls.at(-1)![0];
    const objectiveInputs = vi
      .mocked(commands.getAnalyticsProjection)
      .mock.calls.map((call) => call[0]);
    expect(objectiveInputs).toContainEqual(plans);
  });

  it("opens the exact Focus Plan from Analytics", async () => {
    const onPlanNavigate = vi.fn();
    renderWithClient(<AnalyticsScreen onPlanNavigate={onPlanNavigate} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open Plan AI Foundations" }));
    expect(onPlanNavigate).toHaveBeenCalledWith("plan-1");
  });

  it("has zero applicable accessibility violations", async () => {
    vi.mocked(commands.getAnalyticsProjection).mockResolvedValue(
      projectionWithActual(actual(60n, 3_600n)),
    );
    const { container } = renderWithClient(<AnalyticsScreen onPlanNavigate={vi.fn()} />);
    await screen.findByRole("region", { name: "Recorded actual time" });
    await screen.findByRole("table", { name: /Focus Plan activity in this period/ });
    expect((await axe.run(container)).violations).toEqual([]);
  });
});

describe("actual-time formatting", () => {
  it("is deterministic at second, minute, and hour boundaries", () => {
    expect(formatActualTime(0n)).toBe("0s");
    expect(formatActualTime(59n)).toBe("59s");
    expect(formatActualTime(61n)).toBe("1m 1s");
    expect(formatActualTime(3_661n)).toBe("1h 1m 1s");
    expect(actualTimeVariance(actual(10n, 10n))).toBe("Matched tracked plan");
  });
});

describe("category scheduled-time goals", () => {
  beforeEach(() => {
    vi.mocked(commands.listTaskCategories).mockResolvedValue([
      {
        id: "general",
        name: "General",
        icon_key: "category-general",
        color_key: "blue",
        weekly_minimum_minutes: 60,
        weekly_target_minutes: 120,
        goal_revision: 2,
      },
    ]);
    vi.mocked(commands.updateCategoryGoals).mockResolvedValue({
      id: "general",
      name: "General",
      icon_key: "category-general",
      color_key: "blue",
      weekly_minimum_minutes: 120,
      weekly_target_minutes: 180,
      goal_revision: 3,
    });
  });

  it("loads duration controls and saves typed minutes", async () => {
    renderWithClient(<CategoryGoals />);
    expect(await screen.findByRole("heading", { name: "General" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Weekly minimum hours"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Weekly target hours"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save goals" }));
    await waitFor(() =>
      expect(commands.updateCategoryGoals).toHaveBeenCalledWith(
        expect.objectContaining({
          weekly_minimum_minutes: 120,
          weekly_target_minutes: 180,
          expected_revision: 2,
        }),
      ),
    );
  });

  it("validates minimum before target without sending", async () => {
    renderWithClient(<CategoryGoals />);
    await screen.findByRole("heading", { name: "General" });
    fireEvent.change(screen.getByLabelText("Weekly minimum hours"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Weekly target hours"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save goals" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Minimum must not exceed target");
    expect(commands.updateCategoryGoals).not.toHaveBeenCalled();
  });

  it("can explicitly clear configured goals", async () => {
    renderWithClient(<CategoryGoals />);
    await screen.findByRole("heading", { name: "General" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Configure scheduled-time goals" }));
    fireEvent.click(screen.getByRole("button", { name: "Save goals" }));
    await waitFor(() =>
      expect(commands.updateCategoryGoals).toHaveBeenCalledWith(
        expect.objectContaining({
          weekly_minimum_minutes: null,
          weekly_target_minutes: null,
        }),
      ),
    );
  });
});
