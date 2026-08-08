import { useQuery } from "@tanstack/react-query";

import { getFocusPlanAnalyticsProjection } from "../../ipc/commands";
import type { AnalyticsPeriodKind } from "../../ipc/generated/AnalyticsPeriodKind";
import type { FocusPlanAnalyticsPlanView } from "../../ipc/generated/FocusPlanAnalyticsPlanView";
import type { FocusPlanLifecycle } from "../../ipc/generated/FocusPlanLifecycle";
import * as styles from "./AnalyticsScreen.css";
import { actualTimeVariance, formatActualTime, planScheduledDuration } from "./format";

const lifecycleLabels: Record<FocusPlanLifecycle, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

/** Lifecycle and archive state are always words, never a colour or an icon alone. */
function planState(plan: FocusPlanAnalyticsPlanView) {
  return plan.archived
    ? `${lifecycleLabels[plan.lifecycle]} · Archived`
    : lifecycleLabels[plan.lifecycle];
}

function recordedActual(plan: FocusPlanAnalyticsPlanView) {
  if (BigInt(plan.actual_time.tracked_task_count) === 0n) return "Not tracked";
  return `${formatActualTime(plan.actual_time.actual_seconds)} · tracked plan ${formatActualTime(
    plan.actual_time.tracked_scheduled_seconds,
  )} · ${actualTimeVariance(plan.actual_time)}`;
}

/**
 * Factual Focus Plan activity for the period Analytics is already showing (ADR 0043).
 *
 * Every number here comes from the backend projection. The renderer deliberately performs no
 * aggregation of its own, and there is no progress bar, ratio, percentage, or health signal:
 * these are retrospective facts, not automatic Plan progress.
 */
export function FocusPlanAnalyticsSection({
  periodKind,
  anchorLocalDate,
  observedLocalDate,
  observedLocalMinute,
  onPlanNavigate,
}: {
  periodKind: AnalyticsPeriodKind;
  anchorLocalDate: string;
  observedLocalDate: string;
  observedLocalMinute: number;
  onPlanNavigate?: ((planId: string) => void) | undefined;
}) {
  // The key starts with "analytics", so the established
  // `invalidateQueries({queryKey:["analytics"]})` contract already refreshes this section.
  const query = useQuery({
    queryKey: ["analytics", "focus-plans", periodKind, anchorLocalDate, observedLocalDate],
    queryFn: () =>
      getFocusPlanAnalyticsProjection({
        period_kind: periodKind,
        anchor_local_date: anchorLocalDate,
        observed_local_date: observedLocalDate,
        observed_local_minute: observedLocalMinute,
      }),
    placeholderData: (previous) => previous,
  });
  const data = query.data;

  return (
    <section aria-labelledby="focus-plan-activity">
      <h2 id="focus-plan-activity">Focus Plan activity</h2>
      {query.isLoading && <p role="status">Loading Focus Plan activity…</p>}
      {query.isError && <p role="alert">Unable to load Focus Plan activity.</p>}
      {data && (
        <>
          <dl className={styles.facts}>
            <div>
              <dt>Plans with activity</dt>
              <dd>{data.plan_count}</dd>
            </div>
            <div>
              <dt>Linked scheduled time</dt>
              <dd>{planScheduledDuration(data.scheduled_minutes)}</dd>
            </div>
            <div>
              <dt>Linked work items</dt>
              <dd>{data.work_item_count}</dd>
            </div>
            <div>
              <dt>Evaluated</dt>
              <dd>{data.evaluated_count}</dd>
            </div>
            <div>
              <dt>Missed</dt>
              <dd>{data.missed_count}</dd>
            </div>
            <div>
              <dt>Reviews</dt>
              <dd>{data.review_count}</dd>
            </div>
            <div>
              <dt>Recorded actual time</dt>
              <dd>{formatActualTime(data.actual_time.actual_seconds)}</dd>
            </div>
          </dl>

          {data.plans.length === 0 ? (
            <p>No Focus Plan-linked work or reviews in this period.</p>
          ) : (
            <div className={styles.planTableWrap}>
              <table className={styles.planTable}>
                <caption>Focus Plan activity in this period</caption>
                <thead>
                  <tr>
                    <th scope="col">Focus Plan</th>
                    <th scope="col">State</th>
                    <th scope="col">Scheduled</th>
                    <th scope="col">Work items</th>
                    <th scope="col">Evaluated</th>
                    <th scope="col">Missed</th>
                    <th scope="col">Recorded actual time</th>
                    <th scope="col">Reviews</th>
                    <th scope="col">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {data.plans.map((plan) => (
                    <tr key={plan.plan_id}>
                      <th scope="row">{plan.title}</th>
                      <td>{planState(plan)}</td>
                      <td>{planScheduledDuration(plan.scheduled_minutes)}</td>
                      <td>
                        {plan.work_item_count} ({plan.one_off_task_count} one-off,{" "}
                        {plan.recurring_occurrence_count} recurring)
                      </td>
                      <td>{plan.evaluated_count}</td>
                      <td>{plan.missed_count}</td>
                      <td>{recordedActual(plan)}</td>
                      <td>
                        {plan.review_count}
                        {plan.latest_reviewed_local_date ? (
                          <>
                            {" · latest "}
                            <time dateTime={plan.latest_reviewed_local_date}>
                              {plan.latest_reviewed_local_date}
                            </time>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-label={`Open Plan ${plan.title}`}
                          onClick={() => onPlanNavigate?.(plan.plan_id)}
                          disabled={!onPlanNavigate}
                        >
                          Open Plan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p>
            Plan activity follows each Task or recurring series&apos; current Focus Plan link;
            Lifeweave does not store historical Plan-link snapshots. Reviews are counted by their
            review date.
          </p>
          <p>
            Recorded actual time covers completed sessions on linked one-off Tasks only; recurring
            occurrences do not support actual-time tracking. These are retrospective facts, not
            automatic Plan progress.
          </p>
        </>
      )}
    </section>
  );
}
