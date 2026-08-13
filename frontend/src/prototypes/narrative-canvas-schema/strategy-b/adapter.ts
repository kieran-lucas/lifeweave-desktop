// Strategy B adapter: full ProseMirror document.
// The document is one large PM doc where scenes are custom nodes and blocks are
// semantic block nodes (rich_text_block, metric_block, image_block, callout_block, timeline_block).
// Fair pre-validation via codec before nodeFromJSON.

import { Fragment } from "@tiptap/pm/model";
import type { Node as PMNode } from "@tiptap/pm/model";
import type {
  BasicLeafContent,
  HistoryState,
  NarrativeSemanticBlock,
  NarrativeSemanticDocument,
  NarrativeSemanticScene,
  PMLeafNode,
  PrototypeAdapter,
  SceneAtmosphere,
  SceneLayoutPreset,
  SceneMotionPreset,
  StaticProjection,
} from "../shared/types";
import { makeHistory, pushHistory, undoHistory, redoHistory } from "../shared/types";
import { semanticDocumentToPlainText, semanticDocumentToStaticProjection } from "../shared/semantic";
import { validateRawJson, migrateJson } from "./codec";
import { narrativeSchemaV1, narrativeSchemaV2 } from "./schema";

export type DocB = PMNode;

// ---------------------------------------------------------------------------
// Conversion helpers: semantic → PM nodes
// ---------------------------------------------------------------------------

function basicLeafToFragment(content: BasicLeafContent): Fragment {
  const nodes = content.content.map(node => narrativeSchemaV1.nodeFromJSON(node as object));
  return Fragment.from(nodes);
}

function semanticBlockToNode(block: NarrativeSemanticBlock): PMNode {
  switch (block.kind) {
    case "rich_text":
      return narrativeSchemaV1.node(
        "rich_text_block",
        { id: block.id },
        basicLeafToFragment(block.content),
      );
    case "metric":
      return narrativeSchemaV1.node("metric_block", {
        id: block.id,
        label: block.label,
        value: block.value,
        unit: block.unit,
        description: block.description,
      });
    case "image":
      return narrativeSchemaV1.node("image_block", {
        id: block.id,
        assetId: block.assetId,
        alt: block.alt,
        caption: block.caption,
      });
    case "callout":
      return narrativeSchemaV1.node(
        "callout_block",
        { id: block.id, variant: block.variant },
        basicLeafToFragment(block.content),
      );
    case "timeline":
      return narrativeSchemaV1.node("timeline_block", {
        id: block.id,
        title: block.title,
        itemsJson: JSON.stringify(block.items),
      });
  }
}

function semanticSceneToNode(scene: NarrativeSemanticScene): PMNode {
  const blocks = Fragment.from(scene.blocks.map(semanticBlockToNode));
  return narrativeSchemaV1.node(
    "scene",
    {
      id: scene.id,
      title: scene.title,
      layoutPreset: scene.layoutPreset,
      atmosphere: scene.atmosphere,
      motionPreset: scene.motionPreset,
    },
    blocks,
  );
}

// ---------------------------------------------------------------------------
// Conversion helpers: PM nodes → semantic
// ---------------------------------------------------------------------------

function blockNodeContentToBasicLeaf(blockNode: PMNode): BasicLeafContent {
  const contentNodes: PMLeafNode[] = [];
  blockNode.forEach(child => {
    contentNodes.push(child.toJSON() as PMLeafNode);
  });
  return { type: "doc", content: contentNodes };
}

function nodeToSemanticBlock(node: PMNode): NarrativeSemanticBlock {
  const id = node.attrs["id"] as string;
  switch (node.type.name) {
    case "rich_text_block":
      return { kind: "rich_text", id, content: blockNodeContentToBasicLeaf(node) };
    case "metric_block":
      return {
        kind: "metric",
        id,
        label: node.attrs["label"] as string,
        value: node.attrs["value"] as string,
        unit: node.attrs["unit"] as string,
        description: node.attrs["description"] as string,
      };
    case "image_block":
      return {
        kind: "image",
        id,
        assetId: node.attrs["assetId"] as string,
        alt: node.attrs["alt"] as string,
        caption: node.attrs["caption"] as string,
      };
    case "callout_block":
      return {
        kind: "callout",
        id,
        variant: node.attrs["variant"] as "note" | "warning" | "tip",
        content: blockNodeContentToBasicLeaf(node),
      };
    case "timeline_block":
      return {
        kind: "timeline",
        id,
        title: node.attrs["title"] as string,
        items: JSON.parse(node.attrs["itemsJson"] as string) as {
          id: string;
          label: string;
          description: string;
        }[],
      };
    default:
      // Fallback: treat unknown blocks as rich_text
      return { kind: "rich_text", id, content: { type: "doc", content: [] } };
  }
}

function nodeToSemanticScene(node: PMNode): NarrativeSemanticScene {
  const blocks: NarrativeSemanticBlock[] = [];
  node.forEach(child => {
    blocks.push(nodeToSemanticBlock(child));
  });
  return {
    id: node.attrs["id"] as string,
    title: node.attrs["title"] as string,
    layoutPreset: node.attrs["layoutPreset"] as SceneLayoutPreset,
    atmosphere: node.attrs["atmosphere"] as SceneAtmosphere,
    motionPreset: node.attrs["motionPreset"] as SceneMotionPreset,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// fromSemanticDocument / toSemanticDocument
// ---------------------------------------------------------------------------

export function fromSemanticDocument(doc: NarrativeSemanticDocument): DocB {
  const scenes = Fragment.from(doc.scenes.map(semanticSceneToNode));
  return narrativeSchemaV1.node(
    "doc",
    {
      documentId: doc.documentId,
      title: doc.title,
      templateId: doc.templateId,
      schemaVersion: 1,
    },
    scenes,
  );
}

function pmDocToSemanticDocument(doc: DocB): NarrativeSemanticDocument {
  const scenes: NarrativeSemanticScene[] = [];
  doc.forEach(child => {
    scenes.push(nodeToSemanticScene(child));
  });
  return {
    schemaVersion: 1,
    documentId: doc.attrs["documentId"] as string,
    title: doc.attrs["title"] as string,
    templateId: doc.attrs["templateId"] as "strategy_dashboard" | "knowledge_dossier",
    scenes,
  };
}

// ---------------------------------------------------------------------------
// Immutable tree helpers
// ---------------------------------------------------------------------------

function replaceDocChild(doc: PMNode, index: number, newChild: PMNode): PMNode {
  const children: PMNode[] = [];
  doc.forEach((child, _offset, i) => {
    children.push(i === index ? newChild : child);
  });
  return doc.copy(Fragment.from(children));
}

function replaceSceneChild(scene: PMNode, index: number, newChild: PMNode): PMNode {
  const children: PMNode[] = [];
  scene.forEach((child, _offset, i) => {
    children.push(i === index ? newChild : child);
  });
  return scene.copy(Fragment.from(children));
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export const adapterB: PrototypeAdapter<DocB> = {
  parse(json) {
    const raw = JSON.parse(json) as unknown;
    const validated = validateRawJson(raw);
    if (!validated.ok) throw new Error(validated.error);
    return narrativeSchemaV1.nodeFromJSON(validated.value as object);
  },

  serialize(doc) {
    return JSON.stringify(doc.toJSON());
  },

  toSemanticDocument(doc) {
    return pmDocToSemanticDocument(doc);
  },

  getSceneCount(doc) {
    return doc.childCount;
  },

  getBlockCount(doc, sceneIndex) {
    if (sceneIndex >= doc.childCount) return 0;
    return doc.child(sceneIndex).childCount;
  },

  createScene(doc, scene) {
    const newNode = semanticSceneToNode(scene);
    const children: PMNode[] = [];
    doc.forEach(child => {
      children.push(child);
    });
    children.push(newNode);
    return doc.copy(Fragment.from(children));
  },

  deleteScene(doc, sceneIndex) {
    const children: PMNode[] = [];
    doc.forEach((child, _offset, i) => {
      if (i !== sceneIndex) children.push(child);
    });
    return doc.copy(Fragment.from(children));
  },

  reorderScene(doc, from, to) {
    const children: PMNode[] = [];
    doc.forEach(child => {
      children.push(child);
    });
    const [item] = children.splice(from, 1);
    children.splice(to, 0, item!);
    return doc.copy(Fragment.from(children));
  },

  updateSceneLayout(doc, sceneIndex, layout) {
    const scene = doc.child(sceneIndex);
    const newScene = scene.type.create(
      { ...scene.attrs, layoutPreset: layout },
      scene.content,
      scene.marks,
    );
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  updateSceneAtmosphere(doc, sceneIndex, atm) {
    const scene = doc.child(sceneIndex);
    const newScene = scene.type.create(
      { ...scene.attrs, atmosphere: atm },
      scene.content,
      scene.marks,
    );
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  updateSceneMotion(doc, sceneIndex, motion) {
    const scene = doc.child(sceneIndex);
    const newScene = scene.type.create(
      { ...scene.attrs, motionPreset: motion },
      scene.content,
      scene.marks,
    );
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  insertBlock(doc, sceneIndex, blockIndex, block) {
    const scene = doc.child(sceneIndex);
    const blockNode = semanticBlockToNode(block);
    const children: PMNode[] = [];
    scene.forEach(child => {
      children.push(child);
    });
    children.splice(blockIndex, 0, blockNode);
    const newScene = scene.copy(Fragment.from(children));
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  deleteBlock(doc, sceneIndex, blockIndex) {
    const scene = doc.child(sceneIndex);
    const children: PMNode[] = [];
    scene.forEach((child, _offset, i) => {
      if (i !== blockIndex) children.push(child);
    });
    const newScene = scene.copy(Fragment.from(children));
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  reorderBlock(doc, sceneIndex, from, to) {
    const scene = doc.child(sceneIndex);
    const children: PMNode[] = [];
    scene.forEach(child => {
      children.push(child);
    });
    const [item] = children.splice(from, 1);
    children.splice(to, 0, item!);
    const newScene = scene.copy(Fragment.from(children));
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  moveBlock(doc, fromScene, fromBlock, toScene, toBlock) {
    // Extract the block node from source
    const sourceScene = doc.child(fromScene);
    const movedNode = sourceScene.child(fromBlock);

    // Remove from source scene
    const sourceChildren: PMNode[] = [];
    sourceScene.forEach((child, _offset, i) => {
      if (i !== fromBlock) sourceChildren.push(child);
    });
    const newSourceScene = sourceScene.copy(Fragment.from(sourceChildren));

    // Insert into target scene
    let targetScene: PMNode;
    if (fromScene === toScene) {
      targetScene = newSourceScene;
    } else {
      targetScene = doc.child(toScene);
    }
    const targetChildren: PMNode[] = [];
    targetScene.forEach(child => {
      targetChildren.push(child);
    });
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

  updateBlock(doc, sceneIndex, blockIndex, block) {
    const scene = doc.child(sceneIndex);
    const blockNode = semanticBlockToNode(block);
    const newScene = replaceSceneChild(scene, blockIndex, blockNode);
    return replaceDocChild(doc, sceneIndex, newScene);
  },

  applyBatch(doc, ops) {
    let current = doc;
    for (const op of ops) {
      switch (op.op) {
        case "createScene":
          current = adapterB.createScene(current, op.scene);
          break;
        case "deleteScene":
          current = adapterB.deleteScene(current, op.sceneIndex);
          break;
        case "reorderScene":
          current = adapterB.reorderScene(current, op.from, op.to);
          break;
        case "updateSceneLayout":
          current = adapterB.updateSceneLayout(current, op.sceneIndex, op.layout);
          break;
        case "updateSceneAtmosphere":
          current = adapterB.updateSceneAtmosphere(current, op.sceneIndex, op.atm);
          break;
        case "updateSceneMotion":
          current = adapterB.updateSceneMotion(current, op.sceneIndex, op.motion);
          break;
        case "insertBlock":
          current = adapterB.insertBlock(current, op.sceneIndex, op.blockIndex, op.block);
          break;
        case "deleteBlock":
          current = adapterB.deleteBlock(current, op.sceneIndex, op.blockIndex);
          break;
        case "reorderBlock":
          current = adapterB.reorderBlock(current, op.sceneIndex, op.from, op.to);
          break;
        case "moveBlock":
          current = adapterB.moveBlock(current, op.fromScene, op.fromBlock, op.toScene, op.toBlock);
          break;
        case "updateBlock":
          current = adapterB.updateBlock(current, op.sceneIndex, op.blockIndex, op.block);
          break;
      }
    }
    return current;
  },

  projectToStatic(doc): StaticProjection {
    return semanticDocumentToStaticProjection(pmDocToSemanticDocument(doc));
  },

  extractPlainText(doc) {
    return semanticDocumentToPlainText(pmDocToSemanticDocument(doc));
  },
};

// ---------------------------------------------------------------------------
// Fair migration using codec
// ---------------------------------------------------------------------------

export function migrateDocBToV2(doc: DocB): PMNode {
  const json = doc.toJSON() as unknown;
  const validated = validateRawJson(json);
  if (!validated.ok) throw new Error(validated.error);
  const migrated = migrateJson(validated.value, 2);
  if (!migrated.ok) throw new Error(migrated.error);
  return narrativeSchemaV2.nodeFromJSON(migrated.value as object);
}

// ---------------------------------------------------------------------------
// History integration
// ---------------------------------------------------------------------------

export const adapterBHistory = {
  make: (doc: DocB): HistoryState<DocB> => makeHistory(doc),
  push: (h: HistoryState<DocB>, doc: DocB): HistoryState<DocB> => pushHistory(h, doc),
  undo: (h: HistoryState<DocB>) => undoHistory(h),
  redo: (h: HistoryState<DocB>) => redoHistory(h),
};
