import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { getRelatedTasksForLifeNode } from "./commands";

describe("Related Tasks command adapter", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue([]));

  it("sends the existing command with camelCase node and local anchor keys", async () => {
    await getRelatedTasksForLifeNode("node-1", "2026-08-04");
    expect(invoke).toHaveBeenCalledWith("get_related_tasks_for_life_node", {
      nodeId: "node-1",
      anchorLocalDate: "2026-08-04",
    });
  });
});
