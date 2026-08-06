import axe from "axe-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifeBranchControls, exportBlockedReason } from "./LifeBranchControls";

const api = vi.hoisted(() => ({ prepare: vi.fn(), read: vi.fn(), preview: vi.fn(), confirm: vi.fn(), discard: vi.fn() }));
vi.mock("../../../ipc/commands", () => ({
  prepareLifeBranchExport: api.prepare, readLifeBranchExport: api.read,
  previewLifeBranchImport: api.preview, confirmLifeBranchImport: api.confirm,
  discardLifeBranchImport: api.discard,
}));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const mount = (ui: React.ReactNode, queryClient = client()) =>
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

const counts = {
  nodes: 5, branches: 2, basic_leaf_documents: 1, narrative_documents: 1, empty_leaves: 1,
  documents: 2, assets: 1, tags: 2, internal_links: 1, maximum_depth: 2,
};
const preview = {
  import_id: "00000000-0000-7000-8000-000000000010",
  package_sha256: "a".repeat(64),
  root_title: "Nghiên cứu",
  counts,
  total_asset_bytes: 2048n,
  package_bytes: 4096n,
  supported: true,
  warnings: [
    "Imported nodes, documents, links, and assets will receive new local identities.",
    "This import cannot be undone.",
    "2 link(s) leaving this branch are not included.",
  ],
};
const result = {
  life_node_id: "imported-root", parent_node_id: "node", tree_revision: 8,
  node_count: 5, document_count: 2, asset_count: 1, created_tag_count: 1,
  reused_tag_count: 1, internal_link_count: 1, undo_token: null, warnings: [],
};

const branchFile = (size = 4) => {
  const bytes = new Uint8Array([80, 75, 3, 4]);
  const file = new File([bytes], "branch.lifeweave-branch.zip", { type: "application/zip" });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(bytes.buffer) });
  return file;
};

const eligible = {
  nodeId: "node", nodeTitle: "Destination", parentId: "parent",
  childCount: 2, treeRevision: 7, onImported: vi.fn(),
};

describe("Life branch export eligibility", () => {
  it("names the exact reason a node cannot be exported", () => {
    expect(exportBlockedReason({ parentId: "p", childCount: 2, hasDocument: false })).toBeUndefined();
    expect(exportBlockedReason({ parentId: null, childCount: 2, hasDocument: false }))
      .toBe("The Life root cannot be exported as a branch.");
    expect(exportBlockedReason({ parentId: "p", childCount: 0, hasDocument: false }))
      .toBe("Export needs a branch with at least one active child.");
    expect(exportBlockedReason({ parentId: "p", childCount: 0, hasDocument: true }))
      .toBe("A node holding a document cannot be exported as a branch.");
  });
});

describe("LifeBranchControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.preview.mockResolvedValue(preview);
    api.confirm.mockResolvedValue(result);
    api.discard.mockResolvedValue(undefined);
    api.prepare.mockResolvedValue({
      export_id: "ticket", file_name: "Research.lifeweave-branch.zip", byte_size: 4n,
      sha256: "b".repeat(64), root_title: "Research", counts, total_asset_bytes: 2048n,
      warnings: ["This package contains one Life branch. It is not a full application backup."],
    });
    api.read.mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("disables export with a visible reason when the node is not an eligible branch", () => {
    mount(<LifeBranchControls {...eligible} parentId={null} />);
    expect(screen.getByRole("button", { name: "Export branch" })).toBeDisabled();
    expect(screen.getByText("The Life root cannot be exported as a branch.")).toBeInTheDocument();
    expect(api.prepare).not.toHaveBeenCalled();
  });

  it("downloads the branch through a Blob and revokes the object URL", async () => {
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.click(screen.getByRole("button", { name: "Export branch" }));
    await screen.findByText(/Branch package prepared/);
    expect(api.prepare).toHaveBeenCalledWith({ node_id: "node" });
    expect(api.read).toHaveBeenCalledWith("ticket");
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("reports an export failure without claiming anything changed", async () => {
    api.prepare.mockRejectedValue(new Error("nope"));
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.click(screen.getByRole("button", { name: "Export branch" }));
    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Branch export failed without changing your Life tree.");
  });

  it("rejects an oversized package before any IPC call", async () => {
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.change(screen.getByLabelText("Import branch here"), {
      target: { files: [branchFile(64 * 1024 * 1024 + 1)] },
    });
    expect(await screen.findByRole("alert"))
      .toHaveTextContent("The branch package is larger than 64 MiB and was not read.");
    expect(api.preview).not.toHaveBeenCalled();
  });

  it("previews raw bytes and shows every count, the destination, and all warnings", async () => {
    const { container } = mount(<LifeBranchControls {...eligible} />);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });

    const dialog = await screen.findByRole("dialog", { name: "Import Life branch" });
    expect(api.preview).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(dialog).toHaveTextContent("Nghiên cứu");
    expect(dialog).toHaveTextContent("Destination");
    expect(dialog).toHaveTextContent("5 (2 branch, 1 empty leaf)");
    expect(dialog).toHaveTextContent("2 (1 Basic Leaf, 1 Narrative Canvas)");
    expect(dialog).toHaveTextContent("This import cannot be undone.");
    expect(dialog).toHaveTextContent("2 link(s) leaving this branch are not included.");

    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });

  it("confirms once with the previewed digest and destination, then refreshes every cache", async () => {
    let resolve!: (value: typeof result) => void;
    api.confirm.mockReturnValue(new Promise(value => { resolve = value; }));
    const queryClient = client();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const onImported = vi.fn();
    mount(<LifeBranchControls {...eligible} onImported={onImported} />, queryClient);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });

    const confirm = await screen.findByRole("button", { name: "Import branch here" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(api.confirm).toHaveBeenCalledTimes(1);
    expect(api.confirm).toHaveBeenCalledWith(expect.objectContaining({
      import_id: preview.import_id,
      package_sha256: preview.package_sha256,
      parent_node_id: "node",
      expected_tree_revision: 7,
    }));
    expect(screen.getByRole("button", { name: "Importing…" })).toBeDisabled();

    resolve(result);
    await screen.findByText(/Imported/);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["life"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["search"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tags"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-life-targets"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["life-links"] });
    expect(onImported).toHaveBeenCalledWith("imported-root");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the preview and reuses the operation ID when a commit fails, so a retry is idempotent", async () => {
    api.confirm.mockRejectedValueOnce(new Error("storage"));
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Import branch here" }));

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Import failed without changing your Life tree. You can retry or cancel.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nghiên cứu")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Import branch here" }));
    await waitFor(() => expect(api.confirm).toHaveBeenCalledTimes(2));
    const first = api.confirm.mock.calls[0]![0];
    const second = api.confirm.mock.calls[1]![0];
    expect(second.operation_id).toBe(first.operation_id);
    expect(second.parent_node_id).toBe("node");
  });

  it("cancels with Escape, discards the staged package, and restores focus to the trigger", async () => {
    mount(<LifeBranchControls {...eligible} />);
    const input = screen.getByLabelText("Import branch here");
    fireEvent.change(input, { target: { files: [branchFile()] } });
    await screen.findByRole("dialog");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.discard).toHaveBeenCalledWith({ import_id: preview.import_id });
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("ignores Escape while a commit is pending", async () => {
    api.confirm.mockReturnValue(new Promise(() => {}));
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Import branch here" }));

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.discard).not.toHaveBeenCalled();
  });

  it("traps Tab inside the dialog and keeps both controls reachable", async () => {
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });
    const dialog = await screen.findByRole("dialog");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Import Life branch" }));

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Import branch here" });
    expect(dialog).toContainElement(cancel);
    expect(dialog).toContainElement(confirm);

    confirm.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it("reports a rejected package without opening a dialog", async () => {
    api.preview.mockRejectedValue(new Error("invalid"));
    mount(<LifeBranchControls {...eligible} />);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });
    expect(await screen.findByRole("alert"))
      .toHaveTextContent("The branch package could not be validated. Nothing was changed.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("warns instead of claiming success when the caches cannot refresh", async () => {
    const queryClient = client();
    vi.spyOn(queryClient, "invalidateQueries").mockRejectedValue(new Error("offline"));
    mount(<LifeBranchControls {...eligible} />, queryClient);
    fireEvent.change(screen.getByLabelText("Import branch here"), { target: { files: [branchFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Import branch here" }));
    expect(await screen.findByText(/could not refresh automatically/)).toBeInTheDocument();
  });
});
