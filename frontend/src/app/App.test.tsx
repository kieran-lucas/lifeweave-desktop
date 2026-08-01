import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

vi.mock("../ipc/commands", () => ({
  healthCheck: vi.fn().mockResolvedValue({ status: "ok" }),
  listFoundationRecords: vi.fn().mockResolvedValue([]),
  createFoundationRecord: vi.fn(),
  updateFoundationRecord: vi.fn(),
  archiveFoundationRecord: vi.fn(),
  restoreFoundationRecord: vi.fn(),
}));

describe("App", () => {
  it("shows loading state then renders FoundationScreen after IPC ready", async () => {
    render(<App />);
    expect(screen.getByText(/Connecting to application core/)).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Foundation Records" });
  });
});
