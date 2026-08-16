import { Extension, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Plugin, PluginKey, Selection } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { convertMarkdownFragment } from "../../../ipc/commands";
import { countForeignImages, isLocalAssetImage, repairSlice, reportMessage, sliceFromCanonical } from "./ingestion";
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

/**
 * Where a Markdown paste that is still being converted intends to land.
 *
 * Conversion is an IPC round trip, so the document can change before the result arrives.
 * The range is therefore held in plugin state and mapped through every transaction in
 * between, rather than being re-derived from wherever the cursor happens to be when the
 * promise resolves — which would drop the content into unrelated text the user had since
 * moved to.
 */
type PendingPaste = { id: number; from: number; to: number };
type GatewayState = { pending: PendingPaste[] };
type GatewayMeta = { kind: "open"; entry: PendingPaste } | { kind: "close"; id: number };

export const ingestionKey = new PluginKey<GatewayState>("lifeweaveIngestion");

export type IngestionNotice = (message: string) => void;

type GatewayOptions = { onNotice: IngestionNotice | null };

/** Whether a paste should be read as Markdown rather than as literal text. */
function wantsMarkdown(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === "v" && event.shiftKey && (event.ctrlKey || event.metaKey);
}

function mapPending(pending: PendingPaste[], tr: Transaction): PendingPaste[] {
  if (!tr.docChanged) return pending;
  return pending.map(entry => ({
    id: entry.id,
    // A collapsed target moves after anything typed at it, so a paste that resolves late
    // lands after the words the user wrote while waiting rather than inside them. A range
    // keeps covering the content it was taken from; if that content is deleted the two
    // ends collapse to the deletion point, which is where the paste then goes.
    from: tr.mapping.map(entry.from, entry.from === entry.to ? 1 : -1),
    to: tr.mapping.map(entry.to, 1),
  }));
}

/**
 * Place converted Markdown at the range the paste was invoked on.
 *
 * The selection is only moved when it is still sitting at that range — that is, when the
 * user waited. If they moved on, taking their cursor back to the insertion would be an
 * edit they did not ask for.
 */
function insertCanonical(view: EditorView, canonicalJson: string, target: PendingPaste): void {
  const parsed = sliceFromCanonical(canonicalJson, view.state.schema);
  // A run that begins or ends in a paragraph joins the paragraph it lands in, which is how
  // every other paste behaves; a run that begins with a list or a table stays its own block.
  const first = parsed.content.firstChild;
  const last = parsed.content.lastChild;
  const openStart = first?.type.name === "paragraph" ? 1 : 0;
  const openEnd = last?.type.name === "paragraph" ? 1 : 0;
  const content = parsed.content.size === 0 ? Fragment.empty : parsed.content;

  const limit = view.state.doc.content.size;
  const from = Math.min(Math.max(target.from, 0), limit);
  const to = Math.min(Math.max(target.to, from), limit);
  const followed = view.state.selection.from === from && view.state.selection.to === to;

  const tr = view.state.tr.replaceRange(from, to, new Slice(content, openStart, openEnd));
  if (followed) {
    tr.setSelection(Selection.near(tr.doc.resolve(Math.min(tr.mapping.map(to), tr.doc.content.size))));
    tr.scrollIntoView();
  }
  view.dispatch(tr);
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
  /*
   * ProseMirror asks plugins for a paste or drop handler in order and stops at the first
   * that claims the event. The gateway has to see every one of them to report what it
   * cannot store, so it sorts ahead of anything that might claim one first; it then returns
   * false for everything except its own Markdown route, leaving the event to be handled
   * normally.
   */
  priority: 1000,
  addOptions() { return { onNotice: null }; },
  addProseMirrorPlugins() {
    const notify = (message: string | undefined) => {
      if (message) this.options.onNotice?.(message);
    };
    /*
     * Tell the author about pictures the document cannot hold.
     *
     * The image rule matches `img[data-asset-id]` only, so a picture from a web page is
     * discarded while ProseMirror parses and the repair pass — which runs after parsing —
     * never sees it. The raw clipboard markup on the event is the last point at which it
     * still exists. This deliberately reads the event rather than `transformPastedHTML`:
     * ProseMirror resolves that prop from the view's own props before consulting any
     * plugin, and Tiptap already sets an identity transform there, so no plugin can own it.
     */
    const reportForeignImages = (html: string | undefined) => {
      const foreign = countForeignImages(html ?? "");
      if (foreign === 0) return;
      notify(
        `${foreign} image${foreign === 1 ? "" : "s"} could not be pasted: an image has to be added with Add image so its file is stored on this computer.`,
      );
    };
    let markdownRequested = false;
    let nextPasteId = 0;
    return [
      new Plugin<GatewayState>({
        key: ingestionKey,
        state: {
          init: () => ({ pending: [] }),
          apply: (tr, value) => {
            const pending = mapPending(value.pending, tr);
            const meta = tr.getMeta(ingestionKey) as GatewayMeta | undefined;
            if (meta?.kind === "open") return { pending: [...pending, meta.entry] };
            if (meta?.kind === "close") return { pending: pending.filter(entry => entry.id !== meta.id) };
            return { pending };
          },
        },
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
            if (!requested) {
              reportForeignImages(event.clipboardData?.getData("text/html"));
              return false;
            }
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;
            event.preventDefault();

            const id = (nextPasteId += 1);
            const { from, to } = view.state.selection;
            // Registering the target as plugin state is what lets it be mapped: from here
            // on every transaction moves it, so the paste keeps pointing at the same place
            // in the document however the document changes around it.
            view.dispatch(view.state.tr.setMeta(ingestionKey, { kind: "open", entry: { id, from, to } }));

            const settle = (apply: (target: PendingPaste) => void) => {
              // A view torn down while the conversion was in flight has no document left to
              // insert into, and dispatching into it would throw.
              if (view.isDestroyed) return;
              const target = ingestionKey.getState(view.state)?.pending.find(entry => entry.id === id);
              view.dispatch(view.state.tr.setMeta(ingestionKey, { kind: "close", id }));
              if (target) apply(target);
            };

            void convertMarkdownFragment({ markdown: text })
              .then(result => {
                settle(target => {
                  insertCanonical(view, result.canonical_json, target);
                  const dropped = result.diagnostics.length;
                  if (dropped > 0) {
                    notify(`Pasted as Markdown with ${dropped} documented fallback${dropped === 1 ? "" : "s"}.`);
                  }
                });
              })
              // A conversion that failed leaves the document exactly as it was; the only
              // thing that changes is that the user is told why nothing appeared.
              .catch(() => settle(() => notify("That text could not be read as Markdown; nothing was inserted.")));
            return true;
          },
          // A drop carries the same markup as a paste and has to be told the same thing.
          handleDrop: (_view, event) => {
            reportForeignImages((event as DragEvent).dataTransfer?.getData("text/html"));
            return false;
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
