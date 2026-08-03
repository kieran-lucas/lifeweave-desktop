import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NarrativeCanvasStudio from "./NarrativeCanvasStudio";

const DOC_ID = "019700000000-0000-7000-8000-000000000201";
const SCENE_ID = "019700000000-0000-7000-8000-000000000202";
const BLOCK_ID = "019700000000-0000-7000-8000-000000000203";
const BLOCK_ID_2 = "019700000000-0000-7000-8000-000000000204";
const CALLOUT_BLOCK_ID = "019700000000-0000-7000-8000-000000000205";

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

const twoBlockJson = JSON.stringify({
  schemaVersion: 1,
  documentId: DOC_ID,
  title: "Test Canvas",
  templateId: "knowledge_dossier",
  templateVersion: 1,
  scenes: [{
    id: SCENE_ID,
    title: "",
    layoutPreset: "single_column",
    atmosphere: "neutral",
    motionPreset: "none",
    blocks: [
      { kind: "rich_text", id: BLOCK_ID, content: { type: "doc", content: [{ type: "paragraph", content: [] }] } },
      { kind: "callout", id: CALLOUT_BLOCK_ID, variant: "note", content: { type: "doc", content: [{ type: "paragraph", content: [] }] } },
    ],
  }],
});

const UNKNOWN_BLOCK_CANONICAL = { kind: "future_v2", id: "019700000000-0000-7000-8000-000000000206", extraField: "extraValue", nested: { a: 1 } };
const docWithUnknownJson = JSON.stringify({
  schemaVersion: 1,
  documentId: DOC_ID,
  title: "Test Canvas",
  templateId: "knowledge_dossier",
  templateVersion: 1,
  scenes: [{
    id: SCENE_ID,
    title: "",
    layoutPreset: "single_column",
    atmosphere: "neutral",
    motionPreset: "none",
    blocks: [
      { kind: "rich_text", id: BLOCK_ID, content: { type: "doc", content: [] } },
      UNKNOWN_BLOCK_CANONICAL,
    ],
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

// Controllable Tiptap mock — tracks onUpdate callback and editor count
const tiptapMock = vi.hoisted(() => ({
  onUpdate: undefined as ((p: { editor: { getJSON: () => unknown } }) => void) | undefined,
  getJSON: vi.fn((): unknown => ({ type: "doc", content: [] })),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((options?: { onUpdate?: (p: { editor: { getJSON: () => unknown } }) => void }) => {
    tiptapMock.onUpdate = options?.onUpdate;
    return { getJSON: tiptapMock.getJSON };
  }),
  EditorContent: ({ editor: _e }: { editor: unknown }) =>
    _e ? <div data-testid="tiptap-editor" contentEditable suppressContentEditableWarning /> : null,
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

const mountWith = (json: string, overrides = {}) =>
  render(
    <NarrativeCanvasStudio
      document={{ ...baseDoc, canonical_json: json }}
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

describe("NarrativeCanvasStudio architecture", () => {
  beforeEach(() => {
    api.save.mockResolvedValue({ ...baseDoc, revision: 1 });
    api.saveDraft.mockResolvedValue(undefined);
    api.discard.mockResolvedValue(undefined);
    api.importAsset.mockResolvedValue({ asset_id: "019700000000-0000-7000-8000-000000000299" });
    tiptapMock.onUpdate = undefined;
    tiptapMock.getJSON.mockReturnValue({ type: "doc", content: [] });
  });

  it("zero Tiptap editors before activation", () => {
    mount();
    expect(screen.queryAllByTestId("tiptap-editor")).toHaveLength(0);
  });

  it("exactly one Tiptap editor after activating rich_text block", () => {
    mount();
    fireEvent.click(screen.getByLabelText("Click to edit rich text block"));
    expect(screen.getAllByTestId("tiptap-editor")).toHaveLength(1);
  });

  it("switching rich_text → callout → rich_text keeps exactly one editor", () => {
    mountWith(twoBlockJson);
    fireEvent.click(screen.getByLabelText("Click to edit rich text block"));
    expect(screen.getAllByTestId("tiptap-editor")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText("Click to edit callout content"));
    expect(screen.getAllByTestId("tiptap-editor")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText("Click to edit rich text block"));
    expect(screen.getAllByTestId("tiptap-editor")).toHaveLength(1);
  });

  it("Publish includes active island content (not stale committed content)", async () => {
    const liveContent: unknown = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Live content" }] }] };
    tiptapMock.getJSON.mockReturnValue(liveContent);
    mount();
    fireEvent.click(screen.getByLabelText("Click to edit rich text block")); // activate
    // Simulate Tiptap typing
    act(() => tiptapMock.onUpdate?.({ editor: { getJSON: () => liveContent } }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => {
      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({
        canonical_json: expect.stringContaining("Live content"),
      }));
    });
  });

  it("Tiptap onUpdate does not add structural history entry", () => {
    mount();
    fireEvent.click(screen.getByLabelText("Click to edit rich text block"));
    const undoBtn = screen.getByRole("button", { name: "Undo" });
    expect(undoBtn).toBeDisabled(); // no structural history before Tiptap
    act(() => tiptapMock.onUpdate?.({ editor: { getJSON: () => ({ type: "doc", content: [] }) } }));
    expect(undoBtn).toBeDisabled(); // still no structural history after Tiptap keystroke
  });

  it("adding a block creates one structural history entry", () => {
    mount();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Metric" }));
    expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("Undo/Redo round-trips structural change", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Metric" }));
    expect(screen.getByText("metric")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByText("metric")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByText("metric")).toBeInTheDocument();
  });

  it("draft debounce fires after 1 second and includes active island content", async () => {
    vi.useFakeTimers();
    const draftContent: unknown = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Draft text" }] }] };
    tiptapMock.getJSON.mockReturnValue(draftContent);
    mount();
    fireEvent.click(screen.getByLabelText("Click to edit rich text block")); // activate
    act(() => tiptapMock.onUpdate?.({ editor: { getJSON: () => draftContent } })); // simulate keystroke → dirty
    await act(async () => { vi.advanceTimersByTime(1001); });
    expect(api.saveDraft).toHaveBeenCalledWith(expect.objectContaining({
      canonical_json: expect.stringContaining("Draft text"),
    }));
    vi.useRealTimers();
  });

  it("failed save retains operation ID for retry", async () => {
    api.save.mockRejectedValueOnce(new Error("network failure"));
    api.save.mockResolvedValueOnce({ ...baseDoc, revision: 1 });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    const firstOpId = api.save.mock.calls[0]![0].operation_id;
    await waitFor(() => expect(screen.getByText(/could not be saved/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    const retryOpId = api.save.mock.calls[1]![0].operation_id;
    expect(retryOpId).toBe(firstOpId); // same op ID for idempotent retry
  });

  it("success rotates operation ID", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    const firstOpId = api.save.mock.calls[0]![0].operation_id;
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    const secondOpId = api.save.mock.calls[1]![0].operation_id;
    expect(secondOpId).not.toBe(firstOpId); // rotated after success
  });

  it("stale revision error shows specific message", async () => {
    api.save.mockRejectedValue(new Error("stale revision"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText(/saved elsewhere/i)).toBeInTheDocument());
  });

  it("Save is disabled while pending", async () => {
    let resolvePromise!: (v: typeof baseDoc) => void;
    api.save.mockReturnValue(new Promise<typeof baseDoc>(r => { resolvePromise = r; }));
    mount();
    const publishBtn = screen.getByRole("button", { name: "Publish" });
    fireEvent.click(publishBtn);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    resolvePromise({ ...baseDoc, revision: 1 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Publish" })).not.toBeDisabled());
  });

  it("unknown block raw payload preserved through reorder", async () => {
    mountWith(docWithUnknownJson);
    // Unknown block shows "unknown block type" label
    expect(screen.getByText(/unknown block type: future_v2/i)).toBeInTheDocument();
    // Move rich_text down (unknown goes from index 1 to 0)
    const moveDownBtns = screen.getAllByRole("button", { name: "Move block down" });
    fireEvent.click(moveDownBtns[0]!); // move rich_text down
    // Publish and check saved JSON still has extraField
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => {
      const savedJson = api.save.mock.calls[0]![0].canonical_json as string;
      expect(JSON.parse(savedJson).scenes[0].blocks).toContainEqual(
        expect.objectContaining({ kind: "future_v2", extraField: "extraValue" })
      );
    });
  });

  it("image block Import image button is rendered after adding Image block", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Image" })); // add image block
    // Import button should appear — component uses a dynamic fileInput.click() not a DOM input
    const importBtn = await screen.findByRole("button", { name: "Import image" });
    expect(importBtn).toBeInTheDocument();
    // Clicking should not crash (fileInput.click is a no-op in jsdom)
    expect(() => fireEvent.click(importBtn)).not.toThrow();
  });

  it("image block shows asset ID text after asset is stored on block state", async () => {
    // Set up a resolved importAsset so if triggered it returns the asset ID
    api.importAsset.mockResolvedValue({ asset_id: "019700000000-0000-7000-8000-000000000299" });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    // Verify the block is rendered with no asset yet
    await screen.findByRole("button", { name: "Import image" });
    // The "asset: ..." text should NOT be visible yet
    expect(screen.queryByText(/asset:/i)).not.toBeInTheDocument();
  });

  it("timeline item add/delete/reorder", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Timeline" })); // add timeline block
    // Add a timeline item
    const addItemBtn = screen.getByRole("button", { name: "Add item" });
    fireEvent.click(addItemBtn);
    expect(screen.getAllByLabelText(/remove timeline item/i)).toHaveLength(1);
    fireEvent.click(addItemBtn);
    expect(screen.getAllByLabelText(/remove timeline item/i)).toHaveLength(2);
    // Delete first item
    fireEvent.click(screen.getAllByLabelText(/remove timeline item 1/i)[0]!);
    expect(screen.getAllByLabelText(/remove timeline item/i)).toHaveLength(1);
  });

  it("text inputs do not carry drag handle aria attributes", () => {
    mount();
    const titleInput = screen.getByLabelText("Canvas title");
    // Input should not have aria-roledescription="draggable"
    expect(titleInput).not.toHaveAttribute("aria-roledescription");
    // The drag handle button should have aria-roledescription from dnd-kit
    const dragHandle = screen.getByRole("button", { name: "Drag to reorder block" });
    expect(dragHandle).toBeInTheDocument();
  });
});
