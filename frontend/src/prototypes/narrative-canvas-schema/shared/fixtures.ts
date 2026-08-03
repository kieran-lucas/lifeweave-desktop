// Deterministic fixtures for prototype benchmarks.
// S = small (8 scenes / 40 blocks), K = medium (20 scenes / 100 blocks).

import type { BasicLeafContent, NarrativeBlock, NarrativeDocumentA, NarrativeScene } from "./types";

function makeContent(text: string): BasicLeafContent {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export function makeBlock(id: string, text: string, blockType: NarrativeBlock["blockType"] = "rich-text"): NarrativeBlock {
  return { id, blockType, content: makeContent(text) };
}

export function makeScene(
  id: string, title: string, sceneType: NarrativeScene["sceneType"], blockCount: number
): NarrativeScene {
  return {
    id,
    title,
    sceneType,
    tags: [],
    blocks: Array.from({ length: blockCount }, (_, i) =>
      makeBlock(`${id}-b${i}`, `Block ${i + 1} of scene "${title}"`)
    ),
  };
}

const SCENE_TYPES: NarrativeScene["sceneType"][] = ["linear", "linear", "linear", "branch", "branch", "ending"];

export const FIXTURE_S: NarrativeDocumentA = {
  schemaVersion: 1,
  revision: 1,
  scenes: Array.from({ length: 8 }, (_, i) =>
    makeScene(`s${i}`, `Scene ${String.fromCharCode(65 + i)}`, SCENE_TYPES[i % 6]!, 5)
  ),
};

export const FIXTURE_K: NarrativeDocumentA = {
  schemaVersion: 1,
  revision: 1,
  scenes: Array.from({ length: 20 }, (_, i) =>
    makeScene(`k${i}`, `Chapter ${i + 1}`, i === 19 ? "ending" : SCENE_TYPES[i % 6]!, 5)
  ),
};
