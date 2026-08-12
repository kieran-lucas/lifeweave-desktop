import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CompletionStateView } from "../../ipc/generated/CompletionStateView";
import type { TaskEvaluationView } from "../../ipc/generated/TaskEvaluationView";
import * as styles from "./AssessmentControl.css";

type Props = {
  itemId: string;
  states: CompletionStateView[];
  evaluation: TaskEvaluationView | null;
  eligible: boolean;
  /** Non-null when assessment is blocked for a reason other than the task not having ended. */
  unavailableReason?: string | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (state: CompletionStateView) => void;
};

const progressLabels: Readonly<Record<string, string>> = {
  none: "None",
  below: "Low",
  met: "Done",
  excellent: "Great",
};

function progressLabel(visualToken: string, fallback: string) {
  return progressLabels[visualToken] ?? fallback;
}

function CheckMark() {
  return (
    <svg className={styles.checkMark} viewBox="0 0 20 20" aria-hidden="true">
      <path className={styles.lowBackdrop} d="M6.25 10h7.5" />
      <path className={styles.lowStroke} d="M6.25 10h7.5" />
      <path className={styles.doneBackdrop} d="M5.25 10.25 8.5 13.5 14.75 7" />
      <path className={styles.doneStroke} d="M5.25 10.25 8.5 13.5 14.75 7" />
      <path className={styles.greatBackdrop} d="M10 4.5 11.35 8.65 15.5 10l-4.15 1.35L10 15.5l-1.35-4.15L4.5 10l4.15-1.35L10 4.5Z" />
      <path className={styles.greatStroke} d="M10 5.4 11.1 8.9 14.6 10l-3.5 1.1L10 14.6l-1.1-3.5L5.4 10l3.5-1.1L10 5.4Z" />
    </svg>
  );
}

export function AssessmentControl({
  itemId,
  states,
  evaluation,
  eligible,
  unavailableReason = null,
  open,
  onOpen,
  onClose,
  onSelect,
}: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const label = evaluation
    ? progressLabel(evaluation.visual_token, evaluation.label)
    : progressLabels.none!;
  const available = eligible && states.length > 0 && !unavailableReason;

  const position = () => {
    if (!trigger.current || !rail.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const node = rail.current;
    const padding = 10;
    const compact = window.innerWidth < 340;
    const width = Math.min(292, Math.max(1, window.innerWidth - padding * 2));
    const height = 58;
    const canShowAbove = rect.top >= height + padding;
    const left = Math.min(
      window.innerWidth - width - padding,
      Math.max(padding, rect.right - width),
    );
    const top = canShowAbove ? rect.top - height - 8 : rect.bottom + 8;
    node.style.width = `${width}px`;
    node.style.left = `${left}px`;
    node.style.top = `${Math.max(padding, Math.min(window.innerHeight - height - padding, top))}px`;
    node.dataset.orientation = canShowAbove ? "up" : "down";
    node.dataset.compact = compact ? "true" : "false";
  };

  useLayoutEffect(() => {
    if (open) position();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, states.findIndex((state) => state.id === evaluation?.state_id)));
    const onViewport = () => position();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rail.current?.contains(target) && !trigger.current?.contains(target)) onClose();
    };
    window.addEventListener("resize", onViewport);
    window.addEventListener("scroll", onViewport, true);
    document.addEventListener("pointerdown", outside);
    requestAnimationFrame(() =>
      rail.current?.querySelector<HTMLButtonElement>("button[tabindex='0']")?.focus(),
    );
    return () => {
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("scroll", onViewport, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, onClose, evaluation?.state_id, states]);

  const close = () => {
    onClose();
    queueMicrotask(() => trigger.current?.focus());
  };

  const choose = (state: CompletionStateView) => {
    onSelect(state);
    close();
  };

  const key = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + states.length) % states.length;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % states.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = states.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(states[index]!);
      return;
    }
    if (next !== index) {
      event.preventDefault();
      setActive(next);
      requestAnimationFrame(() =>
        rail.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus(),
      );
    }
  };

  return (
    <div className={styles.anchor}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        data-state={evaluation?.visual_token ?? "empty"}
        aria-label={
          unavailableReason ??
          (!eligible
            ? "Assessment unavailable until task ends"
            : states.length === 0
              ? "Assessment options are loading"
              : `Assess task. Current state: ${label}`)
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!available}
        onClick={(event) => {
          event.stopPropagation();
          open ? close() : onOpen();
        }}
      >
        <span className={styles.ring} aria-hidden="true"><CheckMark /></span>
        <span className={styles.label}>{label}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={rail}
            className={styles.rail}
            role="listbox"
            aria-label="Completion assessment"
            data-item={itemId}
          >
            {states.map((state, index) => (
              <button
                key={state.id}
                type="button"
                role="option"
                aria-selected={evaluation?.state_id === state.id}
                aria-label={progressLabel(state.visual_token, state.label)}
                title={progressLabel(state.visual_token, state.label)}
                data-active={index === active}
                data-visual={state.visual_token}
                tabIndex={index === active ? 0 : -1}
                className={styles.option}
                onKeyDown={(event) => key(event, index)}
                onClick={() => choose(state)}
              >
                <span className={styles.optionMark} aria-hidden="true"><CheckMark /></span>
                <span>{progressLabel(state.visual_token, state.label)}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
