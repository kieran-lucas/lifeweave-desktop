import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NarrativeMarkdownExportButton } from "./NarrativeMarkdownExportButton";

const DOC_ID = "00000000-0000-7000-8000-000000000400";

const api = vi.hoisted(() => ({
  exportNarrativeMarkdown: vi.fn(),
}));

vi.mock("../../../ipc/commands", () => ({
  exportNarrativeMarkdown: api.exportNarrativeMarkdown,
}));

function makeExport(overrides: Record<string, string> = {}) {
  return {
    file_name: "my-canvas.md",
    markdown: "# My Canvas\n\nContent.",
    warning:
      "Markdown preserves readable content, not Canvas block structure or layout. Image bytes are not embedded; referenced local assets must already exist.",
    ...overrides,
  };
}

function renderButton() {
  render(<NarrativeMarkdownExportButton documentId={DOC_ID} />);
}

describe("NarrativeMarkdownExportButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silence jsdom anchor click errors
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);
  });

  it("shows lossiness warning before any interaction", () => {
    renderButton();
    expect(
      screen.getByText(/Markdown preserves readable content/),
    ).toBeInTheDocument();
  });

  it("warning is visible with role=note", () => {
    renderButton();
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Markdown preserves readable content",
    );
  });

  it("export button is present and not disabled initially", () => {
    renderButton();
    const btn = screen.getByRole("button", { name: /Export canvas as Markdown/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("button is disabled while export is pending", async () => {
    let resolve: (v: ReturnType<typeof makeExport>) => void;
    api.exportNarrativeMarkdown.mockImplementation(
      () => new Promise(r => { resolve = r; }),
    );
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /Export canvas as Markdown/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Export canvas as Markdown/i })).toBeDisabled(),
    );
    resolve!(makeExport());
  });

  it("calls exportNarrativeMarkdown with document_id on click", async () => {
    api.exportNarrativeMarkdown.mockResolvedValue(makeExport());
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /Export canvas as Markdown/i }));
    await waitFor(() =>
      expect(api.exportNarrativeMarkdown).toHaveBeenCalledWith({ document_id: DOC_ID }),
    );
  });

  it("does not show error on success", async () => {
    api.exportNarrativeMarkdown.mockResolvedValue(makeExport());
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /Export canvas as Markdown/i }));
    await waitFor(() =>
      expect(api.exportNarrativeMarkdown).toHaveBeenCalled(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows error alert when export fails", async () => {
    api.exportNarrativeMarkdown.mockRejectedValue(new Error("network"));
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /Export canvas as Markdown/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Markdown export failed"),
    );
  });

  it("warning remains visible after successful export", async () => {
    api.exportNarrativeMarkdown.mockResolvedValue(makeExport());
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: /Export canvas as Markdown/i }));
    await waitFor(() => expect(api.exportNarrativeMarkdown).toHaveBeenCalled());
    expect(screen.getByRole("note")).toHaveTextContent(
      "Markdown preserves readable content",
    );
  });

  it("button has aria-describedby pointing to the warning", () => {
    renderButton();
    const btn = screen.getByRole("button", { name: /Export canvas as Markdown/i });
    expect(btn).toHaveAttribute("aria-describedby", "nc-export-warning");
    expect(screen.getByRole("note")).toHaveAttribute("id", "nc-export-warning");
  });
});
