import { useEffect, useState } from "react";
import { localToday } from "./date";

export function millisecondsUntilNextLocalDate(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1, next.getTime() - now.getTime());
}

export function useLocalDateRollover(): string {
  const [value, setValue] = useState(localToday);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(refresh, millisecondsUntilNextLocalDate());
    };
    const refresh = () => { setValue(localToday()); schedule(); };
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return value;
}
