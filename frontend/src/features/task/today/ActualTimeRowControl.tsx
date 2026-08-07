import type { TaskActualTimeView } from "../../../ipc/generated/TaskActualTimeView";
import { durationAttribute, formatElapsed } from "./actualTime";
import * as styles from "./TodayScreen.css";

/**
 * Start/Stop for one one-off Task row, plus its cumulative recorded time.
 *
 * Recurring rows never render this control at all — occurrence identity changes under
 * `ThisAndFuture`, so recurring work owns no actual time.
 *
 * The row itself is clickable and opens the editor on double-click, so every button here stops
 * propagation on both events, matching the life-area and focus-plan chips.
 */
export function ActualTimeRowControl({
  taskId,
  taskTitle,
  actual,
  evaluated,
  otherTimerRunning,
  pending,
  onStart,
  onStop,
}: {
  taskId: string;
  taskTitle: string;
  actual: TaskActualTimeView;
  evaluated: boolean;
  otherTimerRunning: boolean;
  pending: boolean;
  onStart: () => void;
  onStop: (sessionId: string) => void;
}) {
  const running = actual.active_session_id;
  const total = Number(actual.total_completed_seconds);

  // Only the assessed case gets a spoken explanation; a timer elsewhere is already visible in the
  // strip, so the disabled button does not need to repeat it.
  const startLabel = evaluated
    ? `Tracking unavailable for ${taskTitle}: undo this task's assessment first`
    : otherTimerRunning
      ? `Tracking unavailable for ${taskTitle}: another task timer is running`
      : `Start timer for ${taskTitle}`;

  return (
    <span className={styles.rowTimer} data-task-timer={taskId}>
      {total > 0 && (
        <time
          className={styles.rowTimerTotal}
          dateTime={durationAttribute(total)}
          aria-label={`Recorded ${formatElapsed(total)}`}
        >
          {formatElapsed(total)}
        </time>
      )}
      {running ? (
        <button
          className={styles.rowTimerButton}
          type="button"
          data-timer-state="running"
          disabled={pending}
          aria-label={`Stop timer for ${taskTitle}`}
          onClick={(event) => {
            event.stopPropagation();
            onStop(running);
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          Stop
        </button>
      ) : (
        <button
          className={styles.rowTimerButton}
          type="button"
          data-timer-state="idle"
          disabled={pending || evaluated || otherTimerRunning}
          aria-label={startLabel}
          onClick={(event) => {
            event.stopPropagation();
            onStart();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          Start
        </button>
      )}
    </span>
  );
}
