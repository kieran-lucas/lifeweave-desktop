import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifeLinksPanel } from "./LifeLinksPanel";

const api = vi.hoisted(() => ({
  panel: vi.fn(), search: vi.fn(), create: vi.fn(), remove: vi.fn(),
}));
vi.mock("../../../ipc/commands", () => ({
  getLifeLinkPanel: api.panel,
  searchLifeLinkTargets: api.search,
  createLifeLink: api.create,
  removeLifeLink: api.remove,
}));

const sourceId = "00000000-0000-7000-8000-000000000101";
const targetId = "00000000-0000-7000-8000-000000000102";
const backlinkId = "00000000-0000-7000-8000-000000000103";
const row = (overrides = {}) => ({
  link_id: "00000000-0000-7000-8000-000000000201",
  endpoint_node_id: targetId,
  title: "Kế hoạch",
  short_description: "A committed target",
  icon_key: "life-leaf",
  document_kind: "basic_leaf" as const,
  breadcrumb: "Life / Work / Kế hoạch",
  availability: "active" as const,
  created_at: "2026-08-07T00:00:00.000Z",
  ...overrides,
});
const panel = (overrides = {}) => ({
  source: { node_id: sourceId, title: "Source", eligible: true, ineligible_reason: null },
  outgoing: [] as ReturnType<typeof row>[],
  backlinks: [] as ReturnType<typeof row>[],
  ...overrides,
});
const mount = (onNavigate = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    ...render(<QueryClientProvider client={client}><LifeLinksPanel nodeId={sourceId} onNavigate={onNavigate} /></QueryClientProvider>),
    client,
    onNavigate,
  };
};

describe("LifeLinksPanel", () => {
  beforeEach(() => {
    api.panel.mockReset().mockResolvedValue(panel());
    api.search.mockReset().mockResolvedValue([]);
    api.create.mockReset();
    api.remove.mockReset();
  });

  it("shows accessible empty counts and explicit ineligibility", async () => {
    const view = mount();
    expect(await screen.findByRole("heading", { name: "Outgoing links (0)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Backlinks (0)" })).toBeInTheDocument();
    expect((await axe.run(view.container)).violations).toHaveLength(0);
    view.unmount();

    api.panel.mockResolvedValue(panel({ source: { node_id: sourceId, title: "Source", eligible: false, ineligible_reason: "A committed Reader document is required." } }));
    mount();
    expect(await screen.findByText("A committed Reader document is required.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add link" })).toBeDisabled();
  });

  it("navigates by endpoint ID, disables archived navigation, and removes outgoing only", async () => {
    api.panel.mockResolvedValue(panel({
      outgoing: [row()],
      backlinks: [row({ link_id: "link-back", endpoint_node_id: backlinkId, title: "Archived source", availability: "archived" })],
    }));
    api.remove.mockResolvedValue({ link_id: "00000000-0000-7000-8000-000000000201", source_node_id: sourceId, target_node_id: targetId });
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Open Kế hoạch in Life Reader" }));
    expect(view.onNavigate).toHaveBeenCalledWith(targetId);
    expect(screen.getByRole("button", { name: "Archived source is archived" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /Remove link/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove link to Kế hoạch" }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith({ link_id: "00000000-0000-7000-8000-000000000201" }));
    expect(await screen.findByText("Link removed.")).toBeInTheDocument();
    expect((await axe.run(view.container)).violations).toHaveLength(0);
  });

  it("searches explicitly, retains selection after failure, then confirms without ID entry", async () => {
    api.search.mockResolvedValue([{ node_id: targetId, title: "Đời sống", short_description: "Target", icon_key: "life-leaf", document_kind: "narrative_canvas", breadcrumb: "Life / Đời sống" }]);
    api.create.mockRejectedValueOnce(new Error("Incoming cap reached.")).mockResolvedValueOnce({ link_id: "link-new", source_node_id: sourceId, target_node_id: targetId });
    const view = mount();
    const trigger = await screen.findByRole("button", { name: "Add link" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Add link from Source" });
    expect((await axe.run(dialog)).violations).toHaveLength(0);
    const input = within(dialog).getByRole("textbox", { name: "Find a Life leaf" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "đời" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Search" }));
    const choice = await within(dialog).findByRole("radio", { name: /Đời sống/ });
    fireEvent.click(choice);
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm link" }));
    expect(await within(dialog).findByText("Incoming cap reached.")).toBeInTheDocument();
    expect(input).toHaveValue("đời");
    expect(choice).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm link" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.create).toHaveBeenLastCalledWith({ source_node_id: sourceId, target_node_id: targetId });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(await screen.findByText("Link added.")).toBeInTheDocument();
    expect(view.client.getQueryCache().findAll({ queryKey: ["life-links", "targets"] }).length).toBeGreaterThanOrEqual(1);
  });

  it("cancels with Escape, restores focus, and keeps Enter scoped to target search", async () => {
    mount();
    const trigger = await screen.findByRole("button", { name: "Add link" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByRole("textbox");
    fireEvent.change(input, { target: { value: "query" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(api.search).toHaveBeenCalledWith({ source_node_id: sourceId, query: "query" }));
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("renders a stable error state", async () => {
    api.panel.mockRejectedValue(new Error("offline"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Links could not be loaded.");
  });
});
