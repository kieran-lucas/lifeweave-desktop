import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as commands from "../../ipc/commands";
import { FoundationScreen } from "./FoundationScreen";

vi.mock("../../ipc/commands");

const mockRecord = {
  id: "019700000000-7fff-8000-0000-000000000001",
  label: "Test record",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  revision: 0,
  archived_at: null,
};

const archivedRecord = {
  ...mockRecord,
  id: "019700000000-7fff-8000-0000-000000000002",
  label: "Archived",
  archived_at: "2026-01-02T00:00:00Z",
  revision: 1,
};

const mockBackupResult = {
  backup_dir: "C:\\AppData\\lifeweave\\backups\\lifeweave_backup_1",
  db_sha256: "a".repeat(64),
  schema_version: 2,
  created_at: "2026-08-01T12:00:00Z",
  db_size_bytes: BigInt(4096),
};

const mockRestoreResult = {
  restored_at: "2026-08-01T12:01:00Z",
  schema_version: 2,
};

beforeEach(() => {
  vi.mocked(commands.listFoundationRecords).mockResolvedValue([]);
  vi.mocked(commands.listArchivedFoundationRecords).mockResolvedValue([]);
  vi.mocked(commands.createFoundationRecord).mockResolvedValue(mockRecord);
  vi.mocked(commands.updateFoundationRecord).mockResolvedValue({
    ...mockRecord,
    label: "Updated",
    revision: 1,
  });
  vi.mocked(commands.archiveFoundationRecord).mockResolvedValue(undefined);
  vi.mocked(commands.restoreFoundationRecord).mockResolvedValue(undefined);
  vi.mocked(commands.backupDatabase).mockResolvedValue(mockBackupResult);
  vi.mocked(commands.restoreDatabase).mockResolvedValue(mockRestoreResult);
});

describe("FoundationScreen", () => {
  it("shows loading state initially then renders heading", async () => {
    render(<FoundationScreen />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Foundation Records" });
  });

  it("shows empty state when no records exist in either list", async () => {
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

  it("renders active records from list_foundation_records", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([mockRecord]);
    render(<FoundationScreen />);
    await screen.findByText("Test record");
  });

  it("renders archived records from list_archived_foundation_records", async () => {
    vi.mocked(commands.listArchivedFoundationRecords).mockResolvedValue([
      archivedRecord,
    ]);
    render(<FoundationScreen />);
    await screen.findByRole("button", { name: "Restore Archived" });
  });

  it("calls both list commands on mount", async () => {
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    expect(commands.listFoundationRecords).toHaveBeenCalledTimes(1);
    expect(commands.listArchivedFoundationRecords).toHaveBeenCalledTimes(1);
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

  it("archives a record: active list empties, archived list gains the record", async () => {
    vi.mocked(commands.listFoundationRecords)
      .mockResolvedValueOnce([mockRecord])
      .mockResolvedValueOnce([]);
    vi.mocked(commands.listArchivedFoundationRecords)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...mockRecord, archived_at: "2026-01-02T00:00:00Z", revision: 1 }]);

    render(<FoundationScreen />);
    await screen.findByText("Test record");

    fireEvent.click(screen.getByRole("button", { name: "Archive Test record" }));

    await waitFor(() => {
      expect(commands.archiveFoundationRecord).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockRecord.id, expected_revision: 0 }),
      );
    });
    await screen.findByRole("button", { name: "Restore Test record" });
  });

  it("restores an archived record: archived list empties, active list gains the record", async () => {
    vi.mocked(commands.listFoundationRecords)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...archivedRecord, archived_at: null, revision: 2 }]);
    vi.mocked(commands.listArchivedFoundationRecords)
      .mockResolvedValueOnce([archivedRecord])
      .mockResolvedValueOnce([]);

    render(<FoundationScreen />);
    const restoreBtn = await screen.findByRole("button", {
      name: "Restore Archived",
    });

    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(commands.restoreFoundationRecord).toHaveBeenCalledWith(
        expect.objectContaining({ id: archivedRecord.id }),
      );
    });
    await screen.findByText("Archived");
    expect(
      screen.queryByRole("button", { name: "Restore Archived" }),
    ).not.toBeInTheDocument();
  });

  it("Add button is disabled when input is empty", async () => {
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("backup button triggers backupDatabase command", async () => {
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    await waitFor(() => {
      expect(commands.backupDatabase).toHaveBeenCalledTimes(1);
    });
  });

  it("backup success shows status message", async () => {
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    await screen.findByText(/Backup created at/);
  });

  it("backup failure shows error message", async () => {
    vi.mocked(commands.backupDatabase).mockRejectedValue({ message: "Disk full." });
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    await screen.findByText("Disk full.");
  });

  it("restore button is disabled before a backup exists", async () => {
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    expect(screen.getByRole("button", { name: "Restore" })).toBeDisabled();
  });

  it("restore success reloads record list", async () => {
    vi.mocked(commands.listFoundationRecords)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockRecord]);
    render(<FoundationScreen />);
    await screen.findByRole("heading", { name: "Foundation Records" });
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    await screen.findByText(/Backup created at/);
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => {
      expect(commands.restoreDatabase).toHaveBeenCalledTimes(1);
    });
    await screen.findByText("Test record");
  });

  it("restore failure shows error and preserves list", async () => {
    vi.mocked(commands.listFoundationRecords).mockResolvedValue([mockRecord]);
    vi.mocked(commands.restoreDatabase).mockRejectedValue({ message: "Restore failed." });
    render(<FoundationScreen />);
    await screen.findByText("Test record");
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    await screen.findByText(/Backup created at/);
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await screen.findByText("Restore failed.");
    expect(screen.getByText("Test record")).toBeInTheDocument();
  });
});
