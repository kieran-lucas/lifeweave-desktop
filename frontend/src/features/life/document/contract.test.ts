import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";

vi.mock("../../../ipc/commands", () => ({ convertMarkdownFragment: vi.fn() }));

const { basicLeafExtensions } = await import("./BasicLeafEditor");

/**
 * The node and mark names `src-tauri/src/document/schema.rs` accepts.
 *
 * Kept here by hand on purpose: it is the assertion, not a derived value. If the editor
 * ever gains a node the validator does not know, the document it produces stops saving —
 * and the failure surfaces as a generic "Save failed" with nothing naming the cause. This
 * catches that at the point the extension is added instead.
 */
const CANONICAL_NODES = [
  "doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem",
  "taskList", "taskItem", "horizontalRule", "blockquote", "callout", "codeBlock",
  "hardBreak", "image", "table", "tableRow", "tableHeader", "tableCell",
  "inlineMath", "mathBlock",
];
const CANONICAL_MARKS = ["bold", "italic", "code", "strike", "link"];

function makeEditor() {
  const element = window.document.createElement("div");
  window.document.body.appendChild(element);
  const editor = new Editor({ element, extensions: basicLeafExtensions, content: "<p></p>" });
  return { editor, dispose: () => { editor.destroy(); element.remove(); } };
}

describe("the editor cannot produce a document the backend would refuse", () => {
  it("registers no node type outside the canonical schema", () => {
    const { editor, dispose } = makeEditor();
    const registered = Object.keys(editor.schema.nodes);
    dispose();
    expect(registered.filter(name => !CANONICAL_NODES.includes(name))).toEqual([]);
  });

  it("registers no mark type outside the canonical schema", () => {
    const { editor, dispose } = makeEditor();
    const registered = Object.keys(editor.schema.marks);
    dispose();
    expect(registered.filter(name => !CANONICAL_MARKS.includes(name))).toEqual([]);
  });

  it("offers every canonical node, so the Reader never meets one the editor cannot repair", () => {
    // The Reader's fallback tells the user to open Edit. That is only true advice while the
    // editor understands every node the authority can store.
    const { editor, dispose } = makeEditor();
    const registered = Object.keys(editor.schema.nodes);
    dispose();
    expect(CANONICAL_NODES.filter(name => !registered.includes(name))).toEqual([]);
  });

  it("keeps every canonical node through a load and a save", () => {
    // Loading canonical JSON and reading it back is what the editor does on every open and
    // every commit; a node that does not survive that is lost the first time it is edited.
    const source = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "T" }] },
        { type: "paragraph", content: [
          { type: "text", marks: [{ type: "bold" }, { type: "italic" }], text: "bi" },
          { type: "text", marks: [{ type: "code" }], text: "a|b" },
          { type: "text", marks: [{ type: "strike" }], text: "s" },
          { type: "text", marks: [{ type: "link", attrs: { href: "https://example.com/a b" } }], text: "l" },
          { type: "hardBreak" },
          { type: "inlineMath", attrs: { source: "x^2" } },
        ] },
        { type: "mathBlock", attrs: { source: "\\sum_i i" } },
        { type: "codeBlock", attrs: { language: "rust" }, content: [{ type: "text", text: "fn main(){}" }] },
        { type: "horizontalRule" },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "q" }] }] },
        { type: "callout", attrs: { variant: "warning" }, content: [{ type: "paragraph", content: [{ type: "text", text: "w" }] }] },
        { type: "orderedList", attrs: { start: 4 }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "o" }] }] }] },
        { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "t" }] }] }] },
        { type: "image", attrs: { assetId: "00000000-0000-7000-8000-000000000001", src: "asset:00000000-0000-7000-8000-000000000001", alt: "pic" } },
        { type: "table", content: [
          { type: "tableRow", content: [{ type: "tableHeader", attrs: { align: "right" }, content: [{ type: "paragraph", content: [{ type: "text", text: "H" }] }] }] },
          { type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }] }] },
        ] },
      ],
    };
    const element = window.document.createElement("div");
    window.document.body.appendChild(element);
    const editor = new Editor({ element, extensions: basicLeafExtensions, content: source as never });
    const saved = JSON.stringify(editor.getJSON());
    editor.destroy();
    element.remove();

    for (const expected of [
      "\"heading\"", "\"bold\"", "\"italic\"", "\"code\"", "\"strike\"", "\"link\"",
      "\"hardBreak\"", "\"inlineMath\"", "\"mathBlock\"", "\"codeBlock\"", "\"horizontalRule\"",
      "\"blockquote\"", "\"callout\"", "\"orderedList\"", "\"taskList\"", "\"taskItem\"",
      "\"image\"", "\"table\"", "\"tableHeader\"", "\"tableCell\"",
      "\"source\":\"x^2\"", "\"variant\":\"warning\"", "\"start\":4", "\"checked\":true",
      "\"align\":\"right\"", "\"language\":\"rust\"", "a|b", "https://example.com/a b",
      "00000000-0000-7000-8000-000000000001",
    ]) {
      expect(saved, `lost ${expected} between load and save`).toContain(expected);
    }
  });

  it("gives an image node an assetId the validator will accept, or no image at all", () => {
    // `assetId` is the one attribute with no safe default: the validator refuses an image
    // without it, and the refusal is what stops the whole document saving.
    const { editor, dispose } = makeEditor();
    const image = editor.schema.nodes.image!;
    dispose();
    expect(image.spec.attrs?.assetId?.default ?? null).toBeNull();
  });
});
