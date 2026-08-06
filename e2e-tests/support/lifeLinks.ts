import { $, browser, expect } from "@wdio/globals";

export const LINK_ALPHA = "E2E Link Alpha";
export const LINK_BETA = "E2E Link Beta";
export const LINK_GAMMA = "E2E Link Gamma";
export const MUTATED_BETA = "E2E Link Beta Mutated";

type Browse = {
  tree_revision: number;
  children: Array<{ id: string; title: string }>;
};

export async function establishLinkLeaves() {
  const result = await browser.execute(async (titles: string[]) => {
    const invoke = (window as unknown as {
      __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> };
    }).__TAURI_INTERNALS__.invoke;
    let browse = await invoke<Browse>("get_life_browse_projection", {
      input: { node_id: "life-root", child_page: 0 },
    });
    const ids: string[] = [];
    for (const [index, title] of titles.entries()) {
      let node = browse.children.find((child) => child.title === title);
      if (!node) {
        const created = await invoke<{ node: { id: string; title: string }; tree_revision: number }>(
          "create_life_node",
          {
            input: {
              context: { operation_id: `e2e-life-link-node-${index}`, expected_tree_revision: browse.tree_revision },
              parent_id: "life-root",
              title,
              short_description: `${title} stable description`,
              icon_key: "life-leaf",
              theme_variant: "neutral",
            },
          },
        );
        node = created.node;
        browse = await invoke<Browse>("get_life_browse_projection", {
          input: { node_id: "life-root", child_page: 0 },
        });
      }
      ids.push(node.id);
      const projection = await invoke<{ document: { id: string } | null }>("get_reader_document", {
        input: { life_node_id: node.id },
      });
      if (!projection.document) {
        await invoke("create_reader_document", {
          input: { life_node_id: node.id, operation_id: `e2e-life-link-document-${index}` },
        });
      }
    }
    return ids;
  }, [LINK_ALPHA, LINK_BETA, LINK_GAMMA]);
  expect(result).toHaveLength(3);
  return result;
}

export const linksPanel = () => $("section[aria-labelledby='life-links-heading']");

export async function openLifeRoot() {
  await $("button[aria-label='Life System']").click();
  const reader = $("section[aria-labelledby='life-reader-title']");
  if (await reader.isExisting()) {
    await reader.$("button*=Back to Life Browse").click();
  }
  await expect($("h1=Life System")).toBeDisplayed();
  const browseButton = $("button=Browse");
  if (await browseButton.isExisting()) await browseButton.click();
  const rootCrumb = $("//nav[@aria-label='Life breadcrumb']//button[normalize-space()='Life']");
  if (await rootCrumb.isExisting()) await rootCrumb.click();
}

export async function openReader(title: string) {
  await $("button[aria-label='Life System']").click();
  const current = $("section[aria-labelledby='life-reader-title']");
  if (await current.isExisting() && await current.$(`h1=${title}`).isExisting()) return current;
  await openLifeRoot();
  const card = $(`//button[@data-life-id][.//*[normalize-space()="${title}"]]`);
  await expect(card).toBeDisplayed();
  await card.click();
  const reader = $("section[aria-labelledby='life-reader-title']");
  await expect(reader.$(`h1=${title}`)).toBeDisplayed();
  return reader;
}

export async function addLink(targetTitle: string) {
  const panel = linksPanel();
  await expect(panel.$("h2=Links")).toBeDisplayed();
  await panel.$("button=Add link").click();
  const dialog = $("[role='dialog'][aria-modal='true']");
  await expect(dialog).toBeDisplayed();
  const query = dialog.$("//label[normalize-space()='Find a Life leaf']/following::input[1]");
  await query.setValue(targetTitle);
  await dialog.$("button=Search").click();
  const choice = dialog.$(`//label[contains(normalize-space(.), "${targetTitle}")]//input[@type='radio']`);
  await expect(choice).toBeDisplayed();
  await choice.click();
  await dialog.$("button=Confirm link").click();
  await expect(dialog).not.toExist();
  await expect(panel.$(`button[aria-label='Open ${targetTitle} in Life Reader']`)).toBeDisplayed();
}

export async function expectOutgoing(targetTitle: string) {
  const panel = linksPanel();
  await expect(panel.$(`button[aria-label='Open ${targetTitle} in Life Reader']`)).toBeDisplayed();
}

export async function expectBacklink(sourceTitle: string) {
  const backlinks = $("section[aria-labelledby='backlinks-heading']");
  await expect(backlinks.$(`button[aria-label='Open ${sourceTitle} in Life Reader']`)).toBeDisplayed();
}
