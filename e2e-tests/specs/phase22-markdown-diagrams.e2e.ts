/**
 * Phase 22 — diagram rendering and its security boundary, in a real WebView2.
 *
 * The diagram engine measures text with `getComputedTextLength` and `getBBox`, which jsdom
 * does not implement, so the engine's own output can only be produced by a real browser
 * engine. The sanitizer has unit tests of its own against fixed input; what this phase
 * proves is the part those cannot: that the engine's *actual* output passes through the
 * boundary intact, and that hostile diagram source produces no script, no request, no
 * navigation and no surviving markup.
 */
const markdown = [
  "# Diagrams",
  "",
  "## Flowchart",
  "",
  "```mermaid",
  "flowchart LR",
  "  A[Start] --> B{Choice}",
  "  B -->|yes| C[Finish]",
  "  B -->|no| A",
  "```",
  "",
  "## Sequence",
  "",
  "```mermaid",
  "sequenceDiagram",
  "  Alice->>Bob: Question",
  "  Bob-->>Alice: Answer",
  "```",
  "",
  "## State",
  "",
  "```mermaid",
  "stateDiagram-v2",
  "  [*] --> Idle",
  "  Idle --> Working",
  "  Working --> [*]",
  "```",
  "",
  "## Malformed",
  "",
  "```mermaid",
  "flowchart LR",
  "  A --> ",
  "```",
  "",
  "## Hostile labels",
  "",
  "```mermaid",
  "flowchart LR",
  '  X["<img src=\'https://example.invalid/probe.png\' onerror=\'window.__lwPwned=1\'>"] --> Y',
  '  Y["<script>window.__lwPwned=2</script>"] --> Z',
  '  Z["<iframe src=\'https://example.invalid/frame\'></iframe>"] --> X',
  "  click X \"https://example.invalid/clicked\" _blank",
  "```",
  "",
  "## Unknown diagram type",
  "",
  "```mermaid",
  "notARealDiagramType",
  "  a --> b",
  "```",
  "",
].join("\n");

describe("Phase 22 — Markdown diagrams render safely", () => {
  it("draws real diagrams, contains hostile ones, and keeps every source recoverable", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    // Record every resource request and any attempt to navigate, before anything renders.
    await browser.execute(() => {
      const probe = window as unknown as {
        __lwRequests?: string[];
        __lwNavigations?: string[];
      };
      probe.__lwRequests = [];
      probe.__lwNavigations = [];
      const originalOpen = window.open.bind(window);
      window.open = ((url?: string | URL) => {
        probe.__lwNavigations!.push(String(url ?? ""));
        return null;
      }) as typeof originalOpen;
      const originalImage = window.Image;
      window.Image = class extends originalImage {
        set src(value: string) {
          probe.__lwRequests!.push(value);
          super.src = value;
        }
        get src() { return super.src; }
      } as typeof Image;
    });

    const nodeId = await browser.execute(async () => {
      const invoke = (window as unknown as {
        __TAURI_INTERNALS__: { invoke: <T>(command: string, payload?: unknown) => Promise<T> };
      }).__TAURI_INTERNALS__.invoke;
      const root = await invoke<{ tree_revision: number }>("get_life_browse_projection", {
        input: { node_id: null, child_page: 0 },
      });
      const created = await invoke<{ node: { id: string } }>("create_life_node", {
        input: {
          context: { operation_id: "e2e-diagram-node", expected_tree_revision: root.tree_revision },
          parent_id: "life-root",
          title: "Markdown Diagrams",
          short_description: "Diagram rendering and sanitizer verification",
          icon_key: "life-leaf",
          theme_variant: "neutral",
        },
      });
      await invoke("create_reader_document", {
        input: { life_node_id: created.node.id, operation_id: "e2e-diagram-document" },
      });
      return created.node.id;
    });
    expect(nodeId).toMatch(/[0-9a-f-]{36}/);

    await $("button[aria-label='Life System']").click();
    const leaf = $("//button[@data-life-id][.//*[normalize-space()='Markdown Diagrams']]");
    await expect(leaf).toBeDisplayed();
    await leaf.click();
    await expect($("article[data-life-reader]")).toBeDisplayed();

    await $('summary[aria-label="More leaf actions"]').click();
    await expect($("input[type='file'][accept='text/markdown,.md']")).toExist();
    await browser.execute((source) => {
      const control = document.querySelector<HTMLInputElement>("input[type='file'][accept='text/markdown,.md']");
      if (!control) throw new Error("Markdown file input is missing");
      const transfer = new DataTransfer();
      transfer.items.add(new File([source], "diagrams.md", { type: "text/markdown" }));
      Object.defineProperty(control, "files", { configurable: true, value: transfer.files });
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }, markdown);

    // The engine is a lazily loaded chunk and each diagram is drawn asynchronously.
    await browser.waitUntil(
      async () => (await $$("article[aria-label='Leaf document'] figure svg")).length >= 3,
      { timeout: 30_000, timeoutMsg: "diagrams did not render in the WebView" },
    );

    const audit = await browser.execute(() => {
      const article = document.querySelector<HTMLElement>("article[aria-label='Leaf document']");
      if (!article) throw new Error("Reader article is missing");
      const figures = Array.from(article.querySelectorAll("figure"));
      const svgs = Array.from(article.querySelectorAll("figure svg"));
      const probe = window as unknown as {
        __lwPwned?: number;
        __lwRequests?: string[];
        __lwNavigations?: string[];
      };
      const forbidden = ["script", "style", "iframe", "object", "embed", "image", "a", "foreignObject", "use", "animate"];
      return {
        figureCount: figures.length,
        svgCount: svgs.length,
        shapeCount: svgs.reduce((total, svg) => total + svg.querySelectorAll("rect, path, circle, polygon, line").length, 0),
        // Anything an allowlist should have removed, searched for inside the pictures.
        forbiddenInDiagrams: forbidden.filter((tag) =>
          svgs.some((svg) => svg.querySelector(tag) !== null),
        ),
        handlerAttributes: svgs.some((svg) =>
          Array.from(svg.querySelectorAll("*")).some((node) =>
            Array.from(node.attributes).some((attribute) => attribute.name.toLowerCase().startsWith("on")),
          ),
        ),
        hrefAttributes: svgs.some((svg) =>
          Array.from(svg.querySelectorAll("*")).some((node) =>
            Array.from(node.attributes).some((attribute) => /href|src/i.test(attribute.name)),
          ),
        ),
        styleElements: article.querySelectorAll("figure style").length,
        pwned: probe.__lwPwned ?? null,
        externalRequests: (probe.__lwRequests ?? []).filter((url) => /^https?:/i.test(url)),
        navigations: probe.__lwNavigations ?? [],
        performanceExternal: performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => /example\.invalid|^https?:\/\/(?!tauri\.localhost|ipc\.localhost)/i.test(name)),
        location: window.location.href,
        fallbackMessages: Array.from(article.querySelectorAll("figure [role='status']")).map(
          (node) => node.textContent ?? "",
        ),
        sources: Array.from(article.querySelectorAll("figure pre code")).map((node) => node.textContent ?? ""),
        articleText: article.textContent ?? "",
      };
    });

    // Every diagram block produced a figure; the well-formed ones produced pictures.
    expect(audit.figureCount).toBe(6);
    expect(audit.svgCount).toBeGreaterThanOrEqual(3);
    expect(audit.shapeCount).toBeGreaterThan(0);

    // The security boundary held against the engine's real output.
    expect(audit.forbiddenInDiagrams).toEqual([]);
    expect(audit.handlerAttributes).toBe(false);
    expect(audit.hrefAttributes).toBe(false);
    expect(audit.styleElements).toBe(0);
    expect(audit.pwned).toBeNull();

    // Nothing was fetched and nothing navigated.
    expect(audit.externalRequests).toEqual([]);
    expect(audit.navigations).toEqual([]);
    expect(audit.performanceExternal).toEqual([]);
    expect(audit.location).toContain("tauri.localhost");

    // A diagram that cannot be drawn says so and shows what the author wrote.
    expect(audit.fallbackMessages.length).toBeGreaterThanOrEqual(1);
    expect(audit.fallbackMessages.join(" ")).toContain("source is below");

    // Every diagram's source is recoverable, drawn or not.
    const allSources = audit.sources.join("\n");
    for (const expected of ["flowchart LR", "sequenceDiagram", "stateDiagram-v2", "notARealDiagramType"]) {
      expect(allSources).toContain(expected);
    }
    // The hostile label survives as the characters the author typed, never as markup.
    expect(allSources).toContain("<script>window.__lwPwned=2</script>");

    await expect($("[role='alert']")).not.toExist();
  });
});
