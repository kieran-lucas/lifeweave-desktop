import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { confirmLifeBranchImport, createLifeLink, discardLifeBranchImport, getLifeLinkPanel, getRelatedTasksForLifeNode, prepareLifeBranchExport, previewLifeBranchImport, previewPortablePackageImport, readLifeBranchExport, readPortablePackageExport, removeLifeLink, searchLifeLinkTargets } from "./commands";

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

describe("Life link command adapters", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue({}));

  it("keeps stable IDs and bounded query inside typed input envelopes", async () => {
    await getLifeLinkPanel({ source_node_id: "source" });
    await searchLifeLinkTargets({ source_node_id: "source", query: "kế hoạch" });
    await createLifeLink({ source_node_id: "source", target_node_id: "target" });
    await removeLifeLink({ link_id: "link" });
    expect(invoke.mock.calls).toEqual([
      ["get_life_link_panel", { input: { source_node_id: "source" } }],
      ["search_life_link_targets", { input: { source_node_id: "source", query: "kế hoạch" } }],
      ["create_life_link", { input: { source_node_id: "source", target_node_id: "target" } }],
      ["remove_life_link", { input: { link_id: "link" } }],
    ]);
  });
});

describe("Life branch command adapters", () => {
  beforeEach(() => invoke.mockReset().mockResolvedValue(new ArrayBuffer(0)));

  it("sends preview bytes as the raw invoke body and reads binary by opaque ID", async () => {
    const bytes = new Uint8Array([80, 75, 3, 4]);
    await previewLifeBranchImport(bytes);
    expect(invoke).toHaveBeenCalledWith("preview_life_branch_import", bytes);
    await readLifeBranchExport("export-id");
    expect(invoke).toHaveBeenCalledWith("read_life_branch_export", { exportId: "export-id" });
  });

  it("keeps typed inputs inside an envelope and never sends a filesystem path", async () => {
    await prepareLifeBranchExport({ node_id: "node" });
    await confirmLifeBranchImport({
      import_id: "import",
      package_sha256: "a".repeat(64),
      parent_node_id: "parent",
      expected_tree_revision: 3,
      operation_id: "op",
    });
    await discardLifeBranchImport({ import_id: "import" });
    expect(invoke.mock.calls).toEqual([
      ["prepare_life_branch_export", { input: { node_id: "node" } }],
      ["confirm_life_branch_import", { input: { import_id: "import", package_sha256: "a".repeat(64), parent_node_id: "parent", expected_tree_revision: 3, operation_id: "op" } }],
      ["discard_life_branch_import", { input: { import_id: "import" } }],
    ]);
    expect(JSON.stringify(invoke.mock.calls)).not.toMatch(/[A-Za-z]:\\|\/imports\/|\/exports\//);
  });
});
