import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { getRelatedTasksForLifeNode, previewPortablePackageImport, readPortablePackageExport } from "./commands";

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

describe("portable raw command adapters", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue(new ArrayBuffer(0)));
  it("sends preview bytes as the raw invoke body", async () => {
    const bytes = new Uint8Array([80, 75, 3, 4]);
    await previewPortablePackageImport(bytes);
    expect(invoke).toHaveBeenCalledWith("preview_portable_package_import", bytes);
  });
  it("requests an ArrayBuffer export by camelCase opaque ID", async () => {
    await readPortablePackageExport("export-id");
    expect(invoke).toHaveBeenCalledWith("read_portable_package_export", { exportId: "export-id" });
  });
});
