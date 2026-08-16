import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";

const api = vi.hoisted(() => ({ save: vi.fn(), draft: vi.fn(), asset: vi.fn() }));
// The gateway hands the editor its ingestion diagnostics through this callback.
const gateway = vi.hoisted(() => ({ notify: undefined as undefined | ((message: string) => void) }));
const link = vi.hoisted(() => ({ config: undefined as undefined | { isAllowedUri?: (value: string) => boolean } }));
const tiptap = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of [
    "focus",
    "toggleBold",
    "toggleItalic",
    "toggleHeading",
    "toggleBulletList",
    "toggleOrderedList",
    "toggleBlockquote",
    "toggleCodeBlock",
    "extendMarkRange",
    "setLink",
    "insertTable",
    "addRowAfter",
    "addColumnAfter",
    "deleteRow",
    "deleteColumn",
    "deleteTable",
    "setImage",
  ]) chain[name] = vi.fn(() => chain);
  chain.run = vi.fn(() => true);
  const editor = {
    chain: () => chain,
    isActive: vi.fn((_node?: unknown) => false),
    getJSON: () => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Draft" }] }] }),
  };
  return {
    chain,
    editor,
    config: undefined as undefined | {
      autofocus?: boolean;
      editorProps?: { attributes?: Record<string, string> };
      onUpdate?: (value: { editor: { getJSON: () => unknown } }) => void;
    },
  };
});

vi.mock("../../../ipc/commands", () => ({
  saveReaderDocument: api.save,
  saveReaderDraft: api.draft,
  importDocumentAsset: api.asset,
}));
vi.mock("@tiptap/react", () => ({
  EditorContent: () => <div role="textbox" aria-label="Document body" aria-multiline="true" />,
  useEditor: (config: typeof tiptap.config) => {
    tiptap.config = config;
    return tiptap.editor;
  },
  useEditorState: ({ selector }: { selector: (value: { editor: typeof tiptap.editor }) => unknown }) => selector({ editor: tiptap.editor }),
}));
vi.mock("@tiptap/core", () => ({ Node: { create: (value: unknown) => value } }));
// These tests cover the editor shell — saving, drafts, dialogs. The node and paste
// extensions have their own tests against a real ProseMirror schema.
vi.mock("./extensions", () => ({
  AssetImage: { configure: () => ({}) },
  Callout: {},
  InlineMath: {},
  MathBlock: {},
  IngestionGateway: {
    configure: (options: { onNotice?: (message: string) => void }) => {
      gateway.notify = options.onNotice;
      return {};
    },
  },
}));
vi.mock("@tiptap/extension-image", () => ({ default: { extend: () => ({ configure: () => ({}) }) } }));
vi.mock("@tiptap/extension-link", () => ({ default: { configure: (config: typeof link.config) => { link.config = config; return {}; } } }));
vi.mock("@tiptap/extension-table", () => ({
  TableKit: { configure: () => ({}) },
  TableCell: { extend: () => ({}) },
  TableHeader: { extend: () => ({}) },
}));
vi.mock("@tiptap/extension-list", () => ({ TaskList: {}, TaskItem: { configure: () => ({}) } }));
vi.mock("@tiptap/starter-kit", () => ({ default: { configure: () => ({}) } }));

import BasicLeafEditor from "./BasicLeafEditor";

const document = {
  id: "00000000-0000-7000-8000-000000000211",
  life_node_id: "00000000-0000-7000-8000-000000000212",
  schema_version: 1,
  revision: 3,
  canonical_json: '{"type":"doc","content":[{"type":"paragraph"}]}',
  plain_text: "",
  updated_at: "now",
};

const markChanged = () => act(() => tiptap.config?.onUpdate?.({ editor: tiptap.editor }));

describe("focused Basic Leaf editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tiptap.chain.run!.mockReturnValue(true);
    tiptap.editor.isActive.mockReturnValue(false);
    api.save.mockResolvedValue({ ...document, revision: 4 });
    api.draft.mockResolvedValue({});
    api.asset.mockResolvedValue({
      asset_id: "00000000-0000-7000-8000-000000000213",
      original_name: "x.png",
      mime: "image/png",
      byte_size: 4,
      width: 1,
      height: 1,
      status: "usable",
    });
  });

  afterEach(() => vi.useRealTimers());

  it("exposes only the bounded Core controls in one accessible toolbar", async () => {
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);

    expect(await screen.findByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.queryByText(/scene|template|canvas/i)).not.toBeInTheDocument();
  });

  it("reveals direct row and column controls while the caret is in a table", async () => {
    tiptap.editor.isActive.mockImplementation((node: unknown) => node === "table");
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);

    const tableTools = await screen.findByRole("toolbar", { name: "Table editing" });
    fireEvent.click(within(tableTools).getByRole("button", { name: "Add row" }));
    fireEvent.click(within(tableTools).getByRole("button", { name: "Delete table" }));
    expect(tiptap.chain.addRowAfter).toHaveBeenCalledOnce();
    expect(tiptap.chain.deleteTable).toHaveBeenCalledOnce();
    expect(within(tableTools).getByText(/Tab moves between cells/)).toBeInTheDocument();
  });

  it("does not steal scroll position on mount and gives the editor accessible text semantics", () => {
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);

    expect(tiptap.config?.autofocus).toBe(false);
    expect(tiptap.config?.editorProps?.attributes).toEqual(expect.objectContaining({
      "aria-label": "Document body",
      "aria-multiline": "true",
    }));
    expect(screen.getByRole("textbox", { name: "Document body" })).toHaveAttribute("aria-multiline", "true");
  });

  it("keeps Save changes available immediately after typing and commits the authoritative revision", async () => {
    const committed = vi.fn();
    render(<BasicLeafEditor document={document} onCommitted={committed} onCancel={vi.fn()} />);

    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    markChanged();
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved");
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({
      document_id: document.id,
      expected_revision: 3,
      schema_version: 1,
      canonical_json: expect.stringContaining("Draft"),
    })));
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(committed).toHaveBeenCalledWith(expect.objectContaining({ revision: 4 }));
  });

  it("serializes repeated explicit saves instead of racing the same revision", async () => {
    let resolveSave!: (value: typeof document) => void;
    api.save.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    markChanged();

    const save = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(save);
    fireEvent.click(save);
    await act(async () => { await Promise.resolve(); });
    expect(api.save).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    resolveSave({ ...document, revision: 4 });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved"));
  });

  it("debounces recovery draft and committed autosave from the latest edit", async () => {
    vi.useFakeTimers();
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    markChanged();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    markChanged();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(api.draft).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.draft).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Draft saved");

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(api.save).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("does not let a slow draft overwrite the newer committed status", async () => {
    vi.useFakeTimers();
    let resolveDraft!: () => void;
    api.draft.mockReturnValue(new Promise<void>((resolve) => { resolveDraft = resolve; }));
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    markChanged();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByRole("status")).toHaveTextContent("Protecting");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saving");
    expect(api.save).not.toHaveBeenCalled();
    await act(async () => { resolveDraft(); await Promise.resolve(); });
    expect(api.save).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("serializes overlapping recovery drafts in edit order", async () => {
    vi.useFakeTimers();
    let resolveFirstDraft!: () => void;
    api.draft
      .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirstDraft = resolve; }))
      .mockResolvedValueOnce({});
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);

    markChanged();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(api.draft).toHaveBeenCalledOnce();
    markChanged();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(api.draft).toHaveBeenCalledOnce();

    await act(async () => { resolveFirstDraft(); await Promise.resolve(); });
    expect(api.draft).toHaveBeenCalledTimes(2);
  });

  it("keeps the editor open with a recovery-safe error when commit fails", async () => {
    api.save.mockRejectedValue(new Error("storage"));
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    markChanged();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Changes remain here/);
    expect(screen.getByRole("status")).toHaveTextContent("Save failed");
    expect(screen.getByRole("textbox", { name: "Document body" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("rejects unsafe links and explains the accepted schemes", () => {
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    expect(link.config?.isAllowedUri?.("javascript:alert(1)")).toBe(false);
    expect(link.config?.isAllowedUri?.("https://example.com/path")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    const input = screen.getByLabelText("Link destination");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("inputmode", "url");
    tiptap.chain.run!.mockReturnValueOnce(false);
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/complete HTTPS/);
    expect(tiptap.chain.setLink).toHaveBeenCalledWith({ href: "javascript:alert(1)" });

    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    const retryInput = screen.getByLabelText("Link destination");
    fireEvent.change(retryInput, { target: { value: "https://example.com/path" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(tiptap.chain.setLink).toHaveBeenCalledWith({ href: "https://example.com/path" });
    expect(screen.queryByRole("dialog", { name: "Add link" })).not.toBeInTheDocument();
  });

  it("imports an image without exposing a path and resets the picker for same-file retry", async () => {
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText("Image") as HTMLInputElement;
    const file = { name: "x.png", arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer) } as unknown as File;
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    fireEvent.change(input);

    await waitFor(() => expect(api.asset).toHaveBeenCalledWith(expect.objectContaining({ original_name: "x.png" })));
    expect(tiptap.chain.setImage).toHaveBeenCalledWith(expect.objectContaining({ alt: "x.png" }));
    expect(input.value).toBe("");
    expect(document.canonical_json).not.toMatch(/[A-Z]:\\/);
  });

  it("confirms a dirty exit and returns to editing when cancelled", () => {
    const cancel = vi.fn();
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={cancel} />);
    markChanged();
    fireEvent.click(screen.getByRole("button", { name: "Back to Reader" }));
    expect(screen.getByRole("dialog", { name: "Leave Edit?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Back to Reader" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Back to Reader" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave Edit" }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("keeps an ingestion warning readable through the edit that produced it", async () => {
    // The paste that raises the warning is itself an edit, so `markChanged` used to clear
    // the message in the same tick and the warning was never visible for a single frame.
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    act(() => gateway.notify?.("2 images could not be pasted."));
    expect(screen.getByText("2 images could not be pasted.").closest("div")).toHaveAttribute("role", "status");

    markChanged();
    expect(screen.getByText("2 images could not be pasted.")).toBeInTheDocument();

    markChanged();
    await waitFor(() => expect(screen.getByText("Draft saved")).toBeInTheDocument());
    expect(screen.getByText("2 images could not be pasted.")).toBeInTheDocument();
  });

  it("announces the warning politely and lets the reader dismiss it", () => {
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    act(() => gateway.notify?.("An image could not be pasted."));
    const region = screen.getByText("An image could not be pasted.").closest("div");
    expect(region).toHaveAttribute("aria-live", "polite");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("An image could not be pasted.")).not.toBeInTheDocument();
  });

  it("replaces a warning with the next one rather than stacking them", () => {
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    act(() => gateway.notify?.("First warning."));
    act(() => gateway.notify?.("Second warning."));
    expect(screen.queryByText("First warning.")).not.toBeInTheDocument();
    expect(screen.getByText("Second warning.")).toBeInTheDocument();
  });

  it("keeps a save failure and an ingestion warning apart", () => {
    // They are different kinds of message with different lifetimes; sharing one slot meant
    // whichever arrived last erased the other.
    api.save.mockRejectedValue(new Error("nope"));
    render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    act(() => gateway.notify?.("An image could not be pasted."));
    markChanged();
    expect(screen.getByText("An image could not be pasted.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has no critical or serious accessibility violations in the populated editor", async () => {
    const { container } = render(<BasicLeafEditor document={document} onCommitted={vi.fn()} onCancel={vi.fn()} />);
    const results = await axe.run(container);
    expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toHaveLength(0);
  });
});
