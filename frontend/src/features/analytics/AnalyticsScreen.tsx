import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseDate } from "@internationalized/date";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getAnalyticsProjection } from "../../ipc/commands";
import type { AnalyticsPeriodKind } from "../../ipc/generated/AnalyticsPeriodKind";
import { localToday } from "../calendar/date";
import { CategoryIcon } from "../task/categoryIcons";
import * as styles from "./AnalyticsScreen.css";
import { PageFrame, PageHeader } from "../../app/layout/PageFrame";
import { actualTimeVariance, formatActualTime, scheduledDuration } from "./format";
import { EmptyState, LoadingRow } from "../../design-system/primitives/States";
import { iconAnalytics } from "../../design-system/visual/icons";

export { actualTimeVariance, formatActualTime } from "./format";

// Focus Plan activity is an additional read of the same period, so it stays out of the startup
// bundle and loads only once a user actually opens Analytics.
const FocusPlanAnalyticsSection = lazy(() =>
  import("./FocusPlanAnalyticsSection").then((module) => ({
    default: module.FocusPlanAnalyticsSection,
  })),
);

const kinds: AnalyticsPeriodKind[] = ["week", "month", "year"];

function moveDate(date: string, kind: AnalyticsPeriodKind, amount: number) {
  const value = parseDate(date);
  return (kind === "week"
    ? value.add({ weeks: amount })
    : kind === "month"
      ? value.add({ months: amount })
      : value.add({ years: amount })
  ).toString();
}

export function AnalyticsScreen({
  onPlanNavigate,
}: {
  onPlanNavigate?: (planId: string) => void;
} = {}) {
  const [kind, setKind] = useState<AnalyticsPeriodKind>("week");
  const [anchor, setAnchor] = useState(localToday());
  const client = useQueryClient();
  const now = new Date();
  const today = localToday();
  const observedMinute = now.getHours() * 60 + now.getMinutes();
  const analyticsInput = useMemo(
    () => ({
      period_kind: kind,
      anchor_local_date: anchor,
      observed_local_date: today,
      observed_local_minute: observedMinute,
    }),
    [kind, anchor, today, observedMinute],
  );
  const query = useQuery({
    queryKey: ["analytics", kind, anchor, today],
    queryFn: () => getAnalyticsProjection(analyticsInput),
    placeholderData: (previous) => previous,
  });
  useEffect(() => {
    for (const amount of [-1, 1]) {
      const adjacent = moveDate(anchor, kind, amount);
      void client.prefetchQuery({
        queryKey: ["analytics", kind, adjacent, today],
        queryFn: () =>
          getAnalyticsProjection({ ...analyticsInput, anchor_local_date: adjacent }),
      });
    }
  }, [client, kind, anchor, today, analyticsInput]);
  const data = query.data;
  const distributionTotal =
    data?.completion_distribution.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <PageFrame as="section" type="standard" aria-labelledby="analytics-heading">
      <PageHeader>
        <p className={styles.eyebrow}>Objective Analytics · scheduled and recorded time</p>
        <h1 id="analytics-heading" tabIndex={-1}>
          Analytics
        </h1>
      </PageHeader>
      {/*
        Period kind and period navigation are one control group, so they sit in one common region
        rather than floating away from the summary they govern.
      */}
      <div className={styles.periodControls}>
        <div className={styles.periodTabs} role="tablist" aria-label="Analytics period">
          {kinds.map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={kind === value}
              onClick={() => setKind(value)}
            >
              {value[0]!.toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.periodNav}>
          <button aria-label="Previous period" onClick={() => setAnchor(moveDate(anchor, kind, -1))}>
            Previous
          </button>
          <strong>{data ? `${data.period_start} – ${data.period_end}` : anchor}</strong>
          <button aria-label="Next period" onClick={() => setAnchor(moveDate(anchor, kind, 1))}>
            Next
          </button>
          <button onClick={() => setAnchor(today)}>Current period</button>
        </div>
      </div>
      {query.isLoading && <LoadingRow label="Loading objective Analytics…" />}
      {query.isError && <p role="alert">Unable to load objective Analytics.</p>}
      {data && (
        <>
          <section className={styles.section} aria-labelledby="scheduled-overview">
            <h2 id="scheduled-overview">Scheduled overview</h2>
            <p className={styles.primary}>
              <strong>{scheduledDuration(data.scheduled_minutes)}</strong>
              <span>Scheduled time</span>
            </p>
            <dl className={styles.facts}>
              <div>
                <dt>Scheduled tasks</dt>
                <dd>{data.task_count}</dd>
              </div>
              <div>
                <dt>Evaluated</dt>
                <dd>{data.evaluated_count}</dd>
              </div>
              <div>
                <dt>Missed</dt>
                <dd>{data.missed_count}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section} aria-labelledby="recorded-actual-time">
            <h2 id="recorded-actual-time">Recorded actual time</h2>
            <dl className={styles.facts}>
              <div>
                <dt>Recorded time</dt>
                <dd>{formatActualTime(data.actual_time.actual_seconds)}</dd>
              </div>
              <div>
                <dt>Tracked plan</dt>
                <dd>{formatActualTime(data.actual_time.tracked_scheduled_seconds)}</dd>
              </div>
              <div>
                <dt>Variance</dt>
                <dd>{actualTimeVariance(data.actual_time)}</dd>
              </div>
              <div>
                <dt>Tracked Tasks</dt>
                <dd>{data.actual_time.tracked_task_count.toString()}</dd>
              </div>
              <div>
                <dt>Completed segments</dt>
                <dd>{data.actual_time.completed_session_count.toString()}</dd>
              </div>
            </dl>
            {BigInt(data.actual_time.tracked_task_count) === 0n && (
              <p>No completed actual-time sessions for one-off Tasks scheduled in this period.</p>
            )}
            <p>
              Only completed sessions count. Reporting follows each Task&apos;s current scheduled date
              and current category; running timers are excluded until stopped.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="category-time">
            <h2 id="category-time">Category scheduled time</h2>
            {data.categories.length === 0 ? (
              <EmptyState compact icon={iconAnalytics} title="No scheduled tasks in this period." body="Schedule work to see it summarised here." />
            ) : (
              <ul className={styles.categories}>
                {data.categories.map((category) => (
                  <li key={category.category_id}>
                    <h3>
                      <CategoryIcon
                        iconKey={category.category_icon_key}
                        label={`Category ${category.category_name}`}
                      />{" "}
                      {category.category_name}
                    </h3>
                    <p>{scheduledDuration(category.scheduled_minutes)} scheduled</p>
                    {BigInt(category.actual_time.tracked_task_count) > 0n && (
                      <p>
                        Recorded {formatActualTime(category.actual_time.actual_seconds)} · tracked plan{" "}
                        {formatActualTime(category.actual_time.tracked_scheduled_seconds)} ·{" "}
                        {actualTimeVariance(category.actual_time)}
                      </p>
                    )}
                    {category.weekly_minimum_minutes === null ? (
                      <p>Weekly minimum and target not configured.</p>
                    ) : (
                      <>
                        <label>
                          Weekly minimum{" "}
                          <progress
                            value={Math.min(
                              category.scheduled_minutes,
                              category.weekly_minimum_minutes,
                            )}
                            max={category.weekly_minimum_minutes || 1}
                          />
                        </label>
                        <p>
                          {category.minimum_shortfall_minutes > 0
                            ? `${scheduledDuration(category.minimum_shortfall_minutes)} short of minimum`
                            : `${scheduledDuration(category.minimum_overage_minutes)} over minimum`}
                        </p>
                        <label>
                          Weekly target{" "}
                          <progress
                            value={Math.min(
                              category.scheduled_minutes,
                              category.weekly_target_minutes!,
                            )}
                            max={category.weekly_target_minutes || 1}
                          />
                        </label>
                        <p>
                          {category.target_shortfall_minutes > 0
                            ? `${scheduledDuration(category.target_shortfall_minutes)} short of target`
                            : `${scheduledDuration(category.target_overage_minutes)} over target`}
                        </p>
                        {kind !== "week" && (
                          <p>
                            {category.minimum_week_count} of {category.eligible_week_count} completed
                            weeks met minimum; {category.target_week_count} met target.
                          </p>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section} aria-labelledby="objective-streaks">
            <h2 id="objective-streaks">Objective streaks</h2>
            {data.streaks.length === 0 ? (
              <EmptyState compact title="No configured completed-week streaks yet." body="Set a category goal to start tracking streaks." />
            ) : (
              <ul>
                {data.streaks.map((streak) => (
                  <li key={`${streak.category_id}-${streak.threshold_kind}`}>
                    {streak.category_id} {streak.threshold_kind}: current {streak.current_length} weeks;
                    longest {streak.longest_length} weeks.
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.section} aria-labelledby="completion-distribution">
            <h2 id="completion-distribution">Completion distribution</h2>
            {data.completion_distribution.length === 0 ? (
              <EmptyState compact title="No evaluations in this period." body="Evaluated tasks appear here once you assess them." />
            ) : (
              <>
                <div className={styles.distribution} aria-hidden="true">
                  {data.completion_distribution.map((item) => (
                    <progress
                      key={`${item.state_id}-${item.label}`}
                      value={item.count}
                      max={distributionTotal}
                      data-visual={item.visual_token}
                    />
                  ))}
                </div>
                <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <caption>Evaluation counts</caption>
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.completion_distribution.map((item) => (
                      <tr key={`${item.state_id}-${item.label}`}>
                        <th>{item.label}</th>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </section>

          <Suspense fallback={<LoadingRow label="Loading Focus Plan activity…" />}>
            <FocusPlanAnalyticsSection
              periodKind={kind}
              anchorLocalDate={anchor}
              observedLocalDate={today}
              observedLocalMinute={observedMinute}
              onPlanNavigate={onPlanNavigate}
            />
          </Suspense>
        </>
      )}
    </PageFrame>
  );
}
