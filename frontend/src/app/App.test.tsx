import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

vi.mock("../ipc/commands", () => ({
  healthCheck: vi.fn().mockResolvedValue({ status: "ok", setup_phase: true }),
}));

describe("App", () => {
  it("shows heading and transitions to ready state through IPC adapter", async () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Foundation setup" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Connecting to application core/)).toBeInTheDocument();
    await screen.findByText(/IPC ready\. Product features not yet implemented\./);
  });
});
