import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { StrictMode, type ComponentProps, type ReactNode } from "react";
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
  linkPanel: vi.fn(),
  linkSearch: vi.fn(),
  linkCreate: vi.fn(),
  linkRemove: vi.fn(),
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
  getLifeLinkPanel: api.linkPanel,
  searchLifeLinkTargets: api.linkSearch,
  createLifeLink: api.linkCreate,
  removeLifeLink: api.linkRemove,
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
  tags: [] as Array<{ id: string; name: string }>,
});
const root = node("life-root", "Life", 2);
const branch = node("00000000-0000-7000-8000-000000000001", "Branch", 1);
const leaf = node("00000000-0000-7000-8000-000000000002", "Leaf", 0);
const remoteLeaf = node(
  "00000000-0000-7000-8000-000000000003",
  "Remote Leaf",
  0,
);
const thirdLeaf = node("00000000-0000-7000-8000-000000000004", "Third Leaf", 0);
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
  props: Partial<ComponentProps<typeof LifeScreen>> = {},
  wrapper?: (child: ReactNode) => ReactNode,
) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const screen = (
    <QueryClientProvider client={client}>
      <LifeScreen
        anchorLocalDate="2026-08-04"
        {...(onTaskNavigate ? { onTaskNavigate } : {})}
        {...props}
      />
    </QueryClientProvider>
  );
  return { ...render(wrapper ? wrapper(screen) : screen), client };
};

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
    api.linkPanel.mockImplementation(({ source_node_id }: { source_node_id: string }) => {
      const target = source_node_id === leaf.id ? remoteLeaf : source_node_id === remoteLeaf.id ? thirdLeaf : null;
      return Promise.resolve({
        source: { node_id: source_node_id, title: source_node_id === leaf.id ? leaf.title : source_node_id === remoteLeaf.id ? remoteLeaf.title : thirdLeaf.title, eligible: true, ineligible_reason: null },
        outgoing: target ? [{ link_id: `link-${source_node_id}`, endpoint_node_id: target.id, title: target.title, short_description: target.short_description, icon_key: target.icon_key, document_kind: "basic_leaf", breadcrumb: `Life / ${target.title}`, availability: "active", created_at: "2026-08-07T00:00:00.000Z" }] : [],
        backlinks: [],
      });
    });
    api.linkSearch.mockResolvedValue([]);
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
  it("preserves exact stable-ID Reader history across A to B to C", async () => {
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      Promise.resolve(node_id === remoteLeaf.id ? projection(remoteLeaf, []) : node_id === thirdLeaf.id ? projection(thirdLeaf, []) : projection()),
    );
    renderLife();
    fireEvent.click((await screen.findByText("Leaf")).closest("button")!);
    const toRemote = await screen.findByRole("button", { name: "Open Remote Leaf in Life Reader" });
    fireEvent.click(toRemote);
    const remoteHeading = await screen.findByRole("heading", { name: "Remote Leaf", level: 1 });
    await waitFor(() => expect(remoteHeading).toHaveFocus());
    fireEvent.click(await screen.findByRole("button", { name: "Open Third Leaf in Life Reader" }));
    expect(await screen.findByRole("heading", { name: "Third Leaf", level: 1 })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    expect(await screen.findByRole("heading", { name: "Remote Leaf", level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    expect(await screen.findByRole("heading", { name: "Leaf", level: 1 })).toBeInTheDocument();
    expect(api.browse).toHaveBeenCalledWith({ node_id: remoteLeaf.id, child_page: 0 });
    expect(api.browse).toHaveBeenCalledWith({ node_id: thirdLeaf.id, child_page: 0 });
  });
  it("renders all twelve visible Reader tags and remains axe clean", async () => {
    const tags = Array.from({ length: 12 }, (_, index) => ({
      id: `tag-${index + 1}`,
      name: `Tag ${index + 1}`,
    }));
    const taggedLeaf = { ...leaf, tags };
    api.browse.mockResolvedValue(projection(root, [branch, taggedLeaf]));
    const { container } = renderLife();
    fireEvent.click((await screen.findByText("Leaf")).closest("button")!);
    await screen.findByRole("heading", { name: "Reader" });
    for (const tag of tags) expect(screen.getByText(`#${tag.name}`)).toBeInTheDocument();
    expect((await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    })).violations).toEqual([]);
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
  it("shows tags only on available Pinned cards and remains axe clean", async () => {
    api.pins.mockResolvedValue([
      {
        node_id: branch.id,
        title: "Available Branch",
        short_description: "About",
        icon_key: "life-branch",
        branch_theme_id: "neutral",
        child_count: 1,
        is_leaf: false,
        available: true,
        revision: 0,
        tags: [{ id: "research", name: "Research" }],
      },
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
        tags: [{ id: "private", name: "Archived Secret" }],
      },
    ]);
    const { container } = renderLife();
    fireEvent.click(await screen.findByRole("button", { name: "Pinned" }));
    const list = await screen.findByRole("list", { name: "Pinned Life nodes" });
    const availableCard = within(list).getByText("Available Branch").closest("button")!;
    const unavailableCard = within(list).getByText("Archived Leaf").closest("button")!;
    expect(within(availableCard).getByText("#Research")).toBeInTheDocument();
    expect(within(unavailableCard).queryByText("#Archived Secret")).not.toBeInTheDocument();
    expect((await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    })).violations).toEqual([]);
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
        navigation_local_date: "2026-08-01",
        series_id: null,
      },
      {
        id: "series-1",
        kind: "recurring",
        title: "Weekly",
        group: "active",
        navigation_local_date: "2026-08-05",
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
    expect(api.related).toHaveBeenCalledWith(branch.id, "2026-08-04");
    expect(navigate).toHaveBeenCalledWith("2026-08-05", null, "series-1");
  });
  it("settles Browse once and treats a new ID as a new delivery", async () => {
    const settled = vi.fn();
    const first = {
      requestId: "browse-a",
      nodeId: root.id,
      mode: "browse" as const,
    };
    const view = renderLife(undefined, {
      entryRequest: first,
      onEntryRequestSettled: settled,
    });
    await waitFor(() => expect(settled).toHaveBeenCalledWith("browse-a"));
    view.rerender(
      <QueryClientProvider client={view.client}>
        <LifeScreen
          anchorLocalDate="2026-08-04"
          entryRequest={{ ...first }}
          onEntryRequestSettled={settled}
        />
      </QueryClientProvider>,
    );
    expect(settled).toHaveBeenCalledTimes(1);
    view.rerender(
      <QueryClientProvider client={view.client}>
        <LifeScreen
          anchorLocalDate="2026-08-04"
          entryRequest={{ ...first, requestId: "browse-b" }}
          onEntryRequestSettled={settled}
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(settled).toHaveBeenCalledWith("browse-b"));
    expect(settled).toHaveBeenCalledTimes(2);
  });
  it("waits for a remote Browse projection and settles backend fallback", async () => {
    let resolveRemote!: (value: LifeBrowseProjection) => void;
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      node_id === branch.id
        ? new Promise((resolve) => {
            resolveRemote = resolve;
          })
        : Promise.resolve(projection()),
    );
    const settled = vi.fn();
    const view = renderLife(undefined, {
      entryRequest: {
        requestId: "remote-browse",
        nodeId: branch.id,
        mode: "browse",
      },
      onEntryRequestSettled: settled,
    });
    await waitFor(() =>
      expect(api.browse).toHaveBeenCalledWith({ node_id: branch.id, child_page: 0 }),
    );
    expect(settled).not.toHaveBeenCalled();
    resolveRemote(projection(branch, [leaf]));
    await waitFor(() => expect(settled).toHaveBeenCalledWith("remote-browse"));
    view.unmount();

    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      Promise.resolve(
        node_id === branch.id
          ? { ...projection(), resolved_from_fallback: true }
          : projection(),
      ),
    );
    const fallbackSettled = vi.fn();
    renderLife(undefined, {
      entryRequest: {
        requestId: "browse-fallback",
        nodeId: branch.id,
        mode: "browse",
      },
      onEntryRequestSettled: fallbackSettled,
    });
    await waitFor(() =>
      expect(fallbackSettled).toHaveBeenCalledWith("browse-fallback"),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      /nearest available branch/,
    );
  });
  it("opens direct and remote Reader requests and settles each once", async () => {
    const directSettled = vi.fn();
    const direct = renderLife(undefined, {
      entryRequest: {
        requestId: "direct-reader",
        nodeId: leaf.id,
        mode: "reader",
      },
      onEntryRequestSettled: directSettled,
    });
    expect(await screen.findByRole("heading", { name: "Reader" })).toBeInTheDocument();
    expect(await screen.findByText("Leaf")).toBeInTheDocument();
    expect(directSettled).toHaveBeenCalledTimes(1);
    direct.unmount();

    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      Promise.resolve(
        node_id === remoteLeaf.id ? projection(remoteLeaf, []) : projection(),
      ),
    );
    const remoteSettled = vi.fn();
    renderLife(undefined, {
      entryRequest: {
        requestId: "remote-reader",
        nodeId: remoteLeaf.id,
        mode: "reader",
      },
      onEntryRequestSettled: remoteSettled,
    });
    expect(await screen.findByRole("heading", { name: "Reader" })).toBeInTheDocument();
    expect(await screen.findByText("Remote Leaf")).toBeInTheDocument();
    expect(remoteSettled).toHaveBeenCalledTimes(1);
    const accessibility = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });
  it("settles invalid Reader targets in Browse and retries after query error", async () => {
    const nonLeafSettled = vi.fn();
    const nonLeaf = renderLife(undefined, {
      entryRequest: {
        requestId: "non-leaf-reader",
        nodeId: branch.id,
        mode: "reader",
      },
      onEntryRequestSettled: nonLeafSettled,
    });
    await waitFor(() =>
      expect(nonLeafSettled).toHaveBeenCalledWith("non-leaf-reader"),
    );
    expect(screen.queryByRole("heading", { name: "Reader" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Branch" })).toBeInTheDocument();
    nonLeaf.unmount();

    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) => {
      if (node_id === remoteLeaf.id) return Promise.reject(new Error("offline"));
      return Promise.resolve(projection());
    });
    const retrySettled = vi.fn();
    const retry = renderLife(undefined, {
      entryRequest: {
        requestId: "reader-retry",
        nodeId: remoteLeaf.id,
        mode: "reader",
      },
      onEntryRequestSettled: retrySettled,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Life System could not be loaded",
    );
    expect(retrySettled).not.toHaveBeenCalled();
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      Promise.resolve(
        node_id === remoteLeaf.id ? projection(remoteLeaf, []) : projection(),
      ),
    );
    await retry.client.refetchQueries({
      queryKey: ["life", "browse", remoteLeaf.id, 0],
    });
    await waitFor(() => expect(retrySettled).toHaveBeenCalledWith("reader-retry"));
    expect(await screen.findByRole("heading", { name: "Reader" })).toBeInTheDocument();
  });
  it("lets manual Life actions supersede a pending remote request", async () => {
    let resolveRemote!: (value: LifeBrowseProjection) => void;
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      node_id === remoteLeaf.id
        ? new Promise((resolve) => {
            resolveRemote = resolve;
          })
        : Promise.resolve(projection()),
    );
    const settled = vi.fn();
    renderLife(undefined, {
      entryRequest: {
        requestId: "manual-wins",
        nodeId: remoteLeaf.id,
        mode: "reader",
      },
      onEntryRequestSettled: settled,
    });
    await waitFor(() =>
      expect(api.browse).toHaveBeenCalledWith({
        node_id: remoteLeaf.id,
        child_page: 0,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Pinned" }));
    expect(settled).toHaveBeenCalledWith("manual-wins");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pinned" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    resolveRemote(projection(remoteLeaf, []));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pinned" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.queryByRole("heading", { name: "Reader" })).not.toBeInTheDocument();
    expect(settled).toHaveBeenCalledTimes(1);
  });
  it("does not duplicate Reader history for a reallocated request or StrictMode", async () => {
    const settled = vi.fn();
    const request = {
      requestId: "history-once",
      nodeId: leaf.id,
      mode: "reader" as const,
    };
    const view = renderLife(undefined, {
      entryRequest: request,
      onEntryRequestSettled: settled,
    });
    await screen.findByRole("heading", { name: "Reader" });
    view.rerender(
      <QueryClientProvider client={view.client}>
        <LifeScreen
          anchorLocalDate="2026-08-04"
          entryRequest={{ ...request }}
          onEntryRequestSettled={settled}
        />
      </QueryClientProvider>,
    );
    expect(settled).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    expect(await screen.findByRole("heading", { name: "Life" })).toBeInTheDocument();
    view.unmount();

    const strictSettled = vi.fn();
    renderLife(
      undefined,
      {
        entryRequest: {
          requestId: "strict-reader",
          nodeId: leaf.id,
          mode: "reader",
        },
        onEntryRequestSettled: strictSettled,
      },
      (child) => <StrictMode>{child}</StrictMode>,
    );
    await screen.findByRole("heading", { name: "Reader" });
    expect(strictSettled).toHaveBeenCalledTimes(1);
  });
});
