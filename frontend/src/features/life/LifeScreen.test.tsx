import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";

const api = vi.hoisted(() => ({ browse: vi.fn(), savePreference: vi.fn() }));

vi.mock("../../ipc/commands", () => ({
  getLifeBrowseProjection: api.browse,
  saveLifeNavigationPreference: api.savePreference,
}));
vi.mock("./LifeEditWorkspace", () => ({ LifeEditWorkspace: ({ onOpenNode }: { onOpenNode: (id: string, isLeaf: boolean) => void }) => <><button onClick={() => onOpenNode("tree-branch", false)}>Mock tree branch</button><button onClick={() => onOpenNode("tree-leaf", true)}>Mock tree leaf</button></> }));
vi.mock("./RelatedTasksPanel", () => ({ RelatedTasksPanel: () => null }));
vi.mock("../tag/TagChipList", () => ({ TagChipList: () => null }));
vi.mock("./links/LifeLinksPanel", () => ({ default: () => null }));
vi.mock("./document/BasicLeafReader", async () => {
  const { useEffect } = await import("react");
  return {
    BasicLeafReader: ({
      outlineVisible,
      onOutlineAvailabilityChange,
    }: {
      outlineVisible?: boolean;
      onOutlineAvailabilityChange?: (available: boolean) => void;
    }) => {
      useEffect(() => onOutlineAvailabilityChange?.(true), [onOutlineAvailabilityChange]);
      return (
        <div>
          <p>Leaf body</p>
          {outlineVisible && <nav aria-label="Document outline">Outline entries</nav>}
        </div>
      );
    },
  };
});

import { LifeScreen, type LifeViewState } from "./LifeScreen";

const rememberedView = { mode: "browse" as const, nodeId: null, readerId: null, page: 0 };
const staticLifeProps = {
  view: rememberedView,
  onViewChange: vi.fn(),
  onViewReplace: vi.fn(),
  onBack: vi.fn(),
  canHistoryBack: false,
};

const leaf = {
  id: "00000000-0000-7000-8000-000000000401",
  title: "A focused leaf",
  short_description: "Reader fixture",
  icon_key: "life-note",
  branch_theme_id: "default",
  child_count: 0,
  is_leaf: true,
  is_pinned: false,
  direction_confidence: "exploring",
  revision: 1,
  tags: [],
};

const projectionFor = (selected: typeof leaf) => ({
  root_id: "life-root",
  selected,
  parent: null,
  children: [],
  breadcrumb: [selected],
  selected_is_pinned: false,
  child_page: 0,
  child_page_count: 1,
  tree_revision: 1,
  resolved_from_fallback: false,
  preferred_mode: "reader",
  viewport_anchor: null,
});

describe("Life leaf contents control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.browse.mockResolvedValue({
      root_id: "life-root",
      selected: leaf,
      parent: null,
      children: [],
      breadcrumb: [leaf],
      selected_is_pinned: false,
      child_page: 0,
      child_page_count: 1,
      tree_revision: 1,
      resolved_from_fallback: false,
      preferred_mode: "reader",
      viewport_anchor: null,
    });
    api.savePreference.mockResolvedValue(undefined);
  });

  it("keeps Contents off by default and toggles the outline from the left navigator", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen {...staticLifeProps} anchorLocalDate="2026-08-11" />
      </QueryClientProvider>,
    );

    const toggle = await screen.findByRole("button", { name: "Show contents" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide contents" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("navigation", { name: "Document outline" })).toBeInTheDocument();
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Hide contents" }));
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument());
  });

  it("keeps the leaf header minimal and related fields collapsed", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen {...staticLifeProps} anchorLocalDate="2026-08-11" />
      </QueryClientProvider>,
    );

    await screen.findByRole("heading", { name: "A focused leaf" });
    expect(container.querySelector("[data-life-reader] > header")).toBeInTheDocument();
    expect(screen.queryByText("Life document")).not.toBeInTheDocument();
    expect(screen.queryByText("Leaf", { selector: "header *" })).not.toBeInTheDocument();
    const related = screen.getByText("Related").closest("details");
    expect(related).not.toHaveAttribute("open");

    expect(container.querySelector("[data-life-reader]")).toBeInTheDocument();
  });

  it("draws one leaf identity with its secondary name and the default level the tree card shows", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen {...staticLifeProps} anchorLocalDate="2026-08-11" />
      </QueryClientProvider>,
    );

    await screen.findByRole("heading", { name: "A focused leaf", level: 1 });
    await waitFor(() => expect(container.querySelector("[data-life-reader]")).toBeInTheDocument());

    const header = container.querySelector("[data-life-leaf-header]");
    expect(header).toContainElement(screen.getByRole("heading", { name: "A focused leaf", level: 1 }));
    expect(screen.getAllByRole("heading", { name: "A focused leaf" })).toHaveLength(1);
    expect(header).toContainElement(screen.getByText("Reader fixture"));
    // Every leaf carries a level, so the default one is shown rather than hidden.
    expect(container.querySelector('[data-life-leaf-header] [data-level="exploring"]'))
      .toHaveTextContent("Direction confidence: Exploring");
  });

  it("shows a deliberate state in the header's top-left corner", async () => {
    api.browse.mockResolvedValue(projectionFor({ ...leaf, direction_confidence: "committed" }));
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen {...staticLifeProps} anchorLocalDate="2026-08-11" />
      </QueryClientProvider>,
    );

    await screen.findByRole("heading", { name: "A focused leaf", level: 1 });
    const corners = container.querySelector("[data-life-leaf-header] > div");
    const state = container.querySelector('[data-life-leaf-header] [data-level="committed"]');
    expect(state).toHaveTextContent("Direction confidence: Committed");
    // The badge opens the header's corner row and the Reader's controls close it.
    expect(corners?.firstElementChild).toBe(state);
    expect(corners?.lastElementChild).toHaveAttribute("data-life-leaf-commands");
    const accessibility = await axe.run(container);
    expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toHaveLength(0);
  });

  it("restores the immediately previous leaf before returning to its branch", async () => {
    const firstLeaf = { ...leaf, id: "leaf-1", title: "Leaf one" };
    const secondLeaf = { ...leaf, id: "leaf-2", title: "Leaf two" };
    const branch = { ...leaf, id: "branch", title: "Branch", is_leaf: false, child_count: 2 };
    api.browse.mockResolvedValue({
      root_id: "life-root",
      selected: branch,
      parent: null,
      children: [firstLeaf, secondLeaf],
      breadcrumb: [branch],
      selected_is_pinned: false,
      child_page: 0,
      child_page_count: 1,
      tree_revision: 1,
      resolved_from_fallback: false,
      preferred_mode: "browse",
      viewport_anchor: null,
    });

    function LifeHistoryHarness() {
      const [entries, setEntries] = useState<LifeViewState[]>([{
        mode: "browse" as const,
        nodeId: branch.id,
        readerId: null,
        page: 0,
      }]);
      const view = entries.at(-1)!;
      return <LifeScreen
        key={`${view.mode}:${view.nodeId}:${view.readerId}:${view.page}`}
        view={view}
        onViewChange={(next) => setEntries((current) => [...current, next])}
        onViewReplace={(next) => setEntries((current) => [...current.slice(0, -1), next])}
        onBack={() => setEntries((current) => current.slice(0, -1))}
        canHistoryBack={entries.length > 1}
        anchorLocalDate="2026-08-11"
      />;
    }

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeHistoryHarness />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Leaf one/ }));
    expect(screen.getByRole("heading", { name: "Leaf one" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Leaf two/ }));
    expect(screen.getByRole("heading", { name: "Leaf two" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go back in Life System" }));
    expect(screen.getByRole("heading", { name: "Leaf one" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back in Life System" }));
    expect(screen.getByRole("heading", { name: "Branch" })).toBeInTheDocument();
  });

  it("delegates Life Back to WebView history when a prior snapshot exists", async () => {
    const back = vi.fn();
    const navigate = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen
          view={{ mode: "reader", nodeId: leaf.id, readerId: leaf.id, page: 0 }}
          onViewChange={navigate}
          onViewReplace={vi.fn()}
          onBack={back}
          canHistoryBack
          anchorLocalDate="2026-08-11"
        />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Go back in Life System" }));
    expect(back).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("emits Tree as its own screen snapshot", async () => {
    const branch = { ...leaf, id: "branch-tree", title: "Branch", is_leaf: false, child_count: 1 };
    api.browse.mockResolvedValue({
      root_id: "life-root",
      selected: branch,
      parent: null,
      children: [],
      breadcrumb: [branch],
      selected_is_pinned: false,
      child_page: 0,
      child_page_count: 1,
      tree_revision: 1,
      resolved_from_fallback: false,
      preferred_mode: "browse",
      viewport_anchor: null,
    });
    const navigate = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen
          view={{ mode: "browse", nodeId: branch.id, readerId: null, page: 0 }}
          onViewChange={navigate}
          onViewReplace={vi.fn()}
          onBack={vi.fn()}
          canHistoryBack={false}
          anchorLocalDate="2026-08-11"
        />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Tree" }));
    expect(navigate).toHaveBeenCalledWith({ mode: "tree", nodeId: branch.id, readerId: null, page: 0 });
  });

  it("routes direct Tree opens to Browse for branches and Reader for leaves", async () => {
    const branch = { ...leaf, id: "branch-tree", title: "Branch", is_leaf: false, child_count: 1 };
    api.browse.mockResolvedValue({
      root_id: "life-root", selected: branch, parent: null, children: [], breadcrumb: [branch],
      selected_is_pinned: false, child_page: 0, child_page_count: 1, tree_revision: 1,
      resolved_from_fallback: false, preferred_mode: "edit", viewport_anchor: null,
    });
    const navigate = vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LifeScreen view={{ mode: "tree", nodeId: branch.id, readerId: null, page: 0 }} onViewChange={navigate} onViewReplace={vi.fn()} onBack={vi.fn()} canHistoryBack={false} anchorLocalDate="2026-08-11" /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Mock tree branch" }));
    expect(navigate).toHaveBeenCalledWith({ mode: "browse", nodeId: "tree-branch", readerId: null, page: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Mock tree leaf" }));
    expect(navigate).toHaveBeenCalledWith({ mode: "reader", nodeId: "tree-leaf", readerId: "tree-leaf", page: 0 });
  });

  it("contains Tree in a dedicated pan viewport without an outer Life canvas scroll region", async () => {
    api.browse.mockResolvedValue({
      root_id: "life-root",
      selected: { ...leaf, is_leaf: false, child_count: 1 },
      parent: null,
      children: [],
      breadcrumb: [{ ...leaf, is_leaf: false, child_count: 1 }],
      selected_is_pinned: false,
      child_page: 0,
      child_page_count: 1,
      tree_revision: 1,
      resolved_from_fallback: false,
      preferred_mode: "edit",
      viewport_anchor: null,
    });

    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LifeScreen {...staticLifeProps} anchorLocalDate="2026-08-11" />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Life tree" })).toBeInTheDocument();
    expect(container.querySelector("[data-life-tree-header]")).toBeInTheDocument();
    expect(container.querySelector("[data-life-tree-shell]")).toBeInTheDocument();
    expect(container.querySelector('main[data-life-mode="edit"]')).toBeInTheDocument();
  });
});
