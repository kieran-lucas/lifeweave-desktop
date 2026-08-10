import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as commands from "../../ipc/commands";
import * as api from "./ipc";
import { FocusPlansScreen } from "./FocusPlansScreen";

vi.mock("../../ipc/commands");
vi.mock("./ipc");

const summary = {
  id: "plan-1",
  title: "AI Foundations",
  lifecycle: "active" as const,
  start_date: null,
  target_date: "2026-12-20",
  life_node_id: null,
  life_title: null,
  selected_variant_label: "Primary approach",
  active_variant_count: 1,
  active_phase_count: 0,
  tag_names: [],
  revision: 1,
  updated_at: "2026-08-05T00:00:00Z",
  archived: false,
};

const detail = {
  id: "plan-1",
  title: "AI Foundations",
  lifecycle: "active" as const,
  start_date: null,
  target_date: "2026-12-20",
  life_node_id: null,
  life_title: null,
  outcome: "Learn the fundamentals",
  success_criteria: ["Finish the course"],
  selected_variant_id: "variant-1",
  variants: [{ id: "variant-1", label: "Primary approach", canonical_json: '{"type":"doc","content":[]}', plain_text: "", sort_key: 0, archived: false, phases: [] }],
  tags: [],
  revisions: [],
  recovery_draft: null,
  revision: 1,
  created_at: "2026-08-05T00:00:00Z",
  updated_at: "2026-08-05T00:00:00Z",
  archived: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(commands.listTaskLifeTargets).mockResolvedValue([]);
  vi.mocked(api.listFocusPlans).mockResolvedValue([summary]);
  vi.mocked(api.getFocusPlan).mockResolvedValue(detail);
  vi.mocked(api.createFocusPlan).mockResolvedValue(detail);
  vi.mocked(api.mutateFocusPlan).mockResolvedValue({ plan_id: detail.id, revision: 2, created_id: null, replayed: false });
  vi.mocked(commands.getFocusPlanLinkedWork).mockResolvedValue({
    one_off_count: 0,
    series_count: 0,
    items: [],
  });
});

describe("FocusPlansScreen", () => {
  it("keeps the execution brief small, preserves rejected edits, and creates Plans", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    render(
      <QueryClientProvider client={client}>
        <FocusPlansScreen
          entryRequest={null}
          onEntryRequestSettled={vi.fn()}
          anchorLocalDate="2026-08-06"
        />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: /AI Foundations/ });
    fireEvent.click(screen.getByRole("button", { name: /AI Foundations/ }));
    await screen.findByDisplayValue("Learn the fundamentals");

    expect(screen.getAllByRole("tab").map((node) => node.textContent)).toEqual([
      "Active",
      "Drafts",
      "Paused",
      "Completed",
    ]);
    expect(screen.queryByText("Approaches")).not.toBeInTheDocument();
    expect(screen.queryByText("Reviews")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Archived" })).not.toBeInTheDocument();

    const title = screen.getByLabelText("Title");
    fireEvent.change(title, { target: { value: "AI Core" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Stale revision" });
    vi.mocked(api.getFocusPlan).mockResolvedValueOnce({ ...detail, revision: 2 });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("alert");
    expect(title).toHaveValue("AI Core");

    fireEvent.click(screen.getByText("More details"));
    expect(screen.getByLabelText("Status")).toHaveValue("active");
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();

    vi.mocked(api.mutateFocusPlan).mockResolvedValueOnce({ plan_id: detail.id, revision: 3, created_id: null, replayed: false });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() =>
      expect(api.mutateFocusPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          mutation: expect.objectContaining({ action: "update_plan", title: "AI Core", tag_ids: [] }),
        }),
      ),
    );

    fireEvent.change(screen.getByLabelText("New plan title"), { target: { value: "Interview Plan" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.createFocusPlan).toHaveBeenCalledWith(expect.objectContaining({ title: "Interview Plan" })));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-saved-view-projection"] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-saved-view-options"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["analytics"] });
  });
});
