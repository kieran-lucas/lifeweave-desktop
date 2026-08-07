import { $, browser, expect } from "@wdio/globals";

export const TREE_ROOT_A = "E2E Tree Root Alpha";
export const TREE_INNER = "E2E Tree Inner";
export const TREE_BASIC = "E2E Tree Basic";
export const TREE_CANVAS = "E2E Tree Canvas";
export const TREE_EMPTY = "E2E Tree Empty";
export const TREE_ROOT_B = "E2E Tree Root Beta";
export const TREE_DESTINATION = "E2E Tree Destination";

type Invoke = <T>(command: string, payload?: unknown) => Promise<T>;
type Fixture = { ok: boolean; stage: string; error: string; rootAId: string; rootBId: string };

/** Creates two known top-level roots before the product export starts. */
export async function establishTreeFixture(): Promise<Fixture> {
  const result = await browser.execute(async (names: string[]) => {
    const [rootA, inner, basic, canvas, empty, rootB] = names;
    let stage = "start";
    try {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } }).__TAURI_INTERNALS__.invoke;
      type Child = { id: string; title: string; revision: number };
      type Browse = { tree_revision: number; children: Child[]; child_page_count: number };
      const page = (nodeId: string, childPage = 0) => invoke<Browse>("get_life_browse_projection", { input: { node_id: nodeId, child_page: childPage } });
      const allChildren = async (nodeId: string) => {
        const first = await page(nodeId);
        const children = [...first.children];
        for (let index = 1; index < first.child_page_count; index++) children.push(...(await page(nodeId, index)).children);
        return { children, treeRevision: first.tree_revision };
      };
      let counter = 0;
      const ensureNode = async (parentId: string, title: string) => {
        const current = await allChildren(parentId);
        const existing = current.children.find((child) => child.title === title);
        if (existing) return existing.id;
        const created = await invoke<{ node: { id: string } }>("create_life_node", { input: {
          context: { operation_id: `e2e-tree-node-${counter++}-${title.replace(/\W+/g, "-")}`, expected_tree_revision: current.treeRevision },
          parent_id: parentId, title, short_description: `${title} description`, icon_key: "life-branch", theme_variant: "neutral",
        }});
        return created.node.id;
      };

      stage = "nodes";
      const rootAId = await ensureNode("life-root", rootA!);
      const innerId = await ensureNode(rootAId, inner!);
      const basicId = await ensureNode(innerId, basic!);
      const canvasId = await ensureNode(innerId, canvas!);
      await ensureNode(rootAId, empty!);
      const rootBId = await ensureNode("life-root", rootB!);

      stage = "documents";
      const basicProjection = await invoke<{ document: { id: string } | null }>("get_reader_document", { input: { life_node_id: basicId } });
      if (!basicProjection.document) await invoke("create_reader_document", { input: { life_node_id: basicId, operation_id: "e2e-tree-basic" } });
      const canvasProjection = await invoke<{ document: { id: string } | null }>("get_narrative_document", { input: { life_node_id: canvasId } });
      if (!canvasProjection.document) await invoke("create_narrative_document", { input: { life_node_id: canvasId, operation_id: "e2e-tree-canvas", template_id: "knowledge_dossier" } });

      stage = "link";
      const panel = await invoke<{ outgoing: Array<{ endpoint_node_id: string }> }>("get_life_link_panel", { input: { source_node_id: basicId } });
      if (!panel.outgoing.some((row) => row.endpoint_node_id === canvasId)) await invoke("create_life_link", { input: { source_node_id: basicId, target_node_id: canvasId } });
      return { ok: true, stage: "done", error: "", rootAId, rootBId };
    } catch (error) {
      return { ok: false, stage, error: String(error), rootAId: "", rootBId: "" };
    }
  }, [TREE_ROOT_A, TREE_INNER, TREE_BASIC, TREE_CANVAS, TREE_EMPTY, TREE_ROOT_B]);
  expect(result.ok).toBe(true); expect(result.stage).toBe("done"); return result;
}

export async function openLifeEdit(title: string) {
  await $("button[aria-label='Life System']").click();
  const reader = $("section[aria-labelledby='life-reader-title']");
  if (await reader.isExisting()) await reader.$("button*=Back to Life Browse").click();
  const edit = $("button=Edit"); if (await edit.isExisting()) await edit.click();
  await selectNode(title);
}

export async function selectNode(title: string) {
  const card = $(`//button[@data-life-edit-id][.//*[normalize-space()="${title}"]]`);
  await expect(card).toBeDisplayed(); await card.click(); await expect($(`h2=Edit ${title}`)).toBeDisplayed();
}

export const treeControls = () => $("section[aria-label='Life tree interchange']");
export const importDialog = () => $("section[role='dialog'][aria-modal='true']");

export async function installTreeDownloadCapture() {
  await browser.execute(() => {
    const state = window as unknown as { __lifeweaveTreeBlob?: Blob; __lifeweaveTreeFileName?: string; __lifeweaveTreeCapture?: boolean };
    if (state.__lifeweaveTreeCapture) return;
    state.__lifeweaveTreeCapture = true;
    const originalCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => { if (object instanceof Blob) state.__lifeweaveTreeBlob = object; return originalCreate(object as Blob); };
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) { if (this.download) state.__lifeweaveTreeFileName = this.download; return originalClick.call(this); };
  });
}

export async function capturedTreeDownload(): Promise<{ bytes: number[]; fileName: string }> {
  const result = await browser.execute(async () => {
    const state = window as unknown as { __lifeweaveTreeBlob?: Blob; __lifeweaveTreeFileName?: string };
    if (!state.__lifeweaveTreeBlob) return { ok: false, bytes: [] as number[], fileName: "" };
    return { ok: true, bytes: Array.from(new Uint8Array(await state.__lifeweaveTreeBlob.arrayBuffer())), fileName: state.__lifeweaveTreeFileName ?? "" };
  });
  expect(result.ok).toBe(true); expect(result.bytes.length).toBeGreaterThan(0); expect(result.fileName).toContain(".lifeweave-tree.zip");
  return { bytes: result.bytes, fileName: result.fileName };
}

export async function chooseTreeFile(bytes: number[]) {
  await browser.execute((values: number[]) => {
    const input = document.querySelector<HTMLInputElement>("section[aria-label='Life tree interchange'] input[type='file']");
    if (!input) throw new Error("tree file input is missing");
    const transfer = new DataTransfer(); transfer.items.add(new File([new Uint8Array(values)], "lifeweave-tree.zip", { type: "application/zip" }));
    input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
  }, bytes);
}

/** Reads both known roots beneath `parentTitle`, or beneath life-root when null. */
export async function readTreeState(parentTitle: string | null) {
  return browser.execute(async (parent: string | null, names: string[]) => {
    const [rootA, innerTitle, basicTitle, canvasTitle, emptyTitle, rootB] = names;
    const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } }).__TAURI_INTERNALS__.invoke;
    type Node = { id: string; title: string };
    type Browse = { children: Node[]; child_page_count: number };
    const browse = async (nodeId: string) => {
      const first = await invoke<Browse>("get_life_browse_projection", { input: { node_id: nodeId, child_page: 0 } });
      const children = [...first.children];
      for (let index = 1; index < first.child_page_count; index++) children.push(...(await invoke<Browse>("get_life_browse_projection", { input: { node_id: nodeId, child_page: index } })).children);
      return children;
    };
    let container = "life-root";
    if (parent) { const holder = (await browse("life-root")).find((node) => node.title === parent); if (!holder) return { found: false }; container = holder.id; }
    const roots = await browse(container);
    const alpha = roots.find((node) => node.title === rootA); const beta = roots.find((node) => node.title === rootB);
    if (!alpha || !beta) return { found: false };
    const alphaChildren = await browse(alpha.id); const inner = alphaChildren.find((node) => node.title === innerTitle);
    const innerChildren = inner ? await browse(inner.id) : [];
    const basic = innerChildren.find((node) => node.title === basicTitle); const canvas = innerChildren.find((node) => node.title === canvasTitle);
    const document = basic ? await invoke<{ document: { id: string } | null }>("get_reader_document", { input: { life_node_id: basic.id } }) : { document: null };
    const panel = basic ? await invoke<{ outgoing: Array<{ title: string }> }>("get_life_link_panel", { input: { source_node_id: basic.id } }) : { outgoing: [] as Array<{ title: string }> };
    return { found: true, rootAId: alpha.id, rootBId: beta.id, basicId: basic?.id ?? "", canvasId: canvas?.id ?? "", rootTitles: roots.map((node) => node.title), alphaChildTitles: alphaChildren.map((node) => node.title), innerTitles: innerChildren.map((node) => node.title), hasBasicDocument: Boolean(document.document), outgoing: panel.outgoing.map((row) => row.title), expected: { rootA, rootB, innerTitle, basicTitle, canvasTitle, emptyTitle } };
  }, parentTitle, [TREE_ROOT_A, TREE_INNER, TREE_BASIC, TREE_CANVAS, TREE_EMPTY, TREE_ROOT_B]);
}
