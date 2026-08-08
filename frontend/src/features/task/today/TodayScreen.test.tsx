import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  actual_time: { total_completed_seconds: 0, completed_session_count: 0, active_session_id: null, active_started_at_ms: null },
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
  getActiveTaskActualTime: vi.fn(),
  startTaskActualTime: vi.fn(),
  stopTaskActualTime: vi.fn(),
  discardTaskActualTime: vi.fn(),
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
  listTaskSavedViews: vi.fn(),
  listArchivedTaskSavedViews: vi.fn(),
  getTaskSavedViewProjection: vi.fn(),
  getTaskSavedView: vi.fn(),
  getTaskSavedViewEditorOptions: vi.fn(),
  createTaskSavedView: vi.fn(),
  updateTaskSavedView: vi.fn(),
  archiveTaskSavedView: vi.fn(),
  restoreTaskSavedView: vi.fn(),
  reorderTaskSavedViews: vi.fn(),
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

describe("Task 50 layout contracts", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 7, 2, 23, 59));
    commands.getActiveTaskActualTime.mockResolvedValue(null);
    commands.listTodayItems.mockResolvedValue([oneOff]);
    commands.listTaskCategories.mockResolvedValue([
      { id: "general", name: "General", icon_key: "category-general", color_key: "blue" },
    ]);
    commands.listTaskLifeTargets.mockResolvedValue([]);
    commands.listFocusPlanTargets.mockResolvedValue([]);
    commands.listTags.mockResolvedValue([]);
    commands.listCompletionStates.mockResolvedValue([]);
  });
  afterEach(cleanup);

  const openEditor = async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <TodayScreen selectedDate={oneOff.local_date} anchorLocalDate={oneOff.local_date} />
      </QueryClientProvider>,
    );
    await screen.findByText("Focus");
  };

  it("renders exactly one page frame and declares its type", async () => {
    await openEditor();
    const frames = document.querySelectorAll("[data-page-frame]");
    expect(frames).toHaveLength(1);
    /*
     * Today is WIDE_WORKSPACE, not STANDARD_PAGE, from Task 51.
     *
     * It carries a master/detail split now — the timeline plus the context inspector — and the
     * Task 50 taxonomy assigns 1440 to exactly that shape. This is an intentional change to the
     * layout authority recorded in ADR 0045, not a relaxed assertion: the contract still requires
     * exactly one frame and still requires it to declare a type from the finite taxonomy.
     */
    expect(frames[0]).toHaveAttribute("data-page-type", "wide");
  });

  /*
   * The period heading rendered as `Morning04:00–12:00` before Task 50, because the separation was
   * relying on inter-element whitespace that never existed. Name and range are now two boxes.
   */
  it("separates the period name from its time range as layout, not text", async () => {
    await openEditor();
    const heading = screen.getByRole("heading", { name: /Morning/ });
    const parts = [...heading.children].map((node) => node.textContent);
    expect(parts).toEqual(["Morning", "04:00–12:00"]);
    // Two element children, and no bare text node between them: the gap is a layout property, so
    // the heading must not be able to fall back to a single run of text. `textContent` still
    // concatenates here — the rendered spacing itself is proven in native phase 21.
    expect(heading.children).toHaveLength(2);
    expect([...heading.childNodes].every((node) => node.nodeType === Node.ELEMENT_NODE)).toBe(true);
  });

  /*
   * The one MISSING_USER_SURFACE the Task 50 census found: edit, delete and recurring-occurrence
   * scope were reachable only through a double-click or Enter that nothing advertised.
   */
  it("offers a visible Edit control on the task row", async () => {
    await openEditor();
    const edit = screen.getByRole("button", { name: `Edit ${oneOff.title}` });
    expect(edit).toBeVisible();
    fireEvent.click(edit);
    expect(screen.getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
    // Delete lives inside that editor, so the same control is what makes deletion reachable.
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("keeps double-click and Enter working on the row", async () => {
    await openEditor();
    const row = screen.getByText("Focus").closest("[role='listitem']")!;
    fireEvent.doubleClick(row);
    expect(screen.getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
  });

  it("builds the task dialog as a real contained surface", async () => {
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    const dialog = screen.getByRole("dialog");
    // ADR 0039 modal detection depends on this pairing surviving the rebuild.
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const surface = dialog.querySelector("[data-dialog-surface]");
    expect(surface).not.toBeNull();
    expect(surface!.tagName).toBe("FORM");
    expect(surface).toHaveAttribute("data-dialog-width", "standard");
    expect(within(surface as HTMLElement).getByRole("heading", { name: "Create task" })).toBeInTheDocument();
    expect(within(surface as HTMLElement).getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(within(surface as HTMLElement).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("keeps every task field present after the rebuild", async () => {
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    for (const label of [
      "Title",
      "Description",
      "Date",
      "Start hour",
      "Start minute",
      "End hour",
      "End minute",
      "Category",
      "Priority",
      "Deadline",
      "Repeat task",
    ])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("keeps the recurrence controls inside the dialog when recurrence is enabled", async () => {
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.click(screen.getByLabelText("Repeat task"));
    for (const label of ["Frequency", "Recurrence interval"])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    const surface = screen.getByRole("dialog").querySelector("[data-dialog-surface]")!;
    // Recurrence must be part of the bounded surface, not escape into the backdrop.
    expect(surface.contains(screen.getByLabelText("Frequency"))).toBe(true);
  });
});

describe("Today recurrence contract", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 7, 2, 23, 59));
    commands.getActiveTaskActualTime.mockResolvedValue(null);
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
    commands.listTaskSavedViews.mockResolvedValue([]);
    commands.listArchivedTaskSavedViews.mockResolvedValue([]);
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
  // ── Task 38 remediation: Today evaluation cache identity ──────────────────
  // The Today query is keyed by BOTH the viewed day and the observed anchor. These prove the
  // mutation paths write to the entry Today actually renders, not a stale two-part key.

  const renderTodayOnItsOwnDay = () =>
    renderToday(undefined, {
      selectedDate: oneOff.local_date,
      anchorLocalDate: oneOff.local_date,
    });

  const todayEntries = (client: QueryClient) =>
    client.getQueryCache().findAll({ queryKey: ["today-items"] });

  const renderedItems = (client: QueryClient) =>
    client.getQueryData<Array<{ id: string; evaluation: unknown }>>([
      "today-items",
      oneOff.local_date,
      oneOff.local_date,
    ]);

  it("evaluation updates the rendered Today cache entry, not a stale key", async () => {
    const { client } = renderTodayOnItsOwnDay();
    const trigger = await screen.findByRole("button", {
      name: "Assess task. Current state: Unevaluated",
    });

    fireEvent.click(trigger);
    fireEvent.click(
      await screen.findByRole("option", { name: "Met expectation" }),
    );

    // The rendered row itself must transition, not merely the backend call.
    expect(
      await screen.findByRole("button", {
        name: "Assess task. Current state: Met expectation",
      }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(renderedItems(client)?.[0]?.evaluation).toMatchObject({
        state_id: "completion-met",
        operation_id: "operation",
      }),
    );

    // No two-part Today entry may exist or be relied upon.
    const keys = todayEntries(client).map((entry) => entry.queryKey);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key).toHaveLength(3);
  });

  it("undo reverts the same rendered Today cache entry", async () => {
    const { client } = renderTodayOnItsOwnDay();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Assess task. Current state: Unevaluated",
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Met expectation" }),
    );
    await screen.findByRole("button", {
      name: "Assess task. Current state: Met expectation",
    });

    fireEvent.click(screen.getByRole("button", { name: "Undo assessment" }));
    await waitFor(() =>
      expect(commands.undoTaskEvaluation).toHaveBeenCalledWith({
        operation_id: "operation",
      }),
    );

    expect(
      await screen.findByRole("button", {
        name: "Assess task. Current state: Unevaluated",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(renderedItems(client)?.[0]?.evaluation).toBeNull(),
    );
    for (const entry of todayEntries(client))
      expect(entry.queryKey).toHaveLength(3);
  });

  it("rollback after a rejected evaluation restores the rendered entry", async () => {
    commands.evaluateTask.mockRejectedValueOnce(new Error("Assessment rejected"));
    const { client } = renderTodayOnItsOwnDay();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Assess task. Current state: Unevaluated",
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Met expectation" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Assessment rejected",
    );
    // Rollback must land on the three-part key, so the rendered row reverts.
    expect(
      await screen.findByRole("button", {
        name: "Assess task. Current state: Unevaluated",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(renderedItems(client)?.[0]?.evaluation).toBeNull(),
    );
    for (const entry of todayEntries(client))
      expect(entry.queryKey).toHaveLength(3);
  });

  it("evaluation and undo invalidate deadline and Saved View projections", async () => {
    const { client } = renderTodayOnItsOwnDay();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const deadlineInvalidations = () =>
      invalidate.mock.calls.filter(
        ([options]) =>
          Array.isArray(options?.queryKey) &&
          options.queryKey[0] === "deadline-queue",
      ).length;
    const savedViewInvalidations = () =>
      invalidate.mock.calls.filter(
        ([options]) =>
          Array.isArray(options?.queryKey) &&
          options.queryKey[0] === "task-saved-view-projection",
      ).length;

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Assess task. Current state: Unevaluated",
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: "Met expectation" }),
    );
    // A current evaluation removes the Task from the active deadline queue.
    await waitFor(() => expect(deadlineInvalidations()).toBeGreaterThan(0));
    expect(savedViewInvalidations()).toBeGreaterThan(0);

    const afterEvaluate = deadlineInvalidations();
    const savedAfterEvaluate = savedViewInvalidations();
    fireEvent.click(screen.getByRole("button", { name: "Undo assessment" }));
    await waitFor(() =>
      expect(deadlineInvalidations()).toBeGreaterThan(afterEvaluate),
    );
    expect(savedViewInvalidations()).toBeGreaterThan(savedAfterEvaluate);
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
    await screen.findByRole("option", { name: /University/ });
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
  it("focuses the exact moved occurrence when one series has two displayed rows", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    commands.listTodayItems.mockResolvedValue([
      { ...recurring, id: "series:2026-08-01", occurrence_id: "series:2026-08-01", original_local_date: "2026-08-01", is_override: true },
      { ...recurring, id: "series:2026-08-02", occurrence_id: "series:2026-08-02", original_local_date: "2026-08-02" },
    ]);
    renderToday(undefined, {
      focusRequest: {
        requestId: "moved-exact",
        taskId: null,
        seriesId: "series",
        originalLocalDate: "2026-08-01",
      },
    });
    await waitFor(() => expect(document.activeElement).toHaveAttribute("data-original-local-date", "2026-08-01"));
  });
  it("opens the fifth Views tab without changing the Today default", async () => {
    const { container } = renderToday();
    await screen.findByText("Focus");
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Views" }));
    expect(await screen.findByRole("heading", { name: "Saved Views" })).toBeInTheDocument();
    expect(await screen.findByText("No active Saved Views.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Views" })).toHaveAttribute("aria-selected", "true");
    expect((await axe.run(container)).violations).toEqual([]);
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

  describe("Today actual time", () => {
    const timed = (over: Record<string, unknown> = {}) => ({
      ...oneOff,
      actual_time: {
        total_completed_seconds: 0,
        completed_session_count: 0,
        active_session_id: null,
        active_started_at_ms: null,
        ...over,
      },
    });

    it("offers Start on an unevaluated one-off row and never on a recurring row", async () => {
      commands.listTodayItems.mockResolvedValue([timed(), recurring]);
      renderTodayOnItsOwnDay();
      const start = await screen.findByRole("button", { name: `Start timer for ${oneOff.title}` });
      expect(start).toBeEnabled();
      // Exactly one control: the recurring row owns no actual time at all.
      expect(screen.getAllByRole("button", { name: /timer/i })).toHaveLength(1);
    });

    it("starts a timer for the row's task with a fresh operation identity", async () => {
      commands.listTodayItems.mockResolvedValue([timed()]);
      commands.startTaskActualTime.mockResolvedValue({
        total_completed_seconds: 0,
        completed_session_count: 0,
        active_session_id: "session-1",
        active_started_at_ms: Date.now(),
      });
      renderTodayOnItsOwnDay();
      fireEvent.click(await screen.findByRole("button", { name: `Start timer for ${oneOff.title}` }));
      await waitFor(() =>
        expect(commands.startTaskActualTime).toHaveBeenCalledWith(
          expect.objectContaining({ task_id: oneOff.id, operation_id: expect.any(String) }),
        ),
      );
    });

    it("shows Stop and the running strip once a session owns the row", async () => {
      const started = Date.now() - 65_000;
      commands.listTodayItems.mockResolvedValue([
        timed({ active_session_id: "session-1", active_started_at_ms: started }),
      ]);
      commands.getActiveTaskActualTime.mockResolvedValue({
        session_id: "session-1",
        task_id: oneOff.id,
        task_title: oneOff.title,
        task_local_date: oneOff.local_date,
        started_at_ms: started,
        completed_seconds_before_active: 0,
      });
      renderTodayOnItsOwnDay();

      expect(await screen.findByRole("button", { name: `Stop timer for ${oneOff.title}` })).toBeInTheDocument();
      const strip = await screen.findByRole("region", { name: "Running task timer" });
      expect(strip).toHaveTextContent(oneOff.title);
      expect(screen.getByRole("timer")).toHaveTextContent("1:05");
    });

    it("keeps the running strip visible after navigating to another date", async () => {
      const started = Date.now() - 5_000;
      commands.getActiveTaskActualTime.mockResolvedValue({
        session_id: "session-1",
        task_id: oneOff.id,
        task_title: oneOff.title,
        task_local_date: oneOff.local_date,
        started_at_ms: started,
        completed_seconds_before_active: 0,
      });
      commands.listTodayItems.mockResolvedValue([]);
      renderTodayOnItsOwnDay();
      await screen.findByRole("region", { name: "Running task timer" });

      // Move to a different day; the timer belongs to another date but must stay on screen.
      fireEvent.click(screen.getByRole("button", { name: "Next week" }));
      await waitFor(() =>
        expect(screen.getByRole("region", { name: "Running task timer" })).toBeInTheDocument(),
      );
    });

    it("shows cumulative recorded time only when it is non-zero", async () => {
      commands.listTodayItems.mockResolvedValue([timed()]);
      const { rerender: _r } = renderTodayOnItsOwnDay();
      await screen.findByRole("button", { name: `Start timer for ${oneOff.title}` });
      expect(screen.queryByText("2:00")).not.toBeInTheDocument();

      cleanup();
      commands.listTodayItems.mockResolvedValue([
        timed({ total_completed_seconds: 120, completed_session_count: 2 }),
      ]);
      renderTodayOnItsOwnDay();
      expect(await screen.findByText("2:00")).toBeInTheDocument();
    });

    it("cannot start on an evaluated row and explains why", async () => {
      commands.listTodayItems.mockResolvedValue([
        {
          ...timed(),
          evaluation: {
            id: "e1",
            state_id: "met",
            label: "Met expectation",
            visual_token: "met",
            value_bp: 8000,
            evaluated_at: "2026-08-02T10:00:00Z",
            operation_id: "op",
          },
        },
      ]);
      renderTodayOnItsOwnDay();
      const start = await screen.findByRole("button", {
        name: `Tracking unavailable for ${oneOff.title}: undo this task's assessment first`,
      });
      expect(start).toBeDisabled();
      expect(commands.startTaskActualTime).not.toHaveBeenCalled();
    });

    it("cannot start a second task while another timer runs", async () => {
      const other = { ...timed(), id: "two", title: "Second" };
      commands.listTodayItems.mockResolvedValue([other]);
      commands.getActiveTaskActualTime.mockResolvedValue({
        session_id: "session-1",
        task_id: "elsewhere",
        task_title: "Running elsewhere",
        task_local_date: "2026-08-01",
        started_at_ms: Date.now() - 1000,
        completed_seconds_before_active: 0,
      });
      renderTodayOnItsOwnDay();
      const start = await screen.findByRole("button", {
        name: "Tracking unavailable for Second: another task timer is running",
      });
      expect(start).toBeDisabled();
    });

    it("blocks assessment while this row's timer runs and says so", async () => {
      commands.listTodayItems.mockResolvedValue([
        timed({ active_session_id: "session-1", active_started_at_ms: Date.now() - 1000 }),
      ]);
      renderTodayOnItsOwnDay();
      const assess = await screen.findByRole("button", {
        name: "Stop or discard the running timer before assessing this task",
      });
      expect(assess).toBeDisabled();
    });

    it("stops through the strip and refreshes both the timer and the day", async () => {
      const started = Date.now() - 30_000;
      commands.listTodayItems.mockResolvedValue([
        timed({ active_session_id: "session-1", active_started_at_ms: started }),
      ]);
      commands.getActiveTaskActualTime.mockResolvedValue({
        session_id: "session-1",
        task_id: oneOff.id,
        task_title: oneOff.title,
        task_local_date: oneOff.local_date,
        started_at_ms: started,
        completed_seconds_before_active: 0,
      });
      commands.stopTaskActualTime.mockResolvedValue({
        total_completed_seconds: 30,
        completed_session_count: 1,
        active_session_id: null,
        active_started_at_ms: null,
      });
      const { client } = renderTodayOnItsOwnDay();
      const invalidate = vi.spyOn(client, "invalidateQueries");

      fireEvent.click(await screen.findByRole("button", { name: `Stop timer for ${oneOff.title}` }));
      await waitFor(() =>
        expect(commands.stopTaskActualTime).toHaveBeenCalledWith({ session_id: "session-1" }),
      );
      await waitFor(() => {
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-actual-time-active"] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["today-items"] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["analytics"] });
      });
    });

    it("discards only through the strip, never for a completed segment", async () => {
      const started = Date.now() - 4_000;
      commands.listTodayItems.mockResolvedValue([
        timed({ active_session_id: "session-1", active_started_at_ms: started }),
      ]);
      commands.getActiveTaskActualTime.mockResolvedValue({
        session_id: "session-1",
        task_id: oneOff.id,
        task_title: oneOff.title,
        task_local_date: oneOff.local_date,
        started_at_ms: started,
        completed_seconds_before_active: 0,
      });
      commands.discardTaskActualTime.mockResolvedValue({
        total_completed_seconds: 0,
        completed_session_count: 0,
        active_session_id: null,
        active_started_at_ms: null,
      });
      renderTodayOnItsOwnDay();
      fireEvent.click(await screen.findByRole("button", { name: "Discard segment" }));
      await waitFor(() =>
        expect(commands.discardTaskActualTime).toHaveBeenCalledWith({ session_id: "session-1" }),
      );
    });

    it("announces a failed timer mutation once, as an alert", async () => {
      commands.listTodayItems.mockResolvedValue([timed()]);
      commands.startTaskActualTime.mockRejectedValue({ message: "Another task timer is already running. Stop it first." });
      renderTodayOnItsOwnDay();
      fireEvent.click(await screen.findByRole("button", { name: `Start timer for ${oneOff.title}` }));
      const alerts = await screen.findAllByRole("alert");
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveTextContent("Another task timer is already running.");
    });
  });
});
