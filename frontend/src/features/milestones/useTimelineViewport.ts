import { useLayoutEffect, useRef, useState } from "react";
import { dateAtX, dateX, daysBetween, fitDayWidth, initialRange, monthStart, TIMELINE_INSET, validMilestoneDate, windowEnd, type TimelineRange } from "./timeline";

const behavior = (): ScrollBehavior => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";

/** Resize/explicit navigation are the only geometry updates. Raw gestures never render React. */
export function useTimelineViewport(today: string, navigation: { date: string; sequence: number } | null) {
  const viewport = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState(() => initialRange(today));
  const [width, setWidth] = useState(0);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(today, -2));
  const basis = useRef(monthStart(today, -2));
  const scale = fitDayWidth(width || 960, basis.current);
  const model = useRef({ range, scale });
  const previous = useRef({ range, scale, width });
  const positioned = useRef(false);
  const pending = useRef<{ date: string; alignStart: boolean; smooth: boolean } | null>(null);
  const previousNavigation = useRef(navigation);
  const activePointer = useRef(false);
  const resizeWidth = useRef<number | null>(null);
  const wheelUntil = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelWheel = useRef(() => {});
  model.current = { range, scale };

  function settle() {
    const node = viewport.current;
    if (!node) return;
    if (resizeWidth.current !== null && !activePointer.current && performance.now() >= wheelUntil.current) {
      setWidth(resizeWidth.current); resizeWidth.current = null;
    }
    const current = model.current;
    setVisibleMonth(monthStart(dateAtX(node.scrollLeft + TIMELINE_INSET, current.range.start, current.scale)));
  }
  function queueSettle() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, 160);
  }
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => {
      const nextWidth = node.clientWidth || 960;
      if (activePointer.current || performance.now() < wheelUntil.current) { resizeWidth.current = nextWidth; queueSettle(); }
      else setWidth(nextWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener("scroll", queueSettle, { passive: true });
    return () => { observer.disconnect(); node.removeEventListener("scroll", queueSettle); clearTimeout(settleTimer.current); };
  }, []);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node || !width) return;
    const old = previous.current;
    if (!positioned.current) {
      positioned.current = true;
      node.scrollTo({ left: dateX(basis.current, range.start, scale) - TIMELINE_INSET, behavior: "instant" });
    } else {
      const dayOffset = node.scrollLeft === 0 ? 0 : (node.scrollLeft - TIMELINE_INSET) / old.scale;
      const anchor = node.scrollLeft === 0 && old.range.start === range.start ? 0
        : TIMELINE_INSET + (daysBetween(range.start, old.range.start) + dayOffset) * scale;
      node.scrollTo({ left: Math.max(0, anchor), behavior: "instant" });
      if (pending.current) {
        const destination = pending.current; pending.current = null;
        node.scrollTo({ left: Math.max(0, dateX(monthStart(destination.date, destination.alignStart ? 0 : -2), range.start, scale) - TIMELINE_INSET), behavior: destination.smooth ? behavior() : "instant" });
      }
    }
    previous.current = { range, scale, width };
    queueSettle();
  }, [range, scale, width]);

  function navigate(date: string, alignStart = false) {
    const node = viewport.current;
    if (!node || !validMilestoneDate(date)) return;
    cancelWheel.current();
    const nextStart = monthStart(date, alignStart ? 0 : -2);
    const nextEnd = windowEnd(nextStart, 13);
    const replace = Math.abs(daysBetween(range.start, date)) > 1000;
    let next: TimelineRange = replace ? initialRange(date) : {
      start: nextStart < range.start ? monthStart(nextStart, -6) : range.start,
      end: nextEnd > range.end ? windowEnd(nextEnd, 6) : range.end,
    };
    if (daysBetween(next.start, next.end) > 1400) next = initialRange(date);
    if (next.start !== range.start || next.end !== range.end) {
      pending.current = { date, alignStart, smooth: !replace };
      setRange(next);
    } else node.scrollTo({ left: Math.max(0, dateX(monthStart(date, alignStart ? 0 : -2), range.start, scale) - TIMELINE_INSET), behavior: behavior() });
    queueSettle();
  }
  useLayoutEffect(() => {
    if (navigation && previousNavigation.current !== navigation) navigate(navigation.date);
    previousNavigation.current = navigation;
  });
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    let target: number | null = null;
    let frame = 0;
    const cancel = () => { cancelAnimationFrame(frame); frame = 0; target = null; };
    cancelWheel.current = cancel;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      wheelUntil.current = performance.now() + 140;
      queueSettle();
      // Native horizontal input keeps browser/OS momentum. Diagonal input is constrained to X.
      if (event.deltaX && !event.deltaY) { cancel(); return; }
      if (!event.deltaY && !event.deltaX) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1;
      const delta = (event.deltaX || event.deltaY) * unit;
      if (event.deltaX || event.deltaMode === 0 && Math.abs(event.deltaY) < 40 || behavior() === "instant") {
        cancel(); node.scrollLeft += delta; return;
      }
      target = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, (target ?? node.scrollLeft) + delta));
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (target !== null) node.scrollTo({ left: target, behavior: "smooth" }); });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    node.addEventListener("scrollend", cancel);
    return () => { cancel(); node.removeEventListener("wheel", wheel); node.removeEventListener("scrollend", cancel); };
  }, []);
  function monthStep(direction: number) {
    const node = viewport.current;
    if (node) navigate(monthStart(dateAtX(node.scrollLeft + TIMELINE_INSET, range.start, scale), direction), true);
  }
  function gesture(active: boolean) {
    activePointer.current = active;
    if (active) cancelWheel.current();
    else queueSettle();
  }
  return { viewport, range, scale, visibleMonth, navigate, monthStep, gesture };
}
