// Strategy A adapter: domain envelope + rich-text islands.
// The document is a plain versioned JSON envelope wrapping an array of scenes.
// Each scene holds rich-text blocks whose content is valid Basic Leaf ProseMirror JSON.
// No ProseMirror schema is loaded; operations are pure immutable object transforms.

import type {
  BasicLeafContent,
  NarrativeBlock,
  NarrativeDocumentA,
  NarrativeScene,
  PMLeafNode,
  PrototypeAdapter,
} from "../shared/types";

export type DocA = NarrativeDocumentA;

// Incremented SchemaVersion 2 shape (migration target)
export interface NarrativeDocumentAv2 extends Omit<NarrativeDocumentA, "schemaVersion"> {
  schemaVersion: 2;
  narrativeType: "story" | "branching" | "linear";
}

function bump(doc: DocA): DocA {
  return { ...doc, revision: doc.revision + 1 };
}

export const adapterA: PrototypeAdapter<DocA> = {
  parse(json) {
    const raw = JSON.parse(json) as DocA;
    if (raw.schemaVersion !== 1) throw new Error(`Unsupported schemaVersion: ${raw.schemaVersion}`);
    if (!Array.isArray(raw.scenes)) throw new Error("Missing scenes array");
    return raw;
  },

  serialize(doc) {
    return JSON.stringify(doc);
  },

  getSceneCount(doc) {
    return doc.scenes.length;
  },

  getBlockCount(doc, sceneIndex) {
    return doc.scenes[sceneIndex]?.blocks.length ?? 0;
  },

  addScene(doc, scene) {
    return bump({ ...doc, scenes: [...doc.scenes, scene] });
  },

  reorderScene(doc, from, to) {
    const scenes = [...doc.scenes];
    const [item] = scenes.splice(from, 1);
    scenes.splice(to, 0, item!);
    return bump({ ...doc, scenes });
  },

  deleteScene(doc, sceneIndex) {
    const scenes = doc.scenes.filter((_, i) => i !== sceneIndex);
    return bump({ ...doc, scenes });
  },

  editBlockContent(doc, sceneIndex, blockIndex, content) {
    const scenes = doc.scenes.map((scene, si) => {
      if (si !== sceneIndex) return scene;
      const blocks = scene.blocks.map((block, bi) =>
        bi === blockIndex ? { ...block, content } : block
      );
      return { ...scene, blocks };
    });
    return bump({ ...doc, scenes });
  },

  addBlock(doc, sceneIndex, block) {
    const scenes = doc.scenes.map((scene, si) => {
      if (si !== sceneIndex) return scene;
      return { ...scene, blocks: [...scene.blocks, block] };
    });
    return bump({ ...doc, scenes });
  },

  moveBlock(doc, fromScene, fromBlock, toScene, toBlock) {
    let moved: NarrativeBlock | undefined;
    const afterRemove = doc.scenes.map((scene, si) => {
      if (si !== fromScene) return scene;
      const blocks = [...scene.blocks];
      [moved] = blocks.splice(fromBlock, 1);
      return { ...scene, blocks };
    });
    if (!moved) return doc;
    const b = moved;
    const afterInsert = afterRemove.map((scene, si) => {
      if (si !== toScene) return scene;
      const blocks = [...scene.blocks];
      blocks.splice(toBlock, 0, b);
      return { ...scene, blocks };
    });
    return bump({ ...doc, scenes: afterInsert });
  },

  extractPlainText(doc) {
    const parts: string[] = [];
    function walkNode(node: PMLeafNode): void {
      if (node.type === "text" && node.text) parts.push(node.text);
      if (node.content) for (const child of node.content) walkNode(child);
    }
    for (const scene of doc.scenes) {
      parts.push(scene.title);
      for (const block of scene.blocks) {
        for (const node of block.content.content) walkNode(node);
      }
    }
    return parts.join(" ");
  },

  migrate(doc, _targetVersion) {
    // v1 → v2: add narrativeType field derived from scene composition
    const hasEnding = doc.scenes.some(s => s.sceneType === "ending");
    const hasBranch = doc.scenes.some(s => s.sceneType === "branch");
    const narrativeType = hasBranch ? "branching" : hasEnding ? "story" : "linear";
    const v2: NarrativeDocumentAv2 = {
      ...doc,
      schemaVersion: 2,
      revision: doc.revision + 1,
      narrativeType,
    };
    return v2 as unknown as DocA;
  },
};
