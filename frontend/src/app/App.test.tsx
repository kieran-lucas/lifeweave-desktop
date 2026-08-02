import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { App } from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const renderApp = () => render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);

vi.mock("../ipc/commands", () => ({
  healthCheck: vi.fn().mockResolvedValue({ status: "ok" }),
  listFoundationRecords: vi.fn().mockResolvedValue([]),
  listArchivedFoundationRecords: vi.fn().mockResolvedValue([]),
  listBackups: vi.fn().mockResolvedValue([]),
  createFoundationRecord: vi.fn(), updateFoundationRecord: vi.fn(),
  archiveFoundationRecord: vi.fn(), restoreFoundationRecord: vi.fn(),
  backupDatabase: vi.fn(), restoreDatabase: vi.fn(),
  listTasksForDate: vi.fn().mockResolvedValue([]),
  listTodayItems: vi.fn().mockResolvedValue([]),
  listTaskCategories: vi.fn().mockResolvedValue([]),
  createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
}));

describe("App shell", () => {
  beforeEach(() => window.localStorage.clear());

  it("defaults to Today and exposes the locked navigation order", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.getAllByRole("navigation")[0]).toHaveAccessibleName("Primary navigation");
    expect(screen.getByRole("button", { name: "Create task" })).toBeInTheDocument();
  });

  it("navigates destinations and exposes the active item", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(await screen.findByRole("heading", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
  });

  it("persists collapse and restores the task preference after Life System", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Life System" }));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(window.localStorage.getItem("lifeweave.task-sidebar-mode.v1")).toBe("collapsed");
  });

  it("keeps Foundation tools under Settings", async () => {
    renderApp();
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.queryByRole("heading", { name: "Foundation Records" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Foundation Records" })).toBeInTheDocument();
  });
});
