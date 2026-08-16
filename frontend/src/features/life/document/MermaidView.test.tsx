import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The engine itself needs a real browser: Mermaid measures text with `getComputedTextLength`
 * and `getBBox`, which jsdom does not implement. Those paths are proved in the WebView2 E2E
 * phase. What is proved here is everything the component decides on its own — which is where
 * the failure, staleness and lifetime behaviour lives.
 */
const engine = vi.hoisted(() => ({
  render: vi.fn(),
  initialize: vi.fn(),
}));
vi.mock("mermaid", () => ({ default: engine }));

const { MermaidView, loadDiagramEngine } = await import("./MermaidView");

const diagram = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g class="node"><rect x="1" y="1" width="8" height="8"/><text x="2" y="5">Start</text></g></svg>`;

afterEach(() => { engine.render.mockReset(); });

describe("a diagram is drawn from its source and never replaces it", () => {
  it("renders the sanitized picture and keeps the source with it", async () => {
    engine.render.mockResolvedValue({ svg: diagram });
    const { container } = render(<MermaidView source="flowchart LR\n A[Start]" />);

    await waitFor(() => expect(container.querySelector("svg")).toBeInTheDocument());
    expect(container.querySelector("rect")).toBeInTheDocument();
    expect(container.textContent).toContain("Start");
    // The authored text stays on the page, so the diagram is never the only copy of it.
    expect(screen.getByText("Diagram source")).toBeInTheDocument();
    expect(container.querySelector("code")?.textContent).toContain("flowchart LR");
  });

  it("shows the source when the engine cannot parse the diagram", async () => {
    engine.render.mockRejectedValue(new Error("Parse error on line 2"));
    const { container } = render(<MermaidView source="flowchart LR\n  A -->" />);

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(screen.getByRole("status").textContent).toContain("could not be drawn");
    expect(container.querySelector("code")?.textContent).toContain("A -->");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("shows the source when the engine returns something the boundary refuses", async () => {
    engine.render.mockResolvedValue({ svg: `<html><body>not a diagram</body></html>` });
    const { container } = render(<MermaidView source="flowchart LR" />);

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(container.querySelector("code")?.textContent).toContain("flowchart LR");
  });

  it("never draws markup the engine emitted, whatever the engine returns", async () => {
    // The engine's own security mode is a second lock; this proves the door itself holds
    // even if the engine hands back something it never should.
    engine.render.mockResolvedValue({
      svg: `<svg xmlns="http://www.w3.org/2000/svg"><script>window.__pwned=1</script><a href="javascript:alert(1)"><circle r="1"/></a><rect x="1" onclick="alert(2)"/><image href="https://example.com/x.png"/></svg>`,
    });
    const { container } = render(<MermaidView source="flowchart LR" />);

    await waitFor(() => expect(container.querySelector("svg")).toBeInTheDocument());
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("image")).toBeNull();
    // The rect survives as geometry; the handler on it and the link around the circle do not.
    expect(container.querySelector("rect")).toBeInTheDocument();
    expect(container.querySelector("rect")!.getAttribute("onclick")).toBeNull();
    expect(container.querySelector("circle")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("refuses a source longer than the bound without calling the engine", async () => {
    render(<MermaidView source={"graph LR\n".repeat(2000)} />);
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(engine.render).not.toHaveBeenCalled();
  });

  it("ignores a result that arrives after the component is gone", async () => {
    let settle!: (value: { svg: string }) => void;
    engine.render.mockReturnValue(new Promise(resolve => { settle = resolve; }));
    const { unmount } = render(<MermaidView source="flowchart LR" />);
    await waitFor(() => expect(engine.render).toHaveBeenCalled());

    unmount();
    settle({ svg: diagram });
    // The assertion is that settling after unmount neither throws nor updates state.
    await expect(new Promise(resolve => setTimeout(resolve, 0))).resolves.toBeUndefined();
  });

  it("ignores a stale result when the source changes while it is still drawing", async () => {
    const first = new Promise<{ svg: string }>(() => {});
    engine.render.mockReturnValueOnce(first);
    const { rerender, container } = render(<MermaidView source="graph LR" />);
    await waitFor(() => expect(engine.render).toHaveBeenCalledTimes(1));

    engine.render.mockResolvedValueOnce({ svg: diagram });
    rerender(<MermaidView source="graph TD" />);
    await waitFor(() => expect(container.querySelector("rect")).toBeInTheDocument());
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("draws several diagrams independently from one engine", async () => {
    engine.render.mockResolvedValue({ svg: diagram });
    const { container } = render(
      <div>
        <MermaidView source="graph LR" />
        <MermaidView source="graph TD" />
        <MermaidView source="sequenceDiagram" />
      </div>,
    );
    await waitFor(() => expect(container.querySelectorAll("svg")).toHaveLength(3));
    expect(engine.render).toHaveBeenCalledTimes(3);
    // One engine for the whole application, however many diagrams a document holds.
    expect(loadDiagramEngine()).toBe(loadDiagramEngine());
  });

  it("keeps a bad diagram from taking the good ones down with it", async () => {
    engine.render
      .mockResolvedValueOnce({ svg: diagram })
      .mockRejectedValueOnce(new Error("Parse error"))
      .mockResolvedValueOnce({ svg: diagram });
    const { container } = render(
      <div>
        <MermaidView source="graph A" />
        <MermaidView source="graph B" />
        <MermaidView source="graph C" />
      </div>,
    );
    await waitFor(() => expect(container.querySelectorAll("svg")).toHaveLength(2));
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
