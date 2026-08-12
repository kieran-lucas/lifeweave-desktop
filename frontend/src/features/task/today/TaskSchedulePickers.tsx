import { useEffect, useRef, useState, type PointerEvent, type UIEvent } from "react";

import * as styles from "./TaskSchedulePickers.css";

const ROW = 38;
const HOURS = Array.from({ length: 20 }, (_, index) => index + 4);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

function Wheel({ label, values, value, onChange }: { label: string; values: number[]; value: number; onChange: (value: number) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; top: number } | null>(null);
  const selected = Math.max(0, values.indexOf(value));
  useEffect(() => {
    if (list.current) list.current.scrollTop = selected * ROW;
  }, [values.length]);
  const commit = (top: number) => onChange(values[Math.min(values.length - 1, Math.max(0, Math.round(top / ROW)))]!);
  const move = (index: number) => {
    const safe = Math.min(Math.max(index, 0), values.length - 1);
    if (list.current) list.current.scrollTop = safe * ROW;
    onChange(values[safe]!);
  };
  const scroll = (event: UIEvent<HTMLDivElement>) => {
    commit(event.currentTarget.scrollTop);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: event.clientY, top: event.currentTarget.scrollTop };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    event.currentTarget.scrollTop = drag.current.top + drag.current.y - event.clientY;
    commit(event.currentTarget.scrollTop);
  };
  const pointerUp = () => { drag.current = null; };
  return <div className={styles.wheelGroup}>
    <span>{label}</span>
    <div className={styles.wheelFrame}>
      <div className={styles.lockSlot} />
      <div ref={list} className={styles.wheel} role="listbox" aria-label={label} onScroll={scroll} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
        {values.map((item, index) => <button key={item} type="button" role="option" aria-selected={item === value} aria-label={`${String(item).padStart(2, "0")} ${label.toLowerCase()}`} className={styles.wheelOption} onClick={() => move(index)}>{String(item).padStart(2, "0")}</button>)}
      </div>
    </div>
  </div>;
}

export function TaskTimeWheelPicker({ label, value, onChange }: { label: "Start" | "End"; value: number; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const hour = value === 1440 ? 24 : Math.floor(value / 60);
  const minute = value === 1440 ? 0 : value % 60;
  const hours = label === "End" ? [...HOURS, 24] : HOURS;
  const minutes = hour === 24 ? [0] : MINUTES;
  const display = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return <div className={styles.field}>
    <span className={styles.label}>{label}</span>
    <button type="button" className={styles.trigger} aria-label={`${label} time, ${display}`} aria-expanded={open} onClick={() => setOpen(!open)}>{display}</button>
    {open && <div className={styles.popover} role="dialog" aria-label={`Choose ${label.toLowerCase()} time`}>
      <div className={styles.wheels}>
        <Wheel label="Hours" values={hours} value={hour} onChange={(next) => onChange(next === 24 ? 1440 : next * 60 + minute)} />
        <span className={styles.timeColon}>:</span>
        <Wheel key={minutes.length} label="Minutes" values={minutes} value={minute} onChange={(next) => onChange(hour * 60 + next)} />
      </div>
      <div className={styles.timeFooter}><button type="button" onClick={() => setOpen(false)}>Done</button></div>
    </div>}
  </div>;
}
