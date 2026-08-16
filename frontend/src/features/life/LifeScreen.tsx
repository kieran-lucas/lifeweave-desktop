import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLifeBrowseProjection,
  saveLifeNavigationPreference,
} from "../../ipc/commands";
import type { LifeNodeView } from "../../ipc/generated/LifeNodeView";
import * as styles from "./LifeScreen.css";
import { PageFrame } from "../../app/layout/PageFrame";
import { RelatedTasksPanel } from "./RelatedTasksPanel";
import { EmptyState, LoadingRow } from "../../design-system/primitives/States";
import {
  Icon,
  iconChevronLeft,
  iconChevronRight,
  iconLife,
  iconNote,
} from "../../design-system/visual/icons";
import { lifeIconGlyph } from "./lifeIconCatalog";

type Mode = "browse" | "edit" | "reader";
export type LifeViewState = {
  mode: "browse" | "tree" | "reader";
  nodeId: string | null;
  readerId: string | null;
  page: number;
};

const lifeKeys = {
  browse: (id: string | undefined, page: number) =>
    ["life", "browse", id ?? "remembered", page] as const,
};

const LifeLinksPanel = lazy(() => import("./links/LifeLinksPanel"));
const LifeEditWorkspace = lazy(() =>
  import("./LifeEditWorkspace").then((module) => ({ default: module.LifeEditWorkspace })),
);
const BasicLeafReader = lazy(() =>
  import("./document/BasicLeafReader").then((module) => ({ default: module.BasicLeafReader })),
);

function NodeIcon({ iconKey, size = 17 }: { iconKey: string; size?: number }) {
  const glyph = lifeIconGlyph(iconKey);
  const glyphSize = size >= 26 ? "large" : size >= 20 ? "medium" : "small";
  return (
    <span className={styles.icon} aria-hidden="true">
      {glyph ? (
        <span className={styles.iconGlyph} data-size={glyphSize}>{glyph}</span>
      ) : (
        <Icon
          d={iconKey === "life-leaf" || iconKey === "life-note" ? iconNote : iconLife}
          size={size}
        />
      )}
    </span>
  );
}

export function LifeScreen({
  view,
  onViewChange,
  onViewReplace,
  onBack,
  canHistoryBack,
  onTaskNavigate,
  anchorLocalDate,
}: {
  view: LifeViewState;
  onViewChange: (view: LifeViewState) => void;
  onViewReplace: (view: LifeViewState) => void;
  onBack: () => void;
  canHistoryBack: boolean;
  onTaskNavigate?: (localDate: string, taskId: string | null, seriesId: string | null) => void;
  anchorLocalDate: string;
}) {
  const client = useQueryClient();
  const nodeId = view.nodeId ?? undefined;
  const page = view.page;
  const [mode, setMode] = useState<Mode>(view.mode === "tree" ? "edit" : view.mode);
  const [reader, setReader] = useState<LifeNodeView>();
  const [outlineControl, setOutlineControl] = useState<{
    nodeId: string | null;
    available: boolean;
    visible: boolean;
  }>({ nodeId: null, available: false, visible: false });
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  const linkedNavigationGeneration = useRef(0);
  const readerHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => {
    linkedNavigationGeneration.current += 1;
  }, []);

  const reportOutlineAvailability = useCallback((available: boolean) => {
    const activeNodeId = reader?.id;
    if (!activeNodeId) return;
    setOutlineControl((current) => {
      if (current.nodeId !== activeNodeId) {
        return { nodeId: activeNodeId, available, visible: false };
      }
      const visible = available ? current.visible : false;
      if (current.available === available && current.visible === visible) return current;
      return { ...current, available, visible };
    });
  }, [reader?.id]);

  const browse = useQuery({
    queryKey: lifeKeys.browse(nodeId, page),
    queryFn: () => getLifeBrowseProjection({ node_id: nodeId ?? null, child_page: page }),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (!browse.data) return;
    const selected = browse.data.selected;

    if (!initialized.current && view.nodeId === null) {
      initialized.current = true;
      const preferredMode = browse.data.preferred_mode === "edit"
        ? "tree"
        : browse.data.preferred_mode === "reader" && selected.is_leaf
          ? "reader"
          : "browse";
      if (preferredMode === "reader") setReader(selected);
      setMode(preferredMode === "tree" ? "edit" : preferredMode);
      onViewReplace({
        mode: preferredMode,
        nodeId: selected.id,
        readerId: preferredMode === "reader" ? selected.id : null,
        page: browse.data.child_page,
      });
      return;
    }
    initialized.current = true;

    if (browse.data.resolved_from_fallback || selected.id !== view.nodeId) {
      setReader(undefined);
      setMode("browse");
      onViewReplace({ mode: "browse", nodeId: selected.id, readerId: null, page: browse.data.child_page });
      return;
    }

    if (view.mode === "tree") {
      setReader(undefined);
      setMode("edit");
      return;
    }
    if (view.mode === "browse") {
      setReader(undefined);
      setMode("browse");
      return;
    }

    const directReader = selected.id === view.readerId
      ? selected
      : browse.data.children.find((child) => child.id === view.readerId);
    if (directReader?.is_leaf) {
      setReader(directReader);
      setMode("reader");
      return;
    }

    const generation = linkedNavigationGeneration.current + 1;
    linkedNavigationGeneration.current = generation;
    const targetId = view.readerId;
    if (!targetId) return;
    void client.fetchQuery({
      queryKey: lifeKeys.browse(targetId, 0),
      queryFn: () => getLifeBrowseProjection({ node_id: targetId, child_page: 0 }),
    }).then((target) => {
      if (generation !== linkedNavigationGeneration.current) return;
      if (target.resolved_from_fallback || target.selected.id !== targetId || !target.selected.is_leaf) {
        onViewReplace({ mode: "browse", nodeId: selected.id, readerId: null, page: browse.data.child_page });
        return;
      }
      onViewReplace({ mode: "reader", nodeId: targetId, readerId: targetId, page: 0 });
    }).catch(() => {
      if (generation !== linkedNavigationGeneration.current) return;
      onViewReplace({ mode: "browse", nodeId: selected.id, readerId: null, page: browse.data.child_page });
    });
  }, [browse.data, client, onViewReplace, view.mode, view.nodeId, view.readerId]);

  useEffect(() => {
    if (!browse.data || !initialized.current) return;
    void saveLifeNavigationPreference({
      node_id: browse.data.selected.id,
      mode,
      path_version: 1,
      viewport_anchor: null,
    }).catch(() => {});
  }, [browse.data, mode]);

  useEffect(() => {
    if (mode !== "reader" || !reader) return;
    requestAnimationFrame(() => readerHeading.current?.focus({ preventScroll: true }));
  }, [mode, reader]);


  const openNode = (node: LifeNodeView) => {
    if (busy) return;
    linkedNavigationGeneration.current += 1;
    if (node.is_leaf) {
      onViewChange({
        mode: "reader",
        nodeId: browse.data?.selected.id ?? node.id,
        readerId: node.id,
        page,
      });
      return;
    }
    onViewChange({ mode: "browse", nodeId: node.id, readerId: null, page: 0 });
  };

  const goTo = (id: string) => {
    if (browse.data?.selected.id === id) return;
    linkedNavigationGeneration.current += 1;
    onViewChange({ mode: "browse", nodeId: id, readerId: null, page: 0 });
  };

  const openLinkedReader = async (targetNodeId: string) => {
    if (busy || !reader) return;
    const generation = linkedNavigationGeneration.current + 1;
    linkedNavigationGeneration.current = generation;
    setBusy(true);
    try {
      const target = await client.fetchQuery({
        queryKey: lifeKeys.browse(targetNodeId, 0),
        queryFn: () => getLifeBrowseProjection({ node_id: targetNodeId, child_page: 0 }),
      });
      if (generation !== linkedNavigationGeneration.current) return;
      if (
        target.resolved_from_fallback ||
        target.selected.id !== targetNodeId ||
        !target.selected.is_leaf
      ) {
        throw new Error("That Life leaf is unavailable.");
      }
      onViewChange({ mode: "reader", nodeId: targetNodeId, readerId: targetNodeId, page: 0 });
    } finally {
      if (generation === linkedNavigationGeneration.current) setBusy(false);
    }
  };

  const back = () => {
    linkedNavigationGeneration.current += 1;
    setBusy(false);
    if (canHistoryBack) {
      onBack();
      return;
    }
    const currentNodeId = browse.data?.selected.id ?? view.nodeId;
    if (mode === "reader" || mode === "edit") {
      onViewChange({ mode: "browse", nodeId: currentNodeId, readerId: null, page });
      return;
    }
    if (browse.data?.parent) {
      onViewChange({ mode: "browse", nodeId: browse.data.parent.id, readerId: null, page: 0 });
      return;
    }
  };

  if (browse.isLoading) {
    return <LoadingRow label="Loading Life System…" />;
  }

  if (browse.isError || !browse.data) {
    return (
      <PageFrame as="section" type="wide" flush className={styles.lifeFrame}>
        <h1>Life System</h1>
        <p role="alert">Life System could not be loaded. Your tree context is preserved.</p>
      </PageFrame>
    );
  }

  const projection = browse.data;
  const canBack = canHistoryBack || projection.parent !== null || mode === "reader" || mode === "edit";
  const outlineAvailable = mode === "reader" && reader !== undefined
    && outlineControl.nodeId === reader.id && outlineControl.available;
  const outlineVisible = outlineAvailable && outlineControl.visible;

  return (
    <PageFrame as="section" type="wide" flush className={styles.lifeFrame} aria-labelledby="life-workspace-heading">
      <div className={styles.workspace} data-life-workspace="">
        <aside className={styles.navigator} aria-label="Life navigator">
          <header className={styles.navigatorHeader}>
            <button
              className={styles.backButton}
              type="button"
              onClick={back}
              disabled={!canBack}
              aria-label="Go back in Life System"
            >
              <Icon d={iconChevronLeft} size={16} />
            </button>
            <span className={styles.navigatorLabel}>Life</span>
            <button
              className={styles.editButton}
              type="button"
              aria-pressed={mode === "edit"}
              onClick={() => {
                linkedNavigationGeneration.current += 1;
                onViewChange({
                  mode: mode === "edit" ? "browse" : "tree",
                  nodeId: projection.selected.id,
                  readerId: null,
                  page,
                });
              }}
            >
              {mode === "edit" ? "Close tree" : "Tree"}
            </button>
          </header>

          <nav className={styles.breadcrumb} aria-label="Life breadcrumb">
            {projection.breadcrumb.map((item, index) => (
              <span key={item.id}>
                {index > 0 && <span aria-hidden="true">/</span>}
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={item.id === projection.selected.id ? "page" : undefined}
                >
                  {item.title}
                </button>
              </span>
            ))}
          </nav>

          <div className={styles.branchIdentity}>
            <NodeIcon iconKey={projection.selected.icon_key} size={20} />
            <div>
              <span>{projection.selected.is_leaf ? "Leaf" : "Branch"}</span>
              <strong>{projection.selected.title}</strong>
            </div>
          </div>

          <div className={styles.navigatorTools}>
            {outlineAvailable && (
              <button
                className={styles.navigatorToolButton}
                type="button"
                aria-pressed={outlineVisible}
                aria-label={outlineVisible ? "Hide contents" : "Show contents"}
                onClick={() => setOutlineControl((current) => ({ ...current, visible: !current.visible }))}
              >
                <Icon d={iconNote} size={16} />
                <span>Contents</span>
              </button>
            )}
          </div>

          <div className={styles.childHeader}>
            <span>Inside</span>
            <strong>{projection.selected.child_count}</strong>
          </div>

          {projection.children.length ? (
            <ul className={styles.nodeList} aria-label={`Inside ${projection.selected.title}`}>
              {projection.children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    className={styles.nodeRow}
                    data-life-id={child.id}
                    disabled={busy}
                    onClick={() => openNode(child)}
                  >
                    <NodeIcon iconKey={child.icon_key} />
                    <span className={styles.nodeRowCopy}>
                      <strong>{child.title}</strong>
                      <small>
                        {child.is_leaf
                          ? "Document"
                          : `${child.child_count} ${child.child_count === 1 ? "item" : "items"}`}
                      </small>
                    </span>
                    <Icon d={iconChevronRight} size={14} className={styles.rowArrow} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noChildren}>Nothing inside this branch yet.</p>
          )}

          {projection.child_page_count > 1 && (
            <div className={styles.paging} aria-label="Child pages">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => onViewChange({ ...view, page: page - 1 })}
              >
                Prev
              </button>
              <span>{projection.child_page + 1}/{projection.child_page_count}</span>
              <button
                type="button"
                disabled={page + 1 >= projection.child_page_count}
                onClick={() => onViewChange({ ...view, page: page + 1 })}
              >
                Next
              </button>
            </div>
          )}
        </aside>

        <main className={styles.canvas} data-life-mode={mode}>
          {projection.resolved_from_fallback && (
            <p className={styles.notice} role="status">
              The remembered location was unavailable, so the nearest branch was opened.
            </p>
          )}

          {mode === "edit" ? (
            <div key={`edit-${projection.selected.id}`} className={styles.editCanvas} data-life-tree-shell="">
              <header className={styles.treeHeader} data-life-tree-header="">
                <div>
                  <div className={styles.canvasEyebrow}>Structure</div>
                  <h1 id="life-workspace-heading" className={styles.treeTitle}>
                    Life tree
                  </h1>
                </div>
                <p>Scroll or drag the canvas to navigate</p>
              </header>
              <Suspense fallback={<LoadingRow label="Loading Life tree…" />}>
                <LifeEditWorkspace
                  initialNodeId={projection.selected.id}
                  onOpenNode={(id, isLeaf) => {
                    onViewChange({ mode: isLeaf ? "reader" : "browse", nodeId: id, readerId: isLeaf ? id : null, page: 0 });
                  }}
                />
              </Suspense>
            </div>
          ) : mode === "reader" && reader ? (
            <article key={`reader-${reader.id}`} className={styles.readerCanvas} data-life-reader="">
              <header className={styles.readerHeader}>
                <h1
                  id="life-workspace-heading"
                  className={styles.readerTitle}
                  ref={readerHeading}
                  tabIndex={-1}
                >
                  {reader.title}
                </h1>
              </header>

              <div className={styles.documentBody} data-life-document-body="">
                <Suspense fallback={<LoadingRow label="Loading Life document…" />}>
                  <BasicLeafReader
                    nodeId={reader.id}
                    outlineVisible={outlineVisible}
                    onOutlineAvailabilityChange={reportOutlineAvailability}
                  />
                </Suspense>
              </div>

              <details className={styles.contextDisclosure}>
                <summary>Related</summary>
                <Suspense fallback={<LoadingRow label="Loading links…" />}>
                  <LifeLinksPanel nodeId={reader.id} onNavigate={openLinkedReader} />
                </Suspense>
                <RelatedTasksPanel
                  nodeId={reader.id}
                  anchorLocalDate={anchorLocalDate}
                  onNavigate={onTaskNavigate}
                />
              </details>
            </article>
          ) : (
            <section key={`browse-${projection.selected.id}`} className={styles.branchCanvas}>
              <div className={styles.canvasEyebrow}>Current branch</div>
              <div className={styles.branchHeroIcon}>
                <NodeIcon iconKey={projection.selected.icon_key} size={26} />
              </div>
              <h1 id="life-workspace-heading" className={styles.canvasTitle} tabIndex={-1}>
                {projection.selected.title}
              </h1>
              {projection.selected.short_description ? (
                <p className={styles.branchDescription}>{projection.selected.short_description}</p>
              ) : (
                <p className={styles.branchDescriptionMuted}>No description yet.</p>
              )}

              <div className={styles.branchFacts}>
                <div>
                  <span>Direct items</span>
                  <strong>{projection.selected.child_count}</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{projection.selected.is_leaf ? "Document" : "Branch"}</strong>
                </div>
              </div>

              {projection.children.length === 0 && (
                <EmptyState
                  compact
                  icon={iconLife}
                  title="This branch is open."
                  body="Open Tree when you want to grow its structure."
                />
              )}

              <section className={styles.contextSection} aria-label="Tasks in this Life area">
                <RelatedTasksPanel
                  nodeId={projection.selected.id}
                  anchorLocalDate={anchorLocalDate}
                  onNavigate={onTaskNavigate}
                />
              </section>
            </section>
          )}
        </main>
      </div>
    </PageFrame>
  );
}
