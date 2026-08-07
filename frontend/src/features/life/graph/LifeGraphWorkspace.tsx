import { useEffect, useMemo, useRef, useState } from "react";
import type { LifeGraphNodeView } from "../../../ipc/generated/LifeGraphNodeView";
import type { LifeGraphProjection } from "../../../ipc/generated/LifeGraphProjection";
import {
  buildLifeTreeLayout,
  type LayoutPoint,
  type TreeLayoutGeometry,
} from "../lifeTreeLayout";
import { useLifeGraphProjection } from "./lifeGraphQueries";
import * as styles from "./LifeGraph.css";

/**
 * Read-only, transient explorer of the active Life hierarchy plus existing explicit Life links.
 *
 * The accessibility authority is the semantic layer — a node selector over every projected node, a
 * selected-node inspector, and one complete list of every visible explicit link. The drawn surface
 * is decorative: `aria-hidden`, non-focusable, and pointer-only, so a 500-node graph never becomes
 * 500 tab stops.
 *
 * Nothing here is persisted. Selection lives in component state and is dropped on unmount.
 */

const graphGeometry: TreeLayoutGeometry = {
  nodeSize: [175, 95],
  offsetX: 24,
  offsetY: 24,
  anchorX: 76,
  anchorY: 52,
  minWidth: 600,
  minHeight: 480,
  widthPadding: 200,
  heightPadding: 120,
  emptyWidth: 600,
  emptyHeight: 480,
};

/** Rust owns the bound-refusal wording; this only unwraps the envelope. */
const refusalText = (error: unknown, fallback: string) => {
  const envelope = error as { code?: unknown; message?: unknown } | null;
  if (envelope && envelope.code === "Validation" && typeof envelope.message === "string")
    return envelope.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const countLabel = (value: number, singular: string, plural: string) =>
  `${value} ${value === 1 ? singular : plural}`;

/** Node type is stated as words, never by glyph or colour alone. */
export const nodeKindLabel = (node: LifeGraphNodeView) => {
  if (!node.is_leaf) return "Branch";
  if (node.document_kind === "basic_leaf") return "Basic Leaf";
  if (node.document_kind === "narrative_canvas") return "Narrative Canvas";
  return "Empty leaf";
};

/** A documented leaf is the only node the Reader can open. */
export const opensInReader = (node: LifeGraphNodeView) =>
  node.is_leaf && node.document_kind !== null;

const availabilityLabel = (value: "active" | "archived" | "unavailable") =>
  value === "active" ? "Available" : value === "archived" ? "Archived" : "Unavailable";

type Connection = { key: string; nodeId: string; title: string; kind: string };

function connectionsFor(projection: LifeGraphProjection, selected: LifeGraphNodeView) {
  const byId = new Map(projection.nodes.map(node => [node.id, node] as const));
  const title = (id: string) => byId.get(id)?.title ?? "Unavailable Life node";

  const parent: Connection[] = selected.parent_id
    ? [
        {
          key: `parent:${selected.parent_id}`,
          nodeId: selected.parent_id,
          title: title(selected.parent_id),
          kind: "Parent",
        },
      ]
    : [];
  const children: Connection[] = projection.nodes
    .filter(node => node.parent_id === selected.id)
    .map(node => ({ key: `child:${node.id}`, nodeId: node.id, title: node.title, kind: "Child" }));
  const outgoing: Connection[] = projection.links
    .filter(link => link.source_node_id === selected.id)
    .map(link => ({
      key: `outgoing:${link.link_id}`,
      nodeId: link.target_node_id,
      title: title(link.target_node_id),
      kind: `Outgoing link, ${availabilityLabel(link.availability)}`,
    }));
  const incoming: Connection[] = projection.links
    .filter(link => link.target_node_id === selected.id)
    .map(link => ({
      key: `incoming:${link.link_id}`,
      nodeId: link.source_node_id,
      title: title(link.source_node_id),
      kind: `Backlink, ${availabilityLabel(link.availability)}`,
    }));
  return { parent, children, outgoing, incoming };
}

function ConnectionGroup({
  heading,
  headingId,
  rows,
  emptyText,
  onSelect,
}: {
  heading: string;
  headingId: string;
  rows: Connection[];
  emptyText: string;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <section className={styles.connectionGroup} aria-labelledby={headingId}>
      <h4 className={styles.connectionHeading} id={headingId}>
        {heading} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.connectionList}>
          {rows.map(row => (
            <li key={row.key}>
              <button
                type="button"
                className={styles.connectionButton}
                onClick={() => onSelect(row.nodeId)}
                aria-label={`${row.kind}: ${row.title}. Select in the graph.`}
              >
                {row.title}
                <span className={styles.connectionKind}>{row.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * A positioned visual mark. Deliberately not a button: it is `aria-hidden` and non-focusable so the
 * drawn graph adds no tab stops. Keyboard and assistive-technology access is the node selector.
 */
function GraphNodeMark({
  node,
  point,
  selected,
  onSelect,
}: {
  node: LifeGraphNodeView;
  point: LayoutPoint;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--graph-x", `${point.x}px`);
    element.style.setProperty("--graph-y", `${point.y}px`);
  }, [point]);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-life-graph-id={node.id}
      data-selected={selected ? "true" : "false"}
      className={styles.nodeMark}
      onClick={onSelect}
    >
      <span className={styles.nodeTitle}>{node.title}</span>
      <span className={styles.nodeMeta}>
        {nodeKindLabel(node)} · {node.outgoing_link_count}&rarr; · {node.incoming_link_count}&larr;
      </span>
    </div>
  );
}

export function LifeGraphWorkspace({
  currentNodeId,
  onOpenNode,
  onClose,
}: {
  /** The Life node the user is already on; Graph opens focused on it when it is projected. */
  currentNodeId?: string | undefined;
  onOpenNode: (nodeId: string, target: "reader" | "browse") => void;
  onClose: () => void;
}) {
  const graph = useLifeGraphProjection();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const projection = graph.data;
  const layout = useMemo(
    () => buildLifeTreeLayout(projection?.nodes ?? [], graphGeometry),
    [projection],
  );

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    element.style.setProperty("--graph-width", `${layout.width}px`);
    element.style.setProperty("--graph-height", `${layout.height}px`);
  }, [layout]);

  if (graph.isPending)
    return (
      <p className={styles.status} aria-live="polite">
        Loading the Life graph…
      </p>
    );

  if (graph.isError || !projection)
    return (
      <section className={styles.notice} aria-labelledby="life-graph-notice-heading">
        <h3 className={styles.heading} id="life-graph-notice-heading">
          Life graph unavailable
        </h3>
        <p role="alert">
          {refusalText(graph.error, "The Life graph could not be loaded. Try again.")}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Close graph
          </button>
        </div>
      </section>
    );

  // Selection starts on the node the user was already looking at, falling back to the root.
  const initialId =
    currentNodeId && projection.nodes.some(node => node.id === currentNodeId)
      ? currentNodeId
      : (projection.nodes[0]?.id ?? null);
  const activeId = selectedId ?? initialId;
  const selected = projection.nodes.find(node => node.id === activeId) ?? projection.nodes[0];
  const connections = selected
    ? connectionsFor(projection, selected)
    : { parent: [], children: [], outgoing: [], incoming: [] };

  const titleById = new Map(projection.nodes.map(node => [node.id, node.title] as const));

  // Explicit links are a cyclic overlay, so they are drawn from the tidy-tree positions rather than
  // being fed into the hierarchy that produced them.
  const linkEdges = projection.links.flatMap(link => {
    const source = layout.points.get(link.source_node_id);
    const target = layout.points.get(link.target_node_id);
    if (!source || !target) return [];
    const x1 = source.x + graphGeometry.anchorX;
    const y1 = source.y + graphGeometry.anchorY / 2;
    const x2 = target.x + graphGeometry.anchorX;
    const y2 = target.y + graphGeometry.anchorY / 2;
    const lift = Math.max(40, Math.abs(x2 - x1) / 2);
    return [
      {
        id: link.link_id,
        unavailable: link.availability !== "active",
        d: `M ${x1} ${y1} C ${x1} ${y1 - lift}, ${x2} ${y2 - lift}, ${x2} ${y2}`,
      },
    ];
  });

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <h3 className={styles.heading} id="life-graph-heading">
          Life graph
        </h3>
        <p className={styles.summary}>
          {countLabel(projection.nodes.length, "node", "nodes")} and{" "}
          {countLabel(projection.links.length, "explicit link", "explicit links")} in the active Life
          tree. This view is read-only.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Close graph
          </button>
        </div>
      </div>

      <div className={styles.canvasViewport}>
        <div ref={canvasRef} className={styles.canvas}>
          <svg
            className={styles.edges}
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker
                id="life-graph-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--focus-ring)" />
              </marker>
            </defs>
            {layout.links.map(edge => (
              <path key={`hierarchy:${edge.id}`} className={styles.hierarchyEdge} d={edge.d} />
            ))}
            {linkEdges.map(edge => (
              <path
                key={`link:${edge.id}`}
                className={edge.unavailable ? styles.unavailableEdge : styles.linkEdge}
                data-unavailable={edge.unavailable ? "true" : "false"}
                d={edge.d}
              />
            ))}
          </svg>
          {projection.nodes.map(node => {
            const point = layout.points.get(node.id);
            if (!point) return null;
            return (
              <GraphNodeMark
                key={node.id}
                node={node}
                point={point}
                selected={selected?.id === node.id}
                onSelect={() => setSelectedId(node.id)}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.inspector}>
        <p className={styles.empty} id="life-graph-instructions">
          Hierarchy edges are solid. Explicit links are dashed and arrow-tipped; unavailable ones are
          dotted and labelled. Every relationship shown is also listed below as text.
        </p>

        <label className={styles.field} htmlFor="life-graph-node-selector">
          Life node
          <select
            id="life-graph-node-selector"
            className={styles.select}
            value={selected?.id ?? ""}
            onChange={event => setSelectedId(event.target.value)}
          >
            {projection.nodes.map(node => (
              <option key={node.id} value={node.id}>
                {`${"— ".repeat(node.depth)}${node.title} (${nodeKindLabel(node)})`}
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <>
            <h3 className={styles.inspectorTitle}>{selected.title}</h3>
            <p className={styles.inspectorMeta}>
              <span>{nodeKindLabel(selected)}</span>
              <span>Level {selected.depth + 1}</span>
              <span>{countLabel(connections.children.length, "child", "children")}</span>
              <span>
                {countLabel(selected.outgoing_link_count, "outgoing link", "outgoing links")}
              </span>
              <span>{countLabel(selected.incoming_link_count, "backlink", "backlinks")}</span>
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() =>
                  onOpenNode(selected.id, opensInReader(selected) ? "reader" : "browse")
                }
              >
                {opensInReader(selected)
                  ? `Open ${selected.title} in Life Reader`
                  : `Open ${selected.title} in Life Browse`}
              </button>
            </div>
            <ConnectionGroup
              heading="Parent"
              headingId="life-graph-parent-heading"
              rows={connections.parent}
              emptyText="This is the Life root."
              onSelect={setSelectedId}
            />
            <ConnectionGroup
              heading="Children"
              headingId="life-graph-children-heading"
              rows={connections.children}
              emptyText="No children."
              onSelect={setSelectedId}
            />
            <ConnectionGroup
              heading="Outgoing links"
              headingId="life-graph-outgoing-heading"
              rows={connections.outgoing}
              emptyText="No outgoing links."
              onSelect={setSelectedId}
            />
            <ConnectionGroup
              heading="Backlinks"
              headingId="life-graph-backlinks-heading"
              rows={connections.incoming}
              emptyText="No backlinks."
              onSelect={setSelectedId}
            />
          </>
        ) : (
          <p className={styles.empty}>This Life tree has no active nodes to graph.</p>
        )}
      </div>

      <section className={styles.allLinks} aria-labelledby="life-graph-all-links-heading">
        <h4 className={styles.connectionHeading} id="life-graph-all-links-heading">
          All explicit links ({projection.links.length})
        </h4>
        {projection.links.length === 0 ? (
          <p className={styles.empty}>This Life tree has no explicit links.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className={styles.empty}>
                Every explicit directed link drawn above, listed once.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Target</th>
                  <th scope="col">Availability</th>
                </tr>
              </thead>
              <tbody>
                {projection.links.map(link => (
                  <tr key={link.link_id} data-availability={link.availability}>
                    <td>
                      <button
                        type="button"
                        className={styles.connectionButton}
                        onClick={() => setSelectedId(link.source_node_id)}
                        aria-label={`Select source ${titleById.get(link.source_node_id) ?? "Unavailable Life node"} in the graph.`}
                      >
                        {titleById.get(link.source_node_id) ?? "Unavailable Life node"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.connectionButton}
                        onClick={() => setSelectedId(link.target_node_id)}
                        aria-label={`Select target ${titleById.get(link.target_node_id) ?? "Unavailable Life node"} in the graph.`}
                      >
                        {titleById.get(link.target_node_id) ?? "Unavailable Life node"}
                      </button>
                    </td>
                    <td>{availabilityLabel(link.availability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default LifeGraphWorkspace;
