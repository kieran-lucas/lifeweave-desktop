import { hierarchy, tree } from "d3-hierarchy";

/** Deterministic, compact left-to-right geometry for the Life hierarchy. */
export type LayoutPoint = { x: number; y: number; width: number; height: number };
export type LayoutEdge = { id: string; d: string };
export type TreeLayout = {
  points: Map<string, LayoutPoint>;
  links: LayoutEdge[];
  width: number;
  height: number;
};
export type LayoutNode = { id: string; parent_id: string | null; sort_key: number; title?: string };

export const LIFE_TREE_NODE_MIN_WIDTH = 196;
export const LIFE_TREE_NODE_MAX_WIDTH = 440;

const OFFSET_X = 24;
const OFFSET_Y = 28;
const DEPTH_GAP = 44;
const ROW_GAP = 16;
const COUSIN_GAP = 14;

/** Card width is fitted before layout, so long names never overlap the next generation. */
function lifeTreeNodeWidth(node: LayoutNode): number {
  return Math.max(LIFE_TREE_NODE_MIN_WIDTH, Math.min(
    LIFE_TREE_NODE_MAX_WIDTH,
    Array.from(node.title ?? "").length * 7 + 66,
  ));
}

function dimensions(node: LayoutNode): Pick<LayoutPoint, "width" | "height"> {
  const width = lifeTreeNodeWidth(node);
  const titleWidth = Array.from(node.title ?? "").length * 7;
  return {
    width,
    height: Math.max(64, 49 + Math.max(1, Math.ceil(titleWidth / Math.max(80, width - 58))) * 15),
  };
}

type Datum<T> = { data: T; children: Array<Datum<T>> };

export function buildLifeTreeLayout<T extends LayoutNode>(nodes: T[]): TreeLayout {
  if (!nodes.length) return { points: new Map(), links: [], width: 720, height: 500 };

  const childrenByParent = new Map<string, T[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const children = childrenByParent.get(node.parent_id) ?? [];
    children.push(node);
    childrenByParent.set(node.parent_id, children);
  }
  for (const children of childrenByParent.values())
    children.sort((left, right) => left.sort_key - right.sort_key || left.id.localeCompare(right.id));

  const make = (node: T): Datum<T> => ({
    data: node,
    children: (childrenByParent.get(node.id) ?? []).map(make),
  });
  const rootNode = nodes.find(node => node.parent_id === null) ?? nodes[0]!;
  const root = hierarchy(make(rootNode), value => value.children);
  const descendants = root.descendants();
  const sizes = new Map(descendants.map(entry => [entry.data.data.id, dimensions(entry.data.data)]));

  tree<typeof root.data>().nodeSize([1, 1]).separation((left, right) => {
    const leftHeight = sizes.get(left.data.data.id)!.height;
    const rightHeight = sizes.get(right.data.data.id)!.height;
    return (leftHeight + rightHeight) / 2 + ROW_GAP + (left.parent === right.parent ? 0 : COUSIN_GAP);
  })(root);

  const depthX = new Map<number, number>();
  const maxWidthByDepth = new Map<number, number>();
  for (const entry of descendants)
    maxWidthByDepth.set(entry.depth, Math.max(maxWidthByDepth.get(entry.depth) ?? 0, sizes.get(entry.data.data.id)!.width));
  let nextX = OFFSET_X;
  for (let depth = 0; depth <= Math.max(...descendants.map(entry => entry.depth)); depth += 1) {
    depthX.set(depth, nextX);
    nextX += maxWidthByDepth.get(depth)! + DEPTH_GAP;
  }

  const minY = Math.min(...descendants.map(entry => entry.x ?? 0));
  const points = new Map<string, LayoutPoint>();
  for (const entry of descendants) points.set(entry.data.data.id, {
    x: depthX.get(entry.depth)!,
    y: (entry.x ?? 0) - minY + OFFSET_Y,
    ...sizes.get(entry.data.data.id)!,
  });

  const links = root.links().map(link => {
    const source = points.get(link.source.data.data.id)!;
    const target = points.get(link.target.data.data.id)!;
    const x1 = source.x + source.width;
    const y1 = source.y + source.height / 2;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;
    const middle = (x1 + x2) / 2;
    return { id: link.target.data.data.id, d: `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}` };
  });
  const laidOut = [...points.values()];
  return {
    points,
    links,
    width: Math.max(720, Math.max(...laidOut.map(point => point.x + point.width)) + 28),
    height: Math.max(500, Math.max(...laidOut.map(point => point.y + point.height)) + 28),
  };
}
