export type BasicLeafMark = { type: "bold" | "italic" | "link"; attrs?: { href?: string } };
export type BasicLeafNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: BasicLeafMark[];
  content?: BasicLeafNode[];
};

export const EMPTY_DOCUMENT: BasicLeafNode = {
  type: "doc",
  content: [{ type: "paragraph", content: [] }],
};

export function parseDocument(value: string): BasicLeafNode {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || (parsed as BasicLeafNode).type !== "doc") {
    throw new Error("Unsupported document root");
  }
  return parsed as BasicLeafNode;
}

export function safeLink(href: unknown): string | undefined {
  if (typeof href !== "string") return undefined;
  try {
    const url = new URL(href);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

export function operationId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
