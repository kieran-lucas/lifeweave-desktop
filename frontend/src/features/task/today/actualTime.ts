import { useEffect, useState } from "react";

/**
 * Elapsed seconds for a session that started at `startedAtMs`, floored, never negative.
 *
 * Always derived from the persisted start timestamp, never accumulated from ticks, so a throttled
 * or backgrounded tab self-corrects the moment it renders again.
 */
export function elapsedSeconds(startedAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}

/** `H:MM:SS` once an hour has passed, otherwise `M:SS`. */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** ISO 8601 duration, for the machine-readable `datetime` attribute on `<time>`. */
export function durationAttribute(totalSeconds: number): string {
  return `PT${Math.max(0, Math.floor(totalSeconds))}S`;
}

/** Accessible label: spoken words rather than a bare digit clock. */
export function spokenElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/**
 * A 1 Hz wall-clock reading, live only while `active` is true.
 *
 * The interval exists solely to trigger a re-render; the displayed value is recomputed from
 * `Date.now()` every time, so a missed or coalesced tick can never cause drift. Refocusing the
 * window or making the tab visible re-reads the clock immediately, which matters for a stopwatch
 * whose tab was backgrounded. When `active` is false no timer is registered at all, and the effect
 * cleanup is idempotent so React StrictMode double-mounting is safe.
 */
export function useActualTimeTick(active: boolean): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const read = () => setNowMs(Date.now());
    read();
    const interval = setInterval(read, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") read();
    };
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  return nowMs;
}
