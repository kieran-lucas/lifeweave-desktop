import { $, browser, expect } from "@wdio/globals";

type InvokeFn = <T>(command: string, payload?: unknown) => Promise<T>;
type TagView = { id: string; name: string; revision: number; archived: boolean };
type LifeEditProjection = { tree_revision: number };
type LifeMutationResult = { node: { id: string; revision: number } };

describe("Phase 7 — Unified Tags", () => {
  it("creates, assigns, displays, archives, and restores a tag across Today, Life, and Search", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    // Step 1–2: Seed via IPC — create tag, task with tag, life leaf with tag
    const seed = await browser.execute(async () => {
      const invoke = (
        window as unknown as { __TAURI_INTERNALS__: { invoke: InvokeFn } }
      ).__TAURI_INTERNALS__.invoke;

      const d = new Date();
      const todayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      // Create "Research" tag
      const tag = await invoke<TagView>("create_tag", { input: { name: "Research" } });

      // Create task with the Research tag
      await invoke("create_task", {
        input: {
          title: "E2E Tag Task",
          description: "",
          local_date: todayDate,
          start_minute: 480,
          end_minute: 540,
          category_id: "general",
          priority: "medium",
          life_node_id: null,
          tag_ids: [tag.id],
        },
      });

      // Create a life leaf node and assign the Research tag
      const editProj = await invoke<LifeEditProjection>("get_life_edit_projection", {});
      const createResult = await invoke<LifeMutationResult>("create_life_node", {
        input: {
          context: {
            operation_id: crypto.randomUUID(),
            expected_tree_revision: editProj.tree_revision,
          },
          parent_id: "life-root",
          title: "E2E Tag Node",
          short_description: "A life node for tag testing",
          icon_key: "life-leaf",
          theme_variant: "neutral",
        },
      });

      await invoke("set_life_node_tags", {
        input: {
          node_id: createResult.node.id,
          tag_ids: [tag.id],
          expected_node_revision: createResult.node.revision,
        },
      });

      return { tagId: tag.id };
    });

    // Step 3: Refresh and verify #Research chip appears in Today task row
    await browser.refresh();
    await expect($("h1=Today")).toBeDisplayed();
    await expect($("//span[normalize-space()='#Research']")).toBeDisplayed();

    // Step 4: Reopen task, change title only, save — verify #Research preserved (P1 regression fix)
    const taskRow = $("//div[@role='listitem'][.//strong[normalize-space()='E2E Tag Task']]");
    await expect(taskRow).toBeDisplayed();
    await taskRow.doubleClick();
    await expect($("h2=Edit task")).toBeDisplayed();
    const titleInput = $("input");
    await titleInput.clearValue();
    await titleInput.setValue("E2E Tag Task Renamed");
    await $("button=Save").click();
    // The #Research chip must persist after title-only save
    await expect($("//span[normalize-space()='#Research']")).toBeDisplayed();

    // Step 5: Navigate to Life System — verify chip on the E2E Tag Node child card
    await $("button[aria-label='Life System']").click();
    await expect($("h1=Life System")).toBeDisplayed();
    await expect($("//span[normalize-space()='#Research']")).toBeDisplayed();

    // Step 6: Open Search, search "research", verify task result appears
    await $("button[aria-label='Search (Ctrl+K)']").click();
    const searchInput = $("[aria-label='Search tasks, life nodes, and documents']");
    await expect(searchInput).toBeDisplayed();
    await searchInput.setValue("research");
    // Allow search index rebuild and debounce
    await browser.pause(600);
    await expect(
      $("//button[.//*[normalize-space()='E2E Tag Task Renamed']]")
    ).toBeDisplayed();
    await $("button[aria-label='Close search']").click();

    // Step 7: Navigate to Settings and archive "Research"
    await $("button[aria-label='Settings']").click();
    await expect($("h2=Tags")).toBeDisplayed();
    const archiveBtn = $(
      "//section[@aria-label='Active tags']//tr[td[normalize-space()='Research']]//button[normalize-space()='Archive']"
    );
    await expect(archiveBtn).toBeDisplayed();
    await archiveBtn.click();
    await browser.pause(300);
    // Research should now appear in Archived tags section
    await expect(
      $("//section[@aria-label='Archived tags']//td[normalize-space()='Research']")
    ).toBeDisplayed();

    // Step 8: Navigate back to Today and verify chip is gone
    await $("button=Today").click();
    await expect($("h1=Today")).toBeDisplayed();
    await expect($("//span[normalize-space()='#Research']")).not.toExist();

    // Step 9: Restore "Research" via IPC
    await browser.execute(async () => {
      const invoke = (
        window as unknown as { __TAURI_INTERNALS__: { invoke: InvokeFn } }
      ).__TAURI_INTERNALS__.invoke;
      const tags = await invoke<TagView[]>("list_tags", { include_archived: true });
      const research = tags.find((t: TagView) => t.name === "Research");
      if (research) {
        await invoke("restore_tag", {
          input: { tag_id: research.id, expected_revision: research.revision },
        });
      }
    });

    // Step 10: Refresh Today and verify #Research chip reappears
    await browser.pause(400);
    await browser.refresh();
    await expect($("h1=Today")).toBeDisplayed();
    await expect($("//span[normalize-space()='#Research']")).toBeDisplayed();

    await expect($("[role='alert']")).not.toExist();
  });
});
