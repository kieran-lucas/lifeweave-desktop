import { hierarchy, tree } from "d3-hierarchy";

/**
 * Deterministic tidy-tree geometry for the Life hierarchy.
 *
 * Extracted from `LifeEditWorkspace` once the Life Graph explorer became a second concrete use.
 * The defaults reproduce Life Edit's card geometry exactly, so its layout is unchanged.
 *
 * Positions come from parent/child edges only. Explicit Life links are a cyclic overlay and are
 * never fed into `hierarchy()`; callers draw them as a separate pass over `points`.
 */

export type LayoutPoint = { x: number; y: number; width: number; height: number };
export type LayoutEdge = { id: string; d: string };
export type TreeLayout = {
  points: Map<string, LayoutPoint>;
  links: LayoutEdge[];
  width: number;
  height: number;
};

/** The structural shape any Life projection node satisfies. */
export type LayoutNode = { id: string; parent_id: string | null; sort_key: number; title?: string };

export type TreeLayoutGeometry = {
  /** Direction in which each generation grows. */
  orientation?: "vertical" | "horizontal";
  /** d3 `nodeSize`: sibling separation and depth separation. */
  nodeSize: [number, number];
  /** Canvas padding applied to every point. */
  offsetX: number;
  offsetY: number;
  /** Where an edge leaves its source: half the card width, and the card height. */
  anchorX: number;
  anchorY: number;
  minWidth: number;
  minHeight: number;
  widthPadding: number;
  heightPadding: number;
  /** Canvas size when there is nothing to lay out. */
  emptyWidth: number;
  emptyHeight: number;
  /** Optional per-node card geometry. The d3 spacing must accommodate their maxima. */
  nodeWidth?: (node: LayoutNode) => number;
  nodeHeight?: (node: LayoutNode, width: number) => number;
};

export const LIFE_TREE_NODE_MIN_WIDTH = 196;
export const LIFE_TREE_NODE_MAX_WIDTH = 440;

function estimatedTitleWidth(title: string): number {
  return Array.from(title).reduce((total, character) => {
    if (character === " ") return total + 3.5;
    if (/[MW&@]/.test(character)) return total + 8.2;
    if (/[A-Z0-9]/.test(character)) return total + 6.8;
    return total + 6.2;
  }, 0);
}

/** Deterministic width used by layout and CSS before native measurement is available. */
export function lifeTreeNodeWidth(node: LayoutNode): number {
  return Math.max(
    LIFE_TREE_NODE_MIN_WIDTH,
    Math.min(LIFE_TREE_NODE_MAX_WIDTH, Math.ceil(estimatedTitleWidth(node.title ?? "") + 66)),
  );
}

function lifeTreeNodeHeight(node: LayoutNode, width: number): number {
  const usableTitleWidth = Math.max(80, width - 58);
  const lines = Math.max(1, Math.ceil(estimatedTitleWidth(node.title ?? "") / usableTitleWidth));
  return Math.max(62, 47 + lines * 15);
}

export const lifeEditGeometry: TreeLayoutGeometry = {
  orientation: "horizontal",
  nodeSize: [168, 480],
  offsetX: 30,
  offsetY: 62,
  anchorX: LIFE_TREE_NODE_MIN_WIDTH,
  anchorY: 31,
  minWidth: 720,
  minHeight: 500,
  widthPadding: 516,
  heightPadding: 150,
  emptyWidth: 720,
  emptyHeight: 500,
  nodeWidth: lifeTreeNodeWidth,
  nodeHeight: lifeTreeNodeHeight,
};

type TreeDatum<T> = { data: T; children: Array<TreeDatum<T>> };

export function buildLifeTreeLayout<T extends LayoutNode>(
  nodes: T[],
  geometry: TreeLayoutGeometry = lifeEditGeometry,
): TreeLayout {
  if (!nodes.length)
    return {
      points: new Map(),
      links: [],
      width: geometry.emptyWidth,
      height: geometry.emptyHeight,
    };
  const rootNode = nodes.find(node => node.parent_id === null) ?? nodes[0]!;
  const childrenByParent = new Map<string, T[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node);
    childrenByParent.set(node.parent_id, children);
  }
  for (const children of childrenByParent.values())
    children.sort((a, b) => a.sort_key - b.sort_key || a.id.localeCompare(b.id));
  const make = (node: T): TreeDatum<T> => ({
    data: node,
    children: (childrenByParent.get(node.id) ?? []).map(make),
  });
  const root = hierarchy(make(rootNode), value => value.children);
  tree<typeof root.data>().nodeSize(geometry.nodeSize)(root);
  const descendants = root.descendants();
  const minX = Math.min(...descendants.map(n => n.x ?? 0));
  const maxX = Math.max(...descendants.map(n => n.x ?? 0));
  const points = new Map<string, LayoutPoint>();
  const horizontal = geometry.orientation === "horizontal";
  for (const entry of descendants)
    points.set(entry.data.data.id, (() => {
      const width = geometry.nodeWidth?.(entry.data.data) ?? geometry.anchorX;
      const height = geometry.nodeHeight?.(entry.data.data, width) ?? geometry.anchorY * 2;
      return {
      x: horizontal ? (entry.y ?? 0) + geometry.offsetX : (entry.x ?? 0) - minX + geometry.offsetX,
      y: horizontal ? (entry.x ?? 0) - minX + geometry.offsetY : (entry.y ?? 0) + geometry.offsetY,
      width,
      height,
      };
    })());
  const links = root.links().map(link => {
    const source = points.get(link.source.data.data.id)!;
    const target = points.get(link.target.data.data.id)!;
    const x1 = source.x + source.width,
      y1 = source.y + source.height / 2,
      x2 = horizontal ? target.x : target.x + target.width,
      y2 = horizontal ? target.y + target.height / 2 : target.y;
    return {
      id: link.target.data.data.id,
      d: horizontal
        ? `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`,
    };
  });
  return {
    points,
    links,
    width: Math.max(geometry.minWidth, (horizontal
      ? Math.max(...descendants.map(n => n.y ?? 0))
      : maxX - minX) + geometry.widthPadding),
    height: Math.max(geometry.minHeight, (horizontal
      ? maxX - minX
      : Math.max(...descendants.map(n => n.y ?? 0))) + geometry.heightPadding),
  };
}
