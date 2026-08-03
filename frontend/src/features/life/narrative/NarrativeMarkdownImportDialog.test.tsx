import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NarrativeMarkdownImportDialog } from "./NarrativeMarkdownImportDialog";
import type { NarrativeMarkdownPreview } from "../../../ipc/generated/NarrativeMarkdownPreview";
import type { NarrativeDocumentView } from "../../../ipc/generated/NarrativeDocumentView";

const NODE_ID = "00000000-0000-7000-8000-000000000300";
const DOC_ID = "00000000-0000-7000-8000-000000000301";

const makePreview = (extra: Partial<NarrativeMarkdownPreview> = {}): NarrativeMarkdownPreview => ({
  proposed_title: "Test Title",
  plain_text_excerpt: "Some content excerpt.",
  top_level_node_count: 3,
  referenced_asset_count: 0,
  warnings: ["Import creates one rich_text block. Block types, layout, and metadata are not preserved."],
  ...extra,
});

const makeDoc = (): NarrativeDocumentView => ({
  id: DOC_ID,
  life_node_id: NODE_ID,
  schema_version: 1,
  revision: 0,
  canonical_json: "{}",
  plain_text: "",
  updated_at: "2026-08-03T00:00:00Z",
  template_id: "knowledge_dossier",
  template_version: 1,
});

const api = vi.hoisted(() => ({
  importNarrativeMarkdown: vi.fn(),
}));

vi.mock("../../../ipc/commands", () => ({
  importNarrativeMarkdown: api.importNarrativeMarkdown,
}));

function renderDialog(
  props: Partial<Parameters<typeof NarrativeMarkdownImportDialog>[0]> = {},
) {
  const onConfirmed = vi.fn();
  const onCancel = vi.fn();
  render(
    <NarrativeMarkdownImportDialog
      nodeId={NODE_ID}
      originalName="notes.md"
      markdown="# Test\n\nContent."
      preview={makePreview()}
      onConfirmed={onConfirmed}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirmed, onCancel };
}

describe("NarrativeMarkdownImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with role=dialog and aria-modal", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows proposed title", () => {
    renderDialog();
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("shows excerpt", () => {
    renderDialog();
    expect(screen.getByText("Some content excerpt.")).toBeInTheDocument();
  });

  it("shows section count", () => {
    renderDialog();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows lossiness warning", () => {
    renderDialog();
    expect(
      screen.getByText(/Import creates one rich_text block/),
    ).toBeInTheDocument();
  });

  it("shows asset warning when included in warnings array", () => {
    renderDialog({
      preview: makePreview({
        referenced_asset_count: 2,
        warnings: [
          "Import creates one rich_text block. Block types, layout, and metadata are not preserved.",
          "This document references local assets that will not be included.",
        ],
      }),
    });
    expect(screen.getByText(/local assets/)).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const { onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when overlay is clicked", () => {
    const { onCancel } = renderDialog();
    // Click the overlay (role=presentation behind the dialog)
    const overlay = screen.getByRole("presentation");
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls importNarrativeMarkdown and onConfirmed on confirm", async () => {
    const doc = makeDoc();
    api.importNarrativeMarkdown.mockResolvedValue(doc);
    const { onConfirmed } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith(doc));
    expect(api.importNarrativeMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        life_node_id: NODE_ID,
        original_name: "notes.md",
      }),
    );
  });

  it("shows error message when import fails", async () => {
    api.importNarrativeMarkdown.mockRejectedValue(new Error("fail"));
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Import failed"),
    );
  });

  it("disables buttons while import is pending", async () => {
    let resolve: (doc: NarrativeDocumentView) => void;
    api.importNarrativeMarkdown.mockImplementation(
      () => new Promise(r => { resolve = r; }),
    );
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled(),
    );
    resolve!(makeDoc());
  });
});
