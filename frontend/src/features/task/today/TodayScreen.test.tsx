import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TodayItemView } from "../../../ipc/generated/TodayItemView";
import { TodayScreen } from "./TodayScreen";

const api = vi.hoisted(() => ({
  createRecurringTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  discardTaskActualTime: vi.fn(),
  evaluateTask: vi.fn(),
  saveTaskProgressNote: vi.fn(),
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
  progress_note: null,
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
      <TodayScreen selectedDate="2026-08-11" anchorLocalDate="2026-08-12" />
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
      {
        id: "english",
        name: "English",
        icon_key: "category-english",
        color_key: "blue",
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
    expect(row.querySelectorAll("svg")).toHaveLength(1);
    expect(row.querySelector("[data-task-priority] > svg")).toBeInTheDocument();

    fireEvent.click(title);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.doubleClick(title);
    const firstEditor = await screen.findByRole("dialog", { name: "Edit task" });
    expect(firstEditor).toBeInTheDocument();
    expect(firstEditor).toHaveAttribute("data-dialog-width", "standard");
    expect(within(firstEditor).getByRole("region", { name: "Task details" })).toBeInTheDocument();
    expect(within(firstEditor).queryByRole("region", { name: "Essentials" })).not.toBeInTheDocument();
    expect(within(firstEditor).getByRole("region", { name: "Schedule" })).toBeInTheDocument();
    expect(within(firstEditor).getByRole("region", { name: "Context" })).toBeInTheDocument();
    expect(within(firstEditor).queryByRole("button", { name: /details/i })).not.toBeInTheDocument();
    expect(within(firstEditor).getByRole("textbox", { name: "Description" })).toHaveValue("");
    expect(await within(firstEditor).findByRole(
      "button",
      { name: "Category, General" },
      { timeout: 8_000 },
    )).toBeInTheDocument();
    expect(within(firstEditor).getByText("Category")).toBeInTheDocument();
    expect(await within(firstEditor).findByRole("button", { name: /Task date, Tuesday, August 11, 2026/ })).toBeInTheDocument();
    expect(within(firstEditor).getByRole("button", { name: "Medium" })).toHaveAttribute("aria-pressed", "true");
    expect(within(firstEditor).getByRole("button", { name: "Deadline, Not set" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Edit Write the report" })).not.toBeInTheDocument();
  });

  it("loads the same rich category catalog for both planning and editing", async () => {
    mount();

    await screen.findByText("Write the report");
    expect(api.listTaskCategories).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Plan task" }));
    await waitFor(() => expect(api.listTaskCategories).toHaveBeenCalledTimes(1));
    const trigger = await screen.findByRole("button", { name: "Category, General" });
    fireEvent.click(trigger);
    const categories = screen.getByRole("listbox", { name: "Task category" });
    expect(within(categories).getByRole("option", { name: /English/ })).toBeInTheDocument();
    fireEvent.click(within(categories).getByRole("option", { name: /English/ }));
    expect(screen.getByRole("button", { name: "Category, English" })).toBeInTheDocument();
  });

  it("closes the task editor when the backdrop is pressed", async () => {
    mount();
    const title = await screen.findByText("Write the report");
    fireEvent.doubleClick(title);
    await screen.findByRole("dialog");

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
    expect(assessment.closest('[data-agenda-id="task-1"]')?.parentElement).not.toHaveAttribute("data-completed");
    expect(screen.queryByRole("button", { name: /Start timer/i })).not.toBeInTheDocument();

    fireEvent.click(assessment);
    expect(screen.getByRole("listbox", { name: "Completion assessment" })).toBeInTheDocument();
  });

  it("shows the saved task description directly below its title", async () => {
    api.listTodayItems.mockResolvedValue([
      { ...task, description: "Outline the findings and next steps." },
    ]);

    mount();
    const description = await screen.findByText("Outline the findings and next steps.");
    const row = description.closest<HTMLElement>('[data-agenda-id="task-1"]');
    expect(row).not.toBeNull();
    expect(within(row!).getByText("Write the report")).toBeInTheDocument();
  });

  it.each([
    [null, "2026-08-11", true, "None"],
    ["none", "2026-08-11", true, "None"],
    ["below", "2026-08-11", false, "Low"],
    ["met", "2026-08-11", false, "Done"],
    ["excellent", "2026-08-11", false, "Great"],
    [null, "2099-01-01", false, "None"],
    ["none", "2099-01-01", false, "None"],
    ["none", "2026-08-12", false, "None"],
  ] as const)("derives red emphasis for state=%s date=%s without changing the assessment control", async (token, localDate, overdue, label) => {
    api.listTodayItems.mockResolvedValue([{ ...task, local_date: localDate,
      end_minute: localDate === "2026-08-12" ? 1440 : task.end_minute,
      evaluation: token === null ? null : {
        state_id: `state-${token}`, label: "Stored assessment", visual_token: token, evaluated_at: "now", operation_id: "op",
      },
    }]);
    mount();
    const title = await screen.findByText(task.title);
    const row = title.closest<HTMLElement>("[data-agenda-id]")!;
    if (overdue) {
      expect(row.closest("li")).toHaveAttribute("data-overdue", "true");
      expect(within(row).getByText("Overdue")).toBeInTheDocument();
    } else {
      expect(row.closest("li")).not.toHaveAttribute("data-overdue");
      expect(within(row).queryByText("Overdue")).not.toBeInTheDocument();
    }
    expect(within(row).getByRole("button")).toHaveTextContent(label);
    if (token === "none") expect(within(row).getByRole("button")).toHaveAttribute("data-state", "none");
    expect(api.evaluateTask).not.toHaveBeenCalled();
  });

  it.each([false, true])("updates red emphasis at the end minute with an explicit None assessment=%s", async (explicitNone) => {
    if (explicitNone) api.listTodayItems.mockResolvedValue([{ ...task, evaluation: {
      state_id: "state-none", label: "None", visual_token: "none", evaluated_at: "now", operation_id: "old-none",
    } }]);
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"], shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 7, 11, 8, 59, 50));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><TodayScreen selectedDate="2026-08-11" /></QueryClientProvider>);
    try {
      await screen.findByText(task.title);
      expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Assessment unavailable/ })).toBeDisabled();
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
      expect(screen.getByText("Overdue")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Assess task/ })).toBeEnabled();
      expect(screen.getByRole("button", { name: /Assess task/ })).toHaveTextContent("None");
      expect(api.evaluateTask).not.toHaveBeenCalled();
    } finally { view.unmount(); vi.useRealTimers(); }
  });

  it("turns an ended Done task red when None is selected and restores Done on undo", async () => {
    const done = { state_id: "state-met", label: "Done", visual_token: "met", evaluated_at: "now", operation_id: "old-done" };
    api.listTodayItems.mockResolvedValue([{ ...task, evaluation: done }]);
    api.evaluateTask.mockImplementation(async (input) => ({ state_id: input.state_id, label: "None", visual_token: "none", evaluated_at: "now", operation_id: input.operation_id }));
    api.undoTaskEvaluation.mockResolvedValue(done);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Assess task. Current state: Done" }));
    fireEvent.click(screen.getByRole("option", { name: "None" }));
    const none = await screen.findByRole("button", { name: "Assess task. Current state: None" });
    expect(none).toHaveAttribute("data-state", "none");
    expect(none.closest("li")).toHaveAttribute("data-overdue", "true");
    await waitFor(() => expect(api.evaluateTask).toHaveBeenCalledTimes(1));
    await act(async () => {});
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByRole("button", { name: "Assess task. Current state: Done" }).closest("li")).not.toHaveAttribute("data-overdue"));
  });

  it("restores Done and removes the red projection if saving None fails", async () => {
    api.listTodayItems.mockResolvedValue([{ ...task, evaluation: {
      state_id: "state-met", label: "Done", visual_token: "met", evaluated_at: "now", operation_id: "old-done",
    } }]);
    api.evaluateTask.mockRejectedValue(new Error("Storage busy"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Assess task. Current state: Done" }));
    fireEvent.click(screen.getByRole("option", { name: "None" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Storage busy");
    expect(screen.getByRole("button", { name: "Assess task. Current state: Done" }).closest("li")).not.toHaveAttribute("data-overdue");
  });

  it("removes overdue emphasis after assessment and restores it after undo", async () => {
    api.evaluateTask.mockImplementation(async (input) => ({ state_id: input.state_id, label: "Done", visual_token: "met", evaluated_at: "now", operation_id: input.operation_id }));
    api.undoTaskEvaluation.mockResolvedValue(null);
    mount();
    const trigger = await screen.findByRole("button", { name: /Assess task/ });
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Done" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Assess task. Current state: Done" })).toBeEnabled());
    expect(screen.queryByText("Overdue")).not.toBeInTheDocument();
    await waitFor(() => expect(api.evaluateTask).toHaveBeenCalledTimes(1));
    await act(async () => {});
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByText("Overdue")).toBeInTheDocument());
    expect(api.undoTaskEvaluation).toHaveBeenCalledTimes(1);
  });

  it("opens the fifth plus option with the keyboard, saves a note below the correct task and restores focus", async () => {
    api.saveTaskProgressNote.mockResolvedValue("Hoàn thành 20/50 bài\nÔn lại ngày mai.");
    mount();
    const trigger = await screen.findByRole("button", { name: /Assess task/ });
    fireEvent.click(trigger);
    expect(screen.getAllByRole("option")).toHaveLength(5);
    fireEvent.keyDown(screen.getByRole("option", { name: "None" }), { key: "End" });
    const noteOption = screen.getByRole("option", { name: "Progress note" });
    expect(noteOption).toHaveTextContent("+");
    await waitFor(() => expect(noteOption).toHaveFocus());
    fireEvent.keyDown(noteOption, { key: "Enter" });
    const dialog = await screen.findByRole("dialog", { name: "Progress note" });
    const input = within(dialog).getByRole("textbox", { name: "What did you complete?" });
    await waitFor(() => expect(input).toHaveFocus());
    expect((await axe.run(dialog)).violations).toEqual([]);
    fireEvent.change(input, { target: { value: "Hoàn thành 20/50 bài\nÔn lại ngày mai." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.saveTaskProgressNote).toHaveBeenCalledWith({ subject_kind: "one_off", task_id: task.id, series_id: null, original_local_date: null, note: "Hoàn thành 20/50 bài\nÔn lại ngày mai." });
    expect(screen.getByText(/Hoàn thành 20\/50/).closest("[data-agenda-id]")).toHaveAttribute("data-agenda-id", task.id);
    expect(api.evaluateTask).not.toHaveBeenCalled();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Progress note" }));
    expect(await screen.findByRole("textbox", { name: "What did you complete?" })).toHaveValue("Hoàn thành 20/50 bài\nÔn lại ngày mai.");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps note text after a save failure and cancels without changing saved content", async () => {
    api.listTodayItems.mockResolvedValue([{ ...task, progress_note: "20/50" }]);
    api.saveTaskProgressNote.mockRejectedValue(new Error("Storage busy"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Assess task/ }));
    fireEvent.click(screen.getByRole("option", { name: "Progress note" }));
    const input = await screen.findByRole("textbox", { name: "What did you complete?" });
    fireEvent.change(input, { target: { value: "30/50" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Storage busy");
    expect(input).toHaveValue("30/50");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("20/50", { exact: false })).toBeInTheDocument();
  });

  it("clears a recurring occurrence note using its original date without changing its assessment", async () => {
    api.listTodayItems.mockResolvedValue([{ ...task, kind: "recurring", series_id: "series", occurrence_id: "occ", original_local_date: "2026-08-10", progress_note: "20/50" }]);
    api.saveTaskProgressNote.mockResolvedValue(null);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Assess task/ }));
    fireEvent.click(screen.getByRole("option", { name: "Progress note" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "What did you complete?" }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("20/50", { exact: false })).not.toBeInTheDocument();
    expect(api.saveTaskProgressNote).toHaveBeenCalledWith({ subject_kind: "recurring", task_id: null, series_id: "series", original_local_date: "2026-08-10", note: "" });
    expect(api.evaluateTask).not.toHaveBeenCalled();
  });

  it("keeps a saved 24:00 end attached to its scheduled date", async () => {
    api.listTodayItems.mockResolvedValue([{ ...task, start_minute: 1380, end_minute: 1440 }]);
    const view = mount();
    const title = await screen.findByText("Write the report");
    const row = title.closest<HTMLElement>('[data-agenda-id="task-1"]')!;
    expect(row.parentElement?.querySelector('[aria-hidden="true"]')).toHaveTextContent("23:0024:00");
    fireEvent.doubleClick(title);
    const editor = await screen.findByRole("dialog", { name: "Edit task" });
    expect(await within(editor).findByRole("button", { name: "End time, 24:00" })).toBeInTheDocument();
    expect(within(editor).getByRole("button", { name: /Task date, Tuesday, August 11, 2026/ })).toBeInTheDocument();
    view.unmount();
  });

  it("shows and edits a saved task before 04:00 without changing its date", async () => {
    api.listTodayItems.mockResolvedValue([{ ...task, start_minute: 0, end_minute: 239 }]);
    api.updateTask.mockResolvedValue(undefined);
    mount();
    const title = await screen.findByText("Write the report");
    const row = title.closest<HTMLElement>('[data-agenda-id="task-1"]')!;
    expect(row.parentElement?.querySelector('[aria-hidden="true"]')).toHaveTextContent("00:0003:59");
    fireEvent.doubleClick(title);
    const editor = await screen.findByRole("dialog", { name: "Edit task" });
    expect(await within(editor).findByRole("button", { name: "Start time, 00:00" })).toBeInTheDocument();
    expect(within(editor).getByRole("button", { name: "End time, 03:59" })).toBeInTheDocument();
    fireEvent.click(within(editor).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith(expect.objectContaining({
      id: "task-1", local_date: "2026-08-11", start_minute: 0, end_minute: 239,
    })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit task" })).not.toBeInTheDocument());
  });

  it.each([false, true])("plans a task at midnight with repeat=%s", async (repeat) => {
    api.createTask.mockResolvedValue(undefined);
    api.createRecurringTask.mockResolvedValue(undefined);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Plan task" }));
    const dialog = await screen.findByRole("dialog", { name: "Plan task" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Title" }), { target: { value: "Early task" } });
    for (const label of ["Start", "End"]) {
      fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(`^${label} time,`) }));
      const picker = within(dialog).getByRole("dialog", { name: `Choose ${label.toLowerCase()} time` });
      const hours = within(picker).getByRole("spinbutton", { name: "Hours" });
      fireEvent.keyDown(hours, { key: "Home" });
      await waitFor(() => expect(hours).toHaveAttribute("aria-valuenow", "0"));
      if (label === "End") {
        const minutes = within(picker).getByRole("spinbutton", { name: "Minutes" });
        fireEvent.keyDown(minutes, { key: "ArrowDown" });
        await waitFor(() => expect(minutes).toHaveAttribute("aria-valuenow", "1"));
      }
      fireEvent.click(within(picker).getByRole("button", { name: "Done" }));
    }
    if (repeat) fireEvent.click(within(dialog).getByRole("button", { name: "Daily" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add to day" }));
    await waitFor(() => expect(repeat ? api.createRecurringTask : api.createTask).toHaveBeenCalledWith(expect.objectContaining({
      title: "Early task", local_date: "2026-08-11", start_minute: 0, end_minute: 1,
    })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Plan task" })).not.toBeInTheDocument());
  });

  it("shows every priority as fitted text plus a redundant three-step signal meter", async () => {
    api.listTodayItems.mockResolvedValue([
      { ...task, id: "task-low", title: "Low priority task", priority: "low" },
      { ...task, id: "task-medium", title: "Medium priority task", priority: "medium" },
      { ...task, id: "task-high", title: "High priority task", priority: "high" },
    ]);

    const view = mount();
    await screen.findByText("High priority task");

    for (const [id, priority, label] of [
      ["task-low", "low", "Low"],
      ["task-medium", "medium", "Medium"],
      ["task-high", "high", "High"],
    ] as const) {
      const row = view.container.querySelector<HTMLElement>(`[data-agenda-id="${id}"]`)!;
      const indicator = row.querySelector<HTMLElement>("[data-task-priority]")!;
      expect(indicator).toHaveAttribute("data-priority", priority);
      expect(indicator).toHaveTextContent(label);
      expect(indicator.previousElementSibling).toHaveTextContent(`${label} priority task`);
      const meter = indicator.querySelector("svg[aria-hidden='true']");
      expect(meter).toHaveAttribute("viewBox", "0 0 11 10");
      expect(meter).toHaveAttribute("shape-rendering", "crispEdges");
      expect(meter?.querySelectorAll("rect")).toHaveLength(3);
      expect([...meter!.querySelectorAll("rect")].map((bar) => bar.getAttribute("width"))).toEqual(["3", "3", "3"]);
      expect([...meter!.querySelectorAll("rect")].map((bar) => bar.getAttribute("height"))).toEqual(["4", "7", "9"]);
      expect(row).toHaveAccessibleName(new RegExp(`Priority: ${label}`));
    }
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
    expect(assessment.closest('[data-agenda-id="task-1"]')?.parentElement).toHaveAttribute("data-completed", "true");

    fireEvent.click(assessment);
    expect(screen.getByRole("option", { name: "Done" })).toHaveTextContent("Done");
  });

  it("uses the styled date field and locking time wheels in the task composer", async () => {
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Plan task" }));
    const dialog = await screen.findByRole("dialog", { name: "Plan task" });
    const dateTrigger = await within(dialog).findByRole("button", { name: /Task date, Tuesday, August 11, 2026/ });
    fireEvent.click(dateTrigger);
    const calendar = within(dialog).getByRole("dialog", { name: "Choose task date" });
    fireEvent.click(within(calendar).getByRole("gridcell", { name: "Thursday, August 13, 2026" }));
    expect(within(dialog).getByRole("button", { name: /Task date, Thursday, August 13, 2026/ })).toBeInTheDocument();
    expect(dialog.querySelector('input[type="time"]')).not.toBeInTheDocument();
    expect(dialog.querySelector('input[type="date"]')).not.toBeInTheDocument();
    expect(await within(dialog).findByRole("button", { name: "Start time, 08:00" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "End time, 09:00" })).toBeInTheDocument();
    expect(dialog.querySelectorAll('[data-form-grid="six-column"]')).toHaveLength(2);
    const medium = within(dialog).getByRole("button", { name: "Medium" });
    expect(medium).toHaveAttribute("aria-pressed", "true");
    expect(medium.querySelector("[aria-hidden=true]")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "One time" })).toHaveTextContent("One time");
    expect(within(dialog).queryByText("Workstream")).not.toBeInTheDocument();
    const deadline = within(dialog).getByRole("button", { name: "Deadline, Not set" });
    expect(deadline).toBeEnabled();
    expect(deadline).not.toHaveTextContent("Optional");
    fireEvent.click(within(dialog).getByRole("button", { name: "Daily" }));
    expect(within(dialog).getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "true");
    expect(deadline).toBeDisabled();
    view.unmount();
  });

  it("keeps the recomposed task instrument semantically grouped and axe clean", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Plan task" }));
    const dialog = await screen.findByRole("dialog", { name: "Plan task" });
    await Promise.all([
      within(dialog).findByRole("button", { name: /Task date,/ }),
      within(dialog).findByRole("button", { name: /Start time,/ }),
      within(dialog).findByRole("button", { name: /End time,/ }),
      within(dialog).findByRole("button", { name: /Category,/ }),
    ]);
    expect(within(dialog).getByRole("textbox", { name: "Title" })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Description" })).toBeInTheDocument();
    expect(within(dialog).queryByText("Notes")).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("region")).toHaveLength(3);
    expect(within(dialog).getByRole("region", { name: "Task details" })).toBeInTheDocument();
    const schedule = within(dialog).getByRole("region", { name: "Schedule" });
    const context = within(dialog).getByRole("region", { name: "Context" });
    expect(schedule.querySelector("header svg")).toBeInTheDocument();
    expect(context.querySelector("header svg")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Task date,/ }).querySelector("svg")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Start time,/ }).querySelector("svg")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /End time,/ }).querySelector("svg")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Category,/ }).querySelector("svg")).toBeInTheDocument();
    expect((await axe.run(dialog)).violations).toEqual([]);
  });
});
