import { useMemo, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { MilestoneView } from "../../ipc/generated/MilestoneView";
import { button, iconButton } from "../../design-system/primitives/controls.css";
import { Icon, iconChevronLeft, iconChevronRight } from "../../design-system/visual/icons";
import { containsDate, dateX, daysBetween, formatMilestoneDate, LABEL_WIDTH, LANE_HEIGHT, monthStart, monthsInRange, packLabels, rangeWidth, TIMELINE_INSET } from "./timeline";
import { useTimelineViewport } from "./useTimelineViewport";
import * as styles from "./MilestonesScreen.css";

// Numeric CSSOM geometry follows the existing Life canvas and the application's strict CSP.
function place(node: HTMLElement | null, geometry: { left?: number; top?: number; width?: number; height?: number }) {
  if (node) Object.entries(geometry).forEach(([property, value]) => node.style.setProperty(property, `${value}px`));
}
export function MilestoneTimeline({ today, milestones, selectedId, onSelect, navigation, actions }: {
  today: string; milestones: MilestoneView[]; selectedId: string | null;
  onSelect: (id: string, relatedIds?: string[]) => void;
  navigation: { date: string; sequence: number } | null; actions?: ReactNode;
}) {
  const { viewport, range, scale, visibleMonth, navigate, monthStep, gesture } = useTimelineViewport(today, navigation);
  const drag = useRef<{ id: number; x: number; y: number; left: number; active: boolean } | null>(null);
  const width = rangeWidth(range, scale);
  const pinned = useMemo(() => milestones.filter(item => item.pinned && containsDate(range, item.date)), [milestones, range]);
  const labels = useMemo(() => packLabels(pinned, range, scale, 3), [pinned, range, scale]);
  const months = useMemo(() => monthsInRange(range), [range]);
  const groups = useMemo(() => {
    const result = new Map<string, MilestoneView[]>();
    pinned.forEach(item => { const group = result.get(item.date) ?? []; group.push(item); result.set(item.date, group); });
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [pinned]);
  const height = Math.max(264, 144 + Math.max(1, ...labels.map(label => label.lane + 1)) * LANE_HEIGHT);
  const todayX = dateX(today, range.start, scale);
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    gesture(true);
    if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest("button,input,select")) return;
    const node = event.currentTarget;
    node.scrollTo({ left: node.scrollLeft, behavior: "instant" });
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: node.scrollLeft, active: false };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.active && Math.abs(event.clientX - current.x) > 5 && Math.abs(event.clientX - current.x) >= Math.abs(event.clientY - current.y)) {
      current.active = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.dataset.dragging = "true";
    }
    if (current.active) { event.preventDefault(); event.currentTarget.scrollLeft = current.left - (event.clientX - current.x); }
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (drag.current && drag.current.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null; delete event.currentTarget.dataset.dragging; gesture(false);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); monthStep(event.key === "ArrowLeft" ? -1 : 1); }
    if (event.key === "Home") { event.preventDefault(); navigate(today); }
  }
  return <>
    <div className={styles.toolbar} aria-label="Timeline navigation">
      <span className={styles.rangeLabel}>{formatMilestoneDate(visibleMonth, { month: "short", year: "numeric" })} — {formatMilestoneDate(monthStart(visibleMonth, 11), { month: "short", year: "numeric" })}</span>
      <button type="button" className={iconButton} aria-label="Previous month" title="Previous month" onClick={() => monthStep(-1)}><Icon d={iconChevronLeft} /></button>
      <button type="button" className={button.ghost} onClick={() => navigate(today)}>Today</button>
      <button type="button" className={iconButton} aria-label="Next month" title="Next month" onClick={() => monthStep(1)}><Icon d={iconChevronRight} /></button>
      {actions}
    </div>
    <div ref={viewport} className={styles.viewport} role="region" aria-label="Milestone timeline" tabIndex={0}
      data-milestone-viewport="" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
      onLostPointerCapture={pointerEnd} onPointerLeave={event => { if (!drag.current?.active) pointerEnd(event); }} onKeyDown={keyDown}>
      <div className={styles.canvas} data-timeline-start={range.start} data-day-width={scale} ref={node => place(node, { width, height })}>
        {months.map((month, index) => {
          const next = monthStart(month, 1);
          const monthWidth = (next === month ? 31 : daysBetween(month, next)) * scale;
          return <time key={month} dateTime={month} data-month={month} className={styles.month} title={formatMilestoneDate(month, { month: "long", year: "numeric" })}
            ref={node => place(node, { left: dateX(month, range.start, scale), width: monthWidth })}>
            {(index === 0 || month.endsWith("-01-01")) && <span className={styles.year}>{month.slice(0, 4)}</span>}
            {scale < 1.25 ? month.slice(5, 7) : formatMilestoneDate(month, { month: "short" }).replace("Sept", "Sep")}
          </time>;
        })}
        {months.map(month => <span key={month} className={styles.tick} aria-hidden="true" ref={node => place(node, { left: dateX(month, range.start, scale) })} />)}
        <div className={styles.baseline} ref={node => place(node, { left: TIMELINE_INSET, width: width - TIMELINE_INSET * 2 })} />
        <div className={styles.progress} ref={node => place(node, { left: TIMELINE_INSET, width: Math.max(0, Math.min(width - TIMELINE_INSET * 2, todayX - TIMELINE_INSET)) })} />
        {containsDate(range, today) && <div className={styles.today} ref={node => place(node, { left: todayX })} data-today-indicator="" aria-label={`Today, ${formatMilestoneDate(today)}`}>
          <span className={styles.todayLabel}>Today</span></div>}
        <svg className={styles.connectors} width={width} height={height} aria-hidden="true">
          {labels.flatMap(({ items, left, lane }) => [...new Set(items.map(item => item.date))].map(date => <path key={`${items[0]!.id}-${date}`}
            d={`M${dateX(date, range.start, scale)} 100 V${124 + lane * LANE_HEIGHT} H${left + 12} V${132 + lane * LANE_HEIGHT}`}
            fill="none" stroke={items.some(item => item.id === selectedId) ? "var(--accent)" : "currentColor"} strokeWidth="1" />))}
        </svg>
        {groups.map(([date, entries]) => <button type="button" key={date} className={styles.marker} ref={node => place(node, { left: dateX(date, range.start, scale) - 20 })}
          aria-label={entries.length === 1 ? `${entries[0]!.title}, ${formatMilestoneDate(date)}` : `${entries.length} milestones on ${formatMilestoneDate(date)}`}
          aria-pressed={entries.some(item => item.id === selectedId)} aria-controls="milestone-detail"
          onClick={() => onSelect(entries[0]!.id, entries.map(item => item.id))}><span className={styles.dot} /></button>)}
        {labels.map(({ item, items, left, lane }) => <button type="button" key={item.id} className={styles.callout}
          data-milestone-label={item.id} data-milestone-count={items.length} ref={node => place(node, { left, top: 132 + lane * LANE_HEIGHT, width: LABEL_WIDTH })}
          aria-label={items.length === 1 ? `${item.title}, ${formatMilestoneDate(item.date)}` : `${items.length} milestones, ${item.title}, ${formatMilestoneDate(item.date)}`}
          aria-pressed={items.some(entry => entry.id === selectedId)} aria-controls="milestone-detail"
          title={items.map(entry => `${formatMilestoneDate(entry.date)} — ${entry.title}`).join("\n")}
          onClick={() => onSelect(item.id, items.map(entry => entry.id))}>
          <span className={styles.labelDate}>{formatMilestoneDate(item.date, { day: "2-digit", month: "2-digit" })}</span>
          <span className={styles.labelTitle}>{item.title}</span>
          {items.length > 1 && <span className={styles.moreCount}>+{items.length - 1}</span>}
        </button>)}
      </div>
    </div>
  </>;
}
