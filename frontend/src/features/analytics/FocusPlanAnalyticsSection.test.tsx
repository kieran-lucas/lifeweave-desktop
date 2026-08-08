import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as commands from "../../ipc/commands";
import type { AnalyticsActualTimeSummaryView } from "../../ipc/generated/AnalyticsActualTimeSummaryView";
import type { FocusPlanAnalyticsProjection } from "../../ipc/generated/FocusPlanAnalyticsProjection";
import { FocusPlanAnalyticsSection } from "./FocusPlanAnalyticsSection";

vi.mock("../../ipc/commands", () => ({
  getFocusPlanAnalyticsProjection: vi.fn(),
}));

const zeroActual: AnalyticsActualTimeSummaryView = {
  actual_seconds: 0n,
  tracked_scheduled_seconds: 0n,
  tracked_task_count: 0n,
  completed_session_count: 0n,
  variance_seconds: 0n,
};

const trackedActual: AnalyticsActualTimeSummaryView = {
  actual_seconds: 1_800n,
  tracked_scheduled_seconds: 3_600n,
  tracked_task_count: 1n,
  completed_session_count: 2n,
  variance_seconds: -1_800n,
};

const empty: FocusPlanAnalyticsProjection = {
  period_start: "2026-08-03",
  period_end: "2026-08-09",
  plan_count: 0,
  scheduled_minutes: 0n,
  work_item_count: 0,
  evaluated_count: 0,
  missed_count: 0,
  review_count: 0,
  actual_time: zeroActual,
  plans: [],
};

const populated: FocusPlanAnalyticsProjection = {
  ...empty,
  plan_count: 2,
  scheduled_minutes: 240n,
  work_item_count: 5,
  evaluated_count: 2,
  missed_count: 1,
  review_count: 3,
  actual_time: trackedActual,
  plans: [
    {
      plan_id: "plan-active",
      title: "AI Foundations",
      lifecycle: "active",
      archived: false,
      scheduled_minutes: 180n,
      work_item_count: 4,
      one_off_task_count: 1,
      recurring_occurrence_count: 3,
      evaluated_count: 2,
      missed_count: 1,
      review_count: 2,
      latest_reviewed_local_date: "2026-08-06",
      actual_time: trackedActual,
    },
    {
      plan_id: "plan-archived",
      title: "Retired strategy",
      lifecycle: "paused",
      archived: true,
      scheduled_minutes: 60n,
      work_item_count: 1,
      one_off_task_count: 1,
      recurring_occurrence_count: 0,
      evaluated_count: 0,
      missed_count: 0,
      review_count: 1,
      latest_reviewed_local_date: "2026-08-04",
      actual_time: zeroActual,
    },
  ],
};

function renderSection(overrides: Partial<Parameters<typeof FocusPlanAnalyticsSection>[0]> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <FocusPlanAnalyticsSection
        periodKind="week"
        anchorLocalDate="2026-08-05"
        observedLocalDate="2026-08-06"
        observedLocalMinute={720}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

describe("Focus Plan activity Analytics", () => {
  beforeEach(() => {
    vi.mocked(commands.getFocusPlanAnalyticsProjection).mockResolvedValue(populated);
  });

  it("requests exactly the Objective Analytics period contract", async () => {
    renderSection();
    await screen.findByRole("heading", { name: "Focus Plan activity" });
    expect(commands.getFocusPlanAnalyticsProjection).toHaveBeenCalledWith({
      period_kind: "week",
      anchor_local_date: "2026-08-05",
      observed_local_date: "2026-08-06",
      observed_local_minute: 720,
    });
  });

  it("belongs to the analytics query key so the existing invalidation covers it", async () => {
    const { client } = renderSection();
    await screen.findByRole("table");
    const keys = client.getQueryCache().getAll().map((query) => query.queryKey);
    expect(keys).toContainEqual([
      "analytics",
      "focus-plans",
      "week",
      "2026-08-05",
      "2026-08-06",
    ]);
    // The established contract is a prefix invalidation on ["analytics"].
    expect(keys.every((key) => key[0] === "analytics")).toBe(true);
  });

  it("renders every overall fact from the backend projection", async () => {
    renderSection();
    await screen.findByRole("table");
    const section = screen.getByRole("region", { name: "Focus Plan activity" });
    for (const [fact, value] of [
      ["Plans with activity", "2"],
      ["Linked scheduled time", "4h 0m"],
      ["Linked work items", "5"],
      ["Evaluated", "2"],
      ["Missed", "1"],
      ["Reviews", "3"],
      ["Recorded actual time", "30m"],
    ]) {
      const term = within(section).getByText(fact!, { selector: "dt" });
      expect(term.parentElement).toHaveTextContent(value!);
    }
  });

  it("shows the neutral empty state without inventing a Plan list", async () => {
    vi.mocked(commands.getFocusPlanAnalyticsProjection).mockResolvedValue(empty);
    renderSection();
    expect(
      await screen.findByText("No Focus Plan-linked work or reviews in this period."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("states lifecycle and archive as text and never colour alone", async () => {
    renderSection();
    const table = await screen.findByRole("table");
    const archived = within(table).getByRole("row", { name: /Retired strategy/ });
    expect(archived).toHaveTextContent("Paused · Archived");
    const active = within(table).getByRole("row", { name: /AI Foundations/ });
    expect(active).toHaveTextContent("Active");
    expect(active).not.toHaveTextContent("Archived");
  });

  it("renders per-Plan scheduled, work, evaluated, missed and review facts", async () => {
    renderSection();
    const table = await screen.findByRole("table");
    const row = within(table).getByRole("row", { name: /AI Foundations/ });
    expect(row).toHaveTextContent("3h 0m");
    expect(row).toHaveTextContent("4 (1 one-off, 3 recurring)");
    expect(row).toHaveTextContent("2 · latest 2026-08-06");
  });

  it("shows backend actual and tracked values and marks untracked Plans explicitly", async () => {
    renderSection();
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("row", { name: /AI Foundations/ })).toHaveTextContent(
      "30m · tracked plan 1h 0m · Under tracked plan by 30m",
    );
    expect(within(table).getByRole("row", { name: /Retired strategy/ })).toHaveTextContent(
      "Not tracked",
    );
  });

  it("explains current-link attribution, review dates and one-off-only actual time", async () => {
    renderSection();
    expect(
      await screen.findByText(/current Focus Plan link; Lifeweave does not store historical/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Reviews are counted by their review date/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /completed sessions on linked one-off Tasks only; recurring occurrences do not support/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/retrospective facts, not automatic Plan progress/)).toBeInTheDocument();
  });

  it("never renders progress, percentage, health, score, or completion language", async () => {
    const { container } = renderSection();
    await screen.findByRole("table");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.querySelector("progress")).toBeNull();
    expect(
      screen.queryByText(/\d+\s*%|percent|health|score|on track|complete[d]? \d/i),
    ).not.toBeInTheDocument();
  });

  it("opens the exact Plan through the supplied navigation callback", async () => {
    const onPlanNavigate = vi.fn();
    renderSection({ onPlanNavigate });
    const button = await screen.findByRole("button", { name: "Open Plan AI Foundations" });
    fireEvent.click(button);
    expect(onPlanNavigate).toHaveBeenCalledWith("plan-active");
    expect(
      screen.getByRole("button", { name: "Open Plan Retired strategy" }),
    ).toBeInTheDocument();
  });

  it("announces loading and error states accessibly", async () => {
    vi.mocked(commands.getFocusPlanAnalyticsProjection).mockRejectedValueOnce(
      new Error("failure"),
    );
    renderSection();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load Focus Plan activity.",
    );
    // The failed state announces once and does not leave a competing loading announcement.
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("has zero applicable accessibility violations", async () => {
    const { container } = renderSection({ onPlanNavigate: vi.fn() });
    await screen.findByRole("table");
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
