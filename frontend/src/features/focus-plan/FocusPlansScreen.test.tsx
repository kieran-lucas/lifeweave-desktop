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
  target_date: null,
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
  target_date: null,
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

const conflictDetail = {
  ...detail,
  revision: 2,
  recovery_draft: {
    base_revision: 1,
    conflict: true,
    updated_at: "2026-08-05T00:01:00Z",
    draft_json: JSON.stringify({
      action: "update_plan",
      title: "Recovered AI Core",
      lifecycle: "paused",
      life_node_id: null,
      start_date: "2026-08-10",
      target_date: "2026-12-20",
      outcome: "Recovered outcome",
      success_criteria: ["Recovered criterion"],
      tag_ids: [],
    }),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(commands.listTaskLifeTargets).mockResolvedValue([]);
  vi.mocked(commands.listTags).mockResolvedValue([]);
  vi.mocked(api.listFocusPlans).mockResolvedValue([summary]);
  vi.mocked(api.getFocusPlan).mockResolvedValue(detail);
  vi.mocked(api.createFocusPlan).mockResolvedValue(detail);
  vi.mocked(api.mutateFocusPlan).mockResolvedValue({ plan_id: detail.id, revision: 2, created_id: null, replayed: false });
  vi.mocked(api.saveFocusPlanDraft).mockResolvedValue(undefined);
  vi.mocked(api.discardFocusPlanDraft).mockResolvedValue(undefined);
  vi.mocked(commands.getFocusPlanLinkedWork).mockResolvedValue({
    one_off_count: 0,
    series_count: 0,
    items: [],
  });
  vi.mocked(commands.listFocusPlanReviews).mockResolvedValue({
    review_count: 0,
    latest_reviewed_local_date: null,
    reviews: [],
  });
});

describe("FocusPlansScreen", () => {
  it("creates, edits, retains rejected input, and loads the conflict recovery draft", async () => {
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

    const title = screen.getByLabelText("Title");
    fireEvent.change(title, { target: { value: "AI Core" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Stale revision" });
    vi.mocked(api.getFocusPlan).mockResolvedValueOnce(conflictDetail);
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));

    await screen.findByRole("alert");
    expect(title).toHaveValue("AI Core");

    fireEvent.click(await screen.findByRole("button", { name: "Load recovery draft" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Recovered AI Core");
    expect(screen.getByLabelText("Lifecycle")).toHaveValue("paused");
    expect(screen.getByLabelText("Start date")).toHaveValue("2026-08-10");
    expect(screen.getByLabelText("Target date")).toHaveValue("2026-12-20");
    expect(screen.getByLabelText("Outcome")).toHaveValue("Recovered outcome");
    expect(screen.getByLabelText("Success criteria, one per line")).toHaveValue("Recovered criterion");

    const alternative = screen.getByPlaceholderText("Alternative approach");
    fireEvent.change(alternative, { target: { value: "Keep this approach" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Approach rejected" });
    fireEvent.click(screen.getByRole("button", { name: "Add approach" }));
    await screen.findByText("Approach rejected");
    expect(alternative).toHaveValue("Keep this approach");

    const phase = screen.getByPlaceholderText("New phase");
    fireEvent.change(phase, { target: { value: "Keep this phase" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Phase rejected" });
    fireEvent.click(screen.getByRole("button", { name: "Add phase" }));
    await screen.findByText("Phase rejected");
    expect(phase).toHaveValue("Keep this phase");

    fireEvent.change(screen.getByLabelText("New plan title"), { target: { value: "Interview Plan" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.createFocusPlan).toHaveBeenCalledWith(expect.objectContaining({ title: "Interview Plan" })));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-saved-view-projection"] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-saved-view-options"] });
  });
});
