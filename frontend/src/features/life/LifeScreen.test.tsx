import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";

const api = vi.hoisted(() => ({ browse: vi.fn(), savePreference: vi.fn() }));

vi.mock("../../ipc/commands", () => ({
  getLifeBrowseProjection: api.browse,
  saveLifeNavigationPreference: api.savePreference,
}));
vi.mock("./LifeEditWorkspace", () => ({ LifeEditWorkspace: () => null }));
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

import { LifeScreen } from "./LifeScreen";

const leaf = {
  id: "00000000-0000-7000-8000-000000000401",
  title: "A focused leaf",
  short_description: "Reader fixture",
  icon_key: "life-note",
  branch_theme_id: "default",
  child_count: 0,
  is_leaf: true,
  is_pinned: false,
  revision: 1,
  tags: [],
};

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
        <LifeScreen anchorLocalDate="2026-08-11" />
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
        <LifeScreen anchorLocalDate="2026-08-11" />
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
        <LifeScreen anchorLocalDate="2026-08-11" />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Life tree" })).toBeInTheDocument();
    expect(container.querySelector("[data-life-tree-header]")).toBeInTheDocument();
    expect(container.querySelector("[data-life-tree-shell]")).toBeInTheDocument();
    expect(container.querySelector('main[data-life-mode="edit"]')).toBeInTheDocument();
  });
});
