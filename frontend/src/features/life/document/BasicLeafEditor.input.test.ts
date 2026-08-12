import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { basicLeafExtensions } from "./BasicLeafEditor";

let editor: Editor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("Basic Leaf real input pipeline", () => {
  it("applies text deletion transactions through the production extension set", () => {
    const host = document.createElement("div");
    document.body.append(host);
    editor = new Editor({
      element: host,
      extensions: basicLeafExtensions,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] },
    });
    editor.commands.setTextSelection({ from: 5, to: 6 });
    expect(editor.commands.deleteSelection()).toBe(true);

    expect(editor.getText()).toBe("Hell");
    host.remove();
  });

  it("adds and removes table structure with the production extensions", () => {
    editor = new Editor({ extensions: basicLeafExtensions, content: { type: "doc", content: [{ type: "paragraph" }] } });

    expect(editor.chain().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(2);
    expect(editor.chain().addRowAfter().run()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toHaveLength(3);
    expect(editor.chain().deleteTable().run()).toBe(true);
    expect(editor.isActive("table")).toBe(false);
  });
});
