import { $, browser, expect } from "@wdio/globals";

export const TIMED_TASK = "E2E Timed Work";
export const SECOND_TASK = "E2E Second Work";
export const RECURRING_TASK = "E2E Recurring Work";

type Invoke = <T>(command: string, payload?: unknown) => Promise<T>;

/** Yesterday, so the tasks are always assessable regardless of the hour the phase runs. */
export function yesterday(): string {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Builds two one-off Tasks and one recurring series through established raw IPC.
 *
 * Fixture construction only: every Start, Stop, and assessment under test is driven through the
 * product UI.
 */
export async function establishActualTimeFixture(localDate: string) {
  const result = await browser.execute(async (date: string, names: string[]) => {
    const [timed, second, recurring] = names;
    let stage = "start";
    try {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } })
        .__TAURI_INTERNALS__.invoke;
      type Item = { kind: string; id: string; title: string };
      const items = () =>
        invoke<Item[]>("list_today_items", { localDate: date, observedLocalDate: date });

      stage = "existing";
      const existing = await items();
      const byTitle = (title: string) => existing.find((item) => item.title === title);

      stage = "one-off tasks";
      for (const [index, title] of [timed!, second!].entries()) {
        if (byTitle(title)) continue;
        await invoke("create_task", {
          input: {
            title,
            description: "",
            local_date: date,
            start_minute: 480 + index * 120,
            end_minute: 540 + index * 120,
            category_id: "general",
            priority: "high",
            life_node_id: null,
            focus_plan_id: null,
            deadline_local_date: null,
            tag_ids: [],
          },
        });
      }

      stage = "recurring series";
      if (!byTitle(recurring!)) {
        await invoke("create_recurring_task", {
          input: {
            title: recurring,
            description: "",
            local_date: date,
            start_minute: 720,
            end_minute: 780,
            category_id: "general",
            priority: "medium",
            frequency: "daily",
            interval: 1,
            weekdays: [],
            until: null,
            count: 2,
            life_node_id: null,
            focus_plan_id: null,
            tag_ids: [],
          },
        });
      }

      stage = "done";
      const final = await items();
      return {
        ok: true,
        stage,
        error: "",
        oneOff: final.filter((item) => item.kind === "one_off").length,
        recurring: final.filter((item) => item.kind === "recurring").length,
      };
    } catch (error) {
      return { ok: false, stage, error: String(error), oneOff: 0, recurring: 0 };
    }
  }, localDate, [TIMED_TASK, SECOND_TASK, RECURRING_TASK]);

  expect(result).toEqual(
    expect.objectContaining({ ok: true, stage: "done" }),
  );
  return result;
}

/**
 * Opens Today and selects the given local date through the product UI.
 *
 * The week strip labels each day with a locale-formatted date, which is awkward to match, so the
 * target is reached by position instead: today carries `aria-current="date"`, and the fixture date
 * is the day immediately before it. When today is the first day shown, step back a week and take
 * the last day.
 */
export async function openToday(localDate: string) {
  await $("button[aria-label='Today']").click();
  await expect($("h1=Today")).toBeDisplayed();
  const tab = $("//button[@role='tab' and normalize-space()='Today']");
  if (await tab.isExisting()) await tab.click();

  const selected = () => $(`//p[normalize-space()='Selected day · ${localDate}']`);
  const todayHeading = () => $(`//p[normalize-space()='Today · ${localDate}']`);
  if ((await selected().isExisting()) || (await todayHeading().isExisting())) return;

  const dayButtons = () => $$("nav[aria-label='Week navigation'] button[aria-pressed]");
  let days = await dayButtons();
  let currentIndex = -1;
  for (const [index, day] of days.entries()) {
    if ((await day.getAttribute("aria-current")) === "date") {
      currentIndex = index;
      break;
    }
  }
  if (currentIndex > 0) {
    await days[currentIndex - 1]!.click();
  } else {
    await $("button[aria-label='Previous week']").click();
    days = await dayButtons();
    await days[days.length - 1]!.click();
  }
  await expect(selected()).toBeDisplayed();
}

export const row = (title: string) =>
  $(`//div[@role="listitem"][.//strong[normalize-space()="${title}"]]`);

export const timerStrip = () => $("section[aria-label='Running task timer']");

export const startButton = (title: string) =>
  $(`button[aria-label='Start timer for ${title}']`);

export const stopRowButton = (title: string) =>
  $(`button[aria-label='Stop timer for ${title}']`);

export const blockedStartButton = (title: string) =>
  $(`button[aria-label^='Tracking unavailable for ${title}']`);

/** Reads recorded totals straight from the projection, for assertions the DOM cannot express. */
export async function readActualTime(localDate: string) {
  return browser.execute(async (date: string, names: string[]) => {
    const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } })
      .__TAURI_INTERNALS__.invoke;
    type Actual = {
      total_completed_seconds: number;
      completed_session_count: number;
      active_session_id: string | null;
    } | null;
    type Item = { kind: string; title: string; actual_time: Actual; evaluation: unknown };
    const items = await invoke<Item[]>("list_today_items", {
      localDate: date,
      observedLocalDate: date,
    });
    const pick = (title: string) => items.find((item) => item.title === title);
    const active = await invoke<{ session_id: string; task_id: string } | null>(
      "get_active_task_actual_time",
    );
    const timed = pick(names[0]!);
    const recurring = items.find((item) => item.kind === "recurring");
    return {
      activeSessionId: active?.session_id ?? null,
      timedTotalSeconds: Number(timed?.actual_time?.total_completed_seconds ?? -1),
      timedCompletedCount: Number(timed?.actual_time?.completed_session_count ?? -1),
      timedActiveSessionId: timed?.actual_time?.active_session_id ?? null,
      timedEvaluated: timed?.evaluation !== null && timed?.evaluation !== undefined,
      recurringActualTime: recurring ? recurring.actual_time : "no recurring row",
    };
  }, localDate, [TIMED_TASK]);
}

/**
 * Attempts a concurrent Start through the native command surface and reports the outcome.
 *
 * The UI already disables the button, so without this the phase would only prove the frontend
 * gating and would stay green even if the backend guard were removed entirely.
 *
 * A rejecting async `browser.execute` corrupts the WebDriver response, so the call is kicked off
 * synchronously with both outcomes handled in-page, and the result is read back afterwards.
 */
export async function attemptConcurrentStart(localDate: string, title: string): Promise<string> {
  await browser.execute((date: string, wanted: string) => {
    const holder = window as unknown as { __e2eConcurrentStart?: string };
    holder.__e2eConcurrentStart = "pending";
    const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } })
      .__TAURI_INTERNALS__.invoke;
    type Item = { kind: string; id: string; title: string };
    invoke<Item[]>("list_today_items", { localDate: date, observedLocalDate: date })
      .then((items) => {
        const target = items.find((item) => item.title === wanted);
        if (!target) throw new Error(`fixture task ${wanted} is missing`);
        return invoke("start_task_actual_time", {
          input: { task_id: target.id, operation_id: `e2e-concurrent-${Date.now()}` },
        });
      })
      .then(
        () => { holder.__e2eConcurrentStart = "ALLOWED"; },
        (reason: unknown) => {
          const message =
            reason && typeof reason === "object" && "message" in reason
              ? String((reason as { message: unknown }).message)
              : String(reason);
          holder.__e2eConcurrentStart = `REFUSED: ${message}`;
        },
      );
  }, localDate, title);

  await browser.waitUntil(
    async () =>
      (await browser.execute(
        () => (window as unknown as { __e2eConcurrentStart?: string }).__e2eConcurrentStart,
      )) !== "pending",
    { timeoutMsg: "concurrent start attempt never settled" },
  );
  return browser.execute(
    () => (window as unknown as { __e2eConcurrentStart?: string }).__e2eConcurrentStart ?? "",
  );
}
