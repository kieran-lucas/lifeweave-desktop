import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifeScreen } from "./LifeScreen";
import type { LifeBrowseProjection } from "../../ipc/generated/LifeBrowseProjection";

const api = vi.hoisted(() => ({
  browse: vi.fn(),
  edit: vi.fn(),
  pins: vi.fn(),
  pin: vi.fn(),
  unpin: vi.fn(),
  save: vi.fn(),
  document: vi.fn(),
  related: vi.fn(),
}));
vi.mock("../../ipc/commands", () => ({
  getLifeBrowseProjection: api.browse,
  getLifeEditProjection: api.edit,
  getPinnedLifeNodes: api.pins,
  pinLifeNode: api.pin,
  unpinLifeNode: api.unpin,
  saveLifeNavigationPreference: api.save,
  getReaderDocument: api.document,
  getRelatedTasksForLifeNode: api.related,
}));
const node = (id: string, title: string, children = 0, pinned = false) => ({
  id,
  title,
  short_description: `About ${title}`,
  icon_key: children ? "life-branch" : "life-leaf",
  branch_theme_id: "neutral",
  child_count: children,
  is_leaf: children === 0,
  is_pinned: pinned,
  revision: 0,
});
const root = node("life-root", "Life", 2);
const branch = node("00000000-0000-7000-8000-000000000001", "Branch", 1);
const leaf = node("00000000-0000-7000-8000-000000000002", "Leaf", 0);
const projection = (
  selected = root,
  children = [branch, leaf],
  page = 0,
  pages = 1,
): LifeBrowseProjection => ({
  root_id: "life-root",
  selected,
  parent: selected.id === "life-root" ? null : root,
  children,
  breadcrumb: selected.id === "life-root" ? [root] : [root, selected],
  selected_is_pinned: selected.is_pinned,
  child_page: page,
  child_page_count: pages,
  tree_revision: 2,
  resolved_from_fallback: false,
  preferred_mode: "browse",
  viewport_anchor: null,
});
const renderLife = (
  onTaskNavigate?: (
    localDate: string,
    taskId: string | null,
    seriesId: string | null,
  ) => void,
) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <LifeScreen {...(onTaskNavigate ? { onTaskNavigate } : {})} />
    </QueryClientProvider>,
  );

describe("Life Browse", () => {
  beforeEach(() => {
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      Promise.resolve(
        node_id === branch.id ? projection(branch, [leaf]) : projection(),
      ),
    );
    api.edit.mockResolvedValue({
      root_id: "life-root",
      tree_revision: 2,
      nodes: [],
      archived_nodes: [],
      latest_undo: null,
    });
    api.pins.mockResolvedValue([]);
    api.pin.mockResolvedValue({
      node: root,
      tree_revision: 3,
      invalidation: [],
      undo_token: null,
    });
    api.unpin.mockResolvedValue({
      node: root,
      tree_revision: 3,
      invalidation: [],
      undo_token: null,
    });
    api.save.mockResolvedValue({
      node_id: "life-root",
      mode: "browse",
      path_version: 1,
      viewport_anchor: null,
    });
    api.document.mockResolvedValue({
      life_node_id: leaf.id,
      document: null,
      draft_state: "none",
      draft_json: null,
      draft_base_revision: null,
    });
    api.related.mockResolvedValue([]);
  });
  it("renders a real root Browse with no fake personal branches", async () => {
    renderLife();
    expect(
      await screen.findByRole("heading", { name: "Life" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Career|Finance|Relationships/),
    ).not.toBeInTheDocument();
  });
  it("renders only the focal node and its direct children", async () => {
    renderLife();
    const list = await screen.findByRole("list", {
      name: "Direct children of Life",
    });
    expect(
      within(list)
        .getAllByRole("button")
        .filter((b) => !b.getAttribute("aria-label")),
    ).toHaveLength(2);
    expect(screen.queryByText("Grandchild")).not.toBeInTheDocument();
  });
  it("activates a branch and replaces its direct-child set", async () => {
    renderLife();
    fireEvent.click((await screen.findByText("Branch")).closest("button")!);
    expect(
      await screen.findByRole("heading", { name: "Branch" }),
    ).toBeInTheDocument();
    expect(api.browse).toHaveBeenCalledWith({
      node_id: branch.id,
      child_page: 0,
    });
  });
  it("supports breadcrumb and Back navigation", async () => {
    renderLife();
    fireEvent.click((await screen.findByText("Branch")).closest("button")!);
    await screen.findByRole("heading", { name: "Branch" });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(
      await screen.findByRole("heading", { name: "Life" }),
    ).toBeInTheDocument();
  });
  it("opens a leaf Reader and returns to exact Browse context", async () => {
    renderLife();
    const trigger = (await screen.findByText("Leaf")).closest("button")!;
    fireEvent.click(trigger);
    expect(
      await screen.findByRole("heading", { name: "Reader" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/no document yet/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Back to Life Browse/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Life" }),
    ).toBeInTheDocument();
  });
  it("pins and unpins without nesting interactive controls", async () => {
    renderLife();
    fireEvent.click(await screen.findByRole("button", { name: "Pin Leaf" }));
    await waitFor(() =>
      expect(api.pin).toHaveBeenCalledWith({ node_id: leaf.id }),
    );
    expect(
      screen.getByText("Leaf").closest("button")!.querySelector("button"),
    ).toBeNull();
  });
  it("loads Pinned lazily and navigates an active branch", async () => {
    api.pins.mockResolvedValue([
      {
        node_id: branch.id,
        title: "Branch",
        short_description: "About",
        icon_key: "life-branch",
        branch_theme_id: "neutral",
        child_count: 1,
        is_leaf: false,
        available: true,
        revision: 0,
      },
    ]);
    renderLife();
    fireEvent.click(await screen.findByRole("button", { name: "Pinned" }));
    const list = await screen.findByRole("list", { name: "Pinned Life nodes" });
    fireEvent.click(within(list).getByText("Branch").closest("button")!);
    expect(
      await screen.findByRole("heading", { name: "Branch" }),
    ).toBeInTheDocument();
  });
  it("keeps archived pinned nodes diagnosable and unpinnable", async () => {
    api.pins.mockResolvedValue([
      {
        node_id: leaf.id,
        title: "Archived Leaf",
        short_description: "",
        icon_key: "life-leaf",
        branch_theme_id: "neutral",
        child_count: 0,
        is_leaf: true,
        available: false,
        revision: 1,
      },
    ]);
    renderLife();
    fireEvent.click(await screen.findByRole("button", { name: "Pinned" }));
    expect(
      await screen.findByText(/Unavailable — this node is archived/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Unpin Archived Leaf" }),
    );
    await waitFor(() =>
      expect(api.unpin).toHaveBeenCalledWith({ node_id: leaf.id }),
    );
  });
  it("bounds child paging and announces the page relationship", async () => {
    api.browse.mockResolvedValue(
      projection(
        root,
        Array.from({ length: 8 }, (_, i) => node(`id-${i}`, `Child ${i}`)),
        0,
        2,
      ),
    );
    renderLife();
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next children" }));
    await waitFor(() =>
      expect(api.browse).toHaveBeenCalledWith({
        node_id: "life-root",
        child_page: 1,
      }),
    );
  });
  it("shows fallback recovery without a blank scene", async () => {
    api.browse.mockResolvedValue({
      ...projection(),
      resolved_from_fallback: true,
    });
    renderLife();
    expect(await screen.findByRole("status")).toHaveTextContent(
      /nearest available branch/,
    );
    expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument();
  });
  it("persists navigation only after a successful projection", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life" });
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({
          node_id: "life-root",
          mode: "browse",
          path_version: 1,
        }),
      ),
    );
  });
  it("keeps Browse, Edit, and Pinned as separate local modes", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life" });
    expect(screen.getByRole("button", { name: "Browse" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Pinned" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
  it("groups canonical related sources once and navigates stable identity", async () => {
    const navigate = vi.fn();
    api.related.mockResolvedValue([
      {
        id: "task-1",
        kind: "one_off",
        title: "Finished",
        group: "completed",
        local_date: "2026-08-01",
        series_id: null,
      },
      {
        id: "series-1",
        kind: "recurring",
        title: "Weekly",
        group: "active",
        local_date: "2026-08-03",
        series_id: "series-1",
      },
    ]);
    renderLife(navigate);
    fireEvent.click((await screen.findByText("Branch")).closest("button")!);
    expect(
      await screen.findByRole("heading", { name: "Active (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Completed (1)" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Weekly" })).toHaveLength(1);
    const panel = screen
      .getByRole("heading", { name: "Related tasks" })
      .closest("section")!;
    const accessibility = await axe.run(panel, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Weekly" }));
    expect(navigate).toHaveBeenCalledWith("2026-08-03", null, "series-1");
  });
});
