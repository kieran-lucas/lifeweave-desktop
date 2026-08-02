import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function Broken({ fail }: { fail: boolean }) {
  if (fail) throw new Error("private content must not be surfaced");
  return <h1>Recovered destination</h1>;
}

describe("RouteErrorBoundary", () => {
  it("contains a destination fault and renders content-free recovery guidance", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<RouteErrorBoundary destination="today"><Broken fail /></RouteErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("saved data was not changed");
    expect(screen.queryByText(/private content/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry view" })).toBeInTheDocument();
  });

  it("allows a safe retry without remounting the application shell", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let fail = true;
    const { rerender } = render(<RouteErrorBoundary destination="life"><Broken fail={fail} /></RouteErrorBoundary>);
    fail = false;
    rerender(<RouteErrorBoundary destination="life"><Broken fail={fail} /></RouteErrorBoundary>);
    fireEvent.click(screen.getByRole("button", { name: "Retry view" }));
    expect(screen.getByRole("heading", { name: "Recovered destination" })).toBeInTheDocument();
  });
});
