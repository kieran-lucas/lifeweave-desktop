import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";

// Mock scrollIntoView and focus on elements (jsdom doesn't implement them)
Element.prototype.scrollIntoView = vi.fn();
// focus is already implemented in jsdom, but we want to track preventScroll
const originalFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = vi.fn(function (this: HTMLElement, options?: FocusOptions) {
  originalFocus.call(this, options);
});

vi.mock("motion/react", () => ({ useReducedMotion: () => false }));

const api = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), discard: vi.fn(), recover: vi.fn(), importMd: vi.fn(), exportMd: vi.fn(), asset: vi.fn() }));
vi.mock("../../../ipc/commands", () => ({ getReaderDocument: api.get, createReaderDocument: api.create, discardReaderDraft: api.discard, recoverReaderDraft: api.recover, importReaderMarkdown: api.importMd, exportReaderMarkdown: api.exportMd, getDocumentAsset: api.asset }));
vi.mock("./BasicLeafEditor", () => ({ default: () => <div role="region" aria-label="Focused document editor">Editor loaded</div> }));
vi.mock("./markdown", () => ({ normalizeMarkdown: async (text: string) => text }));

import { DocumentOutline } from "./DocumentOutline";
import { StaticDocument } from "./StaticDocument";
import { BasicLeafReader } from "./BasicLeafReader";
import { buildDocumentOutline, headingIdForSourceIndex } from "./outline";
import type { BasicLeafNode } from "./schema";

function makeDoc(content: BasicLeafNode[]): BasicLeafNode {
  return { type: "doc", content };
}

function headingNode(level: number, text: string): BasicLeafNode {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}

function paraNode(text: string): BasicLeafNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

const TWO_HEADING_DOC: BasicLeafNode = makeDoc([
  headingNode(1, "Introduction"),
  paraNode("Some content"),
  headingNode(2, "Details"),
  paraNode("More content"),
]);

const ONE_HEADING_DOC: BasicLeafNode = makeDoc([
  headingNode(2, "Only heading"),
  paraNode("Some content"),
]);

const NO_HEADING_DOC: BasicLeafNode = makeDoc([
  paraNode("Just a paragraph"),
]);

function docJson(doc: BasicLeafNode): string {
  return JSON.stringify(doc);
}

const baseDocRecord = {
  id: "00000000-0000-7000-8000-000000000901",
  life_node_id: "00000000-0000-7000-8000-000000000902",
  schema_version: 1,
  revision: 1,
  plain_text: "",
  updated_at: "2026-08-03T00:00:00Z",
};

const projection = (overrides: object = {}) => ({
  life_node_id: baseDocRecord.life_node_id,
  document: { ...baseDocRecord, canonical_json: docJson(TWO_HEADING_DOC) },
  draft_state: "none",
  draft_json: null,
  draft_base_revision: null,
  ...overrides,
});

function mount(nodeId?: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <BasicLeafReader nodeId={nodeId ?? baseDocRecord.life_node_id} />
    </QueryClientProvider>
  );
}

// ─── StaticDocument tests (10.2) ───────────────────────────────────────────

describe("StaticDocument heading IDs", () => {
  it("gives top-level headings positional IDs matching headingIdForSourceIndex", () => {
    const doc = makeDoc([headingNode(2, "First"), paraNode("text"), headingNode(3, "Second")]);
    render(<StaticDocument document={doc} />);
    const h2 = screen.getByRole("heading", { name: "First" });
    const h3 = screen.getByRole("heading", { name: "Second" });
    expect(h2.id).toBe(headingIdForSourceIndex(0));
    expect(h3.id).toBe(headingIdForSourceIndex(2));
  });

  it("renders h1 for level 1", () => {
    render(<StaticDocument document={makeDoc([headingNode(1, "Top")])} />);
    expect(screen.getByRole("heading", { name: "Top", level: 1 })).toBeInTheDocument();
  });

  it("renders h2 for level 2", () => {
    render(<StaticDocument document={makeDoc([headingNode(2, "Sub")])} />);
    expect(screen.getByRole("heading", { name: "Sub", level: 2 })).toBeInTheDocument();
  });

  it("renders h3 for level 3", () => {
    render(<StaticDocument document={makeDoc([headingNode(3, "Sub-sub")])} />);
    expect(screen.getByRole("heading", { name: "Sub-sub", level: 3 })).toBeInTheDocument();
  });

  it("headings are focusable (tabIndex=-1)", () => {
    render(<StaticDocument document={makeDoc([headingNode(2, "Focusable")])} />);
    const h = screen.getByRole("heading", { name: "Focusable" });
    expect(h).toHaveAttribute("tabindex", "-1");
  });

  it("duplicate heading labels get different IDs", () => {
    const doc = makeDoc([headingNode(2, "Same"), headingNode(2, "Same")]);
    render(<StaticDocument document={doc} />);
    const headings = screen.getAllByRole("heading", { name: "Same" });
    expect(headings[0]!.id).not.toBe(headings[1]!.id);
    expect(headings[0]!.id).toBe(headingIdForSourceIndex(0));
    expect(headings[1]!.id).toBe(headingIdForSourceIndex(1));
  });

  it("paragraphs are unchanged (no id or tabIndex)", () => {
    render(<StaticDocument document={makeDoc([paraNode("Plain text")])} />);
    const p = screen.getByText("Plain text");
    expect(p.tagName).toBe("P");
    expect(p).not.toHaveAttribute("id");
    expect(p).not.toHaveAttribute("tabindex");
  });

  it("does not create a Tiptap editor instance", () => {
    render(<StaticDocument document={TWO_HEADING_DOC} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

// ─── DocumentOutline component tests ────────────────────────────────────────

describe("DocumentOutline component", () => {
  const twoEntryOutline = buildDocumentOutline(TWO_HEADING_DOC);

  it("renders a nav with aria-label Document outline", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    expect(screen.getByRole("navigation", { name: "Document outline" })).toBeInTheDocument();
  });

  it("shows entry buttons with correct labels", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    expect(screen.getByRole("button", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
  });

  it("sets data-level attribute on entry buttons", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    const introBtn = screen.getByRole("button", { name: "Introduction" });
    const detailBtn = screen.getByRole("button", { name: "Details" });
    expect(introBtn).toHaveAttribute("data-level", "1");
    expect(detailBtn).toHaveAttribute("data-level", "2");
  });

  it("clicking an entry button calls scrollIntoView with smooth and focus", async () => {
    // Create actual DOM elements to scroll to
    const targetEl = document.createElement("h1");
    targetEl.id = headingIdForSourceIndex(0);
    document.body.appendChild(targetEl);

    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Introduction" }));

    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(targetEl.focus).toHaveBeenCalledWith({ preventScroll: false });

    document.body.removeChild(targetEl);
  });

  it("reducedMotion=true: calls scrollIntoView with auto behavior", async () => {
    const targetEl = document.createElement("h2");
    targetEl.id = headingIdForSourceIndex(2);
    document.body.appendChild(targetEl);

    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });

    document.body.removeChild(targetEl);
  });

  it("sets aria-current on the active entry after click", async () => {
    const targetEl = document.createElement("h1");
    targetEl.id = headingIdForSourceIndex(0);
    document.body.appendChild(targetEl);

    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    const introBtn = screen.getByRole("button", { name: "Introduction" });
    expect(introBtn).not.toHaveAttribute("aria-current");
    fireEvent.click(introBtn);
    await waitFor(() => expect(introBtn).toHaveAttribute("aria-current", "true"));

    document.body.removeChild(targetEl);
  });

  it("shows disclosure toggle with Show outline label by default", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    expect(screen.getByRole("button", { name: /Show outline/ })).toBeInTheDocument();
  });

  it("clicking disclosure toggle changes label to Hide outline", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    const toggle = screen.getByRole("button", { name: /Show outline/ });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: /Hide outline/ })).toBeInTheDocument();
  });

  it("disclosure toggle has aria-expanded=false by default", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    const toggle = screen.getByRole("button", { name: /Show outline/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("disclosure toggle has aria-expanded=true after click", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    const toggle = screen.getByRole("button", { name: /Show outline/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("does not show truncation note when not truncated", () => {
    render(<DocumentOutline outline={twoEntryOutline} reducedMotion={false} />);
    expect(screen.queryByText(/Outline limited/)).not.toBeInTheDocument();
  });

  it("shows truncation note when outline is truncated", () => {
    const manyHeadings: BasicLeafNode[] = Array.from({ length: 300 }, (_, i) => headingNode(2, `Section ${i}`));
    const truncatedOutline = buildDocumentOutline(makeDoc(manyHeadings));
    render(<DocumentOutline outline={truncatedOutline} reducedMotion={false} />);
    expect(screen.getByText(/Outline limited to the first 256 sections/)).toBeInTheDocument();
  });
});

// ─── Reader integration tests (10.3) ─────────────────────────────────────────

describe("BasicLeafReader outline integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(projection());
    api.create.mockResolvedValue({ ...baseDocRecord, canonical_json: docJson(TWO_HEADING_DOC) });
    api.discard.mockResolvedValue(projection());
    api.recover.mockResolvedValue({ ...baseDocRecord, canonical_json: docJson(TWO_HEADING_DOC), revision: 2 });
    api.exportMd.mockResolvedValue({ export_id: "x", file_name: "leaf.md", markdown: "# Leaf" });
  });

  it("outline is hidden when document has 0 headings (< 2)", async () => {
    api.get.mockResolvedValue(projection({ document: { ...baseDocRecord, canonical_json: docJson(NO_HEADING_DOC) } }));
    mount();
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument());
  });

  it("outline is hidden when document has exactly 1 heading", async () => {
    api.get.mockResolvedValue(projection({ document: { ...baseDocRecord, canonical_json: docJson(ONE_HEADING_DOC) } }));
    mount();
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Only heading" })).toBeInTheDocument();
  });

  it("outline is shown when document has 2+ headings", async () => {
    mount();
    expect(await screen.findByRole("navigation", { name: "Document outline" })).toBeInTheDocument();
  });

  it("outline shows correct labels and levels", async () => {
    mount();
    await screen.findByRole("navigation", { name: "Document outline" });
    expect(screen.getByRole("button", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Introduction" })).toHaveAttribute("data-level", "1");
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute("data-level", "2");
  });

  it("clicking outline item navigates to correct heading by ID, not text", async () => {
    // Add the DOM element that would be in the article
    const targetEl = document.createElement("h1");
    targetEl.id = headingIdForSourceIndex(0);
    document.body.appendChild(targetEl);

    mount();
    await screen.findByRole("navigation", { name: "Document outline" });
    fireEvent.click(screen.getByRole("button", { name: "Introduction" }));

    expect(targetEl.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    document.body.removeChild(targetEl);
  });

  it("duplicate heading labels produce distinct navigable controls (different IDs)", async () => {
    const dupDoc = makeDoc([headingNode(2, "Same"), headingNode(2, "Same")]);
    api.get.mockResolvedValue(projection({ document: { ...baseDocRecord, canonical_json: docJson(dupDoc) } }));
    mount();
    await screen.findByRole("navigation", { name: "Document outline" });
    const buttons = screen.getAllByRole("button", { name: "Same" });
    // There should be 2 outline buttons for the 2 headings, but also the heading elements themselves
    // Filter to only buttons within the nav
    const nav = screen.getByRole("navigation", { name: "Document outline" });
    const navButtons = Array.from(nav.querySelectorAll("button[data-level]"));
    expect(navButtons).toHaveLength(2);
    // Verify the heading DOM elements also have distinct IDs
    const headings = screen.getAllByRole("heading", { name: "Same" });
    expect(headings[0]!.id).not.toBe(headings[1]!.id);
  });

  it("editing mode hides the outline", async () => {
    mount();
    await screen.findByRole("navigation", { name: "Document outline" });
    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument());
  });

  it("returning from committed edit shows outline with current content", async () => {
    const updatedDoc = makeDoc([headingNode(1, "Updated Title"), headingNode(2, "New Section")]);
    const updatedDocRecord = { ...baseDocRecord, canonical_json: docJson(updatedDoc), revision: 2 };
    api.recover.mockResolvedValue(updatedDocRecord);
    api.get.mockResolvedValue(projection({
      document: { ...baseDocRecord, canonical_json: docJson(updatedDoc) },
    }));

    mount();
    expect(await screen.findByRole("navigation", { name: "Document outline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Updated Title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Section" })).toBeInTheDocument();
  });

  it("corrupt document shows no outline", async () => {
    api.get.mockResolvedValue(projection({ document: { ...baseDocRecord, canonical_json: '{"type":"scene"}' } }));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(/unsupported content/);
    expect(screen.queryByRole("navigation", { name: "Document outline" })).not.toBeInTheDocument();
  });

  it("truncation notice shown when document has > 256 headings", async () => {
    const manyHeadings: BasicLeafNode[] = Array.from({ length: 300 }, (_, i) => headingNode(2, `Section ${i}`));
    const bigDoc = makeDoc(manyHeadings);
    api.get.mockResolvedValue(projection({ document: { ...baseDocRecord, canonical_json: docJson(bigDoc) } }));
    mount();
    await screen.findByRole("navigation", { name: "Document outline" });
    expect(screen.getByText(/Outline limited to the first 256 sections/)).toBeInTheDocument();
  });

  it("markdown import updates outline when committed document changes", async () => {
    const importedDoc = makeDoc([headingNode(1, "Imported Title"), headingNode(2, "Imported Section")]);
    const importedRecord = { ...baseDocRecord, canonical_json: docJson(importedDoc), revision: 2 };
    api.importMd.mockResolvedValue(importedRecord);

    mount();
    await screen.findByRole("navigation", { name: "Document outline" });

    // Trigger markdown import (simulate file input change)
    // Mock File.prototype.text so markdown normalization receives simple text
    const mockText = vi.fn().mockResolvedValue("# Imported Title\n## Imported Section\n");
    const file = { text: mockText, name: "test.md", type: "text/markdown" } as unknown as File;
    const fileInput = screen.getByLabelText("Import Markdown");
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Imported Title" })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("draft recovery updates outline with committed canonical JSON", async () => {
    const recoveredDoc = makeDoc([headingNode(1, "Recovered Title"), headingNode(2, "Recovered Section")]);
    const recoveredRecord = { ...baseDocRecord, canonical_json: docJson(recoveredDoc), revision: 2 };
    api.recover.mockResolvedValue(recoveredRecord);
    api.get.mockResolvedValue(projection({
      draft_state: "available",
      draft_json: docJson(recoveredDoc),
      draft_base_revision: 1,
    }));

    mount();
    await screen.findByRole("heading", { name: "Recoverable draft" });
    fireEvent.click(screen.getByRole("button", { name: "Recover draft" }));
    await waitFor(() => expect(api.recover).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Recovered Title" })).toBeInTheDocument();
    });
  });

  it("passes accessibility audit (axe) with populated outline", async () => {
    const { container } = mount();
    await screen.findByRole("navigation", { name: "Document outline" });
    const results = await axe.run(container);
    expect(results.violations.filter(v => v.impact === "critical" || v.impact === "serious")).toHaveLength(0);
  });
});
