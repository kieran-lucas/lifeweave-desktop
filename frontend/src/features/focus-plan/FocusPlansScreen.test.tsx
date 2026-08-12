import { fireEvent, render, screen, within } from "@testing-library/react";
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
vi.mock("./LinkedWorkPanel", () => ({ LinkedWorkPanel: () => <p>Linked work</p> }));
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
        anchorLocalDate="2026-08-11"
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
  });

  it("keeps identity compact and makes Plan content the primary read and edit surface", async () => {
    const { container } = renderPlan();

    expect(await screen.findByRole("heading", { level: 1, name: plan.title })).toBeInTheDocument();
    const content = screen.getByRole("region", { name: "Plan content" });
    expect(await within(content).findByText(plan.outcome)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { level: 1, name: `Edit plan ${plan.title}` })).toBeInTheDocument();
    expect(await within(content).findByRole("textbox", { name: "Plan content" })).toHaveValue(plan.outcome);
    expect(screen.getByRole("textbox", { name: "Plan title" })).toHaveValue(plan.title);

    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toHaveLength(0);
  });
});
