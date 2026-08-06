import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { StrictMode, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayScreen, localToday } from "./TodayScreen";

const oneOff = {
  kind: "one_off",
  id: "one",
  occurrence_id: null,
  series_id: null,
  original_local_date: null,
  local_date: "2026-08-02",
  start_minute: 487,
  end_minute: 833,
  title: "Focus",
  description: "Deep work",
  category_id: "general",
  category_name: "General",
  category_icon_key: "category-general",
  category_color_key: "blue",
  priority: "high",
  is_override: false,
  evaluation: null,
  tags: [],
  life_area: null,
  focus_plan: null,
  deadline: null,
};
const recurring = {
  ...oneOff,
  kind: "recurring",
  id: "series:2026-08-02",
  occurrence_id: "series:2026-08-02",
  series_id: "series",
  original_local_date: "2026-08-02",
  title: "Weekly review",
};
const commands = vi.hoisted(() => ({
  listTodayItems: vi.fn(),
  listTaskCategories: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  createRecurringTask: vi.fn(),
  updateRecurringOccurrence: vi.fn(),
  listCompletionStates: vi.fn(),
  evaluateTask: vi.fn(),
  undoTaskEvaluation: vi.fn(),
  listTaskLifeTargets: vi.fn(),
  listFocusPlanTargets: vi.fn(),
  listTags: vi.fn(),
  createTag: vi.fn(),
  getTaskPlanningProjection: vi.fn(),
}));
vi.mock("../../../ipc/commands", () => commands);
const renderToday = (
  onLifeNavigate?: (nodeId: string) => void,
  props: ComponentProps<typeof TodayScreen> = {},
) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider
      client={client}
    >
      <TodayScreen
        {...props}
        {...(onLifeNavigate ? { onLifeNavigate } : {})}
      />
    </QueryClientProvider>,
  );
  return { ...view, client };
};

describe("Today recurrence contract", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 7, 2, 23, 59));
    commands.listTodayItems.mockResolvedValue([oneOff]);
    commands.listTaskCategories.mockResolvedValue([
      {
        id: "general",
        name: "General",
        icon_key: "category-general",
        color_key: "blue",
      },
    ]);
    commands.listTaskLifeTargets.mockResolvedValue([
      { id: "study", title: "Study", breadcrumb: "Study" },
      { id: "university", title: "University", breadcrumb: "Study › University" },
    ]);
    commands.listFocusPlanTargets.mockResolvedValue([
      { id: "plan-a", title: "AI Foundations", lifecycle: "active" },
      { id: "plan-b", title: "Fitness", lifecycle: "draft" },
    ]);
    commands.listTags.mockResolvedValue([]);
    commands.createTag.mockResolvedValue({ id: "tag-new", name: "New tag" });
    commands.listCompletionStates.mockResolvedValue([
      {
        id: "completion-none",
        internal_key: "none",
        label: "Not done",
        sort_key: 0,
        visual_token: "none",
      },
      {
        id: "completion-below",
        internal_key: "below",
        label: "Below expectation",
        sort_key: 1,
        visual_token: "below",
      },
      {
        id: "completion-met",
        internal_key: "met",
        label: "Met expectation",
        sort_key: 2,
        visual_token: "met",
      },
      {
        id: "completion-excellent",
        internal_key: "excellent",
        label: "Very good",
        sort_key: 3,
        visual_token: "excellent",
      },
    ]);
    commands.evaluateTask.mockResolvedValue({
      state_id: "completion-met",
      label: "Met expectation",
      visual_token: "met",
      evaluated_at: "1",
      operation_id: "operation",
    });
    commands.undoTaskEvaluation.mockResolvedValue(null);
    commands.createTask.mockResolvedValue(oneOff);
    commands.updateTask.mockResolvedValue(oneOff);
    commands.createRecurringTask.mockResolvedValue("series");
    commands.updateRecurringOccurrence.mockResolvedValue(undefined);
    commands.deleteTask.mockResolvedValue(undefined);
    commands.getTaskPlanningProjection.mockResolvedValue({
      mode: "upcoming", algorithm_version: 1, anchor_local_date: "2026-08-02",
      range_start_local_date: "2026-08-03", range_end_local_date: "2026-08-16",
      total_item_count: 1, scheduled_minutes: 60,
      groups: [{ local_date: "2026-08-03", scheduled_minutes: 60, items: [{
        ...oneOff, id: "future", local_date: "2026-08-03", start_minute: 600, end_minute: 660,
      }] }],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (HTMLElement.prototype as { scrollIntoView?: unknown })
      .scrollIntoView;
  });
  it("renders all timeline periods and keeps recurrence off by default", async () => {
    renderToday();
    await screen.findByText("Focus");
    for (const name of ["Morning", "Afternoon", "Evening"])
      expect(
        screen.getByRole("heading", { name: new RegExp(name) }),
      ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(screen.getByLabelText("Repeat task")).not.toBeChecked();
    expect(screen.queryByText("Reminder")).not.toBeInTheDocument();
  });
  it("sends interval weekdays and count chosen by the user", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Standup" },
    });
    fireEvent.click(screen.getByLabelText("Repeat task"));
    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "weekly" },
    });
    fireEvent.change(screen.getByLabelText("Recurrence interval"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByLabelText("Tue"));
    fireEvent.click(screen.getByLabelText("count"));
    fireEvent.change(screen.getByLabelText("Occurrence count"), {
      target: { value: "7" },
    });
    expect(
      screen.getByRole("list", { name: "Recurrence preview" }).children.length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.createRecurringTask).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: "weekly",
          interval: 2,
          weekdays: [1],
          count: 7,
          until: null,
        }),
      ),
    );
  });
  it("retains typed recurring identity and exposes all edit scopes", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    renderToday();
    const row = await screen.findByRole("listitem");
    expect(screen.getByLabelText("Recurring task")).toBeInTheDocument();
    fireEvent.doubleClick(row);
    for (const label of [
      "Only this occurrence",
      "This and future occurrences",
      "Entire series",
    ])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("This and future occurrences"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.updateRecurringOccurrence).toHaveBeenCalledWith(
        expect.objectContaining({
          series_id: "series",
          original_local_date: "2026-08-02",
          scope: "this_and_future",
          cancelled: false,
        }),
      ),
    );
  });
  it("submits each recurring edit scope with stable typed identity", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    for (const [label, scope] of [
      ["Only this occurrence", "only_this_occurrence"],
      ["This and future occurrences", "this_and_future"],
      ["Entire series", "entire_series"],
    ] as const) {
      const view = renderToday();
      fireEvent.doubleClick(await screen.findByRole("listitem"));
      fireEvent.click(screen.getByLabelText(label));
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(commands.updateRecurringOccurrence).toHaveBeenLastCalledWith(
          expect.objectContaining({
            series_id: "series",
            original_local_date: "2026-08-02",
            scope,
            cancelled: false,
          }),
        ),
      );
      view.unmount();
    }
  });
  it("moves only this occurrence with its original identity intact", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-08-03" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.updateRecurringOccurrence).toHaveBeenCalledWith(
        expect.objectContaining({
          series_id: "series",
          original_local_date: "2026-08-02",
          replacement_local_date: "2026-08-03",
          scope: "only_this_occurrence",
        }),
      ),
    );
  });
  it("routes recurring delete through every explicit scope and never one-off delete", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));
    for (const [label, scope] of [
      ["Only this occurrence", "only_this_occurrence"],
      ["This and future occurrences", "this_and_future"],
      ["Entire series", "entire_series"],
    ] as const) {
      fireEvent.click(screen.getByLabelText(label));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() =>
        expect(commands.updateRecurringOccurrence).toHaveBeenLastCalledWith(
          expect.objectContaining({ scope, cancelled: true }),
        ),
      );
      if (scope !== "entire_series") {
        commands.listTodayItems.mockResolvedValue([recurring]);
        renderToday();
        fireEvent.doubleClick((await screen.findAllByRole("listitem")).at(-1)!);
      }
    }
    expect(commands.deleteTask).not.toHaveBeenCalled();
  });
  it("preserves recurring draft and scope after conflict", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    commands.updateRecurringOccurrence.mockRejectedValueOnce(
      new Error("Conflict at 08:07"),
    );
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Changed draft" },
    });
    fireEvent.click(screen.getByLabelText("Entire series"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Conflict");
    expect(screen.getByLabelText("Title")).toHaveValue("Changed draft");
    expect(screen.getByLabelText("Entire series")).toBeChecked();
  });
  it("keeps one-off delete on the one-off command", async () => {
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(commands.deleteTask).toHaveBeenCalledWith("one"),
    );
    expect(commands.updateRecurringOccurrence).not.toHaveBeenCalled();
  });
  it("optimistically evaluates an eligible one-off and exposes backend Undo", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: /Assess task/ }));
    fireEvent.click(
      await screen.findByRole("option", { name: "Met expectation" }),
    );
    await waitFor(() =>
      expect(commands.evaluateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_kind: "one_off",
          task_id: "one",
          series_id: null,
          state_id: "completion-met",
        }),
      ),
    );
    expect(
      await screen.findByRole("button", { name: "Undo assessment" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo assessment" }));
    await waitFor(() =>
      expect(commands.undoTaskEvaluation).toHaveBeenCalledWith({
        operation_id: "operation",
      }),
    );
  });
  it("uses stable recurring subject identity for evaluation", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    renderToday();
    await screen.findByText("Weekly review");
    fireEvent.click(screen.getByRole("button", { name: /Assess task/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Very good" }));
    await waitFor(() =>
      expect(commands.evaluateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_kind: "recurring",
          task_id: null,
          series_id: "series",
          original_local_date: "2026-08-02",
          state_id: "completion-excellent",
        }),
      ),
    );
  });
  it("restores the old ring and row focus after persistence failure", async () => {
    commands.evaluateTask.mockRejectedValueOnce(
      new Error("Assessment rejected"),
    );
    renderToday();
    await screen.findByText("Focus");
    const trigger = screen.getByRole("button", { name: /Assess task/ });
    fireEvent.click(trigger);
    fireEvent.click(
      await screen.findByRole("option", { name: "Below expectation" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Assessment rejected",
    );
    expect(
      screen.getByRole("button", {
        name: "Assess task. Current state: Unevaluated",
      }),
    ).toBeInTheDocument();
  });
  it("disables evaluation for a future item", async () => {
    commands.listTodayItems.mockResolvedValue([
      { ...oneOff, local_date: "9999-12-31" },
    ]);
    renderToday();
    await screen.findByText("Focus");
    expect(
      screen.getByRole("button", {
        name: "Assessment unavailable until task ends",
      }),
    ).toBeDisabled();
  });
  it("selects and clears a Focus Plan in the atomic create payload", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Linked" } });
    const chooser = screen.getByRole("combobox", { name: "Focus Plan" });
    fireEvent.change(chooser, { target: { value: "AI Found" } });
    await screen.findByRole("option", { name: /AI Foundations/ });
    fireEvent.keyDown(chooser, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ focus_plan_id: "plan-a" }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(screen.getByRole("combobox", { name: "Focus Plan" })).toHaveValue("");
  });

  it("navigates an active Focus Plan chip without opening the editor and clears the link", async () => {
    const navigate = vi.fn();
    commands.listTodayItems.mockResolvedValue([
      { ...oneOff, focus_plan: { id: "plan-a", title: "AI Foundations", archived: false } },
    ]);
    const view = renderToday(undefined, { onFocusPlanNavigate: navigate });
    const chip = await screen.findByRole("button", { name: /Focus Plan: AI Foundations/ });
    fireEvent.click(chip);
    expect(navigate).toHaveBeenCalledWith("plan-a");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("listitem"));
    fireEvent.click(screen.getByRole("button", { name: "Clear Focus Plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.updateTask).toHaveBeenCalledWith(
        expect.objectContaining({ focus_plan_id: null }),
      ),
    );
    view.unmount();

    commands.listTodayItems.mockResolvedValue([
      { ...oneOff, focus_plan: { id: "gone", title: "Retired", archived: true } },
    ]);
    renderToday();
    // An archived target is stated in text and offers no navigation control.
    expect(await screen.findByText("Archived Focus Plan: Retired")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Focus Plan: Retired/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the Focus Plan on the series across recurring edit scopes", async () => {
    commands.listTodayItems.mockResolvedValue([
      { ...recurring, focus_plan: { id: "plan-a", title: "AI Foundations", archived: false } },
    ]);
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));

    // At occurrence scope the relation belongs to the series and cannot be edited.
    const chooser = screen.getByRole("combobox", { name: "Focus Plan" });
    expect(chooser).toBeDisabled();
    expect(
      screen.getByText(
        "This Focus Plan belongs to the series. Change scope to Entire series to edit it.",
      ),
    ).toBeInTheDocument();

    // The inherited value still round-trips, so an occurrence save changes nothing.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.updateRecurringOccurrence).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "only_this_occurrence",
          focus_plan_id: "plan-a",
        }),
      ),
    );

    // A successful save closes the dialog; reopen it to change scope.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    fireEvent.doubleClick(screen.getByRole("listitem"));

    // Entire series enables the control and carries the new choice.
    fireEvent.click(screen.getByLabelText("Entire series"));
    const enabled = screen.getByRole("combobox", { name: "Focus Plan" });
    await waitFor(() => expect(enabled).not.toBeDisabled());
    fireEvent.change(enabled, { target: { value: "Fitness" } });
    await screen.findByRole("option", { name: /Fitness/ });
    fireEvent.keyDown(enabled, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.updateRecurringOccurrence).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "entire_series", focus_plan_id: "plan-b" }),
      ),
    );
  });

  it("retains the Focus Plan draft after a rejected save", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Linked" } });
    const chooser = screen.getByRole("combobox", { name: "Focus Plan" });
    fireEvent.change(chooser, { target: { value: "AI Found" } });
    await screen.findByRole("option", { name: /AI Foundations/ });
    fireEvent.keyDown(chooser, { key: "Enter" });
    commands.createTask.mockRejectedValueOnce(new Error("Choose an active Focus Plan."));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Title")).toHaveValue("Linked");
    expect(screen.getByRole("combobox", { name: "Focus Plan" })).toHaveValue(
      "AI Foundations",
    );
  });

  it("creates a one-off task with a deadline and clears it without moving the schedule", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Essay" } });
    fireEvent.change(screen.getByLabelText("Deadline"), {
      target: { value: "2026-08-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ deadline_local_date: "2026-08-12" }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Essay 2" } });
    fireEvent.change(screen.getByLabelText("Deadline"), {
      target: { value: "2026-08-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear deadline" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.createTask).toHaveBeenLastCalledWith(
        expect.objectContaining({ deadline_local_date: null }),
      ),
    );
  });

  it("never sends a deadline to recurring creation or recurring edits", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Standup" } });
    fireEvent.change(screen.getByLabelText("Deadline"), {
      target: { value: "2026-08-12" },
    });
    // Switching the same draft to recurring must not carry the deadline across.
    fireEvent.click(screen.getByLabelText("Repeat task"));
    expect(screen.getByLabelText("Deadline")).toBeDisabled();
    expect(
      screen.getByText("Recurring tasks cannot carry a deadline yet."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(commands.createRecurringTask).toHaveBeenCalled());
    expect(commands.createRecurringTask.mock.calls[0]![0]).not.toHaveProperty(
      "deadline_local_date",
    );

  });

  it("never sends a deadline when editing a recurring occurrence", async () => {
    commands.listTodayItems.mockResolvedValue([recurring]);
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));
    expect(screen.getByLabelText("Deadline")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(commands.updateRecurringOccurrence).toHaveBeenCalled(),
    );
    expect(
      commands.updateRecurringOccurrence.mock.calls.at(-1)![0],
    ).not.toHaveProperty("deadline_local_date");
  });

  it("shows deadline state and a schedule conflict as text on one-off rows", async () => {
    commands.listTodayItems.mockResolvedValue([
      {
        ...oneOff,
        deadline: {
          deadline_local_date: "2026-08-04",
          state: "overdue",
          scheduled_after_deadline: true,
        },
      },
    ]);
    const view = renderToday();
    expect(await screen.findByText(/Deadline overdue/)).toBeInTheDocument();
    expect(screen.getByText(/Scheduled after deadline/)).toBeInTheDocument();
    expect(
      view.container.querySelector('time[datetime="2026-08-04"]'),
    ).toBeInTheDocument();
    view.unmount();

    commands.listTodayItems.mockResolvedValue([
      {
        ...oneOff,
        deadline: {
          deadline_local_date: "2026-08-02",
          state: "due_today",
          scheduled_after_deadline: false,
        },
      },
    ]);
    renderToday();
    expect(await screen.findByText(/Due today/)).toBeInTheDocument();
    expect(screen.queryByText(/Scheduled after deadline/)).not.toBeInTheDocument();
  });

  it("retains the deadline draft after a rejected save", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Essay" } });
    fireEvent.change(screen.getByLabelText("Deadline"), {
      target: { value: "2026-08-12" },
    });
    commands.createTask.mockRejectedValueOnce(new Error("Enter a valid deadline date."));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Deadline")).toHaveValue("2026-08-12");
    expect(screen.getByLabelText("Title")).toHaveValue("Essay");
  });

  it("passes the observed anchor alongside the viewed day", async () => {
    renderToday();
    await screen.findByText("Focus");
    expect(commands.listTodayItems).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
    );
  });

  it("selects and clears a Life area in the atomic create payload", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Linked" } });
    const chooser = screen.getByRole("combobox", { name: "Life area" });
    fireEvent.change(chooser, { target: { value: "University" } });
    await screen.findByRole("option", { name:/University/ });
    fireEvent.keyDown(chooser, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(commands.createTask).toHaveBeenCalledWith(expect.objectContaining({ life_node_id: "university" })));
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(screen.getByRole("combobox", { name: "Life area" })).toHaveValue("");
  });
  it("shows archived relation and navigates an active chip without editing", async () => {
    const navigate = vi.fn();
    commands.listTodayItems.mockResolvedValue([{ ...oneOff, life_area: { id:"study", title:"Study", breadcrumb:"Study", archived:false } }]);
    const view = renderToday(navigate);
    const chip = await screen.findByRole("button", { name: /Life area: Study/ });
    fireEvent.click(chip);
    expect(navigate).toHaveBeenCalledWith("study");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("listitem"));
    fireEvent.click(screen.getByRole("button", { name: "Clear Life area" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(commands.updateTask).toHaveBeenCalledWith(expect.objectContaining({ life_node_id: null })));
    view.unmount();
    commands.listTodayItems.mockResolvedValue([{ ...oneOff, life_area: { id:"old", title:"Old", breadcrumb:"Old", archived:true } }]);
    renderToday();
    fireEvent.doubleClick(await screen.findByRole("listitem"));
    expect(screen.getAllByText("Archived life area: Old")).toHaveLength(2);
  });
  it("opens a planning item on its exact Today date and identity", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    commands.listTodayItems.mockImplementation((date: string) => Promise.resolve(date === "2026-08-03" ? [{ ...oneOff, id: "future", local_date: date }] : [oneOff]));
    renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    fireEvent.click(await screen.findByRole("button", { name: /Open day for Focus/ }));
    await waitFor(() => expect(document.activeElement).toHaveAttribute("data-task-id", "future"));
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
  });
  it("closes an assessment fan across both tab round trips and stays axe clean", async () => {
    const { container } = renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("button", { name: /Assess task/ }));
    expect(await screen.findByRole("listbox", { name: "Completion assessment" })).toBeInTheDocument();

    const upcoming = screen.getByRole("tab", { name: "Upcoming" });
    upcoming.focus();
    fireEvent.click(upcoming);
    expect(upcoming).toHaveFocus();
    expect(screen.queryByRole("listbox", { name: "Completion assessment" })).not.toBeInTheDocument();
    await screen.findByRole("heading", { name: "Upcoming" });
    expect((await axe.run(container)).violations).toEqual([]);

    fireEvent.click(screen.getByRole("tab", { name: "Today" }));
    await screen.findByText("Focus");
    expect(screen.queryByRole("listbox", { name: "Completion assessment" })).not.toBeInTheDocument();
    expect((await axe.run(container)).violations).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /Assess task/ }));
    expect(await screen.findByRole("listbox", { name: "Completion assessment" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Overdue" }));
    expect(screen.queryByRole("listbox", { name: "Completion assessment" })).not.toBeInTheDocument();
  });
  it("keeps editor tab disabling and the latest undo operation unchanged", async () => {
    renderToday();
    await screen.findByText("Focus");
    fireEvent.doubleClick(screen.getByRole("listitem"));
    expect(screen.getByRole("tab", { name: "Upcoming" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: /Assess task/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Met expectation" }));
    expect(await screen.findByRole("button", { name: "Undo assessment" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    fireEvent.click(screen.getByRole("tab", { name: "Today" }));
    expect(screen.getByRole("button", { name: "Undo assessment" })).toBeInTheDocument();
  });
  it("handles an external request once, preserves user focus on updates, and handles a new ID", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const request = { requestId: "external-a", taskId: "one", seriesId: null };
    const settled = vi.fn();
    const view = render(
      <QueryClientProvider client={client}>
        <TodayScreen focusRequest={request} onFocusRequestSettled={settled} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(document.activeElement).toHaveAttribute("data-task-id", "one"));
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith("external-a");

    const todayTab = screen.getByRole("tab", { name: "Today" });
    todayTab.focus();
    client.setQueryData(["today-items", "2026-08-02"], [{ ...oneOff }]);
    await waitFor(() => expect(todayTab).toHaveFocus());
    expect(scroll).toHaveBeenCalledTimes(1);

    view.rerender(
      <QueryClientProvider client={client}>
        <TodayScreen focusRequest={{ ...request }} onFocusRequestSettled={settled} />
      </QueryClientProvider>,
    );
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    view.rerender(
      <QueryClientProvider client={client}>
        <TodayScreen focusRequest={{ ...request }} onFocusRequestSettled={settled} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: /Assess task/ }));
    expect(await screen.findByRole("listbox", { name: "Completion assessment" })).toBeInTheDocument();
    view.rerender(
      <QueryClientProvider client={client}>
        <TodayScreen focusRequest={{ ...request }} onFocusRequestSettled={settled} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("listbox", { name: "Completion assessment" })).toBeInTheDocument();
    view.rerender(
      <QueryClientProvider client={client}>
        <TodayScreen
          focusRequest={{ ...request, requestId: "external-c" }}
          onFocusRequestSettled={settled}
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    expect(settled).toHaveBeenCalledTimes(2);
    expect(settled).toHaveBeenLastCalledWith("external-c");
    expect(screen.queryByRole("listbox", { name: "Completion assessment" })).not.toBeInTheDocument();
  });
  it("consumes recurring planning focus and does not revive it after a query update", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    commands.getTaskPlanningProjection.mockResolvedValueOnce({
      mode: "upcoming",
      algorithm_version: 1,
      anchor_local_date: "2026-08-02",
      range_start_local_date: "2026-08-03",
      range_end_local_date: "2026-08-16",
      total_item_count: 1,
      scheduled_minutes: 60,
      groups: [{
        local_date: "2026-08-03",
        scheduled_minutes: 60,
        items: [{ ...recurring, local_date: "2026-08-03" }],
      }],
    });
    commands.listTodayItems.mockImplementation((date: string) =>
      Promise.resolve(date === "2026-08-03" ? [{ ...recurring, local_date: date }] : [oneOff]),
    );
    const { client } = renderToday();
    await screen.findByText("Focus");
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    fireEvent.click(await screen.findByRole("button", { name: /Open day for Weekly review/ }));
    await waitFor(() => expect(document.activeElement).toHaveAttribute("data-series-id", "series"));
    expect(scroll).toHaveBeenCalledTimes(1);
    const todayTab = screen.getByRole("tab", { name: "Today" });
    todayTab.focus();
    client.setQueryData(["today-items", "2026-08-03"], [{ ...recurring, local_date: "2026-08-03" }]);
    await waitFor(() => expect(todayTab).toHaveFocus());
    expect(scroll).toHaveBeenCalledTimes(1);
  });
  it("completes missing-target fallback once after data resolves", async () => {
    let resolveItems!: (items: typeof oneOff[]) => void;
    commands.listTodayItems.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveItems = resolve;
      }),
    );
    const headingFocus = vi.spyOn(HTMLElement.prototype, "focus");
    const settled = vi.fn();
    const { client } = renderToday(undefined, {
      focusRequest: { requestId: "missing", taskId: "absent", seriesId: null },
      onFocusRequestSettled: settled,
    });
    expect(headingFocus).not.toHaveBeenCalled();
    resolveItems([oneOff]);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Today" })).toHaveFocus());
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith("missing");
    const callsAfterFallback = headingFocus.mock.calls.length;
    screen.getByRole("tab", { name: "Today" }).focus();
    client.setQueryData(["today-items", "2026-08-02"], [{ ...oneOff }]);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Today" })).toHaveFocus());
    expect(headingFocus).toHaveBeenCalledTimes(callsAfterFallback + 1);
    headingFocus.mockRestore();
  });
  it("keeps a query-error request pending and acknowledges once after retry", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    commands.listTodayItems
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([oneOff]);
    const settled = vi.fn();
    const { client } = renderToday(undefined, {
      focusRequest: { requestId: "retry", taskId: "one", seriesId: null },
      onFocusRequestSettled: settled,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load tasks",
    );
    expect(settled).not.toHaveBeenCalled();
    await client.refetchQueries({ queryKey: ["today-items", "2026-08-02"] });
    await waitFor(() => expect(settled).toHaveBeenCalledWith("retry"));
    expect(settled).toHaveBeenCalledTimes(1);
  });
  it("delays external focus behind an open editor and preserves its draft", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const settled = vi.fn();
    const view = render(
      <QueryClientProvider client={client}>
        <TodayScreen />
      </QueryClientProvider>,
    );
    await screen.findByText("Focus");
    fireEvent.doubleClick(screen.getByRole("listitem"));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Unsaved draft" },
    });
    view.rerender(
      <QueryClientProvider client={client}>
        <TodayScreen
          focusRequest={{ requestId: "modal", taskId: "one", seriesId: null }}
          onFocusRequestSettled={settled}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved draft");
    expect(scroll).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(settled).toHaveBeenCalledWith("modal"));
    expect(scroll).toHaveBeenCalledTimes(1);
  });
  it("closes TagPicker on first Escape and the Task dialog on second Escape", async () => {
    commands.listTags.mockResolvedValue([{ id: "research", name: "Research" }]);
    renderToday();
    await screen.findByText("Focus");
    fireEvent.doubleClick(screen.getByRole("listitem"));
    const dialog = screen.getByRole("dialog");
    const toggle = screen.getByRole("button", { name: "Add tags" });
    fireEvent.click(toggle);
    const search = await screen.findByRole("searchbox");

    fireEvent.keyDown(search, { key: "Escape" });

    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("lets a workspace tab or Week Strip supersede a loading request", async () => {
    let resolveItems!: (items: typeof oneOff[]) => void;
    commands.listTodayItems.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveItems = resolve;
      }),
    );
    const settled = vi.fn();
    const first = renderToday(undefined, {
      focusRequest: { requestId: "tab-cancel", taskId: "one", seriesId: null },
      onFocusRequestSettled: settled,
    });
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    expect(settled).toHaveBeenCalledWith("tab-cancel");
    resolveItems([oneOff]);
    await screen.findByRole("heading", { name: "Upcoming" });
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    first.unmount();

    commands.listTodayItems.mockReturnValueOnce(new Promise(() => {}));
    const settledDate = vi.fn();
    const second = renderToday(undefined, {
      focusRequest: { requestId: "date-cancel", taskId: "one", seriesId: null },
      onFocusRequestSettled: settledDate,
    });
    const week = screen.getAllByRole("navigation", { name: "Week navigation" }).at(-1)!;
    const otherDate = within(week)
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-pressed") === "false")!;
    fireEvent.click(otherDate);
    expect(settledDate).toHaveBeenCalledWith("date-cancel");
    expect(otherDate).toHaveAttribute("aria-pressed", "true");
    second.unmount();
  });
  it("is StrictMode-safe for external settlement and focus", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const settled = vi.fn();
    render(
      <StrictMode>
        <QueryClientProvider client={new QueryClient()}>
          <TodayScreen
            focusRequest={{ requestId: "strict", taskId: "one", seriesId: null }}
            onFocusRequestSettled={settled}
          />
        </QueryClientProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(settled).toHaveBeenCalledWith("strict"));
    expect(settled).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledTimes(1);
  });
  it("does not revive handled external A after internal B is consumed", async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scroll,
    });
    const request = { requestId: "external-a", taskId: "one", seriesId: null };
    const { client } = renderToday(undefined, { focusRequest: request });
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    fireEvent.click(await screen.findByRole("button", { name: /Open day for Focus/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Today" })).toHaveFocus());
    expect(scroll).toHaveBeenCalledTimes(1);
    const todayTab = screen.getByRole("tab", { name: "Today" });
    todayTab.focus();
    client.setQueryData(["today-items", "2026-08-03"], [{ ...oneOff, id: "future", local_date: "2026-08-03" }]);
    await waitFor(() => expect(todayTab).toHaveFocus());
    expect(scroll).toHaveBeenCalledTimes(1);
  });
});
