import axe from "axe-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortablePackageControls } from "./PortablePackageControls";

const api = vi.hoisted(() => ({ prepare: vi.fn(), read: vi.fn(), preview: vi.fn(), confirm: vi.fn(), discard: vi.fn() }));
vi.mock("../../../ipc/commands", () => ({
  preparePortablePackageExport: api.prepare, readPortablePackageExport: api.read,
  previewPortablePackageImport: api.preview, confirmPortablePackageImport: api.confirm,
  discardPortablePackageImport: api.discard,
}));

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const mount = (ui: React.ReactNode, queryClient = client()) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
const preview = { import_id: "00000000-0000-7000-8000-000000000010", document_kind: "narrative_canvas" as const,
  title: "Portable Canvas", document_schema_version: 1, template_id: "knowledge_dossier", template_version: 1,
  visual_world_id: "aurora", scene_count: 3, asset_count: 2, total_asset_bytes: 2048n, package_bytes: 4096n,
  warnings: ["The imported document will receive new local identities."] };
const packageFile = () => {
  const file = new File([new Uint8Array([80,75,3,4])], "doc.lifeweave.zip", { type: "application/zip" });
  Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(new Uint8Array([80,75,3,4]).buffer) });
  return file;
};

describe("PortablePackageControls", () => {
  beforeEach(() => {
    vi.clearAllMocks(); api.preview.mockResolvedValue(preview); api.confirm.mockResolvedValue({}); api.discard.mockResolvedValue(undefined);
    api.prepare.mockResolvedValue({ export_id: "ticket", file_name: "backend.lifeweave.zip", byte_size: 4n, sha256: "a".repeat(64), document_kind: "basic_leaf", title: "Leaf", asset_count: 0, warnings: [] });
    api.read.mockResolvedValue(new Uint8Array([1,2,3,4]).buffer);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test"); vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("previews raw file bytes and shows complete accessible metadata", async () => {
    const { container } = mount(<PortablePackageControls nodeId="node" />);
    const file = packageFile();
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [file] } });
    expect(await screen.findByRole("dialog", { name: "Import Lifeweave package" })).toBeInTheDocument();
    expect(screen.getByText("Portable Canvas")).toBeInTheDocument(); expect(screen.getByText("aurora")).toBeInTheDocument();
    expect(api.preview).toHaveBeenCalledWith(expect.any(Uint8Array));
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } }); expect(results.violations).toEqual([]);
  });

  it("confirms once, disables duplicate commit, and invalidates the empty leaf", async () => {
    let resolve!: () => void; api.confirm.mockReturnValue(new Promise<void>(value => { resolve = value; }));
    const queryClient = client(); const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    mount(<PortablePackageControls nodeId="node" />, queryClient);
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [packageFile()] } });
    const confirm = await screen.findByRole("button", { name: "Import into this empty leaf" }); fireEvent.click(confirm); fireEvent.click(confirm);
    expect(api.confirm).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "Importing…" })).toBeDisabled();
    resolve(); await screen.findByText("Lifeweave package imported into this empty leaf.");
    expect(invalidate).toHaveBeenCalledTimes(4);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["life-links"] });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels with Escape, discards the ticket, and restores focus", async () => {
    mount(<PortablePackageControls nodeId="node" />); const input = screen.getByLabelText("Import Lifeweave package");
    fireEvent.change(input, { target: { files: [packageFile()] } }); await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" }); await waitFor(() => expect(api.discard).toHaveBeenCalledWith(preview.import_id)); await waitFor(() => expect(input).toHaveFocus());
  });

  it("rejects a frontend file over 64 MiB before reading", async () => {
    mount(<PortablePackageControls nodeId="node" />); const file = packageFile(); Object.defineProperty(file, "size", { value: 64 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [file] } });
    expect(await screen.findByText("The package is larger than 64 MiB and was not read.")).toBeInTheDocument(); expect(file.arrayBuffer).not.toHaveBeenCalled(); expect(api.preview).not.toHaveBeenCalled();
  });

  it("discards an earlier preview before accepting a replacement selection", async () => {
    mount(<PortablePackageControls nodeId="node" />); const input = screen.getByLabelText("Import Lifeweave package");
    fireEvent.change(input, { target: { files: [packageFile()] } }); await screen.findByRole("dialog");
    const second = { ...preview, import_id: "00000000-0000-7000-8000-000000000011", title: "Replacement" }; api.preview.mockResolvedValueOnce(second);
    fireEvent.change(input, { target: { files: [packageFile()] } }); await screen.findByText("Replacement");
    expect(api.discard).toHaveBeenCalledWith(preview.import_id);
  });

  it("uses backend filename, application/zip Blob, revokes URL, and shows draft note", async () => {
    const blob = vi.spyOn(globalThis, "Blob"); mount(<PortablePackageControls nodeId="node" documentKind="basic_leaf" documentId="doc" hasDraft />);
    fireEvent.click(screen.getByRole("button", { name: "Export Lifeweave package" }));
    await screen.findByText(/Portable package prepared/); expect(blob).toHaveBeenCalledWith(expect.any(Array), { type: "application/zip" });
    const clicked = vi.mocked(HTMLAnchorElement.prototype.click).mock.instances.at(-1) as HTMLAnchorElement;
    expect(clicked.download).toBe("backend.lifeweave.zip"); expect(document.body).not.toContainElement(clicked);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test"); expect(screen.getByRole("note")).toHaveTextContent("committed document only");
  });

  it("reports a backend byte-length mismatch without downloading", async () => {
    api.read.mockResolvedValue(new Uint8Array([1]).buffer); mount(<PortablePackageControls nodeId="node" documentKind="basic_leaf" documentId="doc" />);
    fireEvent.click(screen.getByRole("button", { name: "Export Lifeweave package" }));
    expect(await screen.findByText("Portable package export failed without changing the document.")).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it("keeps an empty leaf retryable after preview or confirm errors", async () => {
    api.preview.mockRejectedValueOnce(new Error("invalid"));
    mount(<PortablePackageControls nodeId="node" />); const input = screen.getByLabelText("Import Lifeweave package");
    fireEvent.change(input, { target: { files: [packageFile()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be validated");
    expect(input).toBeInTheDocument();
    api.preview.mockResolvedValueOnce(preview); api.confirm.mockRejectedValueOnce(new Error("conflict"));
    fireEvent.change(input, { target: { files: [packageFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Import into this empty leaf" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("retry or cancel");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("best-effort discards a pending preview when unmounted", async () => {
    const mounted = mount(<PortablePackageControls nodeId="node" />);
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [packageFile()] } });
    await screen.findByRole("dialog"); mounted.unmount();
    await waitFor(() => expect(api.discard).toHaveBeenCalledWith(preview.import_id));
  });

  it("reports committed success when one cache refresh rejects", async () => {
    const queryClient = client();
    vi.spyOn(queryClient, "invalidateQueries")
      .mockRejectedValueOnce(new Error("reader refresh"))
      .mockResolvedValue(undefined);
    mount(<PortablePackageControls nodeId="node" />, queryClient);
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [packageFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Import into this empty leaf" }));
    expect(await screen.findByRole("status")).toHaveTextContent("imported successfully");
    expect(screen.queryByText(/without changing this leaf/)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("attempts every refresh and never reports unchanged after committed success", async () => {
    const queryClient = client();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockRejectedValue(new Error("offline cache"));
    const mounted = mount(<PortablePackageControls nodeId="node" />, queryClient);
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [packageFile()] } });
    fireEvent.click(await screen.findByRole("button", { name: "Import into this empty leaf" }));
    expect(await screen.findByRole("status")).toHaveTextContent("imported successfully");
    expect(invalidate).toHaveBeenCalledTimes(4);
    mounted.unmount();
    expect(api.discard).not.toHaveBeenCalled();
  });

  it("keeps the same preview and operation authority retryable after confirm rejection", async () => {
    api.confirm.mockRejectedValueOnce(new Error("conflict")).mockResolvedValueOnce({});
    mount(<PortablePackageControls nodeId="node" />);
    fireEvent.change(screen.getByLabelText("Import Lifeweave package"), { target: { files: [packageFile()] } });
    const confirm = await screen.findByRole("button", { name: "Import into this empty leaf" });
    fireEvent.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent("without changing this leaf");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Import into this empty leaf" }));
    await screen.findByText("Lifeweave package imported into this empty leaf.");
    expect(api.confirm).toHaveBeenCalledTimes(2);
    const firstInput = api.confirm.mock.calls.at(0)![0];
    const secondInput = api.confirm.mock.calls.at(1)![0];
    expect(secondInput.operation_id).toBe(firstInput.operation_id);
  });
});
