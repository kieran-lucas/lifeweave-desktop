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

export type LayoutPoint = { x: number; y: number };
export type LayoutEdge = { id: string; d: string };
export type TreeLayout = {
  points: Map<string, LayoutPoint>;
  links: LayoutEdge[];
  width: number;
  height: number;
};

/** The structural shape any Life projection node satisfies. */
export type LayoutNode = { id: string; parent_id: string | null; sort_key: number };

export type TreeLayoutGeometry = {
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
};

export const lifeEditGeometry: TreeLayoutGeometry = {
  nodeSize: [190, 105],
  offsetX: 24,
  offsetY: 28,
  anchorX: 82,
  anchorY: 66,
  minWidth: 620,
  minHeight: 500,
  widthPadding: 220,
  heightPadding: 130,
  emptyWidth: 600,
  emptyHeight: 500,
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
  for (const entry of descendants)
    points.set(entry.data.data.id, {
      x: (entry.x ?? 0) - minX + geometry.offsetX,
      y: (entry.y ?? 0) + geometry.offsetY,
    });
  const links = root.links().map(link => {
    const source = points.get(link.source.data.data.id)!;
    const target = points.get(link.target.data.data.id)!;
    const x1 = source.x + geometry.anchorX,
      y1 = source.y + geometry.anchorY,
      x2 = target.x + geometry.anchorX,
      y2 = target.y;
    return {
      id: link.target.data.data.id,
      d: `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`,
    };
  });
  return {
    points,
    links,
    width: Math.max(geometry.minWidth, maxX - minX + geometry.widthPadding),
    height: Math.max(
      geometry.minHeight,
      Math.max(...descendants.map(n => n.y ?? 0)) + geometry.heightPadding,
    ),
  };
}
