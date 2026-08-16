import { Fragment, Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import type { Schema } from "@tiptap/pm/model";

/**
 * The one place content entering the editor from outside is made to satisfy the canonical
 * contract that Rust enforces at commit time.
 *
 * Without it the editor accepts nodes the backend refuses — a clipboard image with no local
 * asset, a language class of arbitrary length — and the document becomes unsavable with no
 * indication of which node caused it. Every rule here mirrors one rule in
 * `src-tauri/src/document/schema.rs`; they are the same contract read from both ends.
 */
export type IngestionReport = {
  droppedImages: number;
  clampedLanguages: number;
  clampedAttributes: number;
  droppedMath: number;
};

export const emptyReport = (): IngestionReport => ({
  droppedImages: 0,
  clampedLanguages: 0,
  clampedAttributes: 0,
  droppedMath: 0,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LANGUAGE = /^[A-Za-z0-9+#._-]{1,32}$/;
const CALLOUT_VARIANTS = ["note", "info", "warning"];
const ALIGNMENTS = ["left", "center", "right"];
const MAX_MATH_SOURCE = 8192;
const MAX_ORDERED_START = 999_999_999;

export function isLocalAssetImage(attrs: Record<string, unknown>): boolean {
  const assetId = attrs.assetId;
  if (typeof assetId !== "string" || !UUID.test(assetId)) return false;
  const source = attrs.src;
  return source === undefined || source === null || source === `asset:${assetId}`;
}

export function isSupportedMath(kind: string, source: unknown): source is string {
  if (typeof source !== "string") return false;
  if (source.length === 0 || source.length > MAX_MATH_SOURCE) return false;
  return kind === "inlineMath" ? !/[$\n]/.test(source) : !source.includes("$$");
}

/** Attribute corrections that keep a node rather than dropping it. */
function repairedAttrs(node: ProseMirrorNode, report: IngestionReport): Record<string, unknown> | null {
  const attrs = { ...node.attrs } as Record<string, unknown>;
  let changed = false;
  const clamp = (key: string, value: unknown) => {
    if (attrs[key] !== value) { attrs[key] = value; changed = true; }
  };

  if (node.type.name === "codeBlock" && attrs.language != null) {
    if (typeof attrs.language !== "string" || !LANGUAGE.test(attrs.language)) {
      clamp("language", null);
      report.clampedLanguages += 1;
    }
  }
  if (node.type.name === "callout" && !CALLOUT_VARIANTS.includes(String(attrs.variant))) {
    clamp("variant", "note");
    report.clampedAttributes += 1;
  }
  if ((node.type.name === "tableCell" || node.type.name === "tableHeader") && attrs.align != null) {
    if (!ALIGNMENTS.includes(String(attrs.align))) {
      clamp("align", null);
      report.clampedAttributes += 1;
    }
  }
  if (node.type.name === "heading") {
    const level = Number(attrs.level);
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      clamp("level", Math.min(3, Math.max(1, Math.round(level) || 1)));
      report.clampedAttributes += 1;
    }
  }
  if (node.type.name === "orderedList") {
    const start = Number(attrs.start ?? 1);
    if (!Number.isInteger(start) || start < 0 || start > MAX_ORDERED_START) {
      clamp("start", 1);
      report.clampedAttributes += 1;
    }
  }
  if (node.type.name === "taskItem" && typeof attrs.checked !== "boolean") {
    clamp("checked", false);
    report.clampedAttributes += 1;
  }
  return changed ? attrs : null;
}

/** Whether a node can be stored at all, or has to be removed to keep the document savable. */
function isStorable(node: ProseMirrorNode, report: IngestionReport): boolean {
  if (node.type.name === "image" && !isLocalAssetImage(node.attrs as Record<string, unknown>)) {
    report.droppedImages += 1;
    return false;
  }
  if (node.type.name === "inlineMath" || node.type.name === "mathBlock") {
    if (!isSupportedMath(node.type.name, node.attrs.source)) {
      report.droppedMath += 1;
      return false;
    }
  }
  return true;
}

export function repairFragment(fragment: Fragment, report: IngestionReport): Fragment {
  const kept: ProseMirrorNode[] = [];
  fragment.forEach(child => {
    if (!isStorable(child, report)) return;
    const content = repairFragment(child.content, report);
    const attrs = repairedAttrs(child, report);
    const changed = attrs !== null || !content.eq(child.content);
    kept.push(changed ? child.type.create(attrs ?? child.attrs, content, child.marks) : child);
  });
  return Fragment.fromArray(kept);
}

export function repairSlice(slice: Slice): { slice: Slice; report: IngestionReport } {
  const report = emptyReport();
  const content = repairFragment(slice.content, report);
  // Dropping a node can leave an open edge pointing at content that is no longer there.
  const openStart = Math.min(slice.openStart, content.size);
  const openEnd = Math.min(slice.openEnd, content.size);
  return { slice: new Slice(content, openStart, openEnd), report };
}

export function reportMessage(report: IngestionReport): string | undefined {
  const parts: string[] = [];
  if (report.droppedImages > 0) {
    parts.push(
      `${report.droppedImages} pasted image${report.droppedImages === 1 ? " was" : "s were"} not kept; use Add image so the file is stored locally`,
    );
  }
  if (report.droppedMath > 0) parts.push(`${report.droppedMath} formula could not be stored`);
  if (report.clampedLanguages > 0) parts.push(`${report.clampedLanguages} code language was not recognized and was cleared`);
  if (report.clampedAttributes > 0) parts.push(`${report.clampedAttributes} unsupported attribute was reset`);
  return parts.length > 0 ? `${parts.join("; ")}.` : undefined;
}

/**
 * Build an editor slice from canonical document JSON produced by the Rust authority.
 *
 * The JSON has already been validated in Rust, so this only has to place it in the
 * document; it is still passed through the repair pass so a single code path decides what
 * the editor may hold, whatever produced the content.
 */
export function sliceFromCanonical(canonicalJson: string, schema: Schema): Slice {
  const parsed: unknown = JSON.parse(canonicalJson);
  const document = ProseMirrorNode.fromJSON(schema, parsed);
  const { slice } = repairSlice(new Slice(document.content, 0, 0));
  return slice;
}
