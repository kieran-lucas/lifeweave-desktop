import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NarrativeCanvasReader } from "./NarrativeCanvasReader";

const NODE_ID = "00000000-0000-7000-8000-000000000200";
const DOC_ID = "00000000-0000-7000-8000-000000000201";

const seedDoc = (canonical_json: string, extra = {}) => ({
  id: DOC_ID,
  life_node_id: NODE_ID,
  schema_version: 1,
  revision: 1,
  canonical_json,
  plain_text: "Test",
  updated_at: "2026-08-03T00:00:00Z",
  template_id: "knowledge_dossier",
  template_version: 1,
  ...extra,
});

const emptyCanvasJson = JSON.stringify({
  schemaVersion: 1,
  documentId: DOC_ID,
  title: "My Canvas",
  templateId: "knowledge_dossier",
  templateVersion: 1,
  scenes: [{
    id: "00000000-0000-7000-8000-000000000202",
    title: "Scene One",
    layoutPreset: "single_column",
    atmosphere: "neutral",
    motionPreset: "none",
    blocks: [],
  }],
});

const projection = (extra = {}) => ({
  life_node_id: NODE_ID,
  document: seedDoc(emptyCanvasJson),
  draft_state: "none",
  draft_json: null,
  draft_base_revision: null,
  ...extra,
});

const api = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  discard: vi.fn(),
  recover: vi.fn(),
}));

vi.mock("../../../ipc/commands", () => ({
  getNarrativeDocument: api.get,
  createNarrativeDocument: api.create,
  discardNarrativeDraft: api.discard,
  recoverNarrativeDraft: api.recover,
  getDocumentAsset: vi.fn(),
}));

vi.mock("./NarrativeCanvasStudio", () => ({
  default: () => <div role="region" aria-label="Narrative studio">Studio loaded</div>,
}));

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <NarrativeCanvasReader nodeId={NODE_ID} />
    </QueryClientProvider>
  );

describe("NarrativeCanvasReader", () => {
  beforeEach(() => {
    api.get.mockResolvedValue(projection());
    api.create.mockResolvedValue(seedDoc(emptyCanvasJson));
    api.discard.mockResolvedValue(projection({ draft_state: "none" }));
    api.recover.mockResolvedValue(seedDoc(emptyCanvasJson, { revision: 2 }));
  });

  it("shows Create Narrative Canvas for empty leaf", async () => {
    api.get.mockResolvedValue(projection({ document: null }));
    mount();
    expect(await screen.findByRole("button", { name: "Create Narrative Canvas" })).toBeInTheDocument();
  });

  it("renders canvas title and scene title statically", async () => {
    mount();
    expect(await screen.findByRole("heading", { name: "My Canvas", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scene One", level: 2 })).toBeInTheDocument();
  });

  it("lazy-loads studio only after Edit canvas click", async () => {
    mount();
    expect(await screen.findByText("My Canvas")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Narrative studio" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit canvas" }));
    expect(await screen.findByRole("region", { name: "Narrative studio" })).toBeInTheDocument();
  });

  it("shows draft recovery banner when draft is available", async () => {
    api.get.mockResolvedValue(projection({ draft_state: "available", draft_json: emptyCanvasJson, draft_base_revision: 1 }));
    mount();
    expect(await screen.findByRole("heading", { name: "Recoverable draft" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Recover draft" }));
    await waitFor(() => expect(api.recover).toHaveBeenCalledWith({ document_id: DOC_ID }));
  });

  it("discard draft dismisses recovery section", async () => {
    api.get.mockResolvedValue(projection({ draft_state: "available", draft_json: emptyCanvasJson, draft_base_revision: 1 }));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Discard draft" }));
    await waitFor(() => expect(api.discard).toHaveBeenCalledWith({ document_id: DOC_ID }));
  });

  it("renders metric block label and value", async () => {
    const withMetric = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "Dashboard",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [{
        id: "00000000-0000-7000-8000-000000000202",
        title: "KPIs",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks: [{
          kind: "metric",
          id: "00000000-0000-7000-8000-000000000203",
          label: "Revenue",
          value: "100",
          unit: "USD",
          description: "Total revenue",
        }],
      }],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(withMetric) }));
    mount();
    expect(await screen.findByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("Total revenue")).toBeInTheDocument();
  });

  it("renders timeline block heading and items", async () => {
    const withTimeline = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "History",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [{
        id: "00000000-0000-7000-8000-000000000202",
        title: "",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks: [{
          kind: "timeline",
          id: "00000000-0000-7000-8000-000000000204",
          title: "Milestones",
          items: [
            { id: "00000000-0000-7000-8000-000000000205", label: "2020", description: "Founded" },
          ],
        }],
      }],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(withTimeline) }));
    mount();
    expect(await screen.findByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("Founded")).toBeInTheDocument();
  });

  it("renders callout block with variant label", async () => {
    const withCallout = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [{
        id: "00000000-0000-7000-8000-000000000202",
        title: "",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks: [{
          kind: "callout",
          id: "00000000-0000-7000-8000-000000000206",
          variant: "warning",
          content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Be careful" }] }] },
        }],
      }],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(withCallout) }));
    mount();
    expect(await screen.findByText("warning")).toBeInTheDocument();
    expect(screen.getByText("Be careful")).toBeInTheDocument();
  });

  it("rich_text block renders its text content through StaticDocument", async () => {
    const withRichText = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "Doc",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [{
        id: "00000000-0000-7000-8000-000000000202",
        title: "",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks: [{
          kind: "rich_text",
          id: "00000000-0000-7000-8000-000000000210",
          content: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Hello StaticDocument" }] }],
          },
        }],
      }],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(withRichText) }));
    mount();
    expect(await screen.findByText("Hello StaticDocument")).toBeInTheDocument();
  });

  it("renders all scenes in a multi-scene document", async () => {
    const twoSceneJson = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "Multi Scene",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [
        {
          id: "00000000-0000-7000-8000-000000000202",
          title: "Act One",
          layoutPreset: "single_column",
          atmosphere: "neutral",
          motionPreset: "none",
          blocks: [],
        },
        {
          id: "00000000-0000-7000-8000-000000000203",
          title: "Act Two",
          layoutPreset: "single_column",
          atmosphere: "neutral",
          motionPreset: "none",
          blocks: [],
        },
      ],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(twoSceneJson) }));
    mount();
    expect(await screen.findByRole("heading", { name: "Act One", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Act Two", level: 2 })).toBeInTheDocument();
    const sections = screen.getAllByRole("region");
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it("renders visually hidden h2 for untitled scenes", async () => {
    const untitledSceneJson = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "Canvas",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [
        {
          id: "00000000-0000-7000-8000-000000000202",
          title: "",
          layoutPreset: "single_column",
          atmosphere: "neutral",
          motionPreset: "none",
          blocks: [],
        },
      ],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(untitledSceneJson) }));
    mount();
    await screen.findByRole("heading", { name: "Canvas", level: 1 });
    // Untitled scene still gets a h2 (screen-reader only)
    expect(screen.getByRole("heading", { name: "Scene 1", level: 2 })).toBeInTheDocument();
  });

  it("corrupt rich_text island shows placeholder without crashing", async () => {
    const withCorrupt = JSON.stringify({
      schemaVersion: 1,
      documentId: DOC_ID,
      title: "Doc",
      templateId: "knowledge_dossier",
      templateVersion: 1,
      scenes: [{
        id: "00000000-0000-7000-8000-000000000202",
        title: "",
        layoutPreset: "single_column",
        atmosphere: "neutral",
        motionPreset: "none",
        blocks: [{
          kind: "rich_text",
          id: "00000000-0000-7000-8000-000000000211",
          content: { type: "not-a-doc", content: [] },
        }],
      }],
    });
    api.get.mockResolvedValue(projection({ document: seedDoc(withCorrupt) }));
    mount();
    expect(await screen.findByText(/unsupported content/i)).toBeInTheDocument();
  });
});
