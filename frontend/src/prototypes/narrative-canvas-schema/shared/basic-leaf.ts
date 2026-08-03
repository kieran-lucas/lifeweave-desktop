// Basic Leaf migration utilities.
// Converts between BasicLeafContent and NarrativeSemanticDocument.
// No ProseMirror imports — pure JSON tree transforms.

import type {
  BasicLeafContent,
  NarrativeSemanticDocument,
  PMLeafNode,
} from "./types";

// ---------------------------------------------------------------------------
// basicLeafToNarrative
// ---------------------------------------------------------------------------

/**
 * Wraps a BasicLeafContent document in a single-scene NarrativeSemanticDocument
 * with a single rich_text block. Preserves all asset IDs, links, and Vietnamese text.
 */
export function basicLeafToNarrative(
  leafJson: BasicLeafContent,
  documentId: string,
): NarrativeSemanticDocument {
  return {
    schemaVersion: 1,
    documentId,
    title: "Imported Document",
    templateId: "knowledge_dossier",
    scenes: [
      {
        id: `${documentId}-scene-0`,
        title: "Main",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks: [
          {
            kind: "rich_text",
            id: `${documentId}-block-0`,
            content: leafJson,
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// narrativeToBasicLeaf
// ---------------------------------------------------------------------------

/** Extract all text from a PM node tree as text nodes */
function pmNodeText(node: PMLeafNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.content) return node.content.map(pmNodeText).join("");
  return "";
}

function makeParagraph(text: string): PMLeafNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function makeHeading(level: number, text: string): PMLeafNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

/**
 * Converts a NarrativeSemanticDocument back to BasicLeafContent.
 * - Document title → H1 heading
 * - Scene title → H2 heading
 * - rich_text → original subtree (passed through)
 * - metric → paragraph with bold label and value
 * - image → image inline node
 * - callout → callout block equivalent
 * - timeline → ordered list
 * - unknown → paragraph with "(Unsupported block)" text
 */
export function narrativeToBasicLeaf(doc: NarrativeSemanticDocument): BasicLeafContent {
  const nodes: PMLeafNode[] = [];

  nodes.push(makeHeading(1, doc.title));

  for (const scene of doc.scenes) {
    nodes.push(makeHeading(2, scene.title));

    for (const block of scene.blocks) {
      switch (block.kind) {
        case "rich_text":
          nodes.push(...block.content.content);
          break;

        case "metric":
          nodes.push({
            type: "paragraph",
            content: [
              { type: "text", text: block.label + ": ", marks: [{ type: "bold" }] },
              { type: "text", text: `${block.value} ${block.unit}` },
              ...(block.description ? [{ type: "text" as const, text: ` — ${block.description}` }] : []),
            ],
          });
          break;

        case "image":
          nodes.push({
            type: "paragraph",
            content: [
              {
                type: "image",
                attrs: { src: "", alt: block.alt, assetId: block.assetId },
              },
            ],
          });
          break;

        case "callout":
          nodes.push({
            type: "callout",
            attrs: { variant: block.variant },
            content: block.content.content,
          });
          break;

        case "timeline": {
          const listItems: PMLeafNode[] = block.items.map(item => ({
            type: "list_item",
            content: [makeParagraph(`${item.label}: ${item.description}`)],
          }));
          nodes.push({ type: "ordered_list", content: listItems });
          break;
        }

        default:
          nodes.push(makeParagraph("(Unsupported block)"));
      }
    }
  }

  return { type: "doc", content: nodes };
}

// ---------------------------------------------------------------------------
// Migration result with loss report
// ---------------------------------------------------------------------------

export type BasicLeafMigrationResult = {
  doc: NarrativeSemanticDocument;
  lossReport: string[];
};

/**
 * Like basicLeafToNarrative but also returns a loss report.
 * Since the migration is from BasicLeaf → Narrative (not the lossy direction),
 * the loss report is always empty here. The lossy direction is narrativeToBasicLeaf.
 */
export function basicLeafToNarrativeWithReport(
  leafJson: BasicLeafContent,
  documentId: string,
): BasicLeafMigrationResult {
  return { doc: basicLeafToNarrative(leafJson, documentId), lossReport: [] };
}

/**
 * Converts NarrativeSemanticDocument to BasicLeafContent and reports any
 * block kinds that cannot be represented losslessly.
 */
export function narrativeToBasicLeafWithReport(doc: NarrativeSemanticDocument): {
  content: BasicLeafContent;
  lossReport: string[];
} {
  const lossReport: string[] = [];

  for (const scene of doc.scenes) {
    for (const block of scene.blocks) {
      if (block.kind === "metric") {
        lossReport.push(
          `Block ${block.id} (metric): converted to paragraph — label/value/unit structure is lost`,
        );
      } else if (block.kind === "image") {
        lossReport.push(
          `Block ${block.id} (image): converted to inline image — caption may be lost`,
        );
      } else if (block.kind === "timeline") {
        lossReport.push(
          `Block ${block.id} (timeline): converted to ordered list — timeline metadata is lost`,
        );
      }
    }
  }

  return { content: narrativeToBasicLeaf(doc), lossReport };
}

/**
 * Round-trip: BasicLeaf → Narrative → BasicLeaf.
 * Only the rich_text blocks survive without loss.
 * Use narrativeToBasicLeafWithReport for loss tracking.
 */
export function roundTripBasicLeaf(
  leafJson: BasicLeafContent,
  documentId: string,
): BasicLeafContent {
  const narrative = basicLeafToNarrative(leafJson, documentId);
  const text = pmNodeText({ type: "doc", content: leafJson.content });
  void text; // used only to confirm no crash
  return narrativeToBasicLeaf(narrative);
}
