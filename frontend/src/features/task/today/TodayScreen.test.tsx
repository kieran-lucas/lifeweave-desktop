import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
}));
vi.mock("../../../ipc/commands", () => commands);
const renderToday = (onLifeNavigate?: (nodeId: string) => void) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <TodayScreen {...(onLifeNavigate ? { onLifeNavigate } : {})} />
    </QueryClientProvider>,
  );

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
  });
  afterEach(() => vi.useRealTimers());
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
});
