import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("declares setup state without claiming product implementation", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Foundation setup" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/have not been implemented/i)).toBeInTheDocument();
  });
});
