import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageFrame } from "../../app/layout/PageFrame";
import { DecisionDialog } from "../../app/layout/DialogSurface";
import { button, iconButton } from "../../design-system/primitives/controls.css";
import { srOnly } from "../../design-system/primitives/utilities.css";
import { LoadingRow } from "../../design-system/primitives/States";
import { Icon, iconDismiss, iconOptions } from "../../design-system/visual/icons";
import { listMilestones, mutateMilestone, saveMilestone } from "../../ipc/commands";
import type { MilestoneView } from "../../ipc/generated/MilestoneView";
import type { MilestoneAction } from "../../ipc/generated/MilestoneAction";
import type { SaveMilestoneInput } from "../../ipc/generated/SaveMilestoneInput";
import { useLocalDateRollover } from "../calendar/useLocalDateRollover";
import { MilestoneEditor, milestoneError } from "./MilestoneEditor";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { MilestoneLibrary } from "./MilestoneLibrary";
import { countdown, formatMilestoneDate } from "./timeline";
import * as todayStyles from "../task/today/TodayScreen.css";
import * as styles from "./MilestonesScreen.css";

const queryKey = ["milestones"] as const;
export function MilestonesScreen() {
  const today = useLocalDateRollover();
  const client = useQueryClient();
  const query = useQuery({ queryKey, queryFn: listMilestones });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [library, setLibrary] = useState<HTMLElement | null>(null);
  const [navigation, setNavigation] = useState<{ date: string; sequence: number } | null>(null);
  const [editor, setEditor] = useState<{ milestone?: MilestoneView; returnFocus: HTMLElement | null } | null>(null);
  const [deleting, setDeleting] = useState<{ milestone: MilestoneView; returnFocus: HTMLElement | null } | null>(null);
  const [error, setError] = useState("");
  const timelineFocus = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const items = useMemo(() => query.data?.filter(item => !item.deleted_at) ?? [], [query.data]);
  const deleted = useMemo(() => query.data?.filter(item => item.deleted_at) ?? [], [query.data]);
  const selected = items.find(item => item.id === selectedId);
  const related = items.filter(item => relatedIds.includes(item.id) || item.date === selected?.date);
  function updateProjection(saved: MilestoneView) {
    client.setQueryData<MilestoneView[]>(queryKey, previous => [...(previous ?? []).filter(item => item.id !== saved.id), saved]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
  }
  const mutation = useMutation({
    mutationFn: ({ item, action }: { item: MilestoneView; action: MilestoneAction }) =>
      mutateMilestone({ id: item.id, expected_revision: item.revision, action }),
    onSuccess: updateProjection,
    onSettled: () => { void client.invalidateQueries({ queryKey }); },
  });
  async function act(item: MilestoneView, action: MilestoneAction) {
    if (busy.current) return false;
    busy.current = true; setError("");
    try {
      const saved = await mutation.mutateAsync({ item, action });
      if (action === "delete") { setSelectedId(null); setDeleting(null); requestAnimationFrame(() => timelineFocus.current?.focus()); }
      if (action === "restore") {
        setSelectedId(saved.id); setRelatedIds([]);
        setNavigation(previous => ({ date: saved.date, sequence: (previous?.sequence ?? 0) + 1 }));
        requestAnimationFrame(() => document.getElementById("milestone-detail-heading")?.focus());
      }
      return true;
    } catch (cause) { setDeleting(null); setError(milestoneError(cause)); return false; }
    finally { busy.current = false; }
  }
  function select(id: string, group: string[] = []) {
    setSelectedId(id); setRelatedIds(group); setError("");
  }
  async function save(input: SaveMilestoneInput) {
    try {
      const saved = await saveMilestone(input);
      updateProjection(saved); setSelectedId(saved.id); setRelatedIds([]);
      setNavigation(previous => ({ date: saved.date, sequence: (previous?.sequence ?? 0) + 1 }));
    } finally { void client.invalidateQueries({ queryKey }); }
  }
  return <>
    <PageFrame as="section" type="wide" aria-labelledby="milestones-heading">
      <div className={todayStyles.dayShell}>
        <header className={`${todayStyles.masthead} ${styles.header}`}>
          <div className={todayStyles.headingBlock}>
            <h1 id="milestones-heading" tabIndex={-1} className={todayStyles.dayTitle}>Milestones</h1>
          </div>
          <button ref={timelineFocus} type="button" className={todayStyles.planButton} onClick={event => setEditor({ returnFocus: event.currentTarget })}>Pin milestone</button>
        </header>
        <MilestoneTimeline today={today} milestones={items} selectedId={selectedId} onSelect={select} navigation={navigation}
          actions={<button type="button" className={iconButton} aria-label="All milestones" title="All milestones" onClick={event => setLibrary(event.currentTarget)}><Icon d={iconOptions} /></button>} />
        {query.isPending && <LoadingRow label="Loading milestones…" />}
        {query.isError && <div role="alert"><p className={styles.error}>Unable to load milestones.</p><button type="button" className={button.secondary} onClick={() => void query.refetch()}>Try again</button></div>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <p role="status" className={srOnly}>{selected ? `${selected.title}. ${formatMilestoneDate(selected.date)}. ${countdown(selected.date, today)}. Details below the timeline.` : ""}</p>
        <section id="milestone-detail" hidden={!selected} aria-label="Milestone details" className={styles.detail} onKeyDown={event => {
          if (event.key === "Escape") { event.stopPropagation(); setSelectedId(null); timelineFocus.current?.focus(); }
        }}>
          {selected && <div className={styles.detailContent}>
            <div className={styles.detailHeader}>
              <h2 id="milestone-detail-heading" tabIndex={-1} className={styles.title}>{selected.title}</h2>
              <button type="button" className={iconButton} aria-label="Close details" title="Close details" onClick={() => { setSelectedId(null); timelineFocus.current?.focus(); }}><Icon d={iconDismiss} /></button>
            </div>
            <div className={styles.facts}><time dateTime={selected.date}>{formatMilestoneDate(selected.date)}</time><span>{countdown(selected.date, today)}</span></div>
            {selected.description && <p className={styles.description}>{selected.description}</p>}
            {related.length > 1 && <div className={styles.actions} aria-label="Nearby milestones">
              {related.map(item => <button type="button" key={item.id} className={`${button.ghost} ${styles.sibling}`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>{item.title}</button>)}
            </div>}
            <div className={styles.actions}>
              <button type="button" className={button.secondary} disabled={mutation.isPending} onClick={event => setEditor({ milestone: selected, returnFocus: event.currentTarget })}>Edit</button>
              <button type="button" className={button.ghost} disabled={mutation.isPending} onClick={() => void act(selected, selected.pinned ? "unpin" : "pin")}>{selected.pinned ? "Unpin" : "Pin to timeline"}</button>
              <button type="button" className={button.destructive} disabled={mutation.isPending} onClick={event => setDeleting({ milestone: selected, returnFocus: event.currentTarget })}>Delete</button>
            </div>
          </div>}
        </section>
      </div>
    </PageFrame>
    {library && <MilestoneLibrary items={items} deleted={deleted} returnFocus={library} onClose={() => setLibrary(null)}
      onChoose={id => {
        select(id); setLibrary(null);
        const item = items.find(candidate => candidate.id === id);
        if (item) setNavigation(previous => ({ date: item.date, sequence: (previous?.sequence ?? 0) + 1 }));
        requestAnimationFrame(() => document.getElementById("milestone-detail-heading")?.focus());
      }} onNavigate={date => { setLibrary(null); setNavigation(previous => ({ date, sequence: (previous?.sequence ?? 0) + 1 })); }}
      onRestore={item => act(item, "restore")} />}
    {editor && <MilestoneEditor {...editor} today={today} onSave={save} onClose={() => {
      const opener = editor.returnFocus;
      setEditor(null);
      requestAnimationFrame(() => { if (!opener?.isConnected) timelineFocus.current?.focus({ preventScroll: true }); });
    }} />}
    {deleting && <DecisionDialog title="Delete milestone?" description={`“${deleting.milestone.title}” will move to Deleted milestones. You can restore it later.`}
      confirmLabel={mutation.isPending ? "Deleting…" : "Delete milestone"} destructive returnFocus={deleting.returnFocus}
      onCancel={() => { if (!busy.current) setDeleting(null); }} onConfirm={() => { void act(deleting.milestone, "delete"); }} />}
  </>;
}
