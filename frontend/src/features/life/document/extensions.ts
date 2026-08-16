import { Extension, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { convertMarkdownFragment } from "../../../ipc/commands";
import { isLocalAssetImage, repairSlice, reportMessage, sliceFromCanonical } from "./ingestion";
import * as styles from "./BasicLeafDocument.css";

const CALLOUT_VARIANTS = ["note", "info", "warning"];

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "note",
        // Without a reader the variant was lost on every copy and paste: the node came
        // back as a note whatever it had been, which silently changed what the document
        // said. The renderer writes `data-callout`, so the reader has to read it.
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-callout");
          return value && CALLOUT_VARIANTS.includes(value) ? value : "note";
        },
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-callout": CALLOUT_VARIANTS.includes(String(attributes.variant)) ? String(attributes.variant) : "note",
        }),
      },
    };
  },
  parseHTML() { return [{ tag: "aside[data-callout]" }]; },
  renderHTML({ HTMLAttributes }) { return ["aside", HTMLAttributes, 0]; },
});

/**
 * An image whose bytes live in the local asset store.
 *
 * The tag selector is deliberately narrow. Matching any `img[src]` meant a picture pasted
 * from a web page became an image node with no `assetId`, which the Rust validator refuses
 * — so the whole document stopped saving, reporting only a generic failure. A foreign
 * image is now not parsed as an image at all, and the ingestion gateway reports it.
 */
export const AssetImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-asset-id"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.assetId ? { "data-asset-id": String(attributes.assetId) } : {},
      },
    };
  },
  parseHTML() { return [{ tag: "img[data-asset-id]" }]; },
});

const mathAttributes = (dataName: string) => ({
  source: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute(dataName) ?? "",
    renderHTML: (attributes: Record<string, unknown>) => ({ [dataName]: String(attributes.source ?? "") }),
  },
});

/**
 * Math is stored as the TeX the author wrote, never as anything rendered from it.
 *
 * The editor shows that source so it stays readable and replaceable without a node view
 * that would have to reimplement editing; the Reader typesets it. Both read the same
 * attribute, so neither can drift from what is stored.
 */
export const InlineMath = Node.create({
  name: "inlineMath",
  inline: true,
  group: "inline",
  atom: true,
  addAttributes() { return mathAttributes("data-math"); },
  parseHTML() { return [{ tag: "span[data-math]" }]; },
  renderHTML({ HTMLAttributes }) { return ["span", HTMLAttributes]; },
  renderText({ node }) { return `$${String(node.attrs.source)}$`; },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("span");
      dom.className = styles.mathSource;
      dom.textContent = `$${String(node.attrs.source)}$`;
      return { dom };
    };
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  addAttributes() { return mathAttributes("data-math-block"); },
  parseHTML() { return [{ tag: "div[data-math-block]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", HTMLAttributes]; },
  renderText({ node }) { return `$$\n${String(node.attrs.source)}\n$$`; },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.className = styles.mathSourceBlock;
      dom.textContent = `$$\n${String(node.attrs.source)}\n$$`;
      return { dom };
    };
  },
});

export const ingestionKey = new PluginKey("lifeweaveIngestion");

export type IngestionNotice = (message: string) => void;

type GatewayOptions = { onNotice: IngestionNotice | null };

/** Whether a paste should be read as Markdown rather than as literal text. */
function wantsMarkdown(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === "v" && event.shiftKey && (event.ctrlKey || event.metaKey);
}

function insertCanonical(view: EditorView, canonicalJson: string): void {
  const parsed = sliceFromCanonical(canonicalJson, view.state.schema);
  // A run that begins or ends in a paragraph joins the paragraph it lands in, which is how
  // every other paste behaves; a run that begins with a list or a table stays its own block.
  const first = parsed.content.firstChild;
  const last = parsed.content.lastChild;
  const openStart = first?.type.name === "paragraph" ? 1 : 0;
  const openEnd = last?.type.name === "paragraph" ? 1 : 0;
  const content = parsed.content.size === 0 ? Fragment.empty : parsed.content;
  view.dispatch(view.state.tr.replaceSelection(new Slice(content, openStart, openEnd)).scrollIntoView());
}

/**
 * The editor's ingestion gateway.
 *
 * Everything arriving from outside the document — clipboard HTML, a drop, an explicit
 * Markdown paste — passes through here, so there is one declared policy rather than one
 * per entry point:
 *
 * - plain text stays literal, because silently reinterpreting typed characters as syntax
 *   is the surprising behaviour, not the helpful one;
 * - rich HTML is parsed against the schema and then repaired, so nothing enters that the
 *   backend would refuse at commit time;
 * - Ctrl/Cmd+Shift+V declares "this text is Markdown" and sends it to the same Rust
 *   authority that file import uses, so both routes cannot disagree.
 */
export const IngestionGateway = Extension.create<GatewayOptions>({
  name: "ingestionGateway",
  addOptions() { return { onNotice: null }; },
  addProseMirrorPlugins() {
    const notify = (message: string | undefined) => {
      if (message) this.options.onNotice?.(message);
    };
    let markdownRequested = false;
    return [
      new Plugin({
        key: ingestionKey,
        props: {
          handleKeyDown: (_view, event) => {
            // The paste event itself carries no modifier state, so the intent is recorded
            // from the keystroke that is about to produce it.
            if (event.key.toLowerCase() === "v") markdownRequested = wantsMarkdown(event);
            return false;
          },
          handlePaste: (view, event) => {
            // The intent belongs to the paste it was declared for. Clearing it here rather
            // than only when it was set stops a Ctrl+Shift+V that produced no paste from
            // leaving the flag standing for whatever the next paste turns out to be.
            const requested = markdownRequested;
            markdownRequested = false;
            if (!requested) return false;
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;
            event.preventDefault();
            void convertMarkdownFragment({ markdown: text })
              .then(result => {
                insertCanonical(view, result.canonical_json);
                const dropped = result.diagnostics.length;
                if (dropped > 0) {
                  notify(`Pasted as Markdown with ${dropped} documented fallback${dropped === 1 ? "" : "s"}.`);
                }
              })
              .catch(() => notify("That text could not be read as Markdown; nothing was inserted."));
            return true;
          },
          // Applies to clipboard HTML and to drops alike, so a dragged fragment cannot
          // enter through a path the clipboard rules never saw.
          transformPasted: slice => {
            const { slice: repaired, report } = repairSlice(slice);
            notify(reportMessage(report));
            return repaired;
          },
        },
      }),
    ];
  },
});

export { isLocalAssetImage };
