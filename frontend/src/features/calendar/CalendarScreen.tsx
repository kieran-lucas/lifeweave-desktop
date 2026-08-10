import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDayOfWeek, getLocalTimeZone, parseDate } from "@internationalized/date";
import type { CalendarDayProjection } from "../../ipc/generated/CalendarDayProjection";
import { getMonthProjection } from "../../ipc/commands";
import * as styles from "./CalendarScreen.css";
import { PageFrame, PageHeader } from "../../app/layout/PageFrame";
import { LoadingRow } from "../../design-system/primitives/States";
import { Icon, iconChevronLeft, iconChevronRight } from "../../design-system/visual/icons";

type Props = { selectedDate: string; today: string; onActivateDate: (date: string) => void };

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function CalendarScreen({ selectedDate, today, onActivateDate }: Props) {
  const locale = navigator.language || "en-US";
  const initial = parseDate(selectedDate);
  const [viewMonth, setViewMonth] = useState(initial.set({ day: 1 }));
  const [focusedDate, setFocusedDate] = useState(selectedDate);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["month-projection", viewMonth.year, viewMonth.month, selectedDate, today],
    queryFn: () => getMonthProjection(viewMonth.year, viewMonth.month, selectedDate, today),
    placeholderData: (previous) => previous,
  });

  const grid = useMemo(() => {
    const offset = getDayOfWeek(viewMonth, locale, "mon");
    const start = viewMonth.subtract({ days: offset });
    const count = Math.ceil((offset + viewMonth.calendar.getDaysInMonth(viewMonth)) / 7) * 7;
    return Array.from({ length: count }, (_, index) => start.add({ days: index }));
  }, [viewMonth, locale]);
  const byDate = useMemo(
    () => new Map((query.data?.days ?? []).map((day) => [day.date, day])),
    [query.data],
  );
  const weekday = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          grid[index]!.toDate(getLocalTimeZone()),
        ),
      ),
    [grid, locale],
  );
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    viewMonth.toDate(getLocalTimeZone()),
  );

  useEffect(() => {
    const previous = viewMonth.subtract({ months: 1 });
    const next = viewMonth.add({ months: 1 });
    const timer = window.setTimeout(() => {
      void client.prefetchQuery({
        queryKey: ["month-projection", previous.year, previous.month, selectedDate, today],
        queryFn: () => getMonthProjection(previous.year, previous.month, selectedDate, today),
      });
      void client.prefetchQuery({
        queryKey: ["month-projection", next.year, next.month, selectedDate, today],
        queryFn: () => getMonthProjection(next.year, next.month, selectedDate, today),
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [client, viewMonth, selectedDate, today]);

  useEffect(() => {
    if (!grid.some((day) => day.toString() === focusedDate)) setFocusedDate(viewMonth.toString());
  }, [grid, focusedDate, viewMonth]);

  const moveFocus = (next: string) => {
    const date = parseDate(next);
    if (date.month !== viewMonth.month || date.year !== viewMonth.year) setViewMonth(date.set({ day: 1 }));
    setFocusedDate(next);
    requestAnimationFrame(() => refs.current.get(next)?.focus());
  };

  const changeMonth = (delta: number) => {
    const next = viewMonth.add({ months: delta });
    setViewMonth(next);
    const current = parseDate(focusedDate);
    const clamped = next.set({ day: Math.min(current.day, next.calendar.getDaysInMonth(next)) });
    setFocusedDate(clamped.toString());
    requestAnimationFrame(() => refs.current.get(clamped.toString())?.focus());
  };

  const onKey = (event: React.KeyboardEvent<HTMLButtonElement>, value: string) => {
    const date = parseDate(value);
    let next: string | undefined;
    if (event.key === "ArrowLeft") next = date.subtract({ days: 1 }).toString();
    if (event.key === "ArrowRight") next = date.add({ days: 1 }).toString();
    if (event.key === "ArrowUp") next = date.subtract({ weeks: 1 }).toString();
    if (event.key === "ArrowDown") next = date.add({ weeks: 1 }).toString();
    if (event.key === "Home") next = date.subtract({ days: getDayOfWeek(date, locale, "mon") }).toString();
    if (event.key === "End") next = date.add({ days: 6 - getDayOfWeek(date, locale, "mon") }).toString();
    if (event.key === "PageUp") {
      event.preventDefault();
      changeMonth(-1);
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      changeMonth(1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivateDate(value);
      return;
    }
    if (next) {
      event.preventDefault();
      moveFocus(next);
    }
  };

  const jumpToday = () => {
    const date = parseDate(today);
    setViewMonth(date.set({ day: 1 }));
    setFocusedDate(today);
  };

  return (
    <PageFrame as="section" type="wide" aria-labelledby="calendar-heading">
      <PageHeader
        actions={
          <div className={styles.actions}>
            <button className={styles.iconAction} type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
              <Icon d={iconChevronLeft} size={18} />
            </button>
            <strong aria-live="polite" className={styles.monthLabel}>{monthLabel}</strong>
            <button className={styles.iconAction} type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
              <Icon d={iconChevronRight} size={18} />
            </button>
            <button className={styles.todayAction} type="button" onClick={jumpToday}>Today</button>
          </div>
        }
      >
        <h1 id="calendar-heading" tabIndex={-1}>Calendar</h1>
        <p className={styles.lede}>Your month, without the dashboard noise.</p>
      </PageHeader>

      {query.isError && <p role="alert">Unable to load the calendar.</p>}
      {query.isLoading && <LoadingRow label="Loading calendar…" />}

      <div role="grid" aria-label={monthLabel} aria-busy={query.isFetching} className={styles.grid}>
        <div role="row" className={styles.weekdays}>
          {weekday.map((label, index) => <div role="columnheader" key={`${label}-${index}`}>{label}</div>)}
        </div>
        {Array.from({ length: grid.length / 7 }, (_, week) => (
          <div role="row" className={styles.week} key={week}>
            {grid.slice(week * 7, week * 7 + 7).map((date) => {
              const value = date.toString();
              const day = byDate.get(value);
              const outside = date.month !== viewMonth.month;
              return (
                <div role="gridcell" aria-selected={value === selectedDate} className={styles.cell} key={value}>
                  <button
                    ref={(node) => {
                      if (node) refs.current.set(value, node);
                      else refs.current.delete(value);
                    }}
                    type="button"
                    tabIndex={value === focusedDate ? 0 : -1}
                    aria-label={dayLabel(date, day, locale)}
                    aria-current={value === today ? "date" : undefined}
                    className={styles.cellButton}
                    data-outside={outside || undefined}
                    onFocus={() => setFocusedDate(value)}
                    onKeyDown={(event) => onKey(event, value)}
                    onClick={() => onActivateDate(value)}
                  >
                    <span className={styles.dayNumber}>{date.day}</span>
                    {day && day.task_count > 0 && <DaySummary day={day} />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

function DaySummary({ day }: { day: CalendarDayProjection }) {
  return (
    <div className={styles.summary}>
      <span className={styles.taskCount}>{day.task_count}</span>
      <span>{day.task_count === 1 ? "task" : "tasks"}</span>
      <span className={styles.durationText}>{formatDuration(day.scheduled_minutes)}</span>
      {day.has_missed && <span className={styles.needsAttention} aria-label="Past scheduled tasks are unevaluated">Review</span>}
    </div>
  );
}

function dayLabel(
  date: ReturnType<typeof parseDate>,
  day: CalendarDayProjection | undefined,
  locale: string,
) {
  const label = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
    date.toDate(getLocalTimeZone()),
  );
  if (!day || day.task_count === 0) return label;
  return `${label}, ${day.task_count} tasks, ${formatDuration(day.scheduled_minutes)} scheduled${day.has_missed ? ", review needed" : ""}`;
}
