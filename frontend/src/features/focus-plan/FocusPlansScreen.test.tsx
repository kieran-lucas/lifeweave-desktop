import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FocusPlanDetailView } from "../../ipc/generated/FocusPlanDetailView";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  mutate: vi.fn(),
  lifeTargets: vi.fn(),
}));

vi.mock("./ipc", () => ({
  getFocusPlan: api.get,
  listFocusPlans: api.list,
  createFocusPlan: api.create,
  mutateFocusPlan: api.mutate,
}));
vi.mock("../../ipc/commands", () => ({ listTaskLifeTargets: api.lifeTargets }));
vi.mock("./PlanContentEditor", () => ({
  default: ({ value, editing, onChange }: { value: string; editing: boolean; onChange: (value: string) => void }) =>
    editing ? (
      <textarea aria-label="Plan content" value={value} onChange={(event) => onChange(event.target.value)} />
    ) : (
      <p>{value}</p>
    ),
}));

import { FocusPlansScreen } from "./FocusPlansScreen";

const plan: FocusPlanDetailView = {
  id: "plan-1",
  title: "Ship the writing system",
  lifecycle: "active",
  score: null,
  start_date: "2026-08-01",
  target_date: "2026-09-01",
  life_node_id: null,
  life_title: null,
  outcome: "A quiet, dependable place where the actual plan is effortless to read and revise.",
  success_criteria: ["The main writing surface remains the visual priority."],
  selected_variant_id: "variant-1",
  variants: [],
  tags: [],
  revisions: [],
  recovery_draft: null,
  revision: 3,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-11T00:00:00Z",
  archived: false,
};

function renderPlan() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FocusPlansScreen
        entryRequest={{ requestId: "request-1", planId: plan.id }}
        onEntryRequestSettled={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

function renderLibrary() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FocusPlansScreen
        entryRequest={null}
        onEntryRequestSettled={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe("Focus Plan detail composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(plan);
    api.list.mockResolvedValue([]);
    api.lifeTargets.mockResolvedValue([]);
    api.mutate.mockResolvedValue({ plan_id: plan.id, revision: 4, created_id: null, replayed: false });
  });

  it("keeps identity compact and makes Plan content the primary read and edit surface", async () => {
    const { container } = renderPlan();

    expect(await screen.findByRole("heading", { level: 1, name: plan.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: plan.title }).closest("[data-page-frame]"))
      .toHaveAttribute("data-page-type", "focused");
    const content = screen.getByRole("region", { name: "Plan content" });
    expect(await within(content).findByText(plan.outcome)).toBeInTheDocument();
    expect(screen.queryByText("Updated")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByText("Start date").parentElement?.querySelector("time"))
      .toHaveAttribute("datetime", "2026-08-01");
    expect(screen.getByText("Target date").parentElement?.querySelector("time"))
      .toHaveAttribute("datetime", "2026-09-01");
    expect(screen.queryByText(/Definition of done/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Linked work/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { level: 1, name: `Edit plan ${plan.title}` })).toBeInTheDocument();
    expect(await within(content).findByRole("textbox", { name: "Plan content" })).toHaveValue(plan.outcome);
    expect(screen.getByRole("textbox", { name: "Plan title" })).toHaveValue(plan.title);
    expect(screen.queryByText(/Definition of done/i)).not.toBeInTheDocument();

    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toHaveLength(0);
  });

  it("sends authored Markdown to the canonical Plan mutation without conversion", async () => {
    renderPlan();
    await screen.findByRole("heading", { level: 1, name: plan.title });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const markdown = "# Kết quả\n\n- **Đậm** và [liên kết](https://example.com)\n\n| Mốc | Trạng thái |\n| --- | --- |\n| Một | Xong |";
    fireEvent.change(await screen.findByRole("textbox", { name: "Plan content" }), {
      target: { value: markdown },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({
      mutation: expect.objectContaining({ action: "update_plan", outcome: markdown }),
    }));
  });

  it("loads completed Plans through the dedicated completed portfolio", async () => {
    const completed = {
      id: "plan-completed",
      title: "Publish the handbook",
      lifecycle: "completed" as const,
      score: 100,
      start_date: "2026-07-01",
      target_date: "2026-08-01",
      life_node_id: null,
      life_title: null,
      selected_variant_label: "Primary approach",
      active_variant_count: 1,
      active_phase_count: 0,
      tag_names: [],
      revision: 4,
      updated_at: "2026-08-11T00:00:00Z",
      archived: false,
    };
    api.list.mockImplementation(async ({ portfolio }: { portfolio: string }) => portfolio === "completed" ? [completed] : []);

    renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    expect(await screen.findByText(completed.title)).toBeInTheDocument();
    expect(screen.getByText(completed.title)).toHaveAttribute("data-completed");
    expect(api.list).toHaveBeenLastCalledWith({ portfolio: "completed", limit: 200, offset: 0 });
  });

  it("marks active Plans clearly and moves a scored Plan to Completed", async () => {
    const active = {
      id: plan.id,
      title: plan.title,
      lifecycle: "active" as const,
      score: null,
      start_date: plan.start_date,
      target_date: plan.target_date,
      life_node_id: null,
      life_title: null,
      selected_variant_label: "Primary approach",
      active_variant_count: 1,
      active_phase_count: 0,
      tag_names: [],
      revision: 3,
      updated_at: plan.updated_at,
      archived: false,
    };
    api.list.mockImplementation(async ({ portfolio }: { portfolio: string }) => {
      if (portfolio === "active") return [active];
      if (portfolio === "completed") {
        return [{ ...active, lifecycle: "completed" as const, score: 100, revision: 4 }];
      }
      return [];
    });

    const { container } = renderLibrary();
    const scoreButton = await screen.findByRole("button", { name: `${plan.title} score: Not scored. Set score` });
    const activeRow = scoreButton.parentElement as HTMLElement;
    expect(within(activeRow).getByText("Active")).toBeInTheDocument();
    fireEvent.click(scoreButton);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Evaluate plan" })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(scoreButton);
    fireEvent.click(scoreButton);

    const dialog = screen.getByRole("dialog", { name: "Evaluate plan" });
    const scoreInput = within(dialog).getByRole("spinbutton", { name: "Score from 1 to 100" });
    fireEvent.change(scoreInput, { target: { value: "0" } });
    fireEvent.submit(dialog);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("1 to 100");
    expect(api.mutate).not.toHaveBeenCalled();

    fireEvent.change(scoreInput, { target: { value: "100" } });
    fireEvent.submit(dialog);

    expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({
      plan_id: plan.id,
      expected_revision: 3,
      mutation: { action: "set_score", score: 100 },
    }));
    const completedScore = await screen.findByRole("button", { name: `${plan.title} score: 100. Set score` });
    expect(completedScore).toHaveTextContent("100");
    expect(screen.getByText(plan.title)).toHaveAttribute("data-completed");
    expect(within(completedScore.parentElement as HTMLElement).queryByText("Active")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed" })).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Completed" })));

    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toHaveLength(0);
  });
});
