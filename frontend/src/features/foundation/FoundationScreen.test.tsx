import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as commands from "../../ipc/commands";
import { FoundationScreen } from "./FoundationScreen";

vi.mock("../../ipc/commands");

const mockRecord = {
  id: "abc123",
  label: "Test record",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  revision: 0,
  archived_at: null,
};

const archivedRecord = {
  ...mockRecord,
  id: "def456",
  label: "Archived",
  archived_at: "2026-01-02T00:00:00Z",
  revision: 1,
};

beforeEach(() => {
  vi.mocked(commands.listFoundationRecords).mockResolvedValue([]);
  vi.mocked(commands.createFoundationRecord).mockResolvedValue(mockRecord);
  vi.mocked(commands.updateFoundationRecord).mockResolvedValue({
    ...mockRecord,
    label: "Updated",
    revision: 1,
  });
  vi.mocked(commands.archiveFoundationRecord).mockResolvedValue(undefined);
  vi.mocked(commands.restoreFoundationRecord).mockResolvedValue(undefined);
});

describe("FoundationScreen", () => {
  it("shows loading state initially then renders heading", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([]);
    render(<FoundationScreen />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Foundation Records" });
  });

  it("shows empty state when no records", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([]);
    render(<FoundationScreen />);
    await screen.findByText(/No records yet/);
  });

  it("shows error state when list fails", async () => {
    vi.mocked(commands.listFoundationRecords).mockRejectedValue({
      message: "Storage error",
    });
    render(<FoundationScreen />);
    await screen.findByText("Storage error");
  });

  it("renders active records from list", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([mockRecord]);
    render(<FoundationScreen />);
    await screen.findByText("Test record");
  });

  it("creates a record when form submitted", async () => {
    vi.mocked(commands.listFoundationRecords)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockRecord]);

    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });

    const input = screen.getByLabelText("New record label");
    fireEvent.change(input, { target: { value: "Test record" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(commands.createFoundationRecord).toHaveBeenCalledWith(
        expect.objectContaining({ label: "Test record" }),
      );
    });
    await screen.findByText("Test record");
  });

  it("shows validation error when create fails", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([]);
    vi.mocked(commands.createFoundationRecord).mockRejectedValue({
      message: "Label is required.",
    });

    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });

    const input = screen.getByLabelText("New record label");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await screen.findByText("Label is required.");
  });

  it("archives a record", async () => {
    vi.mocked(commands.listFoundationRecords)
      .mockResolvedValueOnce([mockRecord])
      .mockResolvedValueOnce([
        { ...mockRecord, archived_at: "2026-01-02T00:00:00Z" },
      ]);

    render(<FoundationScreen />);
    await screen.findByText("Test record");

    fireEvent.click(screen.getByRole("button", { name: "Archive Test record" }));

    await waitFor(() => {
      expect(commands.archiveFoundationRecord).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockRecord.id, expected_revision: 0 }),
      );
    });
  });

  it("restores an archived record", async () => {
    vi.mocked(commands.listFoundationRecords)
      .mockResolvedValueOnce([archivedRecord])
      .mockResolvedValueOnce([{ ...archivedRecord, archived_at: null, revision: 2 }]);

    render(<FoundationScreen />);
    const restoreBtn = await screen.findByRole("button", { name: "Restore Archived" });

    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(commands.restoreFoundationRecord).toHaveBeenCalledWith(
        expect.objectContaining({ id: archivedRecord.id }),
      );
    });
  });

  it("Add button is disabled when input is empty", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([]);
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});
