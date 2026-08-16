import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaticDocument } from "./StaticDocument";
import { loadHighlighter } from "./CodeView";
import { loadMathEngine } from "./MathView";
import type { BasicLeafNode } from "./schema";

vi.mock("katex/dist/katex.min.css", () => ({ default: "" }));

function doc(content: BasicLeafNode[]): BasicLeafNode {
  return { type: "doc", content };
}

const code = (text: string, language?: string): BasicLeafNode => ({
  type: "codeBlock",
  ...(language ? { attrs: { language } } : {}),
  content: [{ type: "text", text }],
});

describe("the Reader renders code without ever becoming a markup channel", () => {
  it("colours a fenced block in the language the document stored", async () => {
    const { container } = render(<StaticDocument document={doc([code("const a = 1;", "javascript")])} />);
    // The source is on the page before the engine loads, so nothing is hidden while waiting.
    expect(container.textContent).toContain("const a = 1;");
    await waitFor(() => expect(container.querySelector(".hljs-keyword")).toBeInTheDocument());
    // Highlighting is presentation: the stored characters are all still there, in order.
    expect(container.querySelector("code")?.textContent).toBe("const a = 1;");
  });

  it("shows code in a language it has no grammar for rather than failing", async () => {
    const { container } = render(
      <StaticDocument document={doc([code("state -> other", "this-language-does-not-exist")])} />,
    );
    await waitFor(() => expect(loadHighlighter()).resolves.toBeDefined());
    expect(container.querySelector("code")?.textContent).toBe("state -> other");
    expect(container.querySelector("code")).toHaveClass("language-this-language-does-not-exist");
  });

  it("keeps a Mermaid fence as its readable, copyable source", async () => {
    const source = "flowchart LR\n  A --> B";
    const { container } = render(<StaticDocument document={doc([code(source, "mermaid")])} />);
    expect(container.querySelector("code")?.textContent).toBe(source);
    expect(container.querySelector("pre")).toHaveAttribute("data-language", "mermaid");
  });

  it("does not let dangerous-looking code become anything but text", async () => {
    const payload = "<script>alert(1)</script>\n<img src=x onerror=alert(2)>";
    const { container } = render(<StaticDocument document={doc([code(payload, "html")])} />);
    await waitFor(() => expect(container.querySelector("code")?.textContent).toBe(payload));
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows a very large block without spending the time to tokenize it", async () => {
    const huge = "x = 1;\n".repeat(9000);
    const { container } = render(<StaticDocument document={doc([code(huge, "javascript")])} />);
    await waitFor(() => expect(loadHighlighter()).resolves.toBeDefined());
    expect(container.querySelector(".hljs-keyword")).toBeNull();
    expect(container.querySelector("code")?.textContent).toBe(huge);
  });
});

describe("the Reader typesets math from the source the document stores", () => {
  it("renders an inline formula and keeps its source available", async () => {
    const { container } = render(
      <StaticDocument document={doc([{ type: "paragraph", content: [{ type: "inlineMath", attrs: { source: "x^2" } }] }])} />,
    );
    await waitFor(() => expect(container.querySelector(".katex")).toBeInTheDocument());
    // The source is in the accessibility tree, so the formula is never only a picture.
    expect(container.textContent).toContain("$x^2$");
  });

  it("renders a display formula as its own block", async () => {
    const { container } = render(
      <StaticDocument document={doc([{ type: "mathBlock", attrs: { source: "\\sum_{i=1}^n i" } }])} />,
    );
    await waitFor(() => expect(container.querySelector(".katex-display")).toBeInTheDocument());
    expect(container.textContent).toContain("\\sum_{i=1}^n i");
  });

  it("shows a formula it cannot parse instead of taking the document down", async () => {
    const { container } = render(
      <StaticDocument
        document={doc([
          { type: "paragraph", content: [{ type: "text", text: "before " }, { type: "inlineMath", attrs: { source: "\\frac{1}{" } }] },
          { type: "paragraph", content: [{ type: "text", text: "after" }] },
        ])}
      />,
    );
    await waitFor(() => expect(loadMathEngine()).resolves.toBeDefined());
    expect(container.textContent).toContain("before");
    expect(container.textContent).toContain("after");
    expect(container.textContent).toContain("\\frac{1}{");
  });

  it("does not let a macro in a formula reach out of the page", async () => {
    // `trust` is off, so the macros that can emit a link or load a resource are refused;
    // KaTeX renders them as an error rather than as an anchor.
    const { container } = render(
      <StaticDocument
        document={doc([{ type: "paragraph", content: [{ type: "inlineMath", attrs: { source: "\\href{javascript:alert(1)}{click}" } }] }])} />,
    );
    await waitFor(() => expect(container.querySelector(".katex")).toBeInTheDocument());
    expect(container.querySelector("a")).toBeNull();
  });

  it("does not render a formula as markup", async () => {
    const { container } = render(
      <StaticDocument
        document={doc([{ type: "mathBlock", attrs: { source: "\\text{<script>alert(1)</script>}" } }])} />,
    );
    await waitFor(() => expect(container.querySelector(".katex-display")).toBeInTheDocument());
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("the Reader never crashes on content it does not know", () => {
  it("offers a repair route instead of failing to render", () => {
    render(<StaticDocument document={doc([{ type: "somethingFromTheFuture" }])} />);
    expect(screen.getByText(/repaired in Edit mode/i)).toBeInTheDocument();
  });
});
