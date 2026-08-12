import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TodayItemView } from "../../../ipc/generated/TodayItemView";
import { TodayScreen } from "./TodayScreen";

const api = vi.hoisted(() => ({
  createRecurringTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  discardTaskActualTime: vi.fn(),
  evaluateTask: vi.fn(),
  getActiveTaskActualTime: vi.fn(),
  listCompletionStates: vi.fn(),
  listTaskCategories: vi.fn(),
  listTodayItems: vi.fn(),
  stopTaskActualTime: vi.fn(),
  undoTaskEvaluation: vi.fn(),
  updateRecurringOccurrence: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../../../ipc/commands", () => api);
vi.mock("../LifeAreaCombobox", () => ({ LifeAreaCombobox: () => <div>Life area field</div> }));
vi.mock("../FocusPlanCombobox", () => ({ FocusPlanCombobox: () => <div>Focus Plan field</div> }));
vi.mock("../../tag/TagPicker", () => ({ TagPicker: () => <div>Tag field</div> }));

const task: TodayItemView = {
  kind: "one_off",
  id: "task-1",
  occurrence_id: null,
  series_id: null,
  original_local_date: null,
  local_date: "2026-08-11",
  start_minute: 480,
  end_minute: 540,
  title: "Write the report",
  description: "",
  category_id: "general",
  category_name: "General",
  category_icon_key: "general",
  category_color_key: "neutral",
  priority: "medium",
  is_override: false,
  evaluation: null,
  life_area: null,
  focus_plan: null,
  deadline: null,
  actual_time: {
    total_completed_seconds: 0n,
    completed_session_count: 0,
    active_session_id: null,
    active_started_at_ms: null,
  },
  tags: [],
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TodayScreen selectedDate="2026-08-11" anchorLocalDate="2026-08-11" />
    </QueryClientProvider>,
  );
}

describe("Today task interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listTodayItems.mockResolvedValue([task]);
    api.listTaskCategories.mockResolvedValue([
      {
        id: "general",
        name: "General",
        icon_key: "general",
        color_key: "neutral",
        weekly_minimum_minutes: null,
        weekly_target_minutes: null,
        goal_revision: 0,
      },
    ]);
    api.listCompletionStates.mockResolvedValue([
      { id: "state-none", internal_key: "none", label: "Clear", sort_key: 0, visual_token: "none" },
      { id: "state-below", internal_key: "below", label: "Low", sort_key: 1, visual_token: "below" },
      { id: "state-met", internal_key: "met", label: "Done", sort_key: 2, visual_token: "met" },
      { id: "state-excellent", internal_key: "excellent", label: "Great", sort_key: 3, visual_token: "excellent" },
    ]);
    api.getActiveTaskActualTime.mockResolvedValue(null);
  });

  it("keeps a single click passive and opens edit on double-click or Enter without an Edit button", async () => {
    const view = mount();
    const title = await screen.findByText("Write the report");
    const row = view.container.querySelector<HTMLElement>('[data-agenda-id="task-1"]')!;
    expect(within(row).queryByText("General")).not.toBeInTheDocument();
    expect(row.querySelector("svg")).not.toBeInTheDocument();

    fireEvent.click(title);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.doubleClick(title);
    const firstEditor = screen.getByRole("dialog");
    expect(firstEditor).toBeInTheDocument();
    expect(firstEditor).toHaveAttribute("data-dialog-width", "wide");
    expect(within(firstEditor).queryByRole("button", { name: /details/i })).not.toBeInTheDocument();
    expect(within(firstEditor).getByText("Notes")).toBeInTheDocument();
    expect(within(firstEditor).queryByText("Category")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Edit Write the report" })).not.toBeInTheDocument();
  });

  it("closes the task editor when the backdrop is pressed", async () => {
    mount();
    const title = await screen.findByText("Write the report");
    fireEvent.doubleClick(title);

    const backdrop = document.querySelector<HTMLElement>("[data-dialog-backdrop]")!;
    fireEvent.pointerDown(backdrop);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows assessment as the task status and exposes no timer start control", async () => {
    mount();
    const assessment = await screen.findByRole("button", {
      name: "Assess task. Current state: None",
    });
    expect(assessment).toHaveTextContent("None");
    expect(screen.queryByRole("button", { name: /Start timer/i })).not.toBeInTheDocument();

    fireEvent.click(assessment);
    expect(screen.getByRole("listbox", { name: "Completion assessment" })).toBeInTheDocument();
  });

  it("uses the same assessment name in the task row and the option menu", async () => {
    api.listTodayItems.mockResolvedValue([
      {
        ...task,
        evaluation: {
          state_id: "state-met",
          label: "Met expectation",
          visual_token: "met",
          evaluated_at: "2026-08-11T09:00:00Z",
          operation_id: "assessment-1",
        },
      },
    ]);
    api.listCompletionStates.mockResolvedValue([
      { id: "state-none", internal_key: "none", label: "Not done", sort_key: 0, visual_token: "none" },
      { id: "state-below", internal_key: "below", label: "Below expectation", sort_key: 1, visual_token: "below" },
      { id: "state-met", internal_key: "met", label: "Met expectation", sort_key: 2, visual_token: "met" },
      { id: "state-excellent", internal_key: "excellent", label: "Very good", sort_key: 3, visual_token: "excellent" },
    ]);

    mount();
    const assessment = await screen.findByRole("button", {
      name: "Assess task. Current state: Done",
    });
    expect(assessment).toHaveTextContent("Done");
    expect(assessment.querySelector("svg")).not.toBeInTheDocument();

    fireEvent.click(assessment);
    expect(screen.getByRole("option", { name: "Done" })).toHaveTextContent("Done");
  });

  it("uses the styled date field and locking time wheels in the task composer", async () => {
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Plan task" }));
    const dialog = screen.getByRole("dialog", { name: "Plan the moment" });
    expect(within(dialog).getByLabelText("Task date")).toHaveValue("2026-08-11");
    expect(dialog.querySelector('input[type="time"]')).not.toBeInTheDocument();
    expect(await within(dialog).findByRole("button", { name: "Start time, 08:00" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "End time, 09:00" })).toBeInTheDocument();
    view.unmount();
  });
});
