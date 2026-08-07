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
const EMPTY = "00000000-0000-7000-8000-000000000104";

type DocumentKind = "basic_leaf" | "narrative_canvas" | null;

const node = (
  id: string,
  parent_id: string | null,
  title: string,
  overrides: Partial<{
    depth: number;
    sort_key: number;
    is_leaf: boolean;
    document_kind: DocumentKind;
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
  document_kind: null as DocumentKind,
  outgoing_link_count: 0,
  incoming_link_count: 0,
  ...overrides,
});

/**
 * Work (branch) → Plan (Basic Leaf); Health is a Narrative Canvas leaf; Empty carries no document.
 * Plan → Health is an active explicit link; Plan → Empty is an unavailable one.
 */
const projection = () => ({
  root_id: ROOT,
  tree_revision: 12,
  nodes: [
    node(ROOT, null, "Life", { depth: 0, is_leaf: false }),
    node(WORK, ROOT, "Work", { depth: 1, sort_key: 1, is_leaf: false }),
    node(PLAN, WORK, "Kế hoạch", {
      depth: 2,
      sort_key: 1,
      document_kind: "basic_leaf",
      outgoing_link_count: 2,
    }),
    node(HEALTH, ROOT, "Health", {
      depth: 1,
      sort_key: 2,
      document_kind: "narrative_canvas",
      incoming_link_count: 1,
    }),
    node(EMPTY, ROOT, "Scratch", { depth: 1, sort_key: 3, incoming_link_count: 1 }),
  ],
  links: [
    { link_id: "link-1", source_node_id: PLAN, target_node_id: HEALTH, availability: "active" },
    { link_id: "link-2", source_node_id: PLAN, target_node_id: EMPTY, availability: "unavailable" },
  ],
});

const mount = (props: Partial<Parameters<typeof LifeGraphWorkspace>[0]> = {}) => {
  const onOpenNode = props.onOpenNode ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    ...render(
      <QueryClientProvider client={client}>
        <LifeGraphWorkspace
          {...props}
          onOpenNode={onOpenNode}
          onClose={onClose}
        />
      </QueryClientProvider>,
    ),
    client,
    onOpenNode,
    onClose,
  };
};

const selector = () => screen.getByRole("combobox", { name: "Life node" });

describe("LifeGraphWorkspace semantic surface", () => {
  beforeEach(() => {
    api.graph.mockReset().mockResolvedValue(projection());
  });

  it("exposes every projected node through one standard selector in tree order", async () => {
    mount();
    await screen.findByRole("heading", { name: "Life graph" });

    const options = within(selector()).getAllByRole("option");
    expect(options.map(option => option.getAttribute("value"))).toEqual([
      ROOT,
      WORK,
      PLAN,
      HEALTH,
      EMPTY,
    ]);
    // Node type is stated in words, so it is never carried by glyph or colour alone.
    expect(options.map(option => option.textContent)).toEqual([
      "Life (Branch)",
      "— Work (Branch)",
      "— — Kế hoạch (Basic Leaf)",
      "— Health (Narrative Canvas)",
      "— Scratch (Empty leaf)",
    ]);
  });

  it("keeps the visual layer decorative rather than a keyboard surface", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });

    const svg = view.container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");

    const marks = view.container.querySelectorAll("[data-life-graph-id]");
    expect(marks).toHaveLength(5);
    for (const mark of marks) {
      expect(mark).toHaveAttribute("aria-hidden", "true");
      expect(mark.tagName).not.toBe("BUTTON");
      expect(mark).not.toHaveAttribute("tabindex");
    }

    // The drawn canvas contributes no tab stops at all.
    const canvas = view.container.querySelector("svg")!.parentElement!;
    expect(
      canvas.querySelectorAll("button, select, a[href], input, [tabindex]:not([tabindex='-1'])"),
    ).toHaveLength(0);
  });

  it("keeps the drawn canvas at zero tab stops however many nodes are projected", async () => {
    const many = projection();
    // 200 extra leaves under the root: 200 more drawn marks, and 200 more selector options.
    for (let index = 0; index < 200; index += 1)
      many.nodes.push(node(`bulk-${index}`, ROOT, `Bulk ${index}`, { depth: 1, sort_key: 9 }));
    api.graph.mockResolvedValue(many);

    const view = mount({ currentNodeId: HEALTH });
    await screen.findByRole("heading", { name: "Life graph" });

    expect(within(selector()).getAllByRole("option")).toHaveLength(205);
    expect(view.container.querySelectorAll("[data-life-graph-id]")).toHaveLength(205);

    const canvas = view.container.querySelector("svg")!.parentElement!;
    expect(
      canvas.querySelectorAll("button, select, a[href], input, [tabindex]:not([tabindex='-1'])"),
    ).toHaveLength(0);

    // With a low-degree node selected, the whole workspace stays a small keyboard surface. The
    // connection list is bounded by the selected node's own degree, exactly like the Links panel;
    // it is not a function of graph size.
    const focusable = view.container.querySelectorAll(
      "button, select, a[href], input, [tabindex]:not([tabindex='-1'])",
    );
    expect(focusable.length).toBeLessThan(20);
  });

  it("keeps visual and semantic selection synchronised", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });

    fireEvent.change(selector(), { target: { value: HEALTH } });
    expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
    expect(
      view.container.querySelector(`[data-life-graph-id="${HEALTH}"]`),
    ).toHaveAttribute("data-selected", "true");

    fireEvent.click(view.container.querySelector(`[data-life-graph-id="${PLAN}"]`)!);
    expect(selector()).toHaveValue(PLAN);
    expect(screen.getByRole("heading", { name: "Kế hoạch" })).toBeInTheDocument();
  });

  it("lists every explicit link exactly once with its availability", async () => {
    mount();
    await screen.findByRole("heading", { name: "Life graph" });

    const region = screen.getByRole("region", { name: /All explicit links/ });
    expect(within(region).getByRole("heading", { name: "All explicit links (2)" })).toBeInTheDocument();

    const rows = within(region).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(
      rows.map(row => within(row).getAllByRole("cell").map(cell => cell.textContent)),
    ).toEqual([
      ["Kế hoạch", "Health", "Available"],
      ["Kế hoạch", "Scratch", "Unavailable"],
    ]);

    // Selecting an endpoint from the list moves the inspector without iterating every node.
    fireEvent.click(within(rows[1]!).getByRole("button", { name: /Select target Scratch/ }));
    expect(screen.getByRole("heading", { name: "Scratch" })).toBeInTheDocument();
  });

  it("represents an unavailable link distinctly in the drawing and in text", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });

    const edges = Array.from(view.container.querySelectorAll("svg > path[data-unavailable]"));
    expect(edges.map(edge => edge.getAttribute("data-unavailable"))).toEqual(["false", "true"]);
    // Distinct class, not merely a distinct colour.
    expect(edges[0]!.getAttribute("class")).not.toBe(edges[1]!.getAttribute("class"));

    fireEvent.change(selector(), { target: { value: PLAN } });
    const outgoing = screen.getByRole("region", { name: /Outgoing links/ });
    expect(
      within(outgoing).getByRole("button", {
        name: "Outgoing link, Unavailable: Scratch. Select in the graph.",
      }),
    ).toBeInTheDocument();
    expect(
      within(outgoing).getByRole("button", {
        name: "Outgoing link, Available: Health. Select in the graph.",
      }),
    ).toBeInTheDocument();
  });

  it("opens on the current Life node and falls back to the root", async () => {
    const focused = mount({ currentNodeId: HEALTH });
    await screen.findByRole("heading", { name: "Life graph" });
    expect(selector()).toHaveValue(HEALTH);
    expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
    focused.unmount();

    mount({ currentNodeId: "00000000-0000-7000-8000-00000000dead" });
    await screen.findByRole("heading", { name: "Life graph" });
    expect(selector()).toHaveValue(ROOT);
  });

  it("routes Open in Life by node kind", async () => {
    const view = mount({ currentNodeId: PLAN });
    await screen.findByRole("heading", { name: "Life graph" });

    // A documented leaf opens the Reader.
    fireEvent.click(screen.getByRole("button", { name: "Open Kế hoạch in Life Reader" }));
    expect(view.onOpenNode).toHaveBeenLastCalledWith(PLAN, "reader");

    // A branch opens Browse.
    fireEvent.change(selector(), { target: { value: WORK } });
    fireEvent.click(screen.getByRole("button", { name: "Open Work in Life Browse" }));
    expect(view.onOpenNode).toHaveBeenLastCalledWith(WORK, "browse");

    // An empty or otherwise unavailable leaf opens Browse.
    fireEvent.change(selector(), { target: { value: EMPTY } });
    fireEvent.click(screen.getByRole("button", { name: "Open Scratch in Life Browse" }));
    expect(view.onOpenNode).toHaveBeenLastCalledWith(EMPTY, "browse");

    // A Narrative Canvas leaf is documented and therefore also opens the Reader.
    fireEvent.change(selector(), { target: { value: HEALTH } });
    fireEvent.click(screen.getByRole("button", { name: "Open Health in Life Reader" }));
    expect(view.onOpenNode).toHaveBeenLastCalledWith(HEALTH, "reader");
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
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      (await axe.run(view.container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("keeps no selection across a remount", async () => {
    const first = mount();
    fireEvent.change(await screen.findByRole("combobox", { name: "Life node" }), {
      target: { value: HEALTH },
    });
    expect(screen.getByRole("heading", { name: "Health" })).toBeInTheDocument();
    first.unmount();

    mount();
    await screen.findByRole("heading", { name: "Life graph" });
    expect(selector()).toHaveValue(ROOT);
  });

  it("has zero applicable axe violations", async () => {
    const view = mount();
    await screen.findByRole("heading", { name: "Life graph" });

    const accessibility = await axe.run(view.container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it("closes on request", async () => {
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Close graph" }));
    expect(view.onClose).toHaveBeenCalledTimes(1);
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
