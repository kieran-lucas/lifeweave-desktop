// Strategy B adapter: full ProseMirror document.
// The document is one large PM doc where scenes are custom nodes and blocks are
// narrative_block nodes. Operations use PM's immutable Node/Fragment API.
// Requires loading PM Schema for both static reading AND mutation — this is the
// key architectural constraint that makes Strategy B lose the static-render criterion.

import { Fragment, Schema } from "@tiptap/pm/model";
import type { Node as PMNode } from "@tiptap/pm/model";
import type {
  BasicLeafContent,
  NarrativeBlock,
  NarrativeScene,
  PMLeafNode,
  PrototypeAdapter,
} from "../shared/types";

// ProseMirror schema for Strategy B: one doc wraps scene nodes.
// All attrs must have defaults so PM can generate empty instances for required positions.
export const narrativeSchema = new Schema({
  nodes: {
    doc: { content: "scene+" },
    scene: {
      attrs: { id: { default: "" }, title: { default: "" }, sceneType: { default: "linear" }, tags: { default: [] } },
      content: "narrative_block+",
    },
    narrative_block: {
      attrs: { id: { default: "" }, blockType: { default: "rich-text" } },
      content: "block+",
    },
    // Basic Leaf-compatible block content (must be declared for schema validation)
    paragraph: { content: "inline*", group: "block" },
    heading: { attrs: { level: { default: 2 } }, content: "inline*", group: "block" },
    blockquote: { content: "block+", group: "block" },
    code_block: { content: "text*", marks: "", group: "block" },
    ordered_list: { content: "list_item+", group: "block" },
    bullet_list: { content: "list_item+", group: "block" },
    list_item: { content: "paragraph block*" },
    callout: { attrs: { variant: { default: "note" } }, content: "block+", group: "block" },
    text: { group: "inline" },
    hard_break: { inline: true, group: "inline", selectable: false },
  },
  marks: {
    bold: {},
    italic: {},
    code: {},
    link: { attrs: { href: {}, title: { default: null } } },
  },
});

// Convert BasicLeafContent to PM block Fragment (strips the "doc" wrapper)
function basicLeafToFragment(content: BasicLeafContent): Fragment {
  const nodes = content.content.map(node => narrativeSchema.nodeFromJSON(node as object));
  return Fragment.from(nodes);
}

// Convert a NarrativeBlock to a PM narrative_block node
function blockToNode(block: NarrativeBlock): PMNode {
  const content = basicLeafToFragment(block.content);
  return narrativeSchema.node("narrative_block", { id: block.id, blockType: block.blockType }, content);
}

// Convert a NarrativeScene to a PM scene node
function sceneToNode(scene: NarrativeScene): PMNode {
  const blocks = Fragment.from(scene.blocks.map(blockToNode));
  return narrativeSchema.node("scene", {
    id: scene.id, title: scene.title, sceneType: scene.sceneType, tags: scene.tags,
  }, blocks);
}

// Build a PM doc from a scene array
function scenesToDoc(scenes: NarrativeScene[]): PMNode {
  return narrativeSchema.node("doc", undefined, Fragment.from(scenes.map(sceneToNode)));
}

// Convert PM narrative_block children to BasicLeafContent
function blockNodeToContent(blockNode: PMNode): BasicLeafContent {
  const contentNodes: PMLeafNode[] = [];
  blockNode.forEach(child => { contentNodes.push(child.toJSON() as PMLeafNode); });
  return { type: "doc", content: contentNodes };
}

// Extract a NarrativeBlock from a PM narrative_block node
function nodeToBlock(node: PMNode): NarrativeBlock {
  return {
    id: node.attrs["id"] as string,
    blockType: node.attrs["blockType"] as NarrativeBlock["blockType"],
    content: blockNodeToContent(node),
  };
}

// Extract a NarrativeScene from a PM scene node
function nodeToScene(node: PMNode): NarrativeScene {
  const blocks: NarrativeBlock[] = [];
  node.forEach(child => { blocks.push(nodeToBlock(child)); });
  return {
    id: node.attrs["id"] as string,
    title: node.attrs["title"] as string,
    sceneType: node.attrs["sceneType"] as NarrativeScene["sceneType"],
    tags: node.attrs["tags"] as string[],
    blocks,
  };
}

// Replace a child at index with newChild
function replaceChild(parent: PMNode, index: number, newChild: PMNode): PMNode {
  const children: PMNode[] = [];
  parent.forEach((child, _offset, i) => { children.push(i === index ? newChild : child); });
  return parent.copy(Fragment.from(children));
}

export type DocB = PMNode;

export const adapterB: PrototypeAdapter<DocB> = {
  parse(json) {
    const raw = JSON.parse(json) as object;
    return narrativeSchema.nodeFromJSON(raw);
  },

  serialize(doc) {
    return JSON.stringify(doc.toJSON());
  },

  getSceneCount(doc) {
    return doc.childCount;
  },

  getBlockCount(doc, sceneIndex) {
    if (sceneIndex >= doc.childCount) return 0;
    return doc.child(sceneIndex).childCount;
  },

  addScene(doc, scene) {
    const newNode = sceneToNode(scene);
    const children: PMNode[] = [];
    doc.forEach(child => { children.push(child); });
    children.push(newNode);
    return doc.copy(Fragment.from(children));
  },

  reorderScene(doc, from, to) {
    const children: PMNode[] = [];
    doc.forEach(child => { children.push(child); });
    const [item] = children.splice(from, 1);
    children.splice(to, 0, item!);
    return doc.copy(Fragment.from(children));
  },

  deleteScene(doc, sceneIndex) {
    const children: PMNode[] = [];
    doc.forEach((child, _offset, i) => { if (i !== sceneIndex) children.push(child); });
    return doc.copy(Fragment.from(children));
  },

  editBlockContent(doc, sceneIndex, blockIndex, content) {
    const scene = doc.child(sceneIndex);
    const block = scene.child(blockIndex);
    const newBlockContent = basicLeafToFragment(content);
    const newBlock = block.copy(newBlockContent);
    const newScene = replaceChild(scene, blockIndex, newBlock);
    return replaceChild(doc, sceneIndex, newScene);
  },

  addBlock(doc, sceneIndex, block) {
    const scene = doc.child(sceneIndex);
    const children: PMNode[] = [];
    scene.forEach(child => { children.push(child); });
    children.push(blockToNode(block));
    const newScene = scene.copy(Fragment.from(children));
    return replaceChild(doc, sceneIndex, newScene);
  },

  moveBlock(doc, fromScene, fromBlock, toScene, toBlock) {
    // Extract the block node
    const sourceScene = doc.child(fromScene);
    const movedNode = sourceScene.child(fromBlock);

    // Remove from source scene
    const sourceChildren: PMNode[] = [];
    sourceScene.forEach((child, _offset, i) => { if (i !== fromBlock) sourceChildren.push(child); });
    const newSourceScene = sourceScene.copy(Fragment.from(sourceChildren));

    // Insert into target scene
    const targetScene = fromScene === toScene ? newSourceScene : doc.child(toScene);
    const targetChildren: PMNode[] = [];
    targetScene.forEach(child => { targetChildren.push(child); });
    targetChildren.splice(toBlock, 0, movedNode);
    const newTargetScene = targetScene.copy(Fragment.from(targetChildren));

    // Rebuild doc
    const docChildren: PMNode[] = [];
    doc.forEach((child, _offset, i) => {
      if (fromScene === toScene) {
        docChildren.push(i === fromScene ? newTargetScene : child);
      } else if (i === fromScene) {
        docChildren.push(newSourceScene);
      } else if (i === toScene) {
        docChildren.push(newTargetScene);
      } else {
        docChildren.push(child);
      }
    });
    return doc.copy(Fragment.from(docChildren));
  },

  extractPlainText(doc) {
    // PM's textContent traverses all text nodes
    return doc.textContent;
  },

  migrate(doc, _targetVersion) {
    // v1 → v2: add narrativeType to each scene's attrs.
    // Migration complexity proof: PM's computeAttrs() iterates schema-defined attrs only,
    // silently dropping any unknown attr from the input JSON. The result is that
    // `narrativeType` disappears without error. This is silent data loss — harder to
    // detect than a thrown exception, and requires a schema update + re-parse to resolve.
    const json = doc.toJSON() as { type: string; content?: Array<Record<string, unknown>> };
    const v2Content = (json.content ?? []).map(scene => {
      const attrs = (scene["attrs"] ?? {}) as Record<string, unknown>;
      const narrativeType = attrs["sceneType"] === "branch" ? "branching" : "story";
      return { ...scene, attrs: { ...attrs, narrativeType } };
    });
    // nodeFromJSON silently drops `narrativeType` because it is not in narrativeSchema
    return narrativeSchema.nodeFromJSON({ ...json, content: v2Content } as object);
  },
};

// Convert a NarrativeDocumentA to PM doc (for cross-strategy comparison)
export function fromNarrativeDocumentA(scenes: NarrativeScene[]): DocB {
  return scenesToDoc(scenes);
}

// Convert PM doc back to scene array
export function toNarrativeScenes(doc: DocB): NarrativeScene[] {
  const scenes: NarrativeScene[] = [];
  doc.forEach(child => { scenes.push(nodeToScene(child)); });
  return scenes;
}
