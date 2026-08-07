import axe from "axe-core";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifeTreeControls, treeExportBlockedReason, treeImportBlockedReason } from "./LifeTreeControls";

const api = vi.hoisted(() => ({ prepare: vi.fn(), read: vi.fn(), preview: vi.fn(), confirm: vi.fn(), discard: vi.fn() }));
vi.mock("../../../ipc/commands", () => ({
  prepareLifeTreeExport: api.prepare, readLifeTreeExport: api.read,
  previewLifeTreeImport: api.preview, confirmLifeTreeImport: api.confirm,
  discardLifeTreeImport: api.discard,
}));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const mount = (ui: React.ReactNode, queryClient = client()) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
const counts = { top_level_nodes: 2, nodes: 6, branches: 2, basic_leaf_documents: 1, narrative_documents: 1, empty_leaves: 2, documents: 2, assets: 1, tags: 2, internal_links: 1, maximum_depth: 3 };
const preview = { import_id: "00000000-0000-7000-8000-000000000010", package_sha256: "a".repeat(64), counts, total_asset_bytes: 2048n, package_bytes: 4096n, supported: true, warnings: ["This import cannot be undone.", "2 archived Life node(s) and their descendants are not included."] };
const result = { first_imported_node_id: "imported-first-root", parent_node_id: "destination", tree_revision: 8, node_count: 6, document_count: 2, asset_count: 1, created_tag_count: 1, reused_tag_count: 1, internal_link_count: 1, undo_token: null, warnings: [] };
const props = { nodeId: "destination", nodeTitle: "Destination", parentId: "life-root", childCount: 0, hasDocument: false, treeRevision: 7, onImported: vi.fn() };
const treeFile = (size = 4) => { const bytes = new Uint8Array([80, 75, 3, 4]); const file = new File([bytes], "lifeweave-tree.zip", { type: "application/zip" }); Object.defineProperty(file, "size", { value: size }); Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(bytes.buffer) }); return file; };

describe("Life tree eligibility", () => {
  it("limits export to a non-empty Life root and import to documentless destinations", () => {
    expect(treeExportBlockedReason({ parentId: null, childCount: 2 })).toBeUndefined();
    expect(treeExportBlockedReason({ parentId: "life-root", childCount: 2 })).toMatch(/only at the Life root/);
    expect(treeExportBlockedReason({ parentId: null, childCount: 0 })).toMatch(/no active non-root content/);
    expect(treeImportBlockedReason(false)).toBeUndefined();
    expect(treeImportBlockedReason(true)).toMatch(/holding a document/);
  });
});

describe("LifeTreeControls", () => {
  beforeEach(() => {
    vi.clearAllMocks(); api.preview.mockResolvedValue(preview); api.confirm.mockResolvedValue(result); api.discard.mockResolvedValue(undefined);
    api.prepare.mockResolvedValue({ export_id: "ticket", file_name: "Life.lifeweave-tree.zip", byte_size: 4n, sha256: "b".repeat(64), counts, total_asset_bytes: 2048n, warnings: ["This package contains the complete active non-root Life forest."] });
    api.read.mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:tree"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {}); vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("exports only from root through Blob download and rejects oversize before IPC", async () => {
    mount(<LifeTreeControls {...props} nodeId="life-root" nodeTitle="Life" parentId={null} childCount={2}/>);
    fireEvent.click(screen.getByRole("button", { name: "Export Life tree" }));
    await screen.findByText(/Life Tree Package prepared/);
    expect(api.prepare).toHaveBeenCalledWith({ node_id: "life-root" }); expect(api.read).toHaveBeenCalledWith("ticket"); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:tree");
    fireEvent.change(screen.getByLabelText("Choose Life Tree Package"), { target: { files: [treeFile(64 * 1024 * 1024 + 1)] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("larger than 64 MiB"); expect(api.preview).not.toHaveBeenCalled();
  });

  it("previews Tree identity, forest counts, destination, fresh IDs, append-only behavior, warnings, and a11y", async () => {
    const { container } = mount(<LifeTreeControls {...props}/>);
    fireEvent.change(screen.getByLabelText("Choose Life Tree Package"), { target: { files: [treeFile()] } });
    const dialog = await screen.findByRole("dialog", { name: "Import Life tree" });
    expect(api.preview).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(dialog).toHaveTextContent("Life Tree Package"); expect(dialog).toHaveTextContent("Top-level roots2"); expect(dialog).toHaveTextContent("Destination");
    expect(dialog).toHaveTextContent("fresh local identity"); expect(dialog).toHaveTextContent("append every top-level root"); expect(dialog).toHaveTextContent("never merged, replaced, reordered, or overwritten"); expect(dialog).toHaveTextContent("cannot be undone");
    expect(dialog).toHaveTextContent("2 archived Life node(s)");
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("cancels and restores trigger focus, then confirms with a stable retry ID and refreshes caches", async () => {
    const queryClient = client(); const invalidate = vi.spyOn(queryClient, "invalidateQueries"); const onImported = vi.fn();
    mount(<LifeTreeControls {...props} onImported={onImported}/>, queryClient);
    const trigger = screen.getByRole("button", { name: "Import Life tree here" });
    fireEvent.change(screen.getByLabelText("Choose Life Tree Package"), { target: { files: [treeFile()] } }); await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" }); await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument()); expect(api.discard).toHaveBeenCalledWith({ import_id: preview.import_id }); await waitFor(() => expect(document.activeElement).toBe(trigger));
    fireEvent.change(screen.getByLabelText("Choose Life Tree Package"), { target: { files: [treeFile()] } });
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Import Life tree here" }));
    await screen.findByText(/Imported 6 nodes/); expect(onImported).toHaveBeenCalledWith("imported-first-root");
    for (const key of [["life"], ["search"], ["tags"], ["task-life-targets"], ["life-links"]]) expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  });

  it("retains a retryable preview and operation ID after safe failure", async () => {
    api.confirm.mockRejectedValueOnce(new Error("injected")); mount(<LifeTreeControls {...props}/>);
    fireEvent.change(screen.getByLabelText("Choose Life Tree Package"), { target: { files: [treeFile()] } });
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Import Life tree here" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("without changing your Life tree"); const first = api.confirm.mock.calls[0]![0];
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Import Life tree here" })); await waitFor(() => expect(api.confirm).toHaveBeenCalledTimes(2)); expect(api.confirm.mock.calls[1]![0].operation_id).toBe(first.operation_id);
  });

  it("disables import for a document-bearing destination", () => {
    mount(<LifeTreeControls {...props} hasDocument/>); expect(screen.getByRole("button", { name: "Import Life tree here" })).toBeDisabled(); expect(screen.getByText(/holding a document/)).toBeInTheDocument();
  });
});
