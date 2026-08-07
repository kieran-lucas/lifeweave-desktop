import { $, browser, expect } from "@wdio/globals";

export const GRAPH_PARENT = "E2E Graph Parent";
export const GRAPH_SOURCE = "E2E Graph Source";
export const GRAPH_TARGET = "E2E Graph Target";
export const GRAPH_SECOND = "E2E Graph Second";
export const GRAPH_EMPTY = "E2E Graph Empty";

type Browse = {
  tree_revision: number;
  children: Array<{ id: string; title: string }>;
};

/**
 * Idempotently establishes, under the Life root: one branch with a child, three documented leaves,
 * and one document-free leaf. Two explicit links are drawn from the source leaf.
 *
 * The document-free leaf exists to prove document classification through the UI — it must appear as
 * an empty leaf and must not be Reader-openable. It carries **no** link: Task 41 correctly refuses
 * to create one to an undocumented leaf, and there is no production path to remove a committed
 * document, so an unavailable edge cannot be constructed natively. That classification is proven by
 * the `life::graph` Rust tests instead, and the audit records the limitation.
 *
 * Links are created through raw IPC rather than the Links UI so that phase 15 exercises only the
 * graph. Task 41's own phases already cover link creation through the accessible UI.
 */
export async function establishGraphFixtures() {
  const result = await browser.execute(
    async (
      parentTitle: string,
      sourceTitle: string,
      targetTitle: string,
      secondTitle: string,
      emptyTitle: string,
    ) => {
      const invoke = (
        window as unknown as {
          __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> };
        }
      ).__TAURI_INTERNALS__.invoke;

      const browseRoot = () =>
        invoke<Browse>("get_life_browse_projection", {
          input: { node_id: "life-root", child_page: 0 },
        });

      let browse = await browseRoot();
      const ensure = async (parentId: string, title: string, slug: string) => {
        const scope =
          parentId === "life-root"
            ? browse
            : await invoke<Browse>("get_life_browse_projection", {
                input: { node_id: parentId, child_page: 0 },
              });
        const existing = scope.children.find(child => child.title === title);
        if (existing) return existing.id;
        const created = await invoke<{ node: { id: string }; tree_revision: number }>(
          "create_life_node",
          {
            input: {
              context: {
                operation_id: `e2e-life-graph-${slug}`,
                expected_tree_revision: scope.tree_revision,
              },
              parent_id: parentId,
              title,
              short_description: `${title} stable description`,
              icon_key: "life-leaf",
              theme_variant: "neutral",
            },
          },
        );
        browse = await browseRoot();
        return created.node.id;
      };

      const withDocument = async (nodeId: string, slug: string) => {
        const projection = await invoke<{ document: { id: string } | null }>(
          "get_reader_document",
          { input: { life_node_id: nodeId } },
        );
        if (!projection.document)
          await invoke("create_reader_document", {
            input: { life_node_id: nodeId, operation_id: `e2e-life-graph-doc-${slug}` },
          });
      };

      const parentId = await ensure("life-root", parentTitle, "parent");
      const childId = await ensure(parentId, `${parentTitle} Child`, "child");
      const sourceId = await ensure("life-root", sourceTitle, "source");
      const targetId = await ensure("life-root", targetTitle, "target");
      const secondId = await ensure("life-root", secondTitle, "second");
      const emptyId = await ensure("life-root", emptyTitle, "empty");
      await withDocument(sourceId, "source");
      await withDocument(targetId, "target");
      await withDocument(secondId, "second");
      // `emptyId` deliberately receives no document.

      const panel = await invoke<{ outgoing: Array<{ endpoint_node_id: string }> }>(
        "get_life_link_panel",
        { input: { source_node_id: sourceId } },
      );
      for (const endpoint of [targetId, secondId])
        if (!panel.outgoing.some(row => row.endpoint_node_id === endpoint))
          await invoke("create_life_link", {
            input: { source_node_id: sourceId, target_node_id: endpoint },
          });

      return { parentId, childId, sourceId, targetId, secondId, emptyId };
    },
    GRAPH_PARENT,
    GRAPH_SOURCE,
    GRAPH_TARGET,
    GRAPH_SECOND,
    GRAPH_EMPTY,
  );

  expect(typeof result.sourceId).toBe("string");
  expect(typeof result.emptyId).toBe("string");
  return result;
}

export async function openLifeSystem() {
  await $("button[aria-label='Life System']").click();
  const reader = $("section[aria-labelledby='life-reader-title']");
  if (await reader.isExisting()) await reader.$("button*=Back to Life Browse").click();
  await expect($("h1=Life System")).toBeDisplayed();
}

/** The semantic node selector is the accessibility authority for the graph. */
export const graphSelector = () => $("#life-graph-node-selector");

export async function graphOptionLabels() {
  // WebdriverIO's element-array `map` is chainable and resolves to a promise rather than an array,
  // so it cannot be handed to `Promise.all`. Read the labels sequentially instead.
  const options = await graphSelector().$$("option");
  const labels: string[] = [];
  for (const option of options) labels.push(await option.getText());
  return labels;
}

export async function selectGraphNode(title: string) {
  const labels = await graphOptionLabels();
  const label = labels.find(value => value.includes(title));
  if (!label) throw new Error(`no graph option for ${title}`);
  await graphSelector().selectByVisibleText(label);
}

export const connectionSection = (heading: string) =>
  $(`section[aria-labelledby='life-graph-${heading}-heading']`);

export async function openGraph() {
  await openLifeSystem();
  // The Graph action is a toggle, so clicking it while the graph is already open would close it.
  if (await $("h3=Life graph").isExisting()) return;
  const browseButton = $("button=Browse");
  if (await browseButton.isExisting()) await browseButton.click();
  await $("button=Graph").click();
  await expect($("h3=Life graph")).toBeDisplayed();
}

/** Reads the persisted Life mode straight from Rust, which is the authority the UI must respect. */
export async function persistedLifeMode() {
  return browser.execute(async () => {
    const invoke = (
      window as unknown as {
        __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> };
      }
    ).__TAURI_INTERNALS__.invoke;
    const browse = await invoke<{ preferred_mode: string }>("get_life_browse_projection", {
      input: { node_id: "life-root", child_page: 0 },
    });
    return browse.preferred_mode;
  });
}
