import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { App } from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const renderApp = () => render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);

vi.mock("../ipc/commands", () => ({
  healthCheck: vi.fn().mockResolvedValue({ status: "ok" }),
  listFoundationRecords: vi.fn().mockResolvedValue([]),
  listArchivedFoundationRecords: vi.fn().mockResolvedValue([]),
  listBackups: vi.fn().mockResolvedValue([]),
  createFoundationRecord: vi.fn(), updateFoundationRecord: vi.fn(),
  archiveFoundationRecord: vi.fn(), restoreFoundationRecord: vi.fn(),
  backupDatabase: vi.fn(), restoreDatabase: vi.fn(),
  listTasksForDate: vi.fn().mockResolvedValue([]),
  listTodayItems: vi.fn().mockResolvedValue([]),
  listTaskCategories: vi.fn().mockResolvedValue([]),
  getMonthProjection: vi.fn().mockResolvedValue({ month: "2026-08", algorithm_version: 1, days: [] }),
  listCompletionStates: vi.fn().mockResolvedValue([]), evaluateTask: vi.fn(), undoTaskEvaluation: vi.fn(),
  getAnalyticsProjection: vi.fn().mockResolvedValue({period_kind:"week",period_start:"2026-07-27",period_end:"2026-08-02",is_complete:true,algorithm_version:1,computed_at:"1",source_revision:"0",scheduled_minutes:0,task_count:0,evaluated_count:0,missed_count:0,categories:[],completion_distribution:[],streaks:[]}),
  updateCategoryGoals: vi.fn(),
  createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
  getLifeBrowseProjection: vi.fn().mockResolvedValue({root_id:"life-root",selected:{id:"life-root",title:"Life",short_description:"Your personal structure begins here.",icon_key:"life-root",branch_theme_id:"neutral",child_count:0,is_leaf:true,is_pinned:false,revision:0},parent:null,children:[],breadcrumb:[],selected_is_pinned:false,child_page:0,child_page_count:1,tree_revision:0,resolved_from_fallback:false,preferred_mode:"browse",viewport_anchor:null}),
  getPinnedLifeNodes: vi.fn().mockResolvedValue([]), pinLifeNode: vi.fn(), unpinLifeNode: vi.fn(), saveLifeNavigationPreference: vi.fn().mockResolvedValue({}),
}));

describe("App shell", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to Today and exposes the locked navigation order", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.getAllByRole("navigation")[0]).toHaveAccessibleName("Primary navigation");
    expect(screen.getByRole("button", { name: "Create task" })).toBeInTheDocument();
  });

  it("navigates destinations and exposes the active item", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(await screen.findByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
  });

  it("opens objective Analytics instead of the former placeholder", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));
    expect(await screen.findByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(await screen.findByText("Scheduled time")).toBeInTheDocument();
    expect(screen.queryByLabelText("Analytics placeholder")).not.toBeInTheDocument();
  });

  it("persists collapse and restores the task preference after Life System", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(window.localStorage.getItem("lifeweave.task-sidebar-mode.v1")).toBe("collapsed");
  });

  it("opens the real two-level Life Browse instead of a placeholder", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    expect(await screen.findByRole("heading", { name: "Life" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pinned" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Life System placeholder")).not.toBeInTheDocument();
  });

  it("keeps Foundation tools under Settings", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.queryByRole("heading", { name: "Foundation Records" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Foundation Records" })).toBeInTheDocument();
  });

  it("keeps selected-day state in the shell and defaults create to it", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    const week=screen.getByRole("navigation",{name:"Week navigation"});
    const other=within(week).getAllByRole("button").find(button=>button.getAttribute("aria-pressed")==="false")!;
    fireEvent.click(other);
    const selectedLabel=await screen.findByText(/Selected day ·/);
    const selectedIso=selectedLabel.textContent!.split(" · ")[1]!;
    fireEvent.click(screen.getByRole("button",{name:"Create task"}));
    expect(screen.getByLabelText("Date")).toHaveValue(selectedIso);
  });

  it("activates a Calendar cell by returning to the day timeline", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button",{name:"Calendar"}));
    const grid=await screen.findByRole("grid");
    fireEvent.click(within(grid).getAllByRole("button")[10]!);
    expect(await screen.findByRole("heading",{name:"Today"})).toBeInTheDocument();
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
