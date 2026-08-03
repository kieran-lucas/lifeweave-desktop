import type { BasicLeafNode } from "./schema";

export type DocumentOutlineEntry = {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  sourceIndex: number;
};

export type DocumentOutlineProjection = {
  entries: DocumentOutlineEntry[];
  totalHeadingCount: number;
  truncated: boolean;
};

export const MAX_OUTLINE_ENTRIES = 256;

export function headingIdForSourceIndex(index: number): string {
  return `leaf-heading-${index}`;
}

export function extractHeadingText(node: BasicLeafNode): string {
  const parts: string[] = [];
  function walk(n: BasicLeafNode): void {
    if (n.type === "text") { parts.push(n.text ?? ""); }
    else if (n.type === "hardBreak") { parts.push(" "); }
    else if (n.content) { for (const child of n.content) walk(child); }
  }
  if (node.content) { for (const child of node.content) walk(child); }
  return parts.join("").replace(/\s+/g, " ").trim() || "Untitled section";
}

export function buildDocumentOutline(document: BasicLeafNode): DocumentOutlineProjection {
  const topContent = document.content ?? [];
  const entries: DocumentOutlineEntry[] = [];
  let totalHeadingCount = 0;
  let i = 0;
  for (const node of topContent) {
    if (node.type === "heading") {
      const rawLevel = Number(node.attrs?.level ?? 2);
      const level: 1 | 2 | 3 = rawLevel === 1 ? 1 : rawLevel === 3 ? 3 : 2;
      totalHeadingCount++;
      if (entries.length < MAX_OUTLINE_ENTRIES) {
        entries.push({ id: headingIdForSourceIndex(i), label: extractHeadingText(node), level, sourceIndex: i });
      }
    }
    i++;
  }
  return { entries, totalHeadingCount, truncated: totalHeadingCount > MAX_OUTLINE_ENTRIES };
}
