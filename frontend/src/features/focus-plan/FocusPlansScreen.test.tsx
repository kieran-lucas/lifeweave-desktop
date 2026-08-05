import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  vi.mocked(commands.listTaskLifeTargets).mockResolvedValue([]);
  vi.mocked(commands.listTags).mockResolvedValue([]);
  vi.mocked(api.listFocusPlans).mockResolvedValue([summary]);
  vi.mocked(api.getFocusPlan).mockResolvedValue(detail);
  vi.mocked(api.createFocusPlan).mockResolvedValue(detail);
  vi.mocked(api.mutateFocusPlan).mockResolvedValue({ plan_id: detail.id, revision: 2, created_id: null, replayed: false });
  vi.mocked(api.saveFocusPlanDraft).mockResolvedValue(undefined);
  vi.mocked(api.discardFocusPlanDraft).mockResolvedValue(undefined);
});

describe("FocusPlansScreen", () => {
  it("creates, edits, and preserves the form after a rejected save", async () => {
    render(<FocusPlansScreen entryRequest={null} onEntryRequestSettled={vi.fn()} />);

    await screen.findByRole("button", { name: /AI Foundations/ });
    fireEvent.click(screen.getByRole("button", { name: /AI Foundations/ }));
    await screen.findByDisplayValue("Learn the fundamentals");

    const title = screen.getByLabelText("Title");
    fireEvent.change(title, { target: { value: "AI Core" } });
    vi.mocked(api.mutateFocusPlan).mockRejectedValueOnce({ message: "Stale revision" });
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));

    await screen.findByRole("alert");
    expect(title).toHaveValue("AI Core");

    fireEvent.change(screen.getByLabelText("New plan title"), { target: { value: "Interview Plan" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(api.createFocusPlan).toHaveBeenCalledWith(expect.objectContaining({ title: "Interview Plan" })));
  });
});
