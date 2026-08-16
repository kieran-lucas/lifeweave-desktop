import { readFileSync } from "node:fs";

const fixture = readFileSync(
  new URL("../../src-tauri/src/document/fixtures/housing_markdown_regression.md", import.meta.url),
  "utf8",
);

describe("Phase 21 — Markdown import fidelity", () => {
  it("imports the Housing regression fixture through the real file control and renders canonical semantics", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    const setup = await browser.execute(async () => {
      const invoke = (window as unknown as {
        __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> };
      }).__TAURI_INTERNALS__.invoke;
      const root = await invoke<{ tree_revision: number }>("get_life_browse_projection", {
        input: { node_id: null, child_page: 0 },
      });
      const created = await invoke<{ node: { id: string } }>("create_life_node", {
        input: {
          context: {
            operation_id: "e2e-markdown-node",
            expected_tree_revision: root.tree_revision,
          },
          parent_id: "life-root",
          title: "Markdown Housing Regression",
          short_description: "CommonMark and GFM import verification",
          icon_key: "life-leaf",
          theme_variant: "neutral",
        },
      });
      await invoke("create_reader_document", {
        input: {
          life_node_id: created.node.id,
          operation_id: "e2e-markdown-document",
        },
      });
      return created.node.id;
    });
    expect(setup).toMatch(/[0-9a-f-]{36}/);

    await $("button[aria-label='Life System']").click();
    const leaf = $("//button[@data-life-id][.//*[normalize-space()='Markdown Housing Regression']]");
    await expect(leaf).toBeDisplayed();
    await leaf.click();
    const reader = $("article[data-life-reader]");
    await expect(reader.$("h1=Markdown Housing Regression")).toBeDisplayed();

    await $('summary[aria-label="More leaf actions"]').click();
    const input = $("input[type='file'][accept='text/markdown,.md']");
    await expect(input).toExist();
    await browser.execute((markdown) => {
      const control = document.querySelector<HTMLInputElement>("input[type='file'][accept='text/markdown,.md']");
      if (!control) throw new Error("Markdown file input is missing");
      const transfer = new DataTransfer();
      transfer.items.add(new File([markdown], "housing-regression.md", { type: "text/markdown" }));
      Object.defineProperty(control, "files", { configurable: true, value: transfer.files });
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }, fixture);

    // Task state, rules, fence languages and cell alignment became schema nodes, so this
    // fixture no longer degrades anything and reports no fallbacks at all.
    //
    // Scoped to the Reader's own body. A bare `[role='status']` resolves to the first status
    // region on the page, which — before the import round trip has set the notice — is the
    // empty one inside the collapsed "Related" disclosure; the matcher then polls that same
    // element for its whole timeout instead of re-querying for the notice.
    await expect($("[data-life-document-body] p[role='status']"))
      .toHaveText(expect.stringContaining("supported formatting preserved"));
    await expect($("ul[aria-label='Markdown import fallbacks']")).not.toExist();

    const rendered = await browser.execute(() => {
      const article = document.querySelector<HTMLElement>("article[aria-label='Leaf document']");
      if (!article) throw new Error("Static Reader article is missing");
      const text = article.textContent ?? "";
      const ordered = Array.from(article.querySelectorAll<HTMLOListElement>("ol"));
      return {
        literalBoldDelimiter: text.includes("**"),
        escapedTildeLeak: text.includes("\\~"),
        trailingBackslashLeak: text.includes("lõi.\\"),
        phantomAsterisk: Array.from(article.querySelectorAll("p")).some(
          (paragraph) => paragraph.textContent?.trim() === "*",
        ),
        strongCount: article.querySelectorAll("strong").length,
        emphasisCount: article.querySelectorAll("em").length,
        inlineCodeCount: article.querySelectorAll("p code, blockquote code, td code, li code").length,
        strikeCount: article.querySelectorAll("s").length,
        quoteStrongCount: article.querySelectorAll("blockquote strong").length,
        orderedStarts: ordered.map((list) => list.start),
        topOrderedItemCounts: ordered
          .filter((list) => !list.parentElement?.closest("ol"))
          .map((list) => Array.from(list.children).filter((child) => child.tagName === "LI").length),
        checkboxes: Array.from(article.querySelectorAll<HTMLInputElement>("input[type='checkbox']")).map(
          (box) => box.checked,
        ),
        uncheckedGlyphLeak: text.includes("☐") || text.includes("☒"),
        hasHardBreak: article.querySelector("br") !== null,
        hasTable: article.querySelector("table") !== null,
        tableBold: article.querySelector("td strong")?.textContent === "Self use",
        diagramSource: article.querySelector("figure pre code")?.textContent ?? "",
        diagramRendered: article.querySelector("figure svg") !== null,
      };
    });

    expect(rendered.literalBoldDelimiter).toBe(false);
    expect(rendered.escapedTildeLeak).toBe(false);
    expect(rendered.trailingBackslashLeak).toBe(false);
    expect(rendered.phantomAsterisk).toBe(false);
    expect(rendered.strongCount).toBeGreaterThanOrEqual(8);
    expect(rendered.emphasisCount).toBeGreaterThanOrEqual(3);
    expect(rendered.inlineCodeCount).toBeGreaterThanOrEqual(4);
    expect(rendered.strikeCount).toBe(1);
    expect(rendered.quoteStrongCount).toBeGreaterThanOrEqual(2);
    expect(rendered.orderedStarts).toContain(1);
    expect(rendered.orderedStarts).toContain(4);
    expect(rendered.topOrderedItemCounts).toEqual([3, 2]);
    expect(rendered.checkboxes).toEqual([false, true, true]);
    expect(rendered.uncheckedGlyphLeak).toBe(false);
    expect(rendered.hasHardBreak).toBe(true);
    expect(rendered.hasTable).toBe(true);
    expect(rendered.tableBold).toBe(true);
    // The fence is a diagram here: the picture is drawn and the authored source stays with
    // it, so a diagram is never the only copy of its own text.
    expect(rendered.diagramRendered).toBe(true);
    expect(rendered.diagramSource).toContain("flowchart LR\nA --> B");
    await expect($("[role='alert']")).not.toExist();
  });
});
