import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BasicLeafReader } from "./BasicLeafReader";

// ── Content-conflict scenario tests ─────────────────────────────────────────

const NODE_ID = "00000000-0000-7000-8000-000000000100";
const LEAF_DOC_ID = "00000000-0000-7000-8000-000000000101";
const CANVAS_ID = "00000000-0000-7000-8000-000000000102";

const conflictLeafDoc = {
  id: LEAF_DOC_ID,
  life_node_id: NODE_ID,
  schema_version: 1,
  revision: 1,
  canonical_json: JSON.stringify({ type: "doc", content: [] }),
  plain_text: "",
  updated_at: "2026-08-03T00:00:00Z",
};

const conflictCanvasDoc = {
  id: CANVAS_ID,
  life_node_id: NODE_ID,
  schema_version: 1,
  revision: 1,
  canonical_json: JSON.stringify({
    schemaVersion: 1,
    documentId: CANVAS_ID,
    title: "Canvas",
    templateId: "knowledge_dossier",
    templateVersion: 1,
    scenes: [{
      id: "00000000-0000-7000-8000-000000000103",
      title: "",
      layoutPreset: "single_column",
      atmosphere: "neutral",
      motionPreset: "none",
      blocks: [],
    }],
  }),
  plain_text: "",
  updated_at: "2026-08-03T00:00:00Z",
  template_id: "knowledge_dossier",
  template_version: 1,
};

const conflictLeafProjection = (docVal: typeof conflictLeafDoc | null = conflictLeafDoc) => ({
  life_node_id: NODE_ID,
  document: docVal,
  draft_state: "none",
  draft_json: null,
  draft_base_revision: null,
});

const conflictCanvasProjection = (docVal: typeof conflictCanvasDoc | null = conflictCanvasDoc) => ({
  life_node_id: NODE_ID,
  document: docVal,
  draft_state: "none",
  draft_json: null,
  draft_base_revision: null,
});

const conflictApi = vi.hoisted(() => ({
  getLeaf: vi.fn(),
  getCanvas: vi.fn(),
  createLeaf: vi.fn(),
}));

// NarrativeCanvasReader mock — placed before other vi.mock calls so hoisting resolves
vi.mock("../narrative/NarrativeCanvasReader", () => ({
  NarrativeCanvasReader: () => <div data-testid="canvas-reader">Canvas Reader</div>,
  narrativeKey: (nodeId: string) => ["life", "narrative", nodeId],
}));

const makeConflictClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const mountConflict = () =>
  render(
    <QueryClientProvider client={makeConflictClient()}>
      <BasicLeafReader nodeId={NODE_ID} />
    </QueryClientProvider>
  );

describe("BasicLeafReader content routing", () => {
  beforeEach(() => {
    // Wire the existing api mock (declared above for the first describe block)
    // for the conflict scenarios, we need getReaderDocument and getNarrativeDocument
    // to return the conflict fixtures. We re-use the existing api mock but provide
    // unique return values per test.
    conflictApi.getLeaf.mockResolvedValue(conflictLeafProjection(null));
    conflictApi.getCanvas.mockResolvedValue(conflictCanvasProjection(null));
    conflictApi.createLeaf.mockResolvedValue(conflictLeafDoc);
    // Also configure the existing api mock so the commands module mock is consistent:
    api.get.mockResolvedValue(conflictLeafProjection(null));
    api.getNarrative.mockResolvedValue(conflictCanvasProjection(null));
    api.create.mockResolvedValue(conflictLeafDoc);
  });

  it("neither document — shows both creation options", async () => {
    mountConflict();
    expect(await screen.findByRole("button", { name: "Create Basic Leaf document" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Narrative Canvas" })).toBeInTheDocument();
  });

  it("basic leaf only — renders the document (no canvas reader)", async () => {
    api.get.mockResolvedValue(conflictLeafProjection(conflictLeafDoc));
    api.getNarrative.mockResolvedValue(conflictCanvasProjection(null));
    mountConflict();
    expect(await screen.findByRole("heading", { name: "Reader" })).toBeInTheDocument();
    expect(screen.queryByTestId("canvas-reader")).not.toBeInTheDocument();
  });

  it("canvas only — renders the canvas reader", async () => {
    api.get.mockResolvedValue(conflictLeafProjection(null));
    api.getNarrative.mockResolvedValue(conflictCanvasProjection(conflictCanvasDoc));
    mountConflict();
    expect(await screen.findByTestId("canvas-reader")).toBeInTheDocument();
  });

  it("both documents — shows conflict alert, no reader mounted, no creation controls", async () => {
    api.get.mockResolvedValue(conflictLeafProjection(conflictLeafDoc));
    api.getNarrative.mockResolvedValue(conflictCanvasProjection(conflictCanvasDoc));
    mountConflict();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/both a Basic Leaf document and a Narrative Canvas/i);
    expect(screen.queryByTestId("canvas-reader")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Basic Leaf document" })).not.toBeInTheDocument();
  });

  it("basic leaf query error — shows error state", async () => {
    api.get.mockRejectedValue(new Error("network error"));
    mountConflict();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("canvas query error — still shows basic leaf content without crashing", async () => {
    api.get.mockResolvedValue(conflictLeafProjection(conflictLeafDoc));
    api.getNarrative.mockRejectedValue(new Error("canvas network error"));
    mountConflict();
    // Basic leaf content renders: Reader heading is visible, no canvas reader
    expect(await screen.findByRole("heading", { name: "Reader" })).toBeInTheDocument();
    expect(screen.queryByTestId("canvas-reader")).not.toBeInTheDocument();
  });
});

const noNarrative = { life_node_id: "00000000-0000-7000-8000-000000000112", document: null, draft_state: "none", draft_json: null, draft_base_revision: null };
const api=vi.hoisted(()=>({get:vi.fn(),create:vi.fn(),discard:vi.fn(),recover:vi.fn(),importMd:vi.fn(),exportMd:vi.fn(),asset:vi.fn(),getNarrative:vi.fn(),createNarrative:vi.fn()}));
vi.mock("../../../ipc/commands",()=>({getReaderDocument:api.get,createReaderDocument:api.create,discardReaderDraft:api.discard,recoverReaderDraft:api.recover,importReaderMarkdown:api.importMd,exportReaderMarkdown:api.exportMd,getDocumentAsset:api.asset,getNarrativeDocument:api.getNarrative,createNarrativeDocument:api.createNarrative}));
vi.mock("./BasicLeafEditor",()=>({default:()=> <div role="region" aria-label="Focused document editor">Editor loaded</div>}));
const doc={id:"00000000-0000-7000-8000-000000000111",life_node_id:"00000000-0000-7000-8000-000000000112",schema_version:1,revision:1,canonical_json:'{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Static heading"}]},{"type":"paragraph","content":[{"type":"text","text":"Safe copy","marks":[{"type":"bold"}]}]}]}',plain_text:"Static heading\nSafe copy",updated_at:"2026-08-02T00:00:00Z"};
const projection=(extra={})=>({life_node_id:doc.life_node_id,document:doc,draft_state:"none",draft_json:null,draft_base_revision:null,...extra});
const mount=(props:Partial<ComponentProps<typeof BasicLeafReader>>={})=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><BasicLeafReader nodeId={doc.life_node_id} {...props}/></QueryClientProvider>);
const titled=(heading:string,level=1)=>projection({document:{...doc,canonical_json:JSON.stringify({type:"doc",content:[{type:"heading",attrs:{level},content:[{type:"text",text:heading}]},{type:"paragraph",content:[{type:"text",text:"Body copy"}]}]})}});

describe("Basic Leaf Reader",()=>{
 beforeEach(()=>{api.get.mockResolvedValue(projection());api.create.mockResolvedValue(doc);api.discard.mockResolvedValue(projection());api.recover.mockResolvedValue({...doc,revision:2});api.exportMd.mockResolvedValue({export_id:"x",file_name:"leaf.md",markdown:"# Leaf"});api.getNarrative.mockResolvedValue(noNarrative);api.createNarrative.mockResolvedValue({...doc,id:"nc-1"});});
 it("shows document creation, Markdown, and portable import for an empty leaf",async()=>{api.get.mockResolvedValue(projection({document:null}));mount();expect(await screen.findByRole("button",{name:"Create Basic Leaf document"})).toBeInTheDocument();expect(await screen.findByRole("button",{name:"Create Narrative Canvas"})).toBeInTheDocument();expect(screen.getByLabelText("Import Markdown as Canvas")).toBeInTheDocument();expect(screen.getByLabelText("Import Lifeweave package")).toBeInTheDocument();});
 it("renders committed content statically",async()=>{mount();expect(await screen.findByRole("heading",{name:"Static heading"})).toBeInTheDocument();expect(screen.getByText("Safe copy").tagName).toBe("STRONG");expect(screen.queryByRole("textbox")).not.toBeInTheDocument();});
 it("collapses document utilities behind one quiet option",async()=>{mount();await screen.findByText("Safe copy");const summary=screen.getByLabelText("More leaf actions");const options=summary.closest("details");const edit=screen.getByRole("button",{name:"Edit"});expect(options).not.toHaveAttribute("open");expect(edit.parentElement).toContainElement(options);expect(screen.queryByRole("heading",{name:"Reader"})).not.toBeInTheDocument();});
 it("renders the leaf commands into the header corner slot the screen provides",async()=>{const slot=window.document.createElement("div");window.document.body.append(slot);try{mount({commandSlot:slot});await screen.findByText("Safe copy");expect(slot).toContainElement(screen.getByRole("button",{name:"Edit"}));expect(slot).toContainElement(screen.getByLabelText("More leaf actions"));}finally{slot.remove();}});
 it("offers Life tree access from the overflow only when the screen provides it",async()=>{const openInTree=vi.fn();const view=mount({onOpenInTree:openInTree});await screen.findByText("Safe copy");fireEvent.click(screen.getByRole("button",{name:"Open in Life tree"}));expect(openInTree).toHaveBeenCalledOnce();view.unmount();mount();await screen.findByText("Safe copy");expect(screen.queryByRole("button",{name:"Open in Life tree"})).not.toBeInTheDocument();});
 it("stops repeating the leaf identity the header already shows",async()=>{api.get.mockResolvedValue(titled("Language & Communication — Ngôn ngữ và giao tiếp"));mount({identity:{title:"Language & Communication",subtitle:"Ngôn ngữ và giao tiếp"}});expect(await screen.findByText("Body copy")).toBeInTheDocument();expect(screen.queryByRole("heading",{name:/Language & Communication/})).not.toBeInTheDocument();});
 it("keeps an authored heading that is not the leaf identity",async()=>{api.get.mockResolvedValue(titled("Language & Communication in practice"));mount({identity:{title:"Language & Communication",subtitle:"Ngôn ngữ và giao tiếp"}});expect(await screen.findByRole("heading",{name:"Language & Communication in practice"})).toBeInTheDocument();});
 it("keeps every heading when the screen gives no identity",async()=>{api.get.mockResolvedValue(titled("Language & Communication"));mount();expect(await screen.findByRole("heading",{name:"Language & Communication"})).toBeInTheDocument();});
 it("lazy-loads focused Edit only after activation",async()=>{mount();expect(await screen.findByText("Safe copy")).toBeInTheDocument();expect(screen.queryByRole("region",{name:"Focused document editor"})).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Edit"}));expect(await screen.findByRole("region",{name:"Focused document editor"})).toBeInTheDocument();});
 it("offers recover and discard for interrupted drafts",async()=>{api.get.mockResolvedValue(projection({draft_state:"available",draft_json:doc.canonical_json,draft_base_revision:1}));mount();expect(await screen.findByRole("heading",{name:"Recoverable draft"})).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Recover draft"}));await waitFor(()=>expect(api.recover).toHaveBeenCalledWith({document_id:doc.id}));});
 it("preserves a stale recovery conflict",async()=>{api.get.mockResolvedValue(projection({draft_state:"conflict",draft_json:doc.canonical_json,draft_base_revision:0}));api.recover.mockRejectedValue(new Error("stale"));mount();fireEvent.click(await screen.findByRole("button",{name:"Recover draft"}));expect(await screen.findByText(/Both copies remain preserved/)).toBeInTheDocument();});
 it("discards only the recovery draft",async()=>{api.get.mockResolvedValue(projection({draft_state:"available",draft_json:doc.canonical_json,draft_base_revision:1}));mount();fireEvent.click(await screen.findByRole("button",{name:"Discard draft"}));await waitFor(()=>expect(api.discard).toHaveBeenCalledWith({document_id:doc.id}));expect(api.recover).not.toHaveBeenCalled();});
 it("degrades corrupt committed content to a repairable placeholder",async()=>{api.get.mockResolvedValue(projection({document:{...doc,canonical_json:'{"type":"scene"}'}}));mount();expect(await screen.findByRole("alert")).toHaveTextContent(/unsupported content/);});
});
