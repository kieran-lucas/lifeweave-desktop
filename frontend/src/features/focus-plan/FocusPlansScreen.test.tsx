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

function renderPlan(onViewChange = vi.fn(), onBack = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { ...render(
    <QueryClientProvider client={client}>
      <FocusPlansScreen
        view={{ portfolio: "active", planId: plan.id }}
        onViewChange={onViewChange}
        onBack={onBack}
      />
    </QueryClientProvider>,
  ), client };
}

function renderLibrary(onViewChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { ...render(
    <QueryClientProvider client={client}>
      <FocusPlansScreen
        view={{ portfolio: "active", planId: null }}
        onViewChange={onViewChange}
        onBack={vi.fn()}
      />
    </QueryClientProvider>,
  ), client };
}

describe("Focus Plan detail composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(plan);
    api.list.mockResolvedValue([]);
    api.lifeTargets.mockResolvedValue([]);
    api.create.mockResolvedValue({ ...plan, lifecycle: "draft" });
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
    expect(screen.getByRole("heading", { level: 1, name: "Edit plan" })).toBeInTheDocument();
    expect(document.querySelector("[data-plan-editor]")).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Plan content" })).toHaveValue(plan.outcome);
    expect(screen.getByRole("textbox", { name: "Plan title" })).toHaveValue(plan.title);
    expect(await screen.findByRole("button", { name: /Start date, Saturday, August 1, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Target date, Tuesday, September 1, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Active" })).toBeChecked();
    expect(screen.getByRole("region", { name: "Plan details" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Essentials" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /Schedule|Context/ })).toHaveLength(2);
    expect(screen.queryByText(/Definition of done/i)).not.toBeInTheDocument();

    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toHaveLength(0);
  });

  it("sends authored Markdown to the canonical Plan mutation without conversion", async () => {
    const { client } = renderPlan();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await screen.findByRole("heading", { level: 1, name: plan.title });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const markdown = "# Kết quả\n\n- **Đậm** và [liên kết](https://example.com)\n\n| Mốc | Trạng thái |\n| --- | --- |\n| Một | Xong |";
    fireEvent.change(await screen.findByRole("textbox", { name: "Plan content" }), {
      target: { value: markdown },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({
      mutation: expect.objectContaining({ action: "update_plan", outcome: markdown }),
    }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["focus-plan-targets"] }));
  });

  it("opens New plan directly in the full editor and persists only when submitted", async () => {
    const library = renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: "New plan" }));

    expect(screen.getByRole("heading", { level: 1, name: "New plan" })).toBeInTheDocument();
    expect(document.querySelector("[data-plan-editor-scroll]")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "New plan title" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Plan title" })).toHaveValue("");
    expect(await screen.findByRole("textbox", { name: "Plan content" })).toHaveValue("");
    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Draft" })).toBeChecked();
    const statusOptions = screen.getAllByRole("radio");
    expect(statusOptions).toHaveLength(4);
    statusOptions.forEach((item) => expect(item).toBeDisabled());
    expect(screen.getByText("Starts as Draft")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Plan content" }), { target: { value: "A finished, defensible outcome." } });
    fireEvent.change(screen.getByRole("textbox", { name: "Plan title" }), { target: { value: "Build the research baseline" } });
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      title: "Build the research baseline",
      outcome: "A finished, defensible outcome.",
      life_node_id: null,
      start_date: null,
      target_date: null,
    }));
    await screen.findByRole("heading", { level: 1, name: plan.title });

    library.unmount();
    renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: "New plan" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { level: 1, name: "Plans" })).toBeInTheDocument();
    expect(api.create).toHaveBeenCalledTimes(1);
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

  it("renders the chronological rail with dated and undated Plan markers", async () => {
    const dated = {
      id: plan.id,
      title: plan.title,
      lifecycle: "active" as const,
      score: null,
      start_date: "2026-08-01",
      target_date: "2026-09-01",
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
    const undated = { ...dated, id: "plan-undated", title: "Keep the system calm", start_date: null, target_date: null };
    api.list.mockResolvedValue([dated, undated]);

    renderLibrary();

    const chronology = await screen.findByRole("list", { name: "Active in chronological order" });
    expect(within(chronology).getAllByRole("listitem")).toHaveLength(2);
    expect(within(chronology).getByLabelText("Starts Aug 1, 2026")).toHaveAttribute("datetime", "2026-08-01");
    expect(within(chronology).getByText("to Sep 1, 2026")).toBeInTheDocument();
    expect(within(chronology).queryByText("Target Sep 1, 2026")).not.toBeInTheDocument();
    expect(within(chronology).getByText("No date")).toBeInTheDocument();
  });

  it("emits the smallest meaningful Plans snapshots for detail and overview navigation", async () => {
    const summary = {
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
    api.list.mockResolvedValue([summary]);
    const navigateFromOverview = vi.fn();
    const library = renderLibrary(navigateFromOverview);

    fireEvent.click((await screen.findByText(plan.title)).closest("button")!);
    expect(navigateFromOverview).toHaveBeenCalledWith({ portfolio: "active", planId: plan.id });
    library.unmount();

    const back = vi.fn();
    renderPlan(vi.fn(), back);
    fireEvent.click(await screen.findByRole("button", { name: "Back to previous screen" }));
    expect(back).toHaveBeenCalledOnce();
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

    const { container, client } = renderLibrary();
    const invalidate = vi.spyOn(client, "invalidateQueries");
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
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["focus-plan-targets"] });

    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toHaveLength(0);
  });
});
