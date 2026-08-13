import {
  useMemo,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { getDayOfWeek, getLocalTimeZone, parseDate } from "@internationalized/date";

import { calendarDateToDate } from "../../calendar/date";
import { Icon, iconArrowEnter, iconArrowExit, iconCalendar } from "../../../design-system/visual/icons";
import * as styles from "./TaskSchedulePickers.css";

const ROW = 40;
const HOURS = Array.from({ length: 20 }, (_, index) => index + 4);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const pad = (value: number) => String(value).padStart(2, "0");

function useDismissiblePopover(
  open: boolean,
  root: React.RefObject<HTMLElement | null>,
  trigger: React.RefObject<HTMLButtonElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const pointerDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      close();
    };
    const keyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", pointerDown);
    document.addEventListener("keydown", keyDown, true);
    return () => {
      document.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("keydown", keyDown, true);
    };
  }, [close, open, root, trigger]);
}

export function TaskDatePicker({
  value,
  today,
  label = "Date",
  optional = false,
  disabled = false,
  variant = "schedule",
  onChange,
}: {
  value: string | null;
  today: string;
  label?: string;
  optional?: boolean;
  disabled?: boolean;
  variant?: "schedule" | "detail";
  onChange: (value: string | null) => void;
}) {
  const locale = navigator.language || "en-US";
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const effectiveValue = value ?? today;
  const selected = parseDate(effectiveValue);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => selected.set({ day: 1 }));
  const [focusedDate, setFocusedDate] = useState(effectiveValue);
  const close = () => setOpen(false);
  useDismissiblePopover(open, root, trigger, close);

  useEffect(() => {
    const nextValue = value ?? today;
    const next = parseDate(nextValue);
    setFocusedDate(nextValue);
    if (next.year !== viewMonth.year || next.month !== viewMonth.month) setViewMonth(next.set({ day: 1 }));
  }, [today, value]);

  const days = useMemo(() => {
    const offset = getDayOfWeek(viewMonth, locale, "mon");
    const start = viewMonth.subtract({ days: offset });
    return Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
  }, [locale, viewMonth]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(days[index]!.toDate(getLocalTimeZone()))), [days, locale]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewMonth.toDate(getLocalTimeZone()));
  const fullDate = (date: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(calendarDateToDate(date));
  const compactDate = value ? new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(calendarDateToDate(value)) : label === "Deadline" ? "No deadline" : "Not set";

  const focusDate = (next: string) => {
    const date = parseDate(next);
    if (date.year !== viewMonth.year || date.month !== viewMonth.month) setViewMonth(date.set({ day: 1 }));
    setFocusedDate(next);
    requestAnimationFrame(() => dayRefs.current.get(next)?.focus());
  };
  const changeMonth = (amount: number) => {
    const next = viewMonth.add({ months: amount });
    const current = parseDate(focusedDate);
    const nextFocus = next.set({ day: Math.min(current.day, next.calendar.getDaysInMonth(next)) });
    setViewMonth(next);
    setFocusedDate(nextFocus.toString());
    requestAnimationFrame(() => dayRefs.current.get(nextFocus.toString())?.focus());
  };
  const selectDate = (next: string | null) => {
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const onDayKey = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const current = parseDate(date);
    let next: string | undefined;
    if (event.key === "ArrowLeft") next = current.subtract({ days: 1 }).toString();
    if (event.key === "ArrowRight") next = current.add({ days: 1 }).toString();
    if (event.key === "ArrowUp") next = current.subtract({ weeks: 1 }).toString();
    if (event.key === "ArrowDown") next = current.add({ weeks: 1 }).toString();
    if (event.key === "Home") next = current.subtract({ days: getDayOfWeek(current, locale, "mon") }).toString();
    if (event.key === "End") next = current.add({ days: 6 - getDayOfWeek(current, locale, "mon") }).toString();
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      changeMonth(event.key === "PageUp" ? -1 : 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDate(date);
      return;
    }
    if (next) {
      event.preventDefault();
      focusDate(next);
    }
  };

  return <div ref={root} className={`${styles.field} ${variant === "detail" ? styles.detailDateField : styles.dateField}`}>
    <span className={styles.label}>{label}</span>
    <button
      ref={trigger}
      type="button"
      className={`${styles.trigger} ${styles.dateTrigger}`}
      aria-label={`${label === "Date" ? "Task date" : label}, ${value ? fullDate(value) : "Not set"}`}
      aria-haspopup="dialog"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => {
        const next = !open;
        setOpen(next);
        if (next) requestAnimationFrame(() => dayRefs.current.get(focusedDate)?.focus());
      }}
    ><Icon d={iconCalendar} size={18} className={styles.triggerGlyph} /><span><strong>{compactDate}</strong>{value ? <small>{selected.year}</small> : null}</span></button>
    {open ? <div className={styles.datePopover} role="dialog" aria-label={label === "Date" ? "Choose task date" : `Choose ${label.toLocaleLowerCase()}`}>
      <header className={styles.calendarHeader}>
        <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>›</button>
      </header>
      <div className={styles.weekdayRow} role="row" aria-hidden="true">{weekdays.map((weekday, index) => <span role="columnheader" key={`${weekday}-${index}`}>{weekday}</span>)}</div>
      <div className={styles.dayGrid} role="grid" aria-label={monthLabel}>
        {Array.from({ length: 6 }, (_, row) => <div role="row" key={row}>
          {days.slice(row * 7, row * 7 + 7).map((date) => {
            const key = date.toString();
            return <button
              ref={(element) => { if (element) dayRefs.current.set(key, element); else dayRefs.current.delete(key); }}
              type="button"
              role="gridcell"
              key={key}
              aria-label={fullDate(key)}
              aria-selected={key === value}
              tabIndex={key === focusedDate ? 0 : -1}
              data-outside={date.month !== viewMonth.month || undefined}
              data-today={key === today || undefined}
              onClick={() => selectDate(key)}
              onKeyDown={(event) => onDayKey(event, key)}
            >{date.day}</button>;
          })}
        </div>)}
      </div>
      <footer className={styles.calendarFooter}>
        <span>{value ? fullDate(value) : `No ${label.toLocaleLowerCase()} set`}</span>
        <div className={styles.calendarFooterActions}>
          {optional && value ? <button type="button" onClick={() => selectDate(null)}>Clear</button> : null}
          <button type="button" onClick={() => selectDate(today)}>Today</button>
        </div>
      </footer>
    </div> : null}
  </div>;
}

function Wheel({ label, values, value, onChange }: { label: string; values: number[]; value: number; onChange: (value: number) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; top: number } | null>(null);
  const lastWheelStep = useRef(-120);
  const selected = values.indexOf(value);
  // Sync on mount or when the available range changes. Depending on `selected` here would force
  // the wheel back to a locked row after every pointer move and make direct dragging visibly jump.
  useEffect(() => {
    list.current!.scrollTop = selected * ROW;
  }, [values.length]);
  const commit = (top: number) => {
    const next = values[Math.min(values.length - 1, Math.max(0, Math.round(top / ROW)))]!;
    if (next !== value) onChange(next);
  };
  const move = (index: number) => {
    const safe = Math.min(Math.max(index, 0), values.length - 1);
    list.current?.scrollTo?.({ top: safe * ROW, behavior: "smooth" });
    onChange(values[safe]!);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: event.clientY, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
    commit(event.currentTarget.scrollTop);
  };
  const pointerUp = () => { drag.current = null; };
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.timeStamp - lastWheelStep.current < 120) return;
    lastWheelStep.current = event.timeStamp;
    move(selected + (event.deltaY > 0 ? 1 : -1));
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    move(event.key === "Home" ? 0 : event.key === "End" ? values.length - 1 : selected + step);
  };
  return <div className={styles.wheelGroup}>
    <span>{label}</span>
    <div className={styles.wheelFrame}>
      <div className={styles.lockSlot} />
      <div ref={list} className={styles.wheel} role="listbox" aria-label={label} tabIndex={0} onKeyDown={keyDown} onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
        {values.map((item, index) => <button key={item} type="button" role="option" tabIndex={-1} aria-selected={item === value} className={styles.wheelOption} onClick={() => move(index)}>{pad(item)}</button>)}
      </div>
    </div>
  </div>;
}

export function TaskTimeWheelPicker({ label, value, onChange }: { label: "Start" | "End"; value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  useDismissiblePopover(open, root, trigger, close);
  const hour = value === 1440 ? 24 : Math.floor(value / 60);
  const minute = value === 1440 ? 0 : value % 60;
  const hours = label === "End" ? [...HOURS, 24] : HOURS;
  const minutes = hour === 24 ? [0] : MINUTES;
  const display = `${pad(hour)}:${pad(minute)}`;
  return <div ref={root} className={styles.field}>
    <span className={styles.label}>{label}</span>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`${label} time, ${display}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
      <Icon d={label === "Start" ? iconArrowEnter : iconArrowExit} size={18} className={styles.triggerGlyph} />
      <span><strong>{display}</strong></span>
    </button>
    {open && <div className={styles.timePopover} role="dialog" aria-label={`Choose ${label.toLowerCase()} time`}>
      <header className={styles.timeHeader}><span>{label} time</span><strong>{display}</strong></header>
      <div className={styles.wheels}>
        <Wheel label="Hours" values={hours} value={hour} onChange={(next) => onChange(next === 24 ? 1440 : next * 60 + minute)} />
        <span className={styles.timeColon}>:</span>
        <Wheel label="Minutes" values={minutes} value={minute} onChange={(next) => onChange(hour * 60 + next)} />
      </div>
      <div className={styles.timeFooter}><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button></div>
    </div>}
  </div>;
}
