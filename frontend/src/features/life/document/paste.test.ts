import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const convert = vi.fn();
vi.mock("../../../ipc/commands", () => ({ convertMarkdownFragment: (input: unknown) => convert(input) }));

const { buildBasicLeafExtensions } = await import("./BasicLeafEditor");

type Deferred = { resolve: (value: unknown) => void; reject: (reason?: unknown) => void };

function makeEditor(text = "start end") {
  const notices: string[] = [];
  const element = window.document.createElement("div");
  window.document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: buildBasicLeafExtensions(message => notices.push(message)),
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
  });
  return { editor, notices, dispose: () => { editor.destroy(); element.remove(); } };
}

/** Put the caret at a character offset inside the first paragraph. */
function caretAt(editor: Editor, offset: number) {
  const position = 1 + offset;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, position)));
}

function clipboard(flavours: Record<string, string>) {
  const event = new Event("paste") as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", { value: { getData: (type: string) => flavours[type] ?? "" } });
  return event;
}

/** Invoke the Markdown paste route the way the keyboard does, and hold the conversion open. */
function pasteAsMarkdown(view: EditorView, source: string): Deferred {
  let resolve!: Deferred["resolve"];
  let reject!: Deferred["reject"];
  convert.mockImplementationOnce(() => new Promise((res, rej) => { resolve = res; reject = rej; }));
  view.someProp("handleKeyDown", handler =>
    handler(view, new KeyboardEvent("keydown", { key: "v", ctrlKey: true, shiftKey: true })),
  );
  const handled = view.someProp("handlePaste", handler => handler(view, clipboard({ "text/plain": source }), Slice.empty));
  expect(handled).toBe(true);
  return { resolve, reject };
}

const paragraph = (text: string) => ({
  canonical_json: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }),
  diagnostics: [] as unknown[],
});

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function plainText(editor: Editor): string {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n");
}

describe("a Markdown paste lands where it was invoked even though conversion is asynchronous", () => {
  it("does not follow the caret to somewhere else in the document", async () => {
    // The conversion is an IPC round trip. Inserting at whatever the selection is when it
    // returns dropped the content into unrelated text the user had since moved to.
    const { editor, dispose } = makeEditor("start end");
    caretAt(editor, 5); // between "start" and " end"
    const pending = pasteAsMarkdown(editor.view, "MD");

    caretAt(editor, 9); // the user moves to the very end while waiting
    pending.resolve(paragraph("MD"));
    await flush();

    expect(plainText(editor)).toBe("startMD end");
    dispose();
  });

  it("keeps its place when the user types before the result arrives", async () => {
    const { editor, dispose } = makeEditor("start end");
    caretAt(editor, 5);
    const pending = pasteAsMarkdown(editor.view, "MD");

    caretAt(editor, 0);
    editor.view.dispatch(editor.state.tr.insertText("XX", 1));
    pending.resolve(paragraph("MD"));
    await flush();

    // "XX" went in at the front, so the target moved two characters right with it.
    expect(plainText(editor)).toBe("XXstartMD end");
    dispose();
  });

  it("falls back to the deletion point when the target text is removed", async () => {
    const { editor, dispose } = makeEditor("start end");
    caretAt(editor, 5);
    const pending = pasteAsMarkdown(editor.view, "MD");

    editor.view.dispatch(editor.state.tr.delete(1, 6)); // remove "start"
    pending.resolve(paragraph("MD"));
    await flush();

    expect(plainText(editor)).toBe("MD end");
    dispose();
  });

  it("gives two pastes in flight their own targets", async () => {
    const { editor, dispose } = makeEditor("AB");
    caretAt(editor, 1);
    const first = pasteAsMarkdown(editor.view, "one");
    caretAt(editor, 2);
    const second = pasteAsMarkdown(editor.view, "two");

    // Resolve out of order: each still has to land where it was invoked.
    second.resolve(paragraph("[2]"));
    await flush();
    first.resolve(paragraph("[1]"));
    await flush();

    expect(plainText(editor)).toBe("A[1]B[2]");
    dispose();
  });

  it("replaces the selected text when the paste was invoked over a selection", async () => {
    const { editor, dispose } = makeEditor("keep drop keep");
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 6, 10)));
    const pending = pasteAsMarkdown(editor.view, "MD");
    pending.resolve(paragraph("NEW"));
    await flush();

    expect(plainText(editor)).toBe("keep NEW keep");
    dispose();
  });

  it("inserts block content such as a list without flattening it", async () => {
    const { editor, dispose } = makeEditor("intro");
    caretAt(editor, 5);
    const pending = pasteAsMarkdown(editor.view, "- one\n- two");
    pending.resolve({
      canonical_json: JSON.stringify({
        type: "doc",
        content: [{
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
          ],
        }],
      }),
      diagnostics: [],
    });
    await flush();

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain("bulletList");
    expect(json).toContain("intro");
    expect(plainText(editor)).toContain("one");
    dispose();
  });

  it("does nothing at all when the conversion fails", async () => {
    const { editor, notices, dispose } = makeEditor("untouched");
    caretAt(editor, 4);
    const pending = pasteAsMarkdown(editor.view, "MD");
    const before = JSON.stringify(editor.getJSON());

    pending.reject(new Error("validation"));
    await flush();

    expect(JSON.stringify(editor.getJSON())).toBe(before);
    expect(notices.join(" ")).toContain("could not be read as Markdown");
    dispose();
  });

  it("does not insert into an editor that was closed while it waited", async () => {
    const { editor, dispose } = makeEditor("gone");
    caretAt(editor, 2);
    const pending = pasteAsMarkdown(editor.view, "MD");
    dispose();

    pending.resolve(paragraph("MD"));
    // The assertion is that resolving does not throw against the torn-down view.
    await expect(flush()).resolves.toBeUndefined();
    expect(editor.isDestroyed).toBe(true);
  });

  it("reports the fallbacks the authority disclosed for the pasted text", async () => {
    const { editor, notices, dispose } = makeEditor("x");
    caretAt(editor, 1);
    const pending = pasteAsMarkdown(editor.view, "text[^1]");
    pending.resolve({ ...paragraph("text[^1]"), diagnostics: [{ kind: "footnote" }, { kind: "footnote" }] });
    await flush();

    expect(notices.join(" ")).toContain("2 documented fallbacks");
    dispose();
  });
});

describe("a picture with no local file behind it is reported rather than dropped in silence", () => {
  /** Paste real clipboard markup through the editor's own paste handling. */
  const runHtml = (html: string) => {
    const { editor, notices, dispose } = makeEditor("x");
    const view = editor.view;
    const handled = view.someProp("handlePaste", handler =>
      handler(view, clipboard({ "text/html": html, "text/plain": "" }), Slice.empty),
    );
    dispose();
    // The gateway only reports; it never claims an ordinary paste, so ProseMirror still
    // parses the markup itself and the local-asset rule still decides what becomes a node.
    return { notices, handled };
  };
  const asset = "00000000-0000-7000-8000-000000000001";

  it("reports one remote image", () => {
    const { notices } = runHtml(`<p>a</p><img src="https://example.com/x.png" alt="Diagram">`);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("1 image could not be pasted");
    expect(notices[0]).toContain("Add image");
  });

  it("counts several remote images once each", () => {
    const { notices } = runHtml(
      `<img src="https://example.com/a.png"><p>x</p><img src="https://example.com/b.png"><img src="https://example.com/c.png">`,
    );
    expect(notices[0]).toContain("3 images could not be pasted");
  });

  it("says nothing about an image that names a local asset", () => {
    const { notices } = runHtml(`<img data-asset-id="${asset}" src="asset:${asset}" alt="local">`);
    expect(notices).toHaveLength(0);
  });

  it("reports only the foreign one when local and remote are mixed", () => {
    const { notices } = runHtml(
      `<img data-asset-id="${asset}" src="asset:${asset}"><img src="https://example.com/x.png">`,
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("1 image could not be pasted");
  });

  it("reports a data-URI image, which is equally not a stored file", () => {
    const { notices } = runHtml(`<img src="data:image/png;base64,AAAA">`);
    expect(notices[0]).toContain("1 image could not be pasted");
  });

  it("reports a malformed image element rather than ignoring it", () => {
    const { notices } = runHtml(`<img>`);
    expect(notices[0]).toContain("1 image could not be pasted");
  });

  it("reports an image wrapped in a link", () => {
    const { notices } = runHtml(`<a href="https://example.com"><img src="https://example.com/x.png"></a>`);
    expect(notices[0]).toContain("1 image could not be pasted");
  });

  it("does not report an image that carries an identity, which the repair pass owns", () => {
    // Reporting here as well as there would tell the user about the same picture twice.
    const { notices } = runHtml(`<img data-asset-id="not-a-uuid" src="asset:whatever">`);
    expect(notices).toHaveLength(0);
  });

  it("only inspects the paste and lets ProseMirror handle it as usual", () => {
    expect(runHtml(`<p>a</p><img src="https://example.com/x.png">`).handled).toBeFalsy();
  });

  it("says the same thing when the markup is dropped rather than pasted", () => {
    const { editor, notices, dispose } = makeEditor("x");
    const event = new Event("drop") as DragEvent;
    Object.defineProperty(event, "dataTransfer", {
      value: { getData: (type: string) => (type === "text/html" ? `<img src="https://example.com/x.png">` : "") },
    });
    editor.view.someProp("handleDrop", handler => handler(editor.view, event, Slice.empty, false));
    dispose();
    expect(notices[0]).toContain("1 image could not be pasted");
  });
});
