import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DeadlineQueuePanel from "../features/task/planning/DeadlineQueuePanel";
import TaskSavedViewsPanel from "../features/task/saved-views/TaskSavedViewsPanel";

/**
 * Cross-cutting accessibility contracts that still belong to live advanced task surfaces.
 * Retired primary-navigation contracts are intentionally absent: accessibility tests protect
 * capabilities that exist, not historical information architecture.
 */

const api = vi.hoisted(() => ({
  getActiveTaskActualTime: vi.fn(),
  startTaskActualTime: vi.fn(),
  stopTaskActualTime: vi.fn(),
  discardTaskActualTime: vi.fn(),
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
  getDeadlineQueue: vi.fn(),
}));
vi.mock("../ipc/commands", () => api);

const savedView = {
  id: "view-1",
  name: "Study",
  base_scope: "today" as const,
  predicate_version: 1,
  sort_mode: "title_ascending" as const,
  group_mode: "none" as const,
  position: 0,
  revision: 1,
  archived: false,
  created_at: "1",
  updated_at: "1",
  support_state: "supported" as const,
};
const savedViewDetail = {
  view: savedView,
  predicate: { type: "all" as const, clauses: [] },
  unsupported_reason: null,
};
const editorOptions = {
  categories: [
    { id: "general", label: "General", archived: false, merged_from_id: null, missing: false },
  ],
  tags: [{ id: "tag-1", label: "Study", archived: false, merged_from_id: null, missing: false }],
  life_areas: [],
  focus_plans: [],
};
const savedViewProjection = {
  view: savedView,
  anchor_local_date: "2026-08-06",
  range_start_local_date: "2026-08-06",
  range_end_local_date: "2026-08-06",
  total_source_count: 1,
  total_visible_count: 1,
  warnings: [],
  unsupported_reason: null,
  groups: [
    {
      key: "all",
      label: "All tasks",
      items: [
        {
          kind: "one_off",
          task_id: "task-1",
          occurrence_id: null,
          series_id: null,
          original_local_date: null,
          scheduled_local_date: "2026-08-06",
          start_minute: 600,
          end_minute: 660,
          title: "Read chapter",
          description: "",
          category_id: "general",
          category_name: "General",
          category_archived: false,
          priority: "high",
          is_override: false,
          evaluation: null,
          life_area: null,
          focus_plan: null,
          deadline: null,
          tags: [],
        },
      ],
    },
  ],
};

const deadlineQueue = {
  anchor_local_date: "2026-08-06",
  range_start_local_date: "2026-07-07",
  range_end_local_date: "2026-08-20",
  total_item_count: 1,
  groups: [
    {
      state: "overdue" as const,
      item_count: 1,
      items: [
        {
          id: "task-1",
          title: "Submit report",
          description: "",
          scheduled_local_date: "2026-08-07",
          deadline_local_date: "2026-08-05",
          start_minute: 540,
          end_minute: 600,
          category_id: "general",
          category_name: "General",
          category_icon_key: "general",
          priority: "high",
          life_area: null,
          focus_plan: null,
          scheduled_after_deadline: true,
          tags: [],
        },
      ],
    },
  ],
};

function mountSavedViews() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TaskSavedViewsPanel anchorLocalDate="2026-08-06" onOpenItem={vi.fn()} />
    </QueryClientProvider>,
  );
}

function mountDeadlines(onOpenItem = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DeadlineQueuePanel anchorLocalDate="2026-08-06" onOpenItem={onOpenItem} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listTaskSavedViews.mockResolvedValue([savedView]);
  api.listArchivedTaskSavedViews.mockResolvedValue([]);
  api.getTaskSavedView.mockResolvedValue(savedViewDetail);
  api.getTaskSavedViewEditorOptions.mockResolvedValue(editorOptions);
  api.getTaskSavedViewProjection.mockResolvedValue(savedViewProjection);
  api.createTaskSavedView.mockResolvedValue(savedViewDetail);
  api.updateTaskSavedView.mockResolvedValue(savedViewDetail);
  api.archiveTaskSavedView.mockResolvedValue(savedViewDetail);
  api.restoreTaskSavedView.mockResolvedValue(savedViewDetail);
  api.reorderTaskSavedViews.mockResolvedValue([savedView]);
  api.getDeadlineQueue.mockResolvedValue(deadlineQueue);
});

describe("Saved View editor keyboard containment", () => {
  it("cycles Tab inside the modal without trapping the user in it", async () => {
    mountSavedViews();
    const open = await screen.findByRole("button", { name: "Create view" });
    fireEvent.click(open);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Create Saved View");

    await screen.findByRole("button", { name: "Save view" });
    const controls = [...dialog.querySelectorAll<HTMLElement>("button,input,select")].filter(
      (control) => !control.hasAttribute("disabled"),
    );
    const first = controls[0]!;
    const last = controls.at(-1)!;

    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Create view" })).toHaveFocus(),
    );
  });

  it("announces a rejected save through a focused alert and keeps the draft", async () => {
    api.createTaskSavedView.mockRejectedValue(new Error("Name is already used."));
    mountSavedViews();
    fireEvent.click(await screen.findByRole("button", { name: "Create view" }));

    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText("Name", { exact: false });
    fireEvent.change(name, { target: { value: "Duplicate" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save view" }));

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Name is already used.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(name).toHaveValue("Duplicate");
  });
});

describe("Deadline queue name, role, state, and reachability", () => {
  it("gives every actionable control a unique, self-describing accessible name", async () => {
    const { container } = mountDeadlines();
    const open = await screen.findByRole("button", {
      name: /^Open Submit report, scheduled .*, deadline 2026-08-05$/,
    });
    expect(open).toBeInTheDocument();

    for (const button of container.querySelectorAll("button")) {
      expect(button).not.toHaveAttribute("tabindex");
      expect(button).toBeEnabled();
      expect(button).toHaveAccessibleName();
    }
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("states deadline status in text and machine-readable time, never colour alone", async () => {
    const { container } = mountDeadlines();
    await screen.findByRole("heading", { name: /Overdue deadlines/ });

    expect(screen.getByText("Scheduled after deadline")).toBeInTheDocument();
    const times = [...container.querySelectorAll("time")].map((node) =>
      node.getAttribute("datetime"),
    );
    expect(times).toContain("2026-08-05");
    expect(times).toContain("2026-08-07");
  });
});
