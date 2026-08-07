import {
  act,
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
  graph: vi.fn(),
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
  getLifeGraphProjection: api.graph,
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
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
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
  it("keeps Back authoritative when a linked Reader projection resolves late", async () => {
    const remote = deferred<LifeBrowseProjection>();
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      node_id === remoteLeaf.id ? remote.promise : Promise.resolve(projection()),
    );
    renderLife();
    fireEvent.click((await screen.findByText("Leaf")).closest("button")!);
    fireEvent.click(await screen.findByRole("button", { name: "Open Remote Leaf in Life Reader" }));
    await waitFor(() =>
      expect(api.browse).toHaveBeenCalledWith({ node_id: remoteLeaf.id, child_page: 0 }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    expect(await screen.findByRole("heading", { name: "Life" })).toBeInTheDocument();
    const branchButton = screen.getByText("Branch").closest("button")!;
    const browseControlsWereEnabled = !branchButton.disabled;
    const browseBackWasDisabled = screen.getByRole("button", { name: /^← Back$/ }).hasAttribute("disabled");

    await act(async () => remote.resolve(projection(remoteLeaf, [])));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "Remote Leaf", level: 1 })).not.toBeInTheDocument();
    expect(document.activeElement).not.toHaveTextContent("Remote Leaf");
    expect(browseControlsWereEnabled).toBe(true);
    expect(browseBackWasDisabled).toBe(true);
    expect(screen.getByRole("button", { name: /^← Back$/ })).toBeDisabled();
  });
  it("keeps a newer Browse destination when a stale linked Reader projection resolves", async () => {
    const remote = deferred<LifeBrowseProjection>();
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      node_id === remoteLeaf.id
        ? remote.promise
        : Promise.resolve(node_id === branch.id ? projection(branch, [leaf]) : projection()),
    );
    renderLife();
    fireEvent.click((await screen.findByText("Leaf")).closest("button")!);
    fireEvent.click(await screen.findByRole("button", { name: "Open Remote Leaf in Life Reader" }));
    await waitFor(() =>
      expect(api.browse).toHaveBeenCalledWith({ node_id: remoteLeaf.id, child_page: 0 }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    const branchButton = (await screen.findByText("Branch")).closest("button")!;
    expect(branchButton).toBeEnabled();
    fireEvent.click(branchButton);
    expect(await screen.findByRole("heading", { name: "Branch" })).toBeInTheDocument();

    await act(async () => remote.resolve(projection(remoteLeaf, [])));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Branch" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "Remote Leaf", level: 1 })).not.toBeInTheDocument();
  });
  it("silences a stale linked Reader rejection after Back", async () => {
    const remote = deferred<LifeBrowseProjection>();
    api.browse.mockImplementation(({ node_id }: { node_id: string | null }) =>
      node_id === remoteLeaf.id ? remote.promise : Promise.resolve(projection()),
    );
    renderLife();
    fireEvent.click((await screen.findByText("Leaf")).closest("button")!);
    fireEvent.click(await screen.findByRole("button", { name: "Open Remote Leaf in Life Reader" }));
    await waitFor(() =>
      expect(api.browse).toHaveBeenCalledWith({ node_id: remoteLeaf.id, child_page: 0 }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    expect(await screen.findByRole("heading", { name: "Life" })).toBeInTheDocument();

    await act(async () => remote.reject(new Error("late failure")));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/unavailable|late failure/i)).not.toBeInTheDocument();
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
  it("returns an external Reader request to Browse even when Reader was the saved mode", async () => {
    api.browse.mockResolvedValue({
      ...projection(leaf, []),
      preferred_mode: "reader",
    });
    renderLife(undefined, {
      entryRequest: {
        requestId: "saved-reader-external-entry",
        nodeId: leaf.id,
        mode: "reader",
      },
      onEntryRequestSettled: vi.fn(),
    });
    await screen.findByRole("heading", { name: "Reader" });
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    expect(await screen.findByRole("button", { name: "Pinned" })).toBeInTheDocument();
  });
});

describe("Life Graph", () => {
  const graphProjection = {
    root_id: "life-root",
    tree_revision: 2,
    nodes: [
      {
        id: "life-root", parent_id: null, title: "Life", icon_key: "life-branch",
        sort_key: 0, depth: 0, is_leaf: false, document_kind: null,
        outgoing_link_count: 0, incoming_link_count: 0,
      },
      {
        id: branch.id, parent_id: "life-root", title: "Branch", icon_key: "life-branch",
        sort_key: 1, depth: 1, is_leaf: false, document_kind: null,
        outgoing_link_count: 0, incoming_link_count: 0,
      },
      {
        id: leaf.id, parent_id: "life-root", title: "Leaf", icon_key: "life-leaf",
        sort_key: 2, depth: 1, is_leaf: true, document_kind: "basic_leaf" as const,
        outgoing_link_count: 0, incoming_link_count: 0,
      },
    ],
    links: [] as Array<{
      link_id: string;
      source_node_id: string;
      target_node_id: string;
      availability: "active" | "archived" | "unavailable";
    }>,
  };
  const graphSelector = () => screen.getByRole("combobox", { name: "Life node" });

  beforeEach(() => {
    // Graph hand-off resolves the exact stable node ID, so the fixture must answer per node.
    api.browse
      .mockReset()
      .mockImplementation(({ node_id }: { node_id: string | null }) =>
        Promise.resolve(
          node_id === leaf.id
            ? projection(leaf, [])
            : node_id === branch.id
              ? projection(branch, [leaf])
              : projection(),
        ),
      );
    api.pins.mockReset().mockResolvedValue([]);
    api.save.mockReset().mockResolvedValue(undefined);
    api.graph.mockReset().mockResolvedValue(graphProjection);
  });

  it("opens transiently and is never written to the persisted Life mode", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    await waitFor(() => expect(api.save).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    expect(await screen.findByRole("heading", { name: "Life graph" })).toBeInTheDocument();

    // The Rust validator only accepts browse/edit/pinned/reader, so "graph" must never reach it.
    for (const call of api.save.mock.calls) expect(call[0].mode).not.toBe("graph");
    expect(api.save.mock.calls.map(call => call[0].mode)).toContain("browse");
  });

  it("closes back to the untouched underlying mode", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    fireEvent.click(screen.getByRole("button", { name: "Pinned" }));
    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });

    fireEvent.click(screen.getByRole("button", { name: "Close graph" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Life graph" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens a documented leaf in the Reader without appending linked-Reader history", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });
    fireEvent.change(graphSelector(), { target: { value: leaf.id } });
    fireEvent.click(screen.getByRole("button", { name: "Open Leaf in Life Reader" }));

    // A documented leaf reaches the Reader, resolved by exact stable ID.
    expect(await screen.findByRole("heading", { name: "Reader" })).toBeInTheDocument();
    expect(api.browse).toHaveBeenCalledWith({ node_id: leaf.id, child_page: 0 });

    // Graph is top-level navigation: leaving the Reader must not unwind into a graph entry.
    fireEvent.click(screen.getByRole("button", { name: /Back to Life Browse/ }));
    await screen.findByRole("button", { name: "Pinned" });
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();
  });

  it("opens a branch in Browse without appending Life history", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });
    fireEvent.change(graphSelector(), { target: { value: branch.id } });
    fireEvent.click(screen.getByRole("button", { name: "Open Branch in Life Browse" }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Life graph" })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "Reader" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Branch" })).toBeInTheDocument();

    // Graph pushes no history entry, so Back ascends to the parent rather than unwinding a graph
    // step. Asserting the destination is load-bearing; Back is legitimately enabled on a branch
    // because it always has a parent.
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(await screen.findByRole("heading", { name: "Life" })).toBeInTheDocument();
  });

  it("fails safely when a Browse target no longer resolves to the requested node", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });
    fireEvent.change(graphSelector(), { target: { value: branch.id } });

    // The branch was archived after the graph projection was taken, so Life resolves the root
    // instead. Committing navigation first would silently open that fallback node.
    api.browse.mockResolvedValue({ ...projection(), resolved_from_fallback: true });
    fireEvent.click(screen.getByRole("button", { name: "Open Branch in Life Browse" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That Life node is unavailable.");
    // Graph stays open and no fallback node was opened.
    expect(screen.getByRole("heading", { name: "Life graph" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reader" })).not.toBeInTheDocument();

    // Closing the graph reveals the untouched Life state: still the root, and no history entry.
    fireEvent.click(screen.getByRole("button", { name: "Close graph" }));
    expect(await screen.findByRole("button", { name: "← Back" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Branch" })).not.toBeInTheDocument();
  });

  it("fails safely when a Reader target no longer resolves to the requested node", async () => {
    renderLife();
    await screen.findByRole("heading", { name: "Life System" });

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });

    // The node vanished between projection and hand-off, so Life resolves something else.
    api.browse.mockResolvedValue({ ...projection(), resolved_from_fallback: true });
    fireEvent.change(graphSelector(), { target: { value: leaf.id } });
    fireEvent.click(screen.getByRole("button", { name: "Open Leaf in Life Reader" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That Life node is unavailable.");
    // It refuses rather than opening the wrong node.
    expect(screen.queryByRole("heading", { name: "Reader" })).not.toBeInTheDocument();
  });

  it("yields to an external entry request and does not reappear afterwards", async () => {
    const settled = vi.fn();
    const view = renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });

    view.rerender(
      <QueryClientProvider client={view.client}>
        <LifeScreen
          anchorLocalDate="2026-08-04"
          entryRequest={{ requestId: "graph-yield", nodeId: leaf.id, mode: "browse" }}
          onEntryRequestSettled={settled}
        />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Life graph" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Graph" })).toHaveAttribute("aria-pressed", "false");
  });

  it("does not survive a remount", async () => {
    const first = renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await screen.findByRole("heading", { name: "Life graph" });
    first.unmount();

    renderLife();
    await screen.findByRole("heading", { name: "Life System" });
    expect(screen.queryByRole("heading", { name: "Life graph" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Graph" })).toHaveAttribute("aria-pressed", "false");
  });
});
