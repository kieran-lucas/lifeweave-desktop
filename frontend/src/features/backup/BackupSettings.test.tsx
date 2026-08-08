import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BackupSummary } from "../../ipc/generated/BackupSummary";
import * as commands from "../../ipc/commands";
import { BackupSettings } from "./BackupSettings";

vi.mock("../../ipc/commands");

const ready: BackupSummary = {
  backup_id: "lifeweave_backup_100",
  format_version: 2,
  app_version: "0.0.0",
  schema_version: 27,
  created_at: "2026-08-08T10:00:00Z",
  db_size_bytes: 4096n,
  compatibility: "ready",
};
const migration: BackupSummary = {
  ...ready,
  backup_id: "lifeweave_backup_90",
  schema_version: 26,
  created_at: "2026-08-07T10:00:00Z",
  compatibility: "migration_required",
};
const newerSchema: BackupSummary = {
  ...ready,
  backup_id: "lifeweave_backup_80",
  schema_version: 28,
  created_at: "2026-08-06T10:00:00Z",
  compatibility: "newer_schema",
};
const newerFormat: BackupSummary = {
  ...ready,
  backup_id: "lifeweave_backup_70",
  format_version: 3,
  created_at: "2026-08-05T10:00:00Z",
  compatibility: "newer_format",
};

beforeEach(() => {
  vi.mocked(commands.listBackups).mockResolvedValue([ready, migration, newerSchema, newerFormat]);
  vi.mocked(commands.backupDatabase).mockResolvedValue({
    backup: ready,
    pruned_backup_count: 0,
    retention_cleanup_pending: false,
  });
  vi.mocked(commands.restoreDatabase).mockResolvedValue({
    restored_at: "2026-08-08T10:01:00Z",
    schema_version: 27,
  });
});

describe("BackupSettings", () => {
  it("renders first-class retention and all textual compatibility states", async () => {
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    await screen.findByRole("heading", { name: "Backup & restore" });
    expect(screen.getByRole("heading", { name: "Retention policy" })).toBeInTheDocument();
    expect(screen.getByText(/12 total/)).toBeInTheDocument();
    expect(screen.getByText(/removed only after the new backup is safely published/)).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Will migrate when restored")).toBeInTheDocument();
    expect(screen.getAllByText("Requires a newer Lifeweave schema").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Uses a newer backup format").length).toBeGreaterThan(0);
  });

  it("shows required metadata and disables incompatible restores", async () => {
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    await screen.findByText("2026-08-08T10:00:00Z");
    const table = screen.getByRole("table", { name: /Managed backup versions/ });
    expect(within(table).getAllByText("2").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("27").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Restore backup from 2026-08-08/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Restore backup from 2026-08-07/ })).toBeEnabled();
    const incompatible = screen.getAllByRole("button", { name: /Restore backup/ }).slice(2);
    expect(incompatible).toHaveLength(2);
    incompatible.forEach((button) => expect(button).toBeDisabled());
  });

  it("reloads after create, focuses the fresh row, and announces pruning", async () => {
    const fresh = { ...ready, backup_id: "lifeweave_backup_101", created_at: "2026-08-08T11:00:00Z" };
    vi.mocked(commands.backupDatabase).mockResolvedValue({
      backup: fresh,
      pruned_backup_count: 2,
      retention_cleanup_pending: false,
    });
    vi.mocked(commands.listBackups)
      .mockResolvedValueOnce([ready])
      .mockResolvedValueOnce([fresh, ready]);
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    await screen.findByText(ready.created_at);
    fireEvent.click(screen.getByRole("button", { name: "Create backup" }));
    const freshRestore = await screen.findByRole("button", { name: /Restore backup from 2026-08-08T11/ });
    await waitFor(() => expect(freshRestore).toHaveFocus());
    expect(screen.getByText(/2 older managed backups were removed/)).toBeInTheDocument();
    expect(commands.listBackups).toHaveBeenCalledTimes(2);
  });

  it("reports cleanup pending without claiming backup failure", async () => {
    vi.mocked(commands.backupDatabase).mockResolvedValue({
      backup: ready,
      pruned_backup_count: 0,
      retention_cleanup_pending: true,
    });
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    await screen.findByText(ready.created_at);
    fireEvent.click(screen.getByRole("button", { name: "Create backup" }));
    expect(await screen.findByText(/backup succeeded, but older-version cleanup did not fully complete/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("requires confirmation and explains migration, source immutability, and safety snapshot", async () => {
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    const trigger = await screen.findByRole("button", { name: /Restore backup from 2026-08-07/ });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Restore managed backup?" });
    expect(within(dialog).getByText(/schema 26/)).toBeInTheDocument();
    expect(within(dialog).getByText(/candidate will migrate forward/)).toBeInTheDocument();
    expect(within(dialog).getByText(/source backup remains unchanged/)).toBeInTheDocument();
    expect(within(dialog).getByText(/safety snapshot/)).toBeInTheDocument();
    expect(commands.restoreDatabase).not.toHaveBeenCalled();
  });

  it("Cancel and Escape close only while idle and restore trigger focus", async () => {
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    const trigger = await screen.findByRole("button", { name: /Restore backup from 2026-08-08/ });
    fireEvent.click(trigger);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).toHaveFocus());
    fireEvent.click(cancel);
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("contains focus and cannot cancel an in-flight restore", async () => {
    let resolveRestore!: (value: { restored_at: string; schema_version: number }) => void;
    vi.mocked(commands.restoreDatabase).mockImplementation(
      () => new Promise((resolve) => { resolveRestore = resolve; }),
    );
    render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restore backup from 2026-08-08/ }));
    const dialog = screen.getByRole("dialog");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Restore backup" });
    fireEvent.keyDown(cancel, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.click(confirm);
    expect(cancel).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    resolveRestore({ restored_at: "2026-08-08T10:01:00Z", schema_version: 27 });
    await screen.findByText("Restore complete.");
  });

  it("successful restore invokes the global callback and reloads inventory", async () => {
    const restored = vi.fn();
    render(<BackupSettings onDatabaseRestored={restored} />);
    fireEvent.click(await screen.findByRole("button", { name: /Restore backup from 2026-08-08/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));
    await screen.findByText("Restore complete.");
    expect(commands.restoreDatabase).toHaveBeenCalledWith(ready.backup_id);
    expect(restored).toHaveBeenCalledTimes(1);
    expect(commands.listBackups).toHaveBeenCalledTimes(2);
  });

  it("has zero applicable axe violations in list and confirmation states", async () => {
    const { container } = render(<BackupSettings onDatabaseRestored={vi.fn()} />);
    const trigger = await screen.findByRole("button", { name: /Restore backup from 2026-08-08/ });
    expect((await axe.run(container)).violations).toEqual([]);
    fireEvent.click(trigger);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
