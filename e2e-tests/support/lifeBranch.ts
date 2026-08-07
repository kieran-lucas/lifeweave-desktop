import { $, browser, expect } from "@wdio/globals";

export const BRANCH_ROOT = "E2E Branch Root";
export const BRANCH_INNER = "E2E Branch Inner";
export const BRANCH_BASIC = "E2E Branch Basic";
export const BRANCH_CANVAS = "E2E Branch Canvas";
export const BRANCH_EMPTY = "E2E Branch Empty";
export const BRANCH_OUTSIDE = "E2E Branch Outside";
export const BRANCH_DESTINATION = "E2E Branch Destination";
export const BRANCH_TAG_SHARED = "E2E Branch Shared Tag";
export const BRANCH_TAG_NEW = "E2E Branch New Tag";

type Invoke = <T>(command: string, payload?: unknown) => Promise<T>;
type Fixture = { ok: boolean; stage: string; error: string; rootId: string; destinationId: string };

/**
 * Builds the source scenario through established raw IPC. Product behaviour under test — preview,
 * destination choice, confirmation, and post-import navigation — is exercised only through the UI.
 *
 * ```text
 * Life root ─ E2E Branch Root ─ E2E Branch Inner ─ E2E Branch Basic  (Basic Leaf)
 *           │                                    ─ E2E Branch Canvas (Narrative Canvas)
 *           │                 ─ E2E Branch Empty (empty leaf)
 *           ├ E2E Branch Outside (Basic Leaf, link target outside the branch)
 *           └ E2E Branch Destination (import destination)
 * ```
 */
export async function establishBranchFixture(): Promise<Fixture> {
  const result = await browser.execute(async (names: string[]) => {
    const [root, inner, basic, canvas, empty, outside, destination, sharedTag, newTag] = names;
    let stage = "start";
    try {
      const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } })
        .__TAURI_INTERNALS__.invoke;
      type Child = { id: string; title: string; revision: number };
      type Browse = { tree_revision: number; children: Child[]; child_page_count: number };
      const browse = (nodeId: string, page = 0) =>
        invoke<Browse>("get_life_browse_projection", {
          input: { node_id: nodeId, child_page: page },
        });
      // Life Browse pages children 8 at a time, and earlier phases leave the Life root well past
      // one page, so every lookup walks all pages rather than trusting page 0.
      const allChildren = async (nodeId: string) => {
        const first = await browse(nodeId);
        const children = [...first.children];
        for (let page = 1; page < first.child_page_count; page++) {
          children.push(...(await browse(nodeId, page)).children);
        }
        return { children, treeRevision: first.tree_revision };
      };

      let counter = 0;
      const ensureNode = async (parentId: string, title: string) => {
        const current = await allChildren(parentId);
        const existing = current.children.find((child) => child.title === title);
        if (existing) return existing.id;
        const created = await invoke<{ node: { id: string } }>("create_life_node", {
          input: {
            context: {
              operation_id: `e2e-branch-node-${title.replace(/\W+/g, "-")}-${counter++}`,
              expected_tree_revision: current.treeRevision,
            },
            parent_id: parentId,
            title,
            short_description: `${title} description`,
            icon_key: "life-branch",
            theme_variant: "neutral",
          },
        });
        return created.node.id;
      };

      stage = "life nodes";
      const rootId = await ensureNode("life-root", root!);
      const innerId = await ensureNode(rootId, inner!);
      const basicId = await ensureNode(innerId, basic!);
      const canvasId = await ensureNode(innerId, canvas!);
      const emptyId = await ensureNode(rootId, empty!);
      const outsideId = await ensureNode("life-root", outside!);
      const destinationId = await ensureNode("life-root", destination!);

      stage = "basic leaf documents";
      for (const [index, nodeId] of [basicId, outsideId].entries()) {
        const projection = await invoke<{ document: { id: string } | null }>("get_reader_document", {
          input: { life_node_id: nodeId },
        });
        if (!projection.document) {
          await invoke("create_reader_document", {
            input: { life_node_id: nodeId, operation_id: `e2e-branch-basic-${index}` },
          });
        }
      }

      stage = "narrative canvas document";
      const canvasProjection = await invoke<{ document: { id: string } | null }>(
        "get_narrative_document",
        { input: { life_node_id: canvasId } },
      );
      if (!canvasProjection.document) {
        await invoke("create_narrative_document", {
          input: {
            life_node_id: canvasId,
            operation_id: "e2e-branch-canvas",
            template_id: "knowledge_dossier",
          },
        });
      }

      stage = "tags";
      const tags = await invoke<Array<{ id: string; name: string }>>("list_tags", {
        includeArchived: false,
      });
      const ensureTag = async (name: string) => {
        const existing = tags.find((tag) => tag.name === name);
        if (existing) return existing.id;
        const created = await invoke<{ id: string }>("create_tag", { input: { name } });
        return created.id;
      };
      const sharedTagId = await ensureTag(sharedTag!);
      const newTagId = await ensureTag(newTag!);
      const inners = await allChildren(innerId);
      const basicNode = inners.children.find((child) => child.id === basicId);
      if (!basicNode) throw new Error("basic leaf disappeared before tagging");
      await invoke("set_life_node_tags", {
        input: {
          node_id: basicId,
          tag_ids: [sharedTagId, newTagId],
          expected_node_revision: basicNode.revision,
        },
      });

      stage = "links";
      const panel = await invoke<{ outgoing: Array<{ endpoint_node_id: string }> }>(
        "get_life_link_panel",
        { input: { source_node_id: basicId } },
      );
      const linked = new Set(panel.outgoing.map((row) => row.endpoint_node_id));
      // One link stays inside the branch and must travel; one leaves it and must not.
      if (!linked.has(canvasId)) {
        await invoke("create_life_link", {
          input: { source_node_id: basicId, target_node_id: canvasId },
        });
      }
      if (!linked.has(outsideId)) {
        await invoke("create_life_link", {
          input: { source_node_id: basicId, target_node_id: outsideId },
        });
      }

      stage = "done";
      return { ok: true, stage, error: "", rootId, destinationId };
    } catch (error) {
      return { ok: false, stage, error: String(error), rootId: "", destinationId: "" };
    }
  }, [
    BRANCH_ROOT, BRANCH_INNER, BRANCH_BASIC, BRANCH_CANVAS, BRANCH_EMPTY,
    BRANCH_OUTSIDE, BRANCH_DESTINATION, BRANCH_TAG_SHARED, BRANCH_TAG_NEW,
  ]);
  expect(result.ok).toBe(true);
  expect(result.stage).toBe("done");
  return result;
}

/** Opens Life Edit and selects the node card with the given title. */
export async function openLifeEdit(title: string) {
  await $("button[aria-label='Life System']").click();
  const reader = $("section[aria-labelledby='life-reader-title']");
  if (await reader.isExisting()) await reader.$("button*=Back to Life Browse").click();
  const editButton = $("button=Edit");
  if (await editButton.isExisting()) await editButton.click();
  await selectNode(title);
}

export async function selectNode(title: string) {
  const card = $(`//button[@data-life-edit-id][.//*[normalize-space()="${title}"]]`);
  await expect(card).toBeDisplayed();
  await card.click();
  await expect($(`h2=Edit ${title}`)).toBeDisplayed();
}

export const branchControls = () => $("section[aria-label='Life branch interchange']");
export const importDialog = () => $("section[role='dialog'][aria-modal='true']");

/**
 * Intercepts the Blob the product's own export path creates, and records the download file name.
 *
 * Export still runs entirely through the `Export branch` button: this only captures the bytes the
 * product already produced, because a WebView download cannot be read back under WebDriver. It adds
 * no production code path and never bypasses preview or confirmation.
 */
export async function installBranchDownloadCapture() {
  await browser.execute(() => {
    const anyWindow = window as unknown as {
      __lifeweaveBranchBlob?: Blob;
      __lifeweaveBranchFileName?: string;
      __lifeweaveCaptureInstalled?: boolean;
    };
    if (anyWindow.__lifeweaveCaptureInstalled) return;
    anyWindow.__lifeweaveCaptureInstalled = true;
    const originalCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      if (object instanceof Blob) anyWindow.__lifeweaveBranchBlob = object;
      return originalCreate(object as Blob);
    };
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patched(this: HTMLAnchorElement) {
      if (this.download) anyWindow.__lifeweaveBranchFileName = this.download;
      return originalClick.call(this);
    };
  });
}

/** Reads back the bytes the product's export download produced. */
export async function capturedBranchDownload(): Promise<{ bytes: number[]; fileName: string }> {
  const result = await browser.execute(async () => {
    const anyWindow = window as unknown as {
      __lifeweaveBranchBlob?: Blob;
      __lifeweaveBranchFileName?: string;
    };
    const blob = anyWindow.__lifeweaveBranchBlob;
    if (!blob) return { ok: false, bytes: [] as number[], fileName: "" };
    return {
      ok: true,
      bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
      fileName: anyWindow.__lifeweaveBranchFileName ?? "",
    };
  });
  expect(result.ok).toBe(true);
  expect(result.bytes.length).toBeGreaterThan(0);
  expect(result.fileName).toContain(".lifeweave-branch.zip");
  return { bytes: result.bytes, fileName: result.fileName };
}

/** Drops the exported bytes onto the hidden file input so the product preview dialog opens. */
export async function chooseBranchFile(bytes: number[]) {
  await browser.execute((values: number[]) => {
    const input = document.querySelector<HTMLInputElement>(
      "section[aria-label='Life branch interchange'] input[type='file']",
    );
    if (!input) throw new Error("branch file input is missing");
    const file = new File([new Uint8Array(values)], "branch.lifeweave-branch.zip", {
      type: "application/zip",
    });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, bytes);
}

/**
 * Reads one branch by its exact position: the branch titled `rootTitle` directly under
 * `parentTitle`, or directly under the Life root when `parentTitle` is null.
 *
 * Both the source copy and the imported copy are read through the same shape, so a fresh-identity
 * assertion compares two genuinely resolved nodes rather than one node and an empty string.
 */
export async function readBranchState(parentTitle: string | null, rootTitle: string) {
  return browser.execute(async (parent: string | null, title: string) => {
    const invoke = (window as unknown as { __TAURI_INTERNALS__: { invoke: Invoke } })
      .__TAURI_INTERNALS__.invoke;
    type Node = { id: string; title: string };
    type Browse = { selected: Node; children: Node[]; child_page_count: number };
    const page = (nodeId: string, index: number) =>
      invoke<Browse>("get_life_browse_projection", {
        input: { node_id: nodeId, child_page: index },
      });
    // Children are paged 8 at a time; a branch can sit on any page.
    const browse = async (nodeId: string) => {
      const first = await page(nodeId, 0);
      const children = [...first.children];
      for (let index = 1; index < first.child_page_count; index++) {
        children.push(...(await page(nodeId, index)).children);
      }
      return { children };
    };

    const missing = {
      found: false,
      branchId: "",
      branchTitle: "",
      childTitles: [] as string[],
      innerTitles: [] as string[],
      basicId: "",
      outgoing: [] as string[],
    };

    let containerId = "life-root";
    if (parent) {
      const root = await browse("life-root");
      const holder = root.children.find((child) => child.title === parent);
      if (!holder) return missing;
      containerId = holder.id;
    }
    const container = await browse(containerId);
    const branch = container.children.find((child) => child.title === title);
    if (!branch) return missing;

    const children = (await browse(branch.id)).children;
    const inner = children.find((child) => child.title.includes("Inner"));
    const innerChildren = inner ? (await browse(inner.id)).children : [];
    const basic = innerChildren.find((child) => child.title.includes("Basic"));
    const panel = basic
      ? await invoke<{ outgoing: Array<{ title: string }> }>("get_life_link_panel", {
          input: { source_node_id: basic.id },
        })
      : { outgoing: [] as Array<{ title: string }> };
    return {
      found: true,
      branchId: branch.id,
      branchTitle: branch.title,
      childTitles: children.map((child) => child.title),
      innerTitles: innerChildren.map((child) => child.title),
      basicId: basic?.id ?? "",
      outgoing: panel.outgoing.map((row) => row.title),
    };
  }, parentTitle, rootTitle);
}
