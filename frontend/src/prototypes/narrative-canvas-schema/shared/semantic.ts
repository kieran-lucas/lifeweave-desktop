// Strategy-neutral semantic utilities: plain text, Markdown, and static projection.
// No ProseMirror imports — pure JSON tree walking.

import type {
  BasicLeafContent,
  NarrativeSemanticBlock,
  NarrativeSemanticDocument,
  PMLeafNode,
  StaticBlockProjection,
  StaticProjection,
  StaticSceneProjection,
} from "./types";

// ---------------------------------------------------------------------------
// Plain text extraction
// ---------------------------------------------------------------------------

function walkNodeText(node: PMLeafNode): string {
  if (node.type === "text" && node.text) return node.text;
  if (node.content) return node.content.map(walkNodeText).join("");
  return "";
}

export function richTextToPlainText(content: BasicLeafContent): string {
  return content.content.map(walkNodeText).join(" ");
}

function blockToPlainText(block: NarrativeSemanticBlock): string {
  switch (block.kind) {
    case "rich_text":
      return richTextToPlainText(block.content);
    case "metric":
      return `${block.label} ${block.value} ${block.unit} ${block.description}`.trim();
    case "image":
      return `${block.alt} ${block.caption}`.trim();
    case "callout":
      return richTextToPlainText(block.content);
    case "timeline": {
      const parts = [block.title];
      for (const item of block.items) {
        parts.push(item.label, item.description);
      }
      return parts.filter(Boolean).join(" ");
    }
  }
}

export function semanticDocumentToPlainText(doc: NarrativeSemanticDocument): string {
  const parts: string[] = [doc.title];
  for (const scene of doc.scenes) {
    parts.push(scene.title);
    for (const block of scene.blocks) {
      parts.push(blockToPlainText(block));
    }
  }
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Markdown output
// ---------------------------------------------------------------------------

function walkNodeMarkdown(node: PMLeafNode, marks?: Array<{ type: string; attrs?: Record<string, unknown> }>): string {
  if (node.type === "text") {
    let t = node.text ?? "";
    const activeMarks = node.marks ?? marks ?? [];
    // Apply marks innermost-first (bold, italic, code)
    for (const m of activeMarks) {
      if (m.type === "bold") t = `**${t}**`;
      else if (m.type === "italic") t = `_${t}_`;
      else if (m.type === "code") t = `\`${t}\``;
    }
    return t;
  }

  if (node.type === "hard_break") return "\n";

  if (!node.content) return "";

  const inner = node.content.map(c => walkNodeMarkdown(c)).join("");

  switch (node.type) {
    case "paragraph":
      return `${inner}\n\n`;
    case "heading": {
      const level = (node.attrs?.["level"] as number) ?? 2;
      return `${"#".repeat(level)} ${inner}\n\n`;
    }
    case "blockquote":
      return inner
        .split("\n")
        .map(l => `> ${l}`)
        .join("\n") + "\n\n";
    case "code_block":
      return `\`\`\`\n${inner}\n\`\`\`\n\n`;
    case "ordered_list": {
      let idx = 1;
      return (node.content ?? []).map(li => `${idx++}. ${walkNodeMarkdown(li).trim()}\n`).join("") + "\n";
    }
    case "bullet_list":
      return (node.content ?? []).map(li => `- ${walkNodeMarkdown(li).trim()}\n`).join("") + "\n";
    case "list_item":
      return inner;
    case "callout": {
      const variant = (node.attrs?.["variant"] as string) ?? "note";
      return inner
        .split("\n")
        .map(l => `> ${l}`)
        .join("\n")
        .replace(/^/, `> **[${variant}]**\n`) + "\n\n";
    }
    default:
      return inner;
  }
}

export function richTextToMarkdown(content: BasicLeafContent): string {
  return content.content.map(n => walkNodeMarkdown(n)).join("");
}

function blockToMarkdown(block: NarrativeSemanticBlock): string {
  switch (block.kind) {
    case "rich_text":
      return richTextToMarkdown(block.content);
    case "metric":
      return `**${block.label}:** ${block.value} ${block.unit}\n\n${block.description}\n\n`;
    case "image":
      return `![${block.alt}](asset:${block.assetId})\n\n`;
    case "callout": {
      const contentMd = richTextToMarkdown(block.content)
        .trim()
        .split("\n")
        .map(l => `> ${l}`)
        .join("\n");
      return `> **[${block.variant}]**\n${contentMd}\n\n`;
    }
    case "timeline": {
      const lines = [`### ${block.title}`];
      block.items.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.label}: ${item.description}`);
      });
      return lines.join("\n") + "\n\n";
    }
  }
}

export function semanticDocumentToMarkdown(doc: NarrativeSemanticDocument): string {
  const lines: string[] = [`# ${doc.title}`, ""];

  for (const scene of doc.scenes) {
    lines.push(`## ${scene.title}`, "");
    for (const block of scene.blocks) {
      lines.push(blockToMarkdown(block));
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Static projection
// ---------------------------------------------------------------------------

function blockToStaticProjection(block: NarrativeSemanticBlock): StaticBlockProjection {
  const plainText = blockToPlainText(block);

  switch (block.kind) {
    case "rich_text":
      return { kind: "rich_text", id: block.id, plainText, data: { content: block.content } };
    case "metric":
      return {
        kind: "metric",
        id: block.id,
        plainText,
        data: { label: block.label, value: block.value, unit: block.unit, description: block.description },
      };
    case "image":
      return {
        kind: "image",
        id: block.id,
        plainText,
        data: { assetId: block.assetId, alt: block.alt, caption: block.caption },
      };
    case "callout":
      return { kind: "callout", id: block.id, plainText, data: { variant: block.variant, content: block.content } };
    case "timeline":
      return { kind: "timeline", id: block.id, plainText, data: { title: block.title, items: block.items } };
  }
}

export function semanticDocumentToStaticProjection(doc: NarrativeSemanticDocument): StaticProjection {
  const scenes: StaticSceneProjection[] = doc.scenes.map(scene => ({
    id: scene.id,
    title: scene.title,
    layout: scene.layoutPreset,
    atmosphere: scene.atmosphere,
    motion: scene.motionPreset,
    blocks: scene.blocks.map(blockToStaticProjection),
  }));

  return { documentTitle: doc.title, scenes };
}
