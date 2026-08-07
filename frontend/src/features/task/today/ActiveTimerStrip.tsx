import type { ActiveTaskActualTimeView } from "../../../ipc/generated/ActiveTaskActualTimeView";
import {
  durationAttribute,
  elapsedSeconds,
  formatElapsed,
  spokenElapsed,
  useActualTimeTick,
} from "./actualTime";
import * as styles from "./TodayScreen.css";

/**
 * The one running session, shown while the user is anywhere in the Today workspace.
 *
 * It names the Task and its scheduled date because the running Task may not be on the day currently
 * being viewed. The counter carries `role="timer"` but deliberately no live region: announcing once
 * a second would flood a screen reader. Start, Stop, and Discard confirmations are announced
 * separately by the caller's polite status line.
 */
export function ActiveTimerStrip({ active, pending, onStop, onDiscard }: {
  active: ActiveTaskActualTimeView;
  pending: boolean;
  onStop: () => void;
  onDiscard: () => void;
}) {
  const nowMs = useActualTimeTick(true);
  const running = elapsedSeconds(Number(active.started_at_ms), nowMs);
  const total = running + Number(active.completed_seconds_before_active);

  return (
    <section className={styles.timerStrip} aria-label="Running task timer">
      <span className={styles.timerRunning}>Timing</span>
      <span className={styles.timerTitle}>{active.task_title}</span>
      <span className={styles.timerDate}>Scheduled {active.task_local_date}</span>
      <time
        className={styles.timerCounter}
        role="timer"
        dateTime={durationAttribute(running)}
        aria-label={`Elapsed ${spokenElapsed(running)}`}
      >
        {formatElapsed(running)}
      </time>
      {total !== running && (
        <span className={styles.timerTotal}>Total {formatElapsed(total)}</span>
      )}
      <button className={styles.timerButton} type="button" disabled={pending} onClick={onStop}>
        Stop timer
      </button>
      <button className={styles.timerButton} type="button" disabled={pending} onClick={onDiscard}>
        Discard segment
      </button>
    </section>
  );
}
