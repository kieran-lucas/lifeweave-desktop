import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TaskSavedViewsPanel from "./TaskSavedViewsPanel";

const api = vi.hoisted(() => ({
  listTaskSavedViews: vi.fn(),
  listArchivedTaskSavedViews: vi.fn(),
  getTaskSavedView: vi.fn(),
  getTaskSavedViewEditorOptions: vi.fn(),
  getTaskSavedViewProjection: vi.fn(),
  createTaskSavedView: vi.fn(),
  updateTaskSavedView: vi.fn(),
  archiveTaskSavedView: vi.fn(),
  restoreTaskSavedView: vi.fn(),
  reorderTaskSavedViews: vi.fn(),
}));
vi.mock("../../../ipc/commands", () => api);

const view = (id: string, name: string, position = 0, archived = false) => ({
  id, name, base_scope: "today" as const, predicate_version: 1,
  sort_mode: "title_ascending" as const, group_mode: "none" as const,
  position, revision: archived ? 2 : 1, archived,
  created_at: "1", updated_at: "1", support_state: "supported" as const,
});
const detail = (value = view("view-1", "Study")) => ({
  view: value,
  predicate: { type: "all" as const, clauses: [] },
  unsupported_reason: null,
});
const options = {
  categories: [{ id: "general", label: "General", archived: false, merged_from_id: null, missing: false }],
  tags: [{ id: "tag-1", label: "Study", archived: false, merged_from_id: null, missing: false }],
  life_areas: [], focus_plans: [],
};
const projection = {
  view: view("view-1", "Study"), anchor_local_date: "2026-08-06",
  range_start_local_date: "2026-08-06", range_end_local_date: "2026-08-06",
  total_source_count: 2, total_visible_count: 1, warnings: [], unsupported_reason: null,
  groups: [{ key: "all", label: "All tasks", items: [{
    kind: "recurring", task_id: null, occurrence_id: "series-1:2026-08-05",
    series_id: "series-1", original_local_date: "2026-08-05",
    scheduled_local_date: "2026-08-06", start_minute: 600, end_minute: 660,
    title: "Moved review", description: "", category_id: "general", category_name: "General",
    category_archived: false, priority: "high", is_override: true, evaluation: null,
    life_area: null, focus_plan: null, deadline: null,
    tags: [{ id: "tag-1", name: "Study", archived: false }],
  }] }],
};

/**
 * A promise the test resolves by hand.
 *
 * The selection race only reproduces when the active-list refetch lands *after* the panel has
 * re-rendered, which is what a real IPC round trip does and what an instantly resolved mock does
 * not. Holding the refetch open makes that ordering deterministic instead of accidental.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}

function mount(onOpenItem = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const result = render(<QueryClientProvider client={client}><TaskSavedViewsPanel anchorLocalDate="2026-08-06" onOpenItem={onOpenItem} /></QueryClientProvider>);
  return { ...result, client, onOpenItem };
}

beforeEach(() => {
  // Reset rather than clear: `mockClear` leaves an unconsumed `mockResolvedValueOnce` queued, and a
  // one-shot left over from an earlier test would silently outrank the next test's own mock.
  vi.resetAllMocks();
  api.listTaskSavedViews.mockResolvedValue([view("view-1", "Study")]);
  api.listArchivedTaskSavedViews.mockResolvedValue([]);
  api.getTaskSavedView.mockResolvedValue(detail());
  api.getTaskSavedViewEditorOptions.mockResolvedValue(options);
  api.getTaskSavedViewProjection.mockResolvedValue(projection);
  api.createTaskSavedView.mockResolvedValue(detail());
  api.updateTaskSavedView.mockResolvedValue(detail());
  api.archiveTaskSavedView.mockResolvedValue(detail(view("view-1", "Study", 0, true)));
  api.restoreTaskSavedView.mockResolvedValue(detail());
  api.reorderTaskSavedViews.mockResolvedValue([view("view-1", "Study")]);
});

describe("TaskSavedViewsPanel", () => {
  it("renders semantic grouped rows and opens a moved occurrence at its displayed date", async () => {
    const mounted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Study" }));
    const group = await screen.findByRole("heading", { name: "All tasks · 1" });
    expect(within(group.parentElement!).getByText("Moved review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Moved review, scheduled 2026-08-06" }));
    expect(mounted.onOpenItem).toHaveBeenCalledWith({ localDate: "2026-08-06", taskId: null, seriesId: "series-1", originalLocalDate: "2026-08-05" });
    expect(api.getTaskSavedViewProjection).toHaveBeenCalledWith({ view_id: "view-1", anchor_local_date: "2026-08-06" });
    expect((await axe.run(mounted.container)).violations).toEqual([]);
  });

  it("opens a one-off result through its stable task identity", async () => {
    api.getTaskSavedViewProjection.mockResolvedValue({
      ...projection,
      groups: [{ ...projection.groups[0]!, items: [{
        ...projection.groups[0]!.items[0]!,
        kind: "one_off",
        task_id: "task-1",
        occurrence_id: null,
        series_id: null,
        original_local_date: null,
        title: "One-off review",
      }] }],
    });
    const mounted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Study" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open One-off review, scheduled 2026-08-06" }));
    expect(mounted.onOpenItem).toHaveBeenCalledWith({
      localDate: "2026-08-06",
      taskId: "task-1",
      seriesId: null,
      originalLocalDate: null,
    });
  });

  it("uses typed controls, retains a rejected draft, and cancels with Escape", async () => {
    api.createTaskSavedView.mockRejectedValueOnce(new Error("Duplicate name")).mockResolvedValueOnce(detail());
    const mounted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Create view" }));
    const dialog = await screen.findByRole("dialog", { name: "Create Saved View" });
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "My priorities" } });
    fireEvent.change(within(dialog).getByLabelText("Add filter"), { target: { value: "priority_in" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    expect(within(dialog).getByRole("group", { name: "Priority" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/query|SQL|JSON/i)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save view" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Duplicate name");
    expect(within(dialog).getByLabelText("Name")).toHaveValue("My priorities");
    expect((await axe.run(dialog)).violations).toEqual([]);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Create view" })).toHaveFocus());
    expect(api.createTaskSavedView).toHaveBeenCalledWith(expect.objectContaining({
      name: "My priorities",
      predicate: { type: "all", clauses: [{ kind: "priority_in", values: ["high"] }] },
    }));
    expect(mounted.container.querySelector("textarea")).toBeNull();
  });

  it("reorders by buttons, clears an archived selection, and restores archived views", async () => {
    const second = view("view-2", "Work", 1);
    const archived = view("view-3", "Old", 2, true);
    api.listTaskSavedViews.mockResolvedValue([view("view-1", "Study"), second]);
    api.listArchivedTaskSavedViews.mockResolvedValue([archived]);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Study" }));
    fireEvent.click(screen.getByRole("button", { name: "Move Study down" }));
    await waitFor(() => expect(api.reorderTaskSavedViews).toHaveBeenCalledWith({ ordered_ids: ["view-2", "view-1"] }));
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    await waitFor(() => expect(screen.getByText("Select or create a Saved View.")).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Archived views/));
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(api.restoreTaskSavedView).toHaveBeenCalledWith({ id: "view-3", expected_revision: 2 }));
  });

  it("keeps a newly created view selected and projects it without a second click", async () => {
    const created = view("view-2", "Deadlines soon", 1);
    const refetch = deferred<ReturnType<typeof view>[]>();
    api.listTaskSavedViews.mockResolvedValueOnce([view("view-1", "Study")]).mockReturnValue(refetch.promise);
    api.createTaskSavedView.mockResolvedValue(detail(created));
    api.getTaskSavedViewProjection.mockResolvedValue({ ...projection, view: created });
    mount();

    fireEvent.click(await screen.findByRole("button", { name: "Create view" }));
    const dialog = await screen.findByRole("dialog", { name: "Create Saved View" });
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Deadlines soon" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save view" }));

    // The save has settled and the panel has re-rendered while the active list is still the old
    // one — the exact window in which the stale-selection effect used to fire.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(api.listTaskSavedViews).toHaveBeenCalledTimes(2));
    refetch.resolve([view("view-1", "Study"), created]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Deadlines soon" })).toHaveAttribute("aria-pressed", "true"));
    await waitFor(() => expect(api.getTaskSavedViewProjection).toHaveBeenCalledWith({
      view_id: "view-2",
      anchor_local_date: "2026-08-06",
    }));
    expect(await screen.findByText("Moved review")).toBeInTheDocument();
    expect(screen.queryByText("Select or create a Saved View.")).not.toBeInTheDocument();
  });

  it("keeps a restored view selected and projects it without a second click", async () => {
    const restored = view("view-3", "Old", 2);
    const refetch = deferred<ReturnType<typeof view>[]>();
    api.listTaskSavedViews.mockResolvedValueOnce([view("view-1", "Study")]).mockReturnValue(refetch.promise);
    api.listArchivedTaskSavedViews
      .mockResolvedValueOnce([view("view-3", "Old", 2, true)])
      .mockResolvedValue([]);
    api.restoreTaskSavedView.mockResolvedValue(detail(restored));
    api.getTaskSavedViewProjection.mockResolvedValue({ ...projection, view: restored });
    mount();

    fireEvent.click(await screen.findByText(/Archived views/));
    fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
    await waitFor(() => expect(api.restoreTaskSavedView).toHaveBeenCalledWith({ id: "view-3", expected_revision: 2 }));
    await waitFor(() => expect(api.listTaskSavedViews).toHaveBeenCalledTimes(2));
    refetch.resolve([view("view-1", "Study"), restored]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Old" })).toHaveAttribute("aria-pressed", "true"));
    await waitFor(() => expect(api.getTaskSavedViewProjection).toHaveBeenCalledWith({
      view_id: "view-3",
      anchor_local_date: "2026-08-06",
    }));
    expect(await screen.findByText("Moved review")).toBeInTheDocument();
    expect(screen.queryByText("Select or create a Saved View.")).not.toBeInTheDocument();
  });

  it("still clears a selection whose view leaves the refreshed active list", async () => {
    const mounted = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Study" }));
    expect(await screen.findByText("Moved review")).toBeInTheDocument();

    api.listTaskSavedViews.mockResolvedValue([]);
    await mounted.client.invalidateQueries({ queryKey: ["task-saved-views"] });

    await waitFor(() => expect(screen.getByText("Select or create a Saved View.")).toBeInTheDocument());
  });

  it("renames through edit and shows unsupported and unresolved states explicitly", async () => {
    api.getTaskSavedView.mockResolvedValue(detail());
    const mounted = mount();
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Edit Saved View" });
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Renamed Study" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save view" }));
    await waitFor(() => expect(api.updateTaskSavedView).toHaveBeenCalledWith(expect.objectContaining({
      id: "view-1",
      expected_revision: 1,
      name: "Renamed Study",
    })));

    api.getTaskSavedViewProjection.mockResolvedValueOnce({
      ...projection,
      groups: [],
      total_visible_count: 0,
      unsupported_reason: "Predicate version 2 is not supported by this app.",
    });
    await mounted.client.invalidateQueries({ queryKey: ["task-saved-view-projection"] });
    expect(await screen.findByRole("alert")).toHaveTextContent("Predicate version 2");

    api.getTaskSavedViewProjection.mockResolvedValueOnce({
      ...projection,
      groups: [],
      total_visible_count: 0,
      warnings: [{
        code: "missing_reference",
        clause_kind: "category_id_in",
        reference_id: "missing",
        message: "A referenced item no longer exists; this clause matches no tasks.",
      }],
    });
    await mounted.client.invalidateQueries({ queryKey: ["task-saved-view-projection"] });
    expect(await screen.findByText("Reference warnings")).toBeInTheDocument();
    expect(screen.getByText("No tasks match this view.")).toBeInTheDocument();
  });

  it("shows a merged tag alias as its canonical target and cancels without persisting", async () => {
    api.getTaskSavedView.mockResolvedValue({
      ...detail(),
      predicate: { type: "all", clauses: [{ kind: "tag_id_any", ids: ["tag-old"] }] },
    });
    api.getTaskSavedViewEditorOptions.mockResolvedValue({
      ...options,
      tags: [{ id: "tag-new", label: "Study", archived: false, merged_from_id: "tag-old", missing: false }],
    });
    const mounted = mount();

    fireEvent.click((await screen.findAllByRole("button", { name: "Edit" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Edit Saved View" });
    const canonical = await within(dialog).findByRole("option", { name: "Study — merged target" }) as HTMLOptionElement;
    expect(canonical.selected).toBe(true);
    expect(within(dialog).getByText("Selected: Study")).toBeInTheDocument();
    expect(within(dialog).queryByText(/tag-old/)).not.toBeInTheDocument();
    expect((await axe.run(dialog)).violations).toEqual([]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(api.updateTaskSavedView).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Edit" })[0]).toHaveFocus());
    expect(mounted.container).not.toHaveTextContent("tag-old");
  });

  it("writes deduplicated canonical tag IDs only on explicit save", async () => {
    api.getTaskSavedView.mockResolvedValue({
      view: { ...view("view-1", "Study"), base_scope: "deadlines" as const },
      predicate: {
        type: "all",
        clauses: [
          { kind: "tag_id_any", ids: ["tag-old", "tag-older"] },
          { kind: "has_deadline_is", value: true },
        ],
      },
      unsupported_reason: null,
    });
    api.getTaskSavedViewEditorOptions.mockResolvedValue({
      ...options,
      tags: [
        { id: "tag-new", label: "Study", archived: false, merged_from_id: "tag-old", missing: false },
        { id: "tag-new", label: "Study", archived: false, merged_from_id: "tag-older", missing: false },
      ],
    });
    mount();

    fireEvent.click((await screen.findAllByRole("button", { name: "Edit" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Edit Saved View" });
    await within(dialog).findByRole("option", { name: "Study — merged target" });
    expect(within(dialog).getAllByRole("option", { name: "Study — merged target" })).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "Save view" }));

    await waitFor(() => expect(api.updateTaskSavedView).toHaveBeenCalledWith(expect.objectContaining({
      id: "view-1",
      name: "Study",
      base_scope: "deadlines",
      sort_mode: "title_ascending",
      group_mode: "none",
      predicate: {
        type: "all",
        clauses: [
          { kind: "tag_id_any", ids: ["tag-new"] },
          { kind: "has_deadline_is", value: true },
        ],
      },
    })));
  });

  it("preserves a genuinely missing tag until the user removes it explicitly", async () => {
    api.getTaskSavedView.mockResolvedValue({
      ...detail(),
      predicate: { type: "all", clauses: [{ kind: "tag_id_any", ids: ["tag-missing"] }] },
    });
    api.getTaskSavedViewEditorOptions.mockResolvedValue({
      ...options,
      tags: [{
        id: "tag-missing",
        label: "Missing reference (tag-missing)",
        archived: false,
        merged_from_id: null,
        missing: true,
      }],
    });
    mount();

    fireEvent.click((await screen.findAllByRole("button", { name: "Edit" }))[0]!);
    const dialog = await screen.findByRole("dialog", { name: "Edit Saved View" });
    const missing = await within(dialog).findByRole("option", { name: "Missing reference (tag-missing) — missing" }) as HTMLOptionElement;
    expect(missing.selected).toBe(true);
    expect(within(dialog).getByText("Selected: Missing reference (tag-missing)")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Any tag" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save view" }));
    await waitFor(() => expect(api.updateTaskSavedView).toHaveBeenCalledWith(expect.objectContaining({
      predicate: { type: "all", clauses: [] },
    })));
  });
});
