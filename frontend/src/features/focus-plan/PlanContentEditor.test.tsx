import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import PlanContentEditor from "./PlanContentEditor";

function EditablePlan({ initial = "quiet" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <PlanContentEditor value={value} editing onChange={setValue} />;
}

describe("Plan Markdown content editor", () => {
  it("uses the Leaf formatting grammar without exposing image persistence", () => {
    render(<EditablePlan />);

    const toolbar = screen.getByRole("toolbar", { name: "Plan Markdown formatting" });
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(screen.queryByText("Image")).not.toBeInTheDocument();

    const editor = screen.getByRole("textbox", { name: "Plan content" }) as HTMLTextAreaElement;
    editor.setSelectionRange(0, 5);
    fireEvent.click(screen.getByRole("button", { name: "Bold" }));
    expect(editor).toHaveValue("**quiet**");
    expect(toolbar).toBeInTheDocument();
  });

  it("previews headings, lists and safe links while leaving unsafe markup inert", () => {
    const onChange = vi.fn();
    render(
      <PlanContentEditor
        value={'## Direction\n\n- Local first\n\n[Safe](https://example.com) [Unsafe](javascript:alert(1))\n\n<script>alert("x")</script>'}
        editing
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("heading", { level: 2, name: "Direction" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Safe" })).toHaveAttribute("href", "https://example.com");
    expect(screen.queryByRole("link", { name: "Unsafe" })).not.toBeInTheDocument();
    expect(screen.getByText(/<script>alert/)).toBeInTheDocument();
  });

  it("preserves authored line breaks in ordinary preview paragraphs", () => {
    render(<PlanContentEditor value={"First line\nSecond line"} editing onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByText(/First line/).textContent).toBe("First line\nSecond line");
  });

  it("has no critical or serious accessibility violations in Write mode", async () => {
    const { container } = render(<EditablePlan initial="## Direction\n\nWrite clearly." />);
    const results = await axe.run(container);
    expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toHaveLength(0);
  });
});
