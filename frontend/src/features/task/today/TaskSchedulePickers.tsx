import {
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { getDayOfWeek, getLocalTimeZone, parseDate } from "@internationalized/date";
import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from "@ncdai/react-wheel-picker";
import "@ncdai/react-wheel-picker/style.css";

import { calendarDateToDate } from "../../calendar/date";
import { Icon, iconChevronLeft, iconChevronRight, iconTaskDate, iconTaskDeadline, iconTaskEnd, iconTaskStart } from "../../../design-system/visual/icons";
import * as styles from "./TaskSchedulePickers.css";

const HOURS = Array.from({ length: 20 }, (_, index) => index + 4);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const pad = (value: number) => String(value).padStart(2, "0");
const HOUR_OPTIONS: WheelPickerOption<number>[] = HOURS.map((value) => ({ value, label: pad(value) }));
const END_HOUR_OPTIONS: WheelPickerOption<number>[] = [...HOUR_OPTIONS, { value: 24, label: "24" }];
const MINUTE_OPTIONS: WheelPickerOption<number>[] = MINUTES.map((value) => ({ value, label: pad(value) }));
const LAST_MINUTE_OPTIONS: WheelPickerOption<number>[] = [{ value: 0, label: "00" }];

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

function popoverLeft(field: HTMLElement, button: DOMRect, width: number) {
  const margin = 12;
  const dialog = field.closest<HTMLElement>('[role="dialog"]')?.getBoundingClientRect();
  const minLeft = Math.max(margin, dialog ? dialog.left + margin : margin);
  const maxRight = Math.min(window.innerWidth - margin, dialog ? dialog.right - margin : window.innerWidth - margin);
  const preferredLeft = button.left + width <= maxRight ? button.left : button.right - width;
  return Math.max(minLeft, Math.min(preferredLeft, maxRight - width));
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
  const popover = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const effectiveValue = value ?? today;
  const selected = parseDate(effectiveValue);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => selected.set({ day: 1 }));
  const [focusedDate, setFocusedDate] = useState(effectiveValue);
  const close = () => setOpen(false);
  useDismissiblePopover(open, root, trigger, close);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const fieldElement = root.current;
      const field = fieldElement?.getBoundingClientRect();
      const button = trigger.current?.getBoundingClientRect();
      const surface = popover.current;
      if (!fieldElement || !field || !button || !surface) return;
      const margin = 12;
      const width = surface.offsetWidth;
      const height = surface.offsetHeight;
      const left = popoverLeft(fieldElement, button, width);
      const above = button.top - height - 8;
      const below = button.bottom + 8;
      const placeAbove = below + height > window.innerHeight - margin && button.top > window.innerHeight - button.bottom;
      const top = Math.max(margin, Math.min(placeAbove ? above : below, window.innerHeight - height - margin));
      surface.style.left = `${left - field.left}px`;
      surface.style.top = `${top - field.top}px`;
      surface.dataset.placement = placeAbove ? "above" : "below";
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open]);

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
    ><Icon d={label === "Deadline" ? iconTaskDeadline : iconTaskDate} size={18} className={styles.triggerGlyph} /><span><strong>{compactDate}</strong>{value ? <small>{selected.year}</small> : null}</span></button>
    {open ? <div ref={popover} className={styles.datePopover} role="dialog" aria-label={label === "Date" ? "Choose task date" : `Choose ${label.toLocaleLowerCase()}`}>
      <header className={styles.calendarHeader}>
        <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><Icon d={iconChevronLeft} size={18} /></button>
        <strong aria-live="polite">{monthLabel}</strong>
        <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><Icon d={iconChevronRight} size={18} /></button>
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

function Wheel({ label, options, value, onChange }: { label: string; options: WheelPickerOption<number>[]; value: number; onChange: (value: number) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const precisionGesture = useRef({ lastEventAt: -Infinity, delta: 0, committed: false, active: false });
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let forwarding = false;
    const onWheel = (event: globalThis.WheelEvent) => {
      if (forwarding) return;
      const gesture = precisionGesture.current;
      const now = performance.now();
      const delta = Math.abs(event.deltaY);
      const precisionEvent = event.deltaMode === 0 && delta !== 100 && delta % 120 !== 0;
      if (now - gesture.lastEventAt > 180) {
        gesture.delta = 0;
        gesture.committed = false;
        gesture.active = precisionEvent;
      } else if (!gesture.active && precisionEvent) {
        // A fast first touchpad delta may resemble a mouse notch; retain its one committed step.
        gesture.active = true;
        gesture.committed = true;
      }
      gesture.lastEventAt = now;
      if (!gesture.active) return;
      event.preventDefault();
      event.stopPropagation();
      if (gesture.committed) return;
      gesture.delta += event.deltaY;
      if (Math.abs(gesture.delta) < 30) return;
      gesture.committed = true;
      const wheel = element.querySelector<HTMLElement>("[data-rwp]");
      forwarding = true;
      wheel?.dispatchEvent(new globalThis.WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: Math.sign(gesture.delta) * 120 }));
      forwarding = false;
    };
    element.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => element.removeEventListener("wheel", onWheel, true);
  }, []);
  useEffect(() => {
    const wheel = frame.current?.querySelector<HTMLElement>("[data-rwp]");
    if (!wheel) return;
    wheel.setAttribute("role", "spinbutton");
    wheel.setAttribute("aria-label", label);
    wheel.setAttribute("aria-valuemin", String(options[0]!.value));
    wheel.setAttribute("aria-valuemax", String(options[options.length - 1]!.value));
    wheel.setAttribute("aria-valuenow", String(value));
    wheel.setAttribute("aria-valuetext", pad(value));
    wheel.querySelectorAll("ul").forEach((list) => list.setAttribute("aria-hidden", "true"));
  }, [label, options, value]);
  return <div className={styles.wheelGroup}>
    <span>{label}</span>
    <div ref={frame} className={styles.wheelFrame}>
      <WheelPickerWrapper className={styles.wheel}>
        {/* One wheel tick stays one row; stronger drag deceleration caps a fast fling near three rows. */}
        <WheelPicker options={options} value={value} onValueChange={onChange} visibleCount={16} optionItemHeight={40} scrollSensitivity={reducedMotion ? 10000 : 8} dragSensitivity={reducedMotion ? 1000 : 16} classNames={{ optionItem: styles.wheelOption, highlightWrapper: styles.lockSlot, highlightItem: styles.wheelSelected }} />
      </WheelPickerWrapper>
    </div>
  </div>;
}

export function TaskTimeWheelPicker({ label, value, onChange }: { label: "Start" | "End"; value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismissiblePopover(open, root, trigger, close);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const fieldElement = root.current;
      const field = fieldElement?.getBoundingClientRect();
      const button = trigger.current?.getBoundingClientRect();
      const surface = popover.current;
      if (!fieldElement || !field || !button || !surface) return;
      const margin = 12;
      const left = popoverLeft(fieldElement, button, surface.offsetWidth);
      const above = button.top - surface.offsetHeight - 8;
      const placeAbove = button.bottom + surface.offsetHeight + 8 > window.innerHeight - margin && above >= margin;
      surface.style.left = `${left - field.left}px`;
      surface.style.top = `${(placeAbove ? above : button.bottom + 8) - field.top}px`;
      surface.dataset.placement = placeAbove ? "above" : "below";
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open]);
  const hour = value === 1440 ? 24 : Math.floor(value / 60);
  const minute = value === 1440 ? 0 : value % 60;
  const hours = label === "End" ? END_HOUR_OPTIONS : HOUR_OPTIONS;
  const minutes = hour === 24 ? LAST_MINUTE_OPTIONS : MINUTE_OPTIONS;
  const display = `${pad(hour)}:${pad(minute)}`;
  return <div ref={root} className={styles.field}>
    <span className={styles.label}>{label}</span>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`${label} time, ${display}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
      <Icon d={label === "Start" ? iconTaskStart : iconTaskEnd} size={18} className={styles.triggerGlyph} />
      <span><strong>{display}</strong></span>
    </button>
    {open && <div ref={popover} className={styles.timePopover} role="dialog" aria-label={`Choose ${label.toLowerCase()} time`}>
      <header className={styles.timeHeader}><span>{label} time</span><strong>{display}</strong></header>
      <div className={styles.wheels}>
        <Wheel label="Hours" options={hours} value={hour} onChange={(next) => onChange(next === 24 ? 1440 : next * 60 + minute)} />
        <span className={styles.timeColon}>:</span>
        <Wheel label="Minutes" options={minutes} value={minute} onChange={(next) => onChange(hour * 60 + next)} />
      </div>
      <div className={styles.timeFooter}><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Done</button></div>
    </div>}
  </div>;
}
