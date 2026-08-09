/**
 * Task 51 motion instrumentation.
 *
 * The activation prompt is explicit that numbers must be measured and not fabricated, so this
 * records real timings from real interactions in the real WebView and exposes them on `window` for
 * the capture spec to read.
 *
 * **What each metric actually measures**, stated precisely so nothing here is over-claimed:
 *
 *   input → commit   `event.timeStamp` of the trusted input event to the moment React has committed
 *                    the resulting DOM change. This is the number the "state first" rule is about:
 *                    it is how long the application takes to *decide*, and it must not depend on
 *                    any animation.
 *
 *   input → frame    the same origin to the `requestAnimationFrame` callback that follows the
 *                    commit. rAF runs immediately before paint, so this is a close lower bound on
 *                    "the user can see it", not a claim about photons. Reported as such.
 *
 *   frame stability  rAF deltas sampled across an interaction window: count, longest, p50, p95, and
 *                    how many exceeded 20 ms (a dropped frame at 60 Hz, which is what this display
 *                    runs at).
 *
 *   long tasks       PerformanceObserver `longtask` entries — main-thread blocks over 50 ms. The
 *                    budget says investigate >16 ms and avoid >50 ms; only the >50 ms class is
 *                    observable this way, so shorter blocking shows up in frame stability instead.
 */

export type Timing = {
  name: string;
  inputToCommit: number;
  inputToFrame: number;
};

export type FrameRun = {
  name: string;
  frames: number;
  longestMs: number;
  p50Ms: number;
  p95Ms: number;
  droppedOver20ms: number;
  durationMs: number;
};

type Pending = { name: string; input: number };

const timings: Timing[] = [];
const frameRuns: FrameRun[] = [];
const longTasks: { start: number; duration: number }[] = [];
let pending: Pending | null = null;
let sampling: { name: string; started: number; last: number; deltas: number[] } | null = null;

if (typeof PerformanceObserver !== "undefined") {
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        longTasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ entryTypes: ["longtask"] });
  } catch {
    /* longtask is not observable everywhere; absence is reported, never faked */
  }
}

/** Call from the event handler, before any state update. */
export function beginInteraction(name: string, timeStamp: number) {
  pending = { name, input: timeStamp };
}

/**
 * Call from a layout effect that runs because of the state change.
 *
 * `useLayoutEffect` fires after React has mutated the DOM and before the browser paints, which is
 * exactly the "committed" boundary this metric wants.
 */
export function commitInteraction() {
  if (!pending) return;
  const { name, input } = pending;
  pending = null;
  const commit = performance.now();
  requestAnimationFrame(() => {
    timings.push({
      name,
      inputToCommit: +(commit - input).toFixed(2),
      inputToFrame: +(performance.now() - input).toFixed(2),
    });
  });
}

export function startFrameSampling(name: string) {
  sampling = { name, started: performance.now(), last: performance.now(), deltas: [] };
  const tick = () => {
    if (!sampling) return;
    const now = performance.now();
    sampling.deltas.push(now - sampling.last);
    sampling.last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function stopFrameSampling() {
  if (!sampling) return;
  const { name, started, deltas } = sampling;
  sampling = null;
  // The first delta spans from `startFrameSampling` to the first tick and is not a frame interval.
  const samples = deltas.slice(1).sort((a, b) => a - b);
  if (samples.length === 0) return;
  const at = (q: number) => +samples[Math.min(samples.length - 1, Math.floor(samples.length * q))]!.toFixed(2);
  frameRuns.push({
    name,
    frames: samples.length,
    longestMs: +samples[samples.length - 1]!.toFixed(2),
    p50Ms: at(0.5),
    p95Ms: at(0.95),
    droppedOver20ms: samples.filter((d) => d > 20).length,
    durationMs: +(performance.now() - started).toFixed(2),
  });
}

export type MotionReport = {
  timings: Timing[];
  frameRuns: FrameRun[];
  longTasks: { start: number; duration: number }[];
  longTaskObservable: boolean;
  capabilities: {
    documentViewTransition: boolean;
    elementViewTransition: boolean;
    reducedMotion: boolean;
    startingStyle: boolean;
    allowDiscrete: boolean;
  };
};

/**
 * Feature detection for the transition APIs, reported rather than assumed.
 *
 * ADR 0045 §5 allows native View Transitions for bounded large-surface continuity only, and the
 * activation prompt is specific that element-scoped transitions use the native element API and that
 * Motion's `animateView()` must not be mistaken for it. Both are probed separately here so the
 * report states which one this WebView actually has.
 */
export function capabilities(): MotionReport["capabilities"] {
  const doc = typeof document !== "undefined" && "startViewTransition" in document;
  const element =
    typeof Element !== "undefined" && "startViewTransition" in Element.prototype;
  return {
    documentViewTransition: doc,
    elementViewTransition: element,
    reducedMotion:
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    startingStyle:
      typeof CSS !== "undefined" && CSS.supports?.("(transition-behavior: allow-discrete)") === true,
    allowDiscrete:
      typeof CSS !== "undefined" && CSS.supports?.("transition-behavior", "allow-discrete") === true,
  };
}

export function report(): MotionReport {
  return {
    timings,
    frameRuns,
    longTasks,
    longTaskObservable: typeof PerformanceObserver !== "undefined",
    capabilities: capabilities(),
  };
}

export function reset() {
  timings.length = 0;
  frameRuns.length = 0;
  longTasks.length = 0;
  pending = null;
  sampling = null;
}

declare global {
  interface Window {
    __lwMotion?: {
      report: typeof report;
      reset: typeof reset;
      startFrameSampling: typeof startFrameSampling;
      stopFrameSampling: typeof stopFrameSampling;
    };
  }
}

export function exposeForCapture() {
  window.__lwMotion = { report, reset, startFrameSampling, stopFrameSampling };
}
