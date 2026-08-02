import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";

export async function normalizeMarkdown(markdown: string): Promise<string> {
  if (/<(?:script|iframe|style)\b/i.test(markdown) || /\b(?:import|export)\s+[^\n]+from\s+["']/i.test(markdown)) {
    throw new Error("Executable or embedded HTML content is not supported.");
  }
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkStringify, { bullet: "-", fences: true });
  return String(await processor.process(markdown));
}
