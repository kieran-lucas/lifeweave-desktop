import { $, browser, expect } from "@wdio/globals";

describe("Phase 4 - portable package round trip", () => {
  it("imports a raw-IPC Basic Leaf package with an image into a second empty leaf", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    const setup = await browser.execute(async () => {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> } }).__TAURI_INTERNALS__.invoke;
      let stage = "browse";
      try {
        const root = await invoke<{ tree_revision: number }>("get_life_browse_projection", { input: { node_id: null, child_page: 0 } });
        stage = "create source";
        const source = await invoke<{ node: { id: string }, tree_revision: number }>("create_life_node", { input: { context: { operation_id: "e2e-portable-source", expected_tree_revision: root.tree_revision }, parent_id: "life-root", title: "Portable Source", short_description: "Original remains", icon_key: "life-leaf", theme_variant: "neutral" } });
        stage = "create target";
        const target = await invoke<{ node: { id: string }, tree_revision: number }>("create_life_node", { input: { context: { operation_id: "e2e-portable-target", expected_tree_revision: source.tree_revision }, parent_id: "life-root", title: "Portable Target", short_description: "Imported copy", icon_key: "life-leaf", theme_variant: "neutral" } });
        stage = "create document";
        const doc = await invoke<{ id: string }>("create_reader_document", { input: { life_node_id: source.node.id, operation_id: "e2e-portable-document" } });
        stage = "import asset";
        const png = Array.from(Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAQSURBVBhXY/jPwPCfARkAAB7zAf+x9MCaAAAAAElFTkSuQmCC"), value => value.charCodeAt(0)));
        const asset = await invoke<{ asset_id: string }>("import_document_asset", { input: { original_name: "e2e.png", bytes: png } });
        stage = "save document";
        const canonical = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Portable persisted text" }] }, { type: "image", attrs: { assetId: asset.asset_id, alt: "Portable image" } }] });
        await invoke("save_reader_document", { input: { document_id: doc.id, expected_revision: 0, schema_version: 1, canonical_json: canonical, operation_id: "e2e-portable-save" } });
        stage = "prepare export";
        const ticket = await invoke<{ export_id: string }>("prepare_portable_package_export", { input: { document_kind: "basic_leaf", document_id: doc.id } });
        stage = "read export";
        const raw = await invoke<ArrayBuffer>("read_portable_package_export", { exportId: ticket.export_id });
        stage = "preview import";
        const preview = await invoke<{ import_id: string }>("preview_portable_package_import", new Uint8Array(raw));
        stage = "confirm import";
        await invoke("confirm_portable_package_import", { input: { import_id: preview.import_id, life_node_id: target.node.id, operation_id: "e2e-portable-confirm" } });
        return { ok: true, stage, error: "" };
      } catch (error) {
        return { ok: false, stage, error: typeof error === "string" ? error : JSON.stringify(error) };
      }
    });
    expect(setup).toEqual({ ok: true, stage: "confirm import", error: "" });
    await $("button[aria-label='Life System']").click();
    const target = $("//button[contains(.,'Portable Target')]"); await expect(target).toBeDisplayed(); await target.click();
    await expect($("//*[contains(normalize-space(.),'Portable persisted text')]")).toBeDisplayed(); await expect($("img[alt='Portable image']")).toBeDisplayed();
  });
});
