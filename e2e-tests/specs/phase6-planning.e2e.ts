import { $, browser, expect } from "@wdio/globals";

describe("Phase 6 — Upcoming and Overdue planning", () => {
  it("projects bounded queues, opens exact recurring identity, and reviews an overdue task", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    const fixture = await browser.execute(async () => {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> } }).__TAURI_INTERNALS__.invoke;
      const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const shift = (days: number) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return iso(date); };
      const yesterday = shift(-1), tomorrow = shift(1), afterTomorrow = shift(2);
      await invoke("create_task", { input: { title: "E2E Past Review", description: "needs review", local_date: yesterday, start_minute: 360, end_minute: 420, category_id: "general", priority: "high", life_node_id: null, tag_ids: [] } });
      await invoke("create_task", { input: { title: "E2E Future One-off", description: "upcoming", local_date: tomorrow, start_minute: 480, end_minute: 540, category_id: "general", priority: "medium", life_node_id: null, tag_ids: [] } });
      const futureSeries = await invoke<string>("create_recurring_task", { input: { title: "E2E Future Recurring", description: "upcoming series", local_date: tomorrow, start_minute: 600, end_minute: 660, category_id: "general", priority: "medium", frequency: "daily", interval: 1, weekdays: [], until: null, count: 3, life_node_id: null, tag_ids: [] } });
      const cancelledSeries = await invoke<string>("create_recurring_task", { input: { title: "E2E Cancelled Past", description: "cancelled", local_date: yesterday, start_minute: 720, end_minute: 780, category_id: "general", priority: "low", frequency: "daily", interval: 1, weekdays: [], until: null, count: 1, life_node_id: null, tag_ids: [] } });
      await invoke("update_recurring_occurrence", { input: { series_id: cancelledSeries, original_local_date: yesterday, replacement_local_date: null, title: null, description: null, category_id: null, priority: null, start_minute: null, end_minute: null, scope: "only_this_occurrence", cancelled: true, frequency: null, interval: null, weekdays: null, until: null, count: null, life_node_id: null, series_tag_ids: null } });
      const movedSeries = await invoke<string>("create_recurring_task", { input: { title: "E2E Moved Future", description: "moved", local_date: tomorrow, start_minute: 840, end_minute: 900, category_id: "general", priority: "low", frequency: "daily", interval: 1, weekdays: [], until: null, count: 1, life_node_id: null, tag_ids: [] } });
      await invoke("update_recurring_occurrence", { input: { series_id: movedSeries, original_local_date: tomorrow, replacement_local_date: afterTomorrow, title: null, description: null, category_id: null, priority: null, start_minute: null, end_minute: null, scope: "only_this_occurrence", cancelled: false, frequency: null, interval: null, weekdays: null, until: null, count: null, life_node_id: null, series_tag_ids: null } });
      return { futureSeries };
    });
    await browser.refresh();
    await expect($("h1=Today")).toBeDisplayed();
    // Assessment-fan lifecycle, driven from an *overdue* Task. Eligibility is
    // `local_date < today || (local_date === today && end_minute <= clockMinute)`, and
    // `validate_range` forbids a start before 04:00, so no today-scheduled fixture is assessable
    // before 05:00 local time. A yesterday-scheduled Task satisfies the first branch at any hour,
    // which is what makes this phase runnable whenever the suite happens to start.
    await $("button=Overdue").click();
    await expect($("//strong[normalize-space()='E2E Past Review']")).toBeDisplayed();
    await $("button[aria-label^='Review for E2E Past Review']").click();
    const fanRow = $("//div[@role='listitem'][.//strong[normalize-space()='E2E Past Review']]");
    await expect(fanRow).toBeDisplayed();
    await fanRow.$("button[aria-label^='Assess task']").click();
    await expect($("[role='listbox'][aria-label='Completion assessment']")).toBeDisplayed();
    const upcoming = $("button=Upcoming");
    await upcoming.click();
    await expect($("[role='listbox'][aria-label='Completion assessment']")).not.toExist();
    await $("button=Today").click();
    await expect($("[role='listbox'][aria-label='Completion assessment']")).not.toExist();
    await upcoming.click();
    await expect($("//strong[normalize-space()='E2E Future One-off']")).toBeDisplayed();
    await expect($("//strong[normalize-space()='E2E Future Recurring']")).toBeDisplayed();
    await expect($("//strong[normalize-space()='E2E Moved Future']")).toBeDisplayed();
    await expect($("//strong[normalize-space()='E2E Cancelled Past']")).not.toExist();
    await $("button[aria-label^='Open day for E2E Future Recurring']").click();
    await expect($("//button[@role='tab' and @aria-selected='true' and normalize-space()='Today']")).toBeDisplayed();
    await expect($(`[data-series-id='${fixture.futureSeries}']`)).toBeDisplayed();
    await upcoming.click();
    await $("button[aria-label='Collapse sidebar']").click();
    await $("button[aria-label='Expand sidebar']").click();
    await expect($("//button[@role='tab' and @aria-selected='true' and normalize-space()='Upcoming']")).toBeDisplayed();
    await $("button[aria-label='Calendar']").click();
    await expect($("h1=Calendar")).toBeDisplayed();
    await $("button[aria-label='Today']").click();
    await expect($("//button[@role='tab' and @aria-selected='true' and normalize-space()='Today']")).toBeDisplayed();
    await expect($("[role='listbox'][aria-label='Completion assessment']")).not.toExist();

    await $("button=Overdue").click();
    await expect($("//strong[normalize-space()='E2E Past Review']")).toBeDisplayed();
    await expect($("//strong[normalize-space()='E2E Cancelled Past']")).not.toExist();
    await $("button[aria-label^='Review for E2E Past Review']").click();
    const row = $("//div[@role='listitem'][.//strong[normalize-space()='E2E Past Review']]");
    await expect(row).toBeDisplayed();
    await row.$("button[aria-label^='Assess task']").click();
    await $("//*[@role='option' and normalize-space()='Met expectation']").click();
    await $("button=Overdue").click();
    await expect($("//strong[normalize-space()='E2E Past Review']")).not.toExist();
  });
});
