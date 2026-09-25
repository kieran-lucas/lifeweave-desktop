import { $, browser, expect } from "@wdio/globals";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("../target/visual-redesign");

async function capture(name: string) {
  await mkdir(output, { recursive: true });
  await browser.saveScreenshot(resolve(output, name));
  const overflow = await browser.execute(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

describe("Visual redesign desktop review", () => {
  it("captures populated product surfaces and checks tree controls at desktop sizes", async () => {
    await browser.url("http://tauri.localhost");
    await browser.setWindowSize(1536, 864);
    await expect($("h1=Today")).toBeDisplayed();
    await capture("today-1536x864.png");
    await $("button=Plan task").click();
    await expect($("[role='dialog'][aria-labelledby='task-composer-heading']")).toBeDisplayed();
    await capture("task-composer-1536x864.png");
    await browser.keys("Escape");
    await expect($("[role='dialog'][aria-labelledby='task-composer-heading']")).not.toExist();
    await browser.execute(async (date: string) => {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: (command: string, payload: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__.invoke;
      const lifeTargets = await invoke("list_task_life_targets", {}) as Array<{ id: string; title: string }>;
      const vitalityId = lifeTargets.find((item) => item.title === "VITALITY")?.id ?? null;
      const titles = [
        "Review weekly priorities", "Prepare the planning notes", "Read and annotate research",
        "Write the next project outline", "Check household calendar", "Refine a long running documentation plan with several moving parts",
        "Process reference material", "Walk and reflect", "Organize the archive", "Review tomorrow's commitments",
      ];
      for (const [index, title] of titles.entries()) {
        const task = await invoke("create_task", { input: {
          title, description: index === 5 ? "A longer note tests wrapping and secondary text in the timeline." : "",
          local_date: date, start_minute: index === 5 ? 780 : 540 + index * 60,
          end_minute: index === 5 ? 825 : index === 9 ? 1200 : 585 + index * 60,
          category_id: "general", priority: index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
          life_node_id: index < 2 ? vitalityId : null, focus_plan_id: null, deadline_local_date: null, tag_ids: [],
        } }) as { id: string };
        if (index === 0 || index === 1 || index === 2) {
          const now = new Date();
          const observedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          await invoke("evaluate_task", { input: {
            subject_kind: "one_off", task_id: task.id, series_id: null, original_local_date: null,
            state_id: index === 0 ? "completion-met" : index === 1 ? "completion-excellent" : "completion-below",
            operation_id: `visual-audit-${index}-${Date.now()}`,
            observed_local_date: observedDate, observed_local_minute: now.getHours() * 60 + now.getMinutes(),
          } });
        }
      }
    }, process.env.LIFEWEAVE_AUDIT_LOCAL_DATE ?? "2026-08-09");

    await $("button[aria-label='Calendar']").click();
    await expect($("h1#calendar-heading")).toBeDisplayed();
    await capture("calendar-1536x864.png");
    await $("button[aria-label='Today']").click();
    await expect($("h1=Today")).toBeDisplayed();
    await expect($("[role='group'][aria-label^='Review weekly priorities.'] button[aria-label='Assess task. Current state: Done']")).toBeDisplayed();
    await capture("today-dense-1536x864.png");
    await $("button[aria-label='Calendar']").click();
    await $("button[aria-label='Next month']").click();
    await $("button[aria-label='Previous month']").click();

    await $("button[aria-label='Plans']").click();
    await expect($("h1=Plans")).toBeDisplayed();
    for (const [index, title] of [
      "Make weekly priorities visible across the household",
      "Restore an intentional reading practice",
      "Build a reliable personal archive",
    ].entries()) {
      await $("button=New plan").click();
      if (index === 0) await capture("plan-editor-1536x864.png");
      await $("input[aria-label='Plan title']").setValue(title);
      await $("button=Create plan").click();
      await expect($("button[aria-label='Back to previous screen']")).toBeDisplayed();
      await $("button[aria-label='Back to previous screen']").click();
      await expect($("h1=Plans")).toBeDisplayed();
    }
    await $("button=Drafts").click();
    await capture("plans-drafts-1536x864.png");

    await $("button[aria-label='Life System']").click();
    await expect($("h1#life-workspace-heading")).toBeDisplayed();
    await capture("life-browse-1536x864.png");
    await $("ul[aria-label='Inside LIFE FOCUS SYSTEM'] button").click();
    await browser.pause(300);
    await capture("life-branch-1536x864.png");
    await $("button=Tree").click();
    await expect($("[role='tree'][aria-label='Full Life tree editor']")).toBeDisplayed();
    await expect($("[role='group'][aria-label='Life tree view controls']")).toBeDisplayed();
    await capture("life-tree-1536x864.png");
    await $("button[aria-label='Zoom out']").click();
    await expect($("[role='group'][aria-label='Life tree view controls'] > span")).toHaveText("90%");
    await $("button=Fit").click();
    await capture("life-tree-overview-1536x864.png");
    for (let index = 0; index < 5; index++) await $("button[aria-label='Zoom in']").click();
    await $("button=Center").click();
    await browser.setWindowSize(1280, 720);
    await browser.pause(250);
    await capture("life-tree-1280x720.png");
    await $("button[aria-label='Calendar']").click();
    await capture("calendar-1280x720.png");
    await browser.setWindowSize(1920, 1080);
    await browser.pause(250);
    await capture("calendar-1920x1080.png");
  });
});
