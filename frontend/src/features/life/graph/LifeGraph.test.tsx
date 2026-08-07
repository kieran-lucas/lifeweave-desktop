import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifeGraphWorkspace } from "./LifeGraphWorkspace";
import { buildLifeTreeLayout } from "../lifeTreeLayout";
import { invalidateLifeLinkMutations } from "../links/lifeLinkQueries";

const api = vi.hoisted(() => ({ graph: vi.fn() }));
vi.mock("../../../ipc/commands", () => ({ getLifeGraphProjection: api.graph }));

const ROOT = "life-root";
const WORK = "00000000-0000-7000-8000-000000000101";
const HEALTH = "00000000-0000-7000-8000-000000000102";
const PLAN = "00000000-0000-7000-8000-000000000103";

const node = (
  id: string,
  parent_id: string | null,
  title: string,
  overrides: Partial<{
    depth: number;
    sort_key: number;
    is_leaf: boolean;
    outgoing_link_count: number;
    incoming_link_count: number;
  }> = {},
) => ({
  id,
  parent_id,
  title,
  icon_key: "life-leaf",
  sort_key: 1,
  depth: 0,
  is_leaf: true,
  outgoing_link_count: 0,
  incoming_link_count: 0,
  ...overrides,
});

/** Work → Health is the one explicit link; Work also parents Plan. */
const projection = () => ({
  root_id: ROOT,
  tree_revision: 12,
  nodes: [
    node(ROOT, null, "Life", { depth: 0, is_leaf: false }),
    node(WORK, ROOT, "Work", { depth: 1, sort_key: 1, is_leaf: false, outgoing_link_count: 1 }),
    node(PLAN, WORK, "Kế hoạch", { depth: 2, sort_key: 1 }),
    node(HEALTH, ROOT, "Health", { depth: 1, sort_key: 2, incoming_link_count: 1 }),
  ],
  links: [{ link_id: "link-1", source_node_id: WORK, target_node_id: HEALTH }],
});

const mount = (onOpenNode = vi.fn(), onClose = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    ...render(
      <QueryClientProvider client={client}>
        <LifeGraphWorkspace onOpenNode={onOpenNode} onClose={onClose} />
      </QueryClientProvider>,
    ),
    client,
    onOpenNode,
    onClose,
  };
};

describe("LifeGraphWorkspace", () => {
  beforeEach(() => {
    api.graph.mockReset().mockResolvedValue(projection());
  });

  it("draws the hierarchy and explicit links on a decorative, non-focusable surface", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });

    const svg = view.container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg.querySelectorAll("[tabindex]")).toHaveLength(0);

    // Three hierarchy edges (root→Work, Work→Plan, root→Health) and exactly one link edge.
    // Scoped to direct children so the arrowhead marker inside `<defs>` is not counted.
    const paths = Array.from(svg.querySelectorAll(":scope > path[d]"));
    expect(paths).toHaveLength(4);

    // Every node is reachable as a real button, and the counts are spoken, never colour-only.
    expect(
      screen.getByRole("button", {
        name: "Work. Level 2. Branch. 1 outgoing link, 0 backlinks.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Health. Level 2. Leaf. 0 outgoing links, 1 backlink.",
      }),
    ).toBeInTheDocument();
  });

  it("gives every drawn relationship a text counterpart in the connection list", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /^Work\./ }));

    const outgoing = screen.getByRole("region", { name: /Outgoing links/ });
    expect(within(outgoing).getByRole("heading", { name: "Outgoing links (1)" })).toBeInTheDocument();
    expect(
      within(outgoing).getByRole("button", { name: "Outgoing link: Health. Select in the graph." }),
    ).toBeInTheDocument();

    const children = screen.getByRole("region", { name: /Children/ });
    expect(within(children).getByRole("button", { name: /^Child: Kế hoạch/ })).toBeInTheDocument();

    const parent = screen.getByRole("region", { name: /Parent/ });
    expect(within(parent).getByRole("button", { name: /^Parent: Life/ })).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Backlinks (0)" })).toBeInTheDocument();

    // Selecting the far end of a link moves the inspector there and shows the reciprocal backlink.
    fireEvent.click(
      within(outgoing).getByRole("button", { name: "Outgoing link: Health. Select in the graph." }),
    );
    expect(screen.getByRole("heading", { name: "Backlinks (1)" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Backlink: Work. Select in the graph." }),
    ).toBeInTheDocument();
  });

  it("counts every projected relationship, so no drawn edge is missing from the text", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });
    const value = projection();

    const drawnEdges = view.container.querySelectorAll("svg > path[d]").length;
    const hierarchyEdges = value.nodes.filter(entry => entry.parent_id !== null).length;
    expect(drawnEdges).toBe(hierarchyEdges + value.links.length);

    // Walking every node through the selector must surface each edge as text exactly twice — once
    // from each endpoint — so a drawn edge with no counterpart is impossible.
    let described = 0;
    for (const entry of value.nodes) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${entry.title}\\.`) }));
      for (const label of ["Parent", "Children", "Outgoing links", "Backlinks"]) {
        const region = screen.getByRole("region", { name: new RegExp(`^${label}`) });
        described += within(region).queryAllByRole("button").length;
      }
    }
    expect(described).toBe(drawnEdges * 2);
  });

  it("hands off to Life without opening the Reader, and closes on request", async () => {
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: /^Health\./ }));
    fireEvent.click(screen.getByRole("button", { name: "Open Health in Life" }));
    expect(view.onOpenNode).toHaveBeenCalledExactlyOnceWith(HEALTH);

    fireEvent.click(screen.getByRole("button", { name: "Close graph" }));
    expect(view.onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the Rust-owned bound refusal as text instead of a partial graph", async () => {
    api.graph.mockRejectedValue({
      code: "Validation",
      message: "This Life tree is too large for the graph explorer (500 node maximum).",
    });
    const view = mount();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This Life tree is too large for the graph explorer (500 node maximum).",
    );
    expect(view.container.querySelector("svg")).toBeNull();
    expect(screen.queryByRole("button", { name: /Level/ })).not.toBeInTheDocument();
    expect((await axe.run(view.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("keeps no selection across a remount", async () => {
    const first = mount();
    fireEvent.click(await screen.findByRole("button", { name: /^Health\./ }));
    expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
    first.unmount();

    mount();
    await screen.findByRole("heading", { name: "Life graph" });
    // Selection falls back to the root, never to the previously inspected node.
    expect(screen.getByRole("heading", { name: "Life" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Health" })).not.toBeInTheDocument();
  });

  it("has zero applicable axe violations and keyboard parity", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });

    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("tabindex", "-1");
      expect(button.getAttribute("aria-label") ?? button.textContent).toBeTruthy();
    }
    const accessibility = await axe.run(view.container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });
});

describe("Life graph layout", () => {
  it("produces identical geometry for the same projection", () => {
    const first = buildLifeTreeLayout(projection().nodes);
    const second = buildLifeTreeLayout(projection().nodes);
    expect([...first.points.entries()]).toEqual([...second.points.entries()]);
    expect(first.links).toEqual(second.links);
    expect([first.width, first.height]).toEqual([second.width, second.height]);
  });

  it("positions from parent edges only, so an explicit link never moves a node", () => {
    // The projection's link list is not an input to the layout at all: same nodes, same geometry.
    const withoutLinks = buildLifeTreeLayout(projection().nodes);
    const reordered = buildLifeTreeLayout([...projection().nodes].reverse());
    expect([...withoutLinks.points.entries()].sort()).toEqual(
      [...reordered.points.entries()].sort(),
    );
  });
});

describe("Life graph invalidation", () => {
  it("refreshes the graph when a link is created or removed", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);
    await invalidateLifeLinkMutations(client, WORK, HEALTH);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["life", "graph"] });
  });
});
