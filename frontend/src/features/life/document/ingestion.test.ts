import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { DOMParser as PMDOMParser, DOMSerializer, Fragment, Slice } from "@tiptap/pm/model";
import type { Schema } from "@tiptap/pm/model";

const convert = vi.fn();
vi.mock("../../../ipc/commands", () => ({ convertMarkdownFragment: (input: unknown) => convert(input) }));

const { basicLeafExtensions } = await import("./BasicLeafEditor");
const { repairSlice, reportMessage, sliceFromCanonical, isSupportedMath } = await import("./ingestion");

function makeEditor(content: unknown = "<p></p>") {
  const element = window.document.createElement("div");
  window.document.body.appendChild(element);
  const editor = new Editor({ element, extensions: basicLeafExtensions, content: content as never });
  return {
    editor,
    dispose: () => { editor.destroy(); element.remove(); },
  };
}

/** Parse an HTML string into a slice the way ProseMirror parses the clipboard. */
function sliceFromHtml(html: string, schema: Schema): Slice {
  const parsed = new window.DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return PMDOMParser.fromSchema(schema).parseSlice(parsed.body, { preserveWhitespace: true });
}

/** Serialize a document the way ProseMirror writes the clipboard. */
function htmlFromDocument(editor: Editor): string {
  const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(editor.state.doc.content);
  const holder = window.document.createElement("div");
  holder.appendChild(fragment);
  return holder.outerHTML;
}

/**
 * Run HTML through the gateway exactly as a paste or a drop does, and report what it
 * produced. The slice is the unit under test: where ProseMirror then places it is its own
 * concern and would only hide what the gateway decided.
 */
function paste(editor: Editor, html: string) {
  const transform = editor.view.someProp("transformPasted") as (slice: Slice) => Slice;
  expect(transform, "the gateway must be installed").toBeTypeOf("function");
  return JSON.stringify(transform(sliceFromHtml(html, editor.schema)).content.toJSON() ?? null);
}

/** A clipboard that answers only for the flavour it was given, as a real one does. */
function clipboard(flavours: Record<string, string>) {
  const event = new Event("paste") as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: { getData: (type: string) => flavours[type] ?? "" },
  });
  return event;
}

describe("the ingestion gateway keeps the editor inside the canonical contract", () => {
  it("does not let a foreign image become a node the backend would refuse", () => {
    // A remote picture parsed as an image with no assetId, and every later save failed
    // validation with nothing to point at. The image is now not stored at all, and said so.
    const { editor, dispose } = makeEditor();
    const json = paste(editor, `<p>before</p><img src="https://example.com/x.png" alt="pic">`);
    expect(json).not.toContain("\"image\"");
    expect(json).toContain("before");
    dispose();
  });

  it("keeps an image that names a local asset", () => {
    const id = "00000000-0000-7000-8000-000000000001";
    const { editor, dispose } = makeEditor();
    const json = paste(editor, `<img data-asset-id="${id}" src="asset:${id}" alt="local">`);
    expect(json).toContain(id);
    dispose();
  });

  it("carries a callout's variant through the editor's own copy and paste", () => {
    // The variant had no reader, so copying a warning produced a note: the document said
    // something different afterwards and nothing reported the change.
    const source = makeEditor({
      type: "doc",
      content: [{ type: "callout", attrs: { variant: "warning" }, content: [{ type: "paragraph", content: [{ type: "text", text: "warn" }] }] }],
    });
    const html = htmlFromDocument(source.editor);
    source.dispose();
    const target = makeEditor();
    expect(paste(target.editor, html)).toContain("\"variant\":\"warning\"");
    target.dispose();
  });

  it("clears a code language the canonical schema would refuse and keeps the code", () => {
    const { editor, dispose } = makeEditor();
    const json = paste(editor, `<pre><code class="language-${"a".repeat(60)}">keep me</code></pre>`);
    expect(json).toContain("keep me");
    expect(json).not.toContain("aaaaaaaaaa");
    dispose();
  });

  it("clears an alignment value that is not one of the three the schema allows", () => {
    const { editor, dispose } = makeEditor();
    const json = paste(editor, `<table><tbody><tr><th style="text-align:justify">A</th></tr></tbody></table>`);
    expect(json).toContain("\"align\":null");
    dispose();
  });

  it("refuses a formula whose source carries the delimiter that would close it", () => {
    expect(isSupportedMath("inlineMath", "a$b")).toBe(false);
    expect(isSupportedMath("inlineMath", "a\nb")).toBe(false);
    expect(isSupportedMath("mathBlock", "a$$b")).toBe(false);
    expect(isSupportedMath("inlineMath", "")).toBe(false);
    expect(isSupportedMath("inlineMath", "x^2")).toBe(true);
    expect(isSupportedMath("mathBlock", "a$b")).toBe(true);
  });

  it("carries a formula through the editor's own copy and paste", () => {
    const source = makeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "see " }, { type: "inlineMath", attrs: { source: "x^2" } }] },
        { type: "mathBlock", attrs: { source: "\\sum_i i" } },
      ],
    });
    const html = htmlFromDocument(source.editor);
    source.dispose();
    const target = makeEditor();
    const json = paste(target.editor, html);
    expect(json).toContain("\"source\":\"x^2\"");
    expect(json).toContain("\\\\sum_i i");
    target.dispose();
  });

  it("reports what it changed instead of changing it silently", () => {
    const { editor, dispose } = makeEditor();
    // A foreign picture no longer parses as an image at all, so the node is built directly
    // here: the repair pass has to refuse it too, not only the parse rule in front of it.
    const stray = editor.schema.nodes.image!.create({ assetId: null, src: "https://example.com/x.png" });
    const { slice, report } = repairSlice(new Slice(Fragment.from(stray), 0, 0));
    dispose();

    expect(slice.content.childCount).toBe(0);
    expect(report.droppedImages).toBe(1);
    expect(reportMessage(report)).toContain("Add image");
    expect(reportMessage({ droppedImages: 0, clampedLanguages: 0, clampedAttributes: 0, droppedMath: 0 })).toBeUndefined();
  });
});

describe("the Markdown paste route shares its authority with file import", () => {
  it("sends the clipboard text to the Rust authority exactly as it was written", async () => {
    // Any trimming or newline rewriting here would make a pasted document mean something
    // different from the same file imported, which is the whole point of the shared route.
    const source = "# Title\n\n- [ ] task  \n  continued\n\n\ttabbed\n";
    convert.mockResolvedValue({
      canonical_json: JSON.stringify({ type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] }] }),
      diagnostics: [],
    });
    const { editor, dispose } = makeEditor();
    const view = editor.view;

    view.someProp("handleKeyDown", handler =>
      handler(view, new KeyboardEvent("keydown", { key: "v", ctrlKey: true, shiftKey: true })),
    );
    const handled = view.someProp("handlePaste", handler =>
      handler(view, clipboard({ "text/plain": source }), Slice.empty),
    );

    expect(handled).toBe(true);
    expect(convert).toHaveBeenCalledWith({ markdown: source });
    await vi.waitFor(() => expect(JSON.stringify(editor.getJSON())).toContain("Title"));
    dispose();
  });

  it("leaves an ordinary paste literal so typed characters are never reinterpreted", () => {
    convert.mockClear();
    const { editor, dispose } = makeEditor();
    const view = editor.view;
    const handled = view.someProp("handlePaste", handler =>
      handler(view, clipboard({ "text/plain": "# not a heading" }), Slice.empty),
    );
    expect(handled).toBeFalsy();
    expect(convert).not.toHaveBeenCalled();
    dispose();
  });

  it("places canonical content from the authority without wrapping it in a stray block", () => {
    const { editor, dispose } = makeEditor();
    const slice = sliceFromCanonical(
      JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] }),
      editor.schema,
    );
    expect(slice.content.childCount).toBe(1);
    expect(slice.content.firstChild?.type.name).toBe("paragraph");
    dispose();
  });
});
