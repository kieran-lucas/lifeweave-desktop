import { useEffect, useRef, useState } from "react";
import * as styles from "./TaskPlanning.css";

export type TaskWorkspaceMode = "today" | "upcoming" | "overdue" | "deadlines" | "views";
const primaryModes: TaskWorkspaceMode[] = ["today", "upcoming"];
const secondaryModes: TaskWorkspaceMode[] = ["overdue", "deadlines", "views"];
const labels: Record<TaskWorkspaceMode, string> = {
  today: "Today",
  upcoming: "Upcoming",
  overdue: "Overdue",
  deadlines: "Deadlines",
  views: "Saved views",
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
  const [focused, setFocused] = useState<TaskWorkspaceMode>(
    primaryModes.includes(active) ? active : "today",
  );
  const refs = useRef<Record<"today" | "upcoming", HTMLButtonElement | null>>({
    today: null,
    upcoming: null,
  });
  const more = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (primaryModes.includes(active)) setFocused(active);
  }, [active]);

  const activateSecondary = (mode: TaskWorkspaceMode) => {
    onActivate(mode);
    if (more.current) more.current.open = false;
  };

  return (
    <div className={styles.navCluster} aria-label="Task views">
      <div className={styles.tabs} role="tablist" aria-label="Primary task views">
        {primaryModes.map((mode, index) => (
          <button
            key={mode}
            ref={(node) => {
              refs.current[mode] = node;
            }}
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
              let next: "today" | "upcoming" | undefined;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                next = primaryModes[(index + 1) % primaryModes.length] as "today" | "upcoming";
              }
              if (event.key === "Home") next = "today";
              if (event.key === "End") next = "upcoming";
              if (next) {
                event.preventDefault();
                setFocused(next);
                refs.current[next]?.focus();
              }
            }}
          >
            {labels[mode]}
          </button>
        ))}
      </div>

      <details className={styles.more} ref={more}>
        <summary className={styles.moreSummary}>
          {secondaryModes.includes(active) ? labels[active] : "More"}
        </summary>
        <div className={styles.moreMenu}>
          {secondaryModes.map((mode) => (
            <button
              key={mode}
              id={`task-tab-${mode}`}
              type="button"
              aria-current={active === mode ? "page" : undefined}
              disabled={disabled && active !== mode}
              className={styles.moreItem}
              onClick={() => activateSecondary(mode)}
            >
              {labels[mode]}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
