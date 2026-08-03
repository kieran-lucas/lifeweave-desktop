import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NarrativeCanvasStudio from "./NarrativeCanvasStudio";

const DOC_ID = "019700000000-0000-7000-8000-000000000201";
const SCENE_ID = "019700000000-0000-7000-8000-000000000202";
const BLOCK_ID = "019700000000-0000-7000-8000-000000000203";

const baseCanvasJson = JSON.stringify({
  schemaVersion: 1,
  documentId: DOC_ID,
  title: "Test Canvas",
  templateId: "knowledge_dossier",
  templateVersion: 1,
  scenes: [{
    id: SCENE_ID,
    title: "Overview",
    layoutPreset: "single_column",
    atmosphere: "neutral",
    motionPreset: "none",
    blocks: [{
      kind: "rich_text",
      id: BLOCK_ID,
      content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
    }],
  }],
});

const baseDoc = {
  id: DOC_ID,
  life_node_id: "019700000000-0000-7000-8000-000000000204",
  schema_version: 1,
  revision: 0,
  canonical_json: baseCanvasJson,
  plain_text: "",
  updated_at: "2026-08-03T00:00:00Z",
  template_id: "knowledge_dossier",
  template_version: 1,
};

const api = vi.hoisted(() => ({
  save: vi.fn(),
  saveDraft: vi.fn(),
  discard: vi.fn(),
  importAsset: vi.fn(),
}));

vi.mock("../../../ipc/commands", () => ({
  saveNarrativeDocument: api.save,
  saveNarrativeDraft: api.saveDraft,
  discardNarrativeDraft: api.discard,
  importDocumentAsset: api.importAsset,
}));

// Mock Tiptap — editor with no actual DOM editing needed
vi.mock("@tiptap/react", () => ({
  useEditor: () => ({
    getJSON: () => ({ type: "doc", content: [] }),
    chain: () => ({ focus: () => ({ run: () => {} }) }),
    destroy: () => {},
    isDestroyed: false,
  }),
  EditorContent: ({ editor: _e }: { editor: unknown }) => (
    <div data-testid="tiptap-editor" contentEditable suppressContentEditableWarning />
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: () => [] },
}));

const mount = (overrides = {}) =>
  render(
    <NarrativeCanvasStudio
      document={baseDoc}
      initialJson={null}
      onCommitted={vi.fn()}
      onCancel={vi.fn()}
      {...overrides}
    />
  );

describe("NarrativeCanvasStudio", () => {
  beforeEach(() => {
    api.save.mockResolvedValue({ ...baseDoc, revision: 1 });
    api.saveDraft.mockResolvedValue(undefined);
    api.discard.mockResolvedValue(undefined);
    api.importAsset.mockResolvedValue({ asset_id: "019700000000-0000-7000-8000-000000000299" });
  });

  it("renders canvas title input with current title", async () => {
    mount();
    const input = screen.getByLabelText("Canvas title");
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("Test Canvas");
  });

  it("renders block list with one rich_text block", async () => {
    mount();
    expect(screen.getByText("rich text")).toBeInTheDocument();
  });

  it("Publish button calls saveNarrativeDocument", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith(expect.objectContaining({
      document_id: DOC_ID,
      expected_revision: 0,
      schema_version: 1,
    })));
  });

  it("Undo button is disabled initially when no past state", () => {
    mount();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("Redo button is disabled initially when no future state", () => {
    mount();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("editing title marks Undo as enabled", () => {
    mount();
    const input = screen.getByLabelText("Canvas title");
    fireEvent.change(input, { target: { value: "New Title" } });
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();
  });

  it("shows unsaved changes status after editing title", () => {
    mount();
    const input = screen.getByLabelText("Canvas title");
    fireEvent.change(input, { target: { value: "Changed" } });
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("Add rich text block button adds a block", () => {
    mount();
    const initialBlocks = screen.getAllByText(/rich text/i);
    fireEvent.click(screen.getByRole("button", { name: "Rich text" }));
    expect(screen.getAllByText(/rich text/i).length).toBeGreaterThan(initialBlocks.length);
  });

  it("Add metric block appears after clicking Metric", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Metric" }));
    expect(screen.getByText("metric")).toBeInTheDocument();
  });

  it("Back button calls onCancel when not dirty", () => {
    const onCancel = vi.fn();
    mount({ onCancel });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Back button shows confirm when dirty", () => {
    const onCancel = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount({ onCancel });
    const input = screen.getByLabelText("Canvas title");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("delete block protection: final block cannot be deleted", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mount();
    const deleteBtn = screen.getByRole("button", { name: "Delete block" });
    fireEvent.click(deleteBtn);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("onCommitted is called with the saved document after Publish", async () => {
    const onCommitted = vi.fn();
    mount({ onCommitted });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(onCommitted).toHaveBeenCalledWith(expect.objectContaining({ revision: 1 })));
  });

  it("shows error status on save failure without crashing", async () => {
    api.save.mockRejectedValue(new Error("network failure"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
  });
});
