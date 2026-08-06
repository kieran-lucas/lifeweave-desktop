import { useEffect, useRef, useState } from "react";
import * as styles from "./TaskPlanning.css";

export type TaskWorkspaceMode = "today" | "upcoming" | "overdue" | "deadlines" | "views";
const modes: TaskWorkspaceMode[] = ["today", "upcoming", "overdue", "deadlines", "views"];
const labels: Record<TaskWorkspaceMode, string> = {
  today: "Today",
  upcoming: "Upcoming",
  overdue: "Overdue",
  deadlines: "Deadlines",
  views: "Views",
};

export function TaskWorkspaceTabs({
  active,
  disabled,
  onActivate,
}: {
  active: TaskWorkspaceMode;
  disabled?: boolean;
  onActivate: (mode: TaskWorkspaceMode) => void;
}) {
  const [focused, setFocused] = useState<TaskWorkspaceMode>(active);
  const refs = useRef<Record<TaskWorkspaceMode, HTMLButtonElement | null>>({
    today: null,
    upcoming: null,
    overdue: null,
    deadlines: null,
    views: null,
  });
  useEffect(() => setFocused(active), [active]);
  const move = (next: TaskWorkspaceMode) => {
    setFocused(next);
    refs.current[next]?.focus();
  };
  return (
    <div className={styles.tabs} role="tablist" aria-label="Task planning views">
      {modes.map((mode, index) => (
        <button
          key={mode}
          ref={(node) => { refs.current[mode] = node; }}
          id={`task-tab-${mode}`}
          role="tab"
          type="button"
          aria-selected={active === mode}
          aria-controls={`task-panel-${mode}`}
          tabIndex={focused === mode ? 0 : -1}
          disabled={disabled && active !== mode}
          className={styles.tab}
          onFocus={() => setFocused(mode)}
          onClick={() => onActivate(mode)}
          onKeyDown={(event) => {
            let next: TaskWorkspaceMode | undefined;
            if (event.key === "ArrowLeft") next = modes[(index + modes.length - 1) % modes.length];
            if (event.key === "ArrowRight") next = modes[(index + 1) % modes.length];
            if (event.key === "Home") next = modes[0];
            if (event.key === "End") next = modes.at(-1);
            if (next) {
              event.preventDefault();
              move(next);
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onActivate(mode);
            }
          }}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}
