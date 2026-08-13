// Strategy A adapter: domain envelope + rich-text islands.
// The document is a plain versioned JSON envelope wrapping an array of scenes.
// Each scene holds semantic blocks. Operations are pure immutable object transforms.
// No prosemirror-model schema is loaded — zero PM dependency.

import type {
  HistoryState,
  NarrativeSemanticBlock,
  NarrativeSemanticDocument,
  NarrativeSemanticScene,
  PrototypeAdapter,
  SceneAtmosphere,
  SceneLayoutPreset,
  SceneMotionPreset,
  StaticProjection,
} from "../shared/types";
import { makeHistory, pushHistory, redoHistory, undoHistory } from "../shared/types";
import { semanticDocumentToPlainText, semanticDocumentToStaticProjection } from "../shared/semantic";

export type DocA = NarrativeSemanticDocument;

// ---------------------------------------------------------------------------
// Pure immutable helpers
// ---------------------------------------------------------------------------

function mapScenes(
  doc: DocA,
  fn: (scenes: NarrativeSemanticScene[]) => NarrativeSemanticScene[],
): DocA {
  return { ...doc, scenes: fn(doc.scenes) };
}

function mapScene(
  doc: DocA,
  sceneIndex: number,
  fn: (scene: NarrativeSemanticScene) => NarrativeSemanticScene,
): DocA {
  return mapScenes(doc, scenes =>
    scenes.map((s, i) => (i === sceneIndex ? fn(s) : s)),
  );
}

function mapBlocks(
  scene: NarrativeSemanticScene,
  fn: (blocks: NarrativeSemanticBlock[]) => NarrativeSemanticBlock[],
): NarrativeSemanticScene {
  return { ...scene, blocks: fn(scene.blocks) };
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export const adapterA: PrototypeAdapter<DocA> = {
  parse(json) {
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (raw["schemaVersion"] !== 1) throw new Error(`Unsupported schemaVersion: ${String(raw["schemaVersion"])}`);
    if (!raw["documentId"]) throw new Error("Missing documentId");
    if (!raw["title"]) throw new Error("Missing title");
    if (!Array.isArray(raw["scenes"])) throw new Error("Missing scenes array");
    return raw as unknown as DocA;
  },

  serialize(doc) {
    return JSON.stringify(doc);
  },

  toSemanticDocument(doc) {
    return doc; // DocA IS the semantic document
  },

  getSceneCount(doc) {
    return doc.scenes.length;
  },

  getBlockCount(doc, sceneIndex) {
    return doc.scenes[sceneIndex]?.blocks.length ?? 0;
  },

  createScene(doc, scene) {
    return mapScenes(doc, scenes => [...scenes, scene]);
  },

  deleteScene(doc, sceneIndex) {
    return mapScenes(doc, scenes => scenes.filter((_, i) => i !== sceneIndex));
  },

  reorderScene(doc, from, to) {
    return mapScenes(doc, scenes => {
      const arr = [...scenes];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item!);
      return arr;
    });
  },

  updateSceneLayout(doc, sceneIndex, layout: SceneLayoutPreset) {
    return mapScene(doc, sceneIndex, s => ({ ...s, layoutPreset: layout }));
  },

  updateSceneAtmosphere(doc, sceneIndex, atm: SceneAtmosphere) {
    return mapScene(doc, sceneIndex, s => ({ ...s, atmosphere: atm }));
  },

  updateSceneMotion(doc, sceneIndex, motion: SceneMotionPreset) {
    return mapScene(doc, sceneIndex, s => ({ ...s, motionPreset: motion }));
  },

  insertBlock(doc, sceneIndex, blockIndex, block) {
    return mapScene(doc, sceneIndex, s =>
      mapBlocks(s, blocks => {
        const arr = [...blocks];
        arr.splice(blockIndex, 0, block);
        return arr;
      }),
    );
  },

  deleteBlock(doc, sceneIndex, blockIndex) {
    return mapScene(doc, sceneIndex, s =>
      mapBlocks(s, blocks => blocks.filter((_, i) => i !== blockIndex)),
    );
  },

  reorderBlock(doc, sceneIndex, from, to) {
    return mapScene(doc, sceneIndex, s =>
      mapBlocks(s, blocks => {
        const arr = [...blocks];
        const [item] = arr.splice(from, 1);
        arr.splice(to, 0, item!);
        return arr;
      }),
    );
  },

  moveBlock(doc, fromScene, fromBlock, toScene, toBlock) {
    let moved: NarrativeSemanticBlock | undefined;

    // Remove from source
    let intermediate = mapScene(doc, fromScene, s =>
      mapBlocks(s, blocks => {
        const arr = [...blocks];
        [moved] = arr.splice(fromBlock, 1);
        return arr;
      }),
    );

    if (!moved) return doc;
    const block = moved;

    // Insert into target
    intermediate = mapScene(intermediate, toScene, s =>
      mapBlocks(s, blocks => {
        const arr = [...blocks];
        arr.splice(toBlock, 0, block);
        return arr;
      }),
    );

    return intermediate;
  },

  updateBlock(doc, sceneIndex, blockIndex, block) {
    return mapScene(doc, sceneIndex, s =>
      mapBlocks(s, blocks => blocks.map((b, i) => (i === blockIndex ? block : b))),
    );
  },

  applyBatch(doc, ops) {
    let current = doc;
    for (const op of ops) {
      switch (op.op) {
        case "createScene":
          current = adapterA.createScene(current, op.scene);
          break;
        case "deleteScene":
          current = adapterA.deleteScene(current, op.sceneIndex);
          break;
        case "reorderScene":
          current = adapterA.reorderScene(current, op.from, op.to);
          break;
        case "updateSceneLayout":
          current = adapterA.updateSceneLayout(current, op.sceneIndex, op.layout);
          break;
        case "updateSceneAtmosphere":
          current = adapterA.updateSceneAtmosphere(current, op.sceneIndex, op.atm);
          break;
        case "updateSceneMotion":
          current = adapterA.updateSceneMotion(current, op.sceneIndex, op.motion);
          break;
        case "insertBlock":
          current = adapterA.insertBlock(current, op.sceneIndex, op.blockIndex, op.block);
          break;
        case "deleteBlock":
          current = adapterA.deleteBlock(current, op.sceneIndex, op.blockIndex);
          break;
        case "reorderBlock":
          current = adapterA.reorderBlock(current, op.sceneIndex, op.from, op.to);
          break;
        case "moveBlock":
          current = adapterA.moveBlock(current, op.fromScene, op.fromBlock, op.toScene, op.toBlock);
          break;
        case "updateBlock":
          current = adapterA.updateBlock(current, op.sceneIndex, op.blockIndex, op.block);
          break;
      }
    }
    return current;
  },

  projectToStatic(doc): StaticProjection {
    return semanticDocumentToStaticProjection(adapterA.toSemanticDocument(doc));
  },

  extractPlainText(doc) {
    return semanticDocumentToPlainText(adapterA.toSemanticDocument(doc));
  },
};

// ---------------------------------------------------------------------------
// History integration
// ---------------------------------------------------------------------------

export const adapterAHistory = {
  make: (doc: DocA): HistoryState<DocA> => makeHistory(doc),
  push: (h: HistoryState<DocA>, doc: DocA): HistoryState<DocA> => pushHistory(h, doc),
  undo: (h: HistoryState<DocA>) => undoHistory(h),
  redo: (h: HistoryState<DocA>) => redoHistory(h),
};
