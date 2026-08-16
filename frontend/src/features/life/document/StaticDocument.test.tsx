import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaticDocument } from "./StaticDocument";
import type { BasicLeafNode } from "./schema";

function doc(content: BasicLeafNode[]): BasicLeafNode {
  return { type: "doc", content };
}

// These node types were added so that ordinary Markdown stops being degraded into text.
// The Reader has to show each of them as itself, not as the fallback it used to be.
describe("StaticDocument renders the constructs the Core schema gained", () => {
  it("draws a horizontal rule as a rule, not as a line of dashes", () => {
    const { container } = render(
      <StaticDocument document={doc([{ type: "horizontalRule" }])} />,
    );
    expect(container.querySelector("hr")).toBeInTheDocument();
    expect(container.textContent).not.toContain("—");
  });

  it("shows task state as a checkbox that reflects the stored value", () => {
    render(
      <StaticDocument
        document={doc([
          {
            type: "taskList",
            content: [
              { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "done" }] }] },
              { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "open" }] }] },
            ],
          },
        ])}
      />,
    );
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
    // The Reader is read-only for every other kind of content, so ticking lives in Edit.
    expect(boxes[0]).toBeDisabled();
    expect(screen.getByText("done")).toBeInTheDocument();
    // The old fallback wrote the box into the text itself.
    expect(screen.queryByText(/☐|☒/)).not.toBeInTheDocument();
  });

  it("keeps a code block's language on the element", () => {
    const { container } = render(
      <StaticDocument
        document={doc([{ type: "codeBlock", attrs: { language: "rust" }, content: [{ type: "text", text: "fn main() {}" }] }])}
      />,
    );
    const code = container.querySelector("code");
    expect(code).toHaveClass("language-rust");
    expect(code).toHaveTextContent("fn main() {}");
  });

  it("omits the language class when a block has none", () => {
    const { container } = render(
      <StaticDocument document={doc([{ type: "codeBlock", content: [{ type: "text", text: "plain" }] }])} />,
    );
    expect(container.querySelector("code")?.className).toBeFalsy();
  });

  it("applies stored column alignment to cells", () => {
    const { container } = render(
      <StaticDocument
        document={doc([
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  { type: "tableHeader", attrs: { align: "right" }, content: [{ type: "paragraph", content: [{ type: "text", text: "n" }] }] },
                  { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] },
                ],
              },
            ],
          },
        ])}
      />,
    );
    const headers = container.querySelectorAll("th");
    expect(headers[0]).toHaveStyle({ textAlign: "right" });
    expect(headers[1]?.style.textAlign).toBe("");
  });

  it("ignores an alignment value it does not recognize", () => {
    const { container } = render(
      <StaticDocument
        document={doc([
          {
            type: "table",
            content: [{ type: "tableRow", content: [{ type: "tableCell", attrs: { align: "middle" }, content: [{ type: "paragraph", content: [{ type: "text", text: "c" }] }] }] }],
          },
        ])}
      />,
    );
    expect(container.querySelector("td")?.style.textAlign).toBe("");
  });
});
