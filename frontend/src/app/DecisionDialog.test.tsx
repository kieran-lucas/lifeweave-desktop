import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DecisionDialog } from "./layout/DialogSurface";

describe("DecisionDialog", () => {
  it("focuses prompt input, submits its value, traps the boundaries, and restores focus", () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const view = render(
      <DecisionDialog
        title="Add link"
        description="Enter a destination."
        confirmLabel="Add link"
        inputLabel="Link destination"
        returnFocus={opener}
        onConfirm={confirm}
        onCancel={cancel}
      />,
    );

    const input = screen.getByLabelText("Link destination");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "https://example.com" } });
    const submit = screen.getByRole("button", { name: "Add link" });
    submit.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(input).toHaveFocus();
    fireEvent.click(submit);
    expect(confirm).toHaveBeenCalledWith("https://example.com");

    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it("cancels on Escape", () => {
    const cancel = vi.fn();
    render(
      <DecisionDialog
        title="Leave Edit?"
        description="A draft remains."
        confirmLabel="Leave Edit"
        onConfirm={vi.fn()}
        onCancel={cancel}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
