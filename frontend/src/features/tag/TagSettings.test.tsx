import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { StrictMode, Suspense } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TagSettings } from "./TagSettings";

const commands = vi.hoisted(() => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
  renameTag: vi.fn(),
  archiveTag: vi.fn(),
  restoreTag: vi.fn(),
  mergeTags: vi.fn(),
}));
vi.mock("../../ipc/commands", () => commands);

const activeTag = (id: string, name: string, extra = {}) => ({
  id,
  name,
  revision: 1,
  archived: false,
  merged_into: null,
  task_count: 0,
  series_count: 0,
  life_node_count: 0,
  ...extra,
});

function renderSettings() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<p>Loading…</p>}>
        <TagSettings />
      </Suspense>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

const archivedTag = (id: string, name: string, extra = {}) => ({
  ...activeTag(id, name, extra),
  archived: true,
});

const mergedTag = (id: string, name: string, canonicalId = "a") => ({
  ...activeTag(id, name),
  archived: true,
  merged_into: { id: canonicalId, name: "Alpha" },
});

describe("TagSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commands.listTags.mockResolvedValue([
      activeTag("a", "Alpha"),
      activeTag("b", "Beta"),
    ]);
    commands.createTag.mockResolvedValue({ id: "c", name: "Gamma", revision: 1 });
    commands.renameTag.mockResolvedValue(undefined);
    commands.archiveTag.mockResolvedValue(undefined);
    commands.restoreTag.mockResolvedValue(undefined);
    commands.mergeTags.mockResolvedValue(undefined);
  });

  it("renders Tags heading", async () => {
    renderSettings();
    await waitFor(() => screen.getByRole("heading", { name: "Tags" }));
  });

  it("renders tag names in table", async () => {
    renderSettings();
    await waitFor(() => screen.getAllByText("Alpha"));
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
  });

  it("exposes all five management areas as named sections", async () => {
    renderSettings();
    await screen.findAllByText("Alpha");
    for (const name of ["Create tag", "Active tags", "Archived tags", "Merged aliases", "Merge tags"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("shows a load alert and Retry explicitly calls listTags again", async () => {
    commands.listTags
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([activeTag("a", "Alpha"), activeTag("b", "Beta")]);
    renderSettings();
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load tags");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findAllByText("Alpha");
    expect(commands.listTags).toHaveBeenCalledTimes(2);
  });

  it("allows an ordinary archived tag to Rename and Restore while merged aliases expose neither", async () => {
    commands.listTags.mockResolvedValue([
      activeTag("a", "Alpha"),
      archivedTag("old", "Old"),
      mergedTag("alias", "Alias"),
    ]);
    renderSettings();
    await screen.findByText("Old");
    const archived = screen.getByRole("region", { name: "Archived tags" });
    expect(within(archived).getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(within(archived).getByRole("button", { name: "Restore" })).toBeInTheDocument();
    const aliases = screen.getByRole("region", { name: "Merged aliases" });
    expect(within(aliases).queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
    expect(within(aliases).queryByRole("button", { name: "Restore" })).not.toBeInTheDocument();
  });

  it("creates a tag on Enter in input", async () => {
    commands.listTags
      .mockResolvedValueOnce([activeTag("a", "Alpha"), activeTag("b", "Beta")])
      .mockResolvedValue([
        activeTag("a", "Alpha"),
        activeTag("b", "Beta"),
        activeTag("c", "Gamma"),
      ]);
    const { client } = renderSettings();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await waitFor(() => screen.getAllByText("Alpha"));
    const input = screen.getByRole("textbox", { name: "New tag name" });
    fireEvent.change(input, { target: { value: "Gamma" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(commands.createTag).toHaveBeenCalledWith({ name: "Gamma" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-saved-view-projection"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["task-saved-view-options"] });
  });

  it("starts rename inline on Rename click", async () => {
    renderSettings();
    await waitFor(() => screen.getAllByRole("button", { name: "Rename" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]!);
    const renameInput = await waitFor(() =>
      screen.getByRole("textbox", { name: /Rename Alpha/ }),
    );
    expect(renameInput).toBeInTheDocument();
  });

  it("submits rename on Enter", async () => {
    commands.listTags.mockResolvedValue([activeTag("a", "Alpha"), activeTag("b", "Beta")]);
    renderSettings();
    await waitFor(() => screen.getAllByRole("button", { name: "Rename" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]!);
    const renameInput = await waitFor(() =>
      screen.getByRole("textbox", { name: /Rename Alpha/ }),
    );
    fireEvent.change(renameInput, { target: { value: "AlphaNew" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });
    await waitFor(() => expect(commands.renameTag).toHaveBeenCalled());
  });

  it("cancels rename on Escape", async () => {
    renderSettings();
    await waitFor(() => screen.getAllByRole("button", { name: "Rename" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Rename" })[0]!);
    const renameInput = await waitFor(() =>
      screen.getByRole("textbox", { name: /Rename Alpha/ }),
    );
    fireEvent.keyDown(renameInput, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: /Rename/ })).toBeNull();
  });

  it("archives a tag", async () => {
    renderSettings();
    await waitFor(() => screen.getAllByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    await waitFor(() => expect(commands.archiveTag).toHaveBeenCalled());
  });

  it("shows two-step merge confirmation without browser confirm", async () => {
    renderSettings();
    await screen.findByRole("combobox", { name: "Source tag to merge from" });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "a" } });
    fireEvent.change(selects[1]!, { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    const confirmRegion = await waitFor(() =>
      screen.getByRole("region", { name: "Confirm merge" }),
    );
    expect(confirmRegion).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm merge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("executes merge on Confirm merge click", async () => {
    commands.listTags.mockResolvedValue([activeTag("a", "Alpha"), activeTag("b", "Beta")]);
    renderSettings();
    await screen.findByRole("combobox", { name: "Source tag to merge from" });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "a" } });
    fireEvent.change(selects[1]!, { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => screen.getByRole("button", { name: "Confirm merge" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm merge" }));
    await waitFor(() => expect(commands.mergeTags).toHaveBeenCalled());
  });

  it("dismisses confirmation on Cancel", async () => {
    renderSettings();
    await screen.findByRole("combobox", { name: "Source tag to merge from" });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "a" } });
    fireEvent.change(selects[1]!, { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Confirm merge" })).toBeNull();
  });

  it("shows merge confirmation text with both tag names", async () => {
    renderSettings();
    await screen.findByRole("combobox", { name: "Source tag to merge from" });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "a" } });
    fireEvent.change(selects[1]!, { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() =>
      screen.getByRole("region", { name: "Confirm merge" }),
    );
    const confirmText = screen.getByRole("region", { name: "Confirm merge" });
    expect(confirmText).toHaveTextContent("Alpha");
    expect(confirmText).toHaveTextContent("Beta");
  });

  it("shows exact source task, series, and Life counts in confirmation", async () => {
    commands.listTags.mockResolvedValue([
      activeTag("a", "Alpha", { task_count: 3, series_count: 2, life_node_count: 4 }),
      activeTag("b", "Beta"),
    ]);
    renderSettings();
    const source = await screen.findByRole("combobox", { name: "Source tag to merge from" });
    fireEvent.change(source, { target: { value: "a" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Target tag to merge into" }), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    expect(await screen.findByRole("region", { name: "Confirm merge" })).toHaveTextContent("3 tasks, 2 series, 4 life nodes");
  });

  it("keeps confirmation and selections after merge failure and Retry calls merge again", async () => {
    commands.mergeTags.mockRejectedValueOnce(new Error("stale merge")).mockResolvedValueOnce(undefined);
    renderSettings();
    const source = await screen.findByRole("combobox", { name: "Source tag to merge from" });
    const target = screen.getByRole("combobox", { name: "Target tag to merge into" });
    fireEvent.change(source, { target: { value: "a" } });
    fireEvent.change(target, { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm merge" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("stale merge");
    expect(screen.getByRole("region", { name: "Confirm merge" })).toBeInTheDocument();
    expect(source).toHaveValue("a");
    expect(target).toHaveValue("b");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(commands.mergeTags).toHaveBeenCalledTimes(2));
  });

  it("refetches after rename failure without losing rename mode or value", async () => {
    commands.renameTag.mockRejectedValueOnce(new Error("stale rename"));
    renderSettings();
    fireEvent.click((await screen.findAllByRole("button", { name: "Rename" }))[0]!);
    const input = screen.getByRole("textbox", { name: "Rename Alpha" });
    fireEvent.change(input, { target: { value: "Alpha revised" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByRole("alert")).toHaveTextContent("stale rename");
    expect(input).toHaveValue("Alpha revised");
    expect(commands.listTags.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("refetches after archive failure and retains the active row action context", async () => {
    commands.archiveTag.mockRejectedValueOnce(new Error("stale archive"));
    renderSettings();
    await screen.findAllByRole("button", { name: "Archive" });
    const active = screen.getByRole("region", { name: "Active tags" });
    fireEvent.click(within(active).getAllByRole("button", { name: "Archive" })[0]!);
    expect(await screen.findByRole("alert")).toHaveTextContent("stale archive");
    expect(within(active).getAllByRole("button", { name: "Archive" }).length).toBeGreaterThan(0);
    expect(commands.listTags.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("refetches after restore failure and keeps the archived section", async () => {
    commands.listTags.mockResolvedValue([activeTag("a", "Alpha"), activeTag("b", "Beta"), archivedTag("old", "Old")]);
    commands.restoreTag.mockRejectedValueOnce(new Error("stale restore"));
    renderSettings();
    await screen.findByRole("button", { name: "Restore" });
    const archived = screen.getByRole("region", { name: "Archived tags" });
    fireEvent.click(within(archived).getByRole("button", { name: "Restore" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("stale restore");
    expect(within(archived).getByText("Old")).toBeInTheDocument();
    expect(commands.listTags.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("focuses the canonical target row and announces merge success once", async () => {
    renderSettings();
    fireEvent.change(await screen.findByRole("combobox", { name: "Source tag to merge from" }), { target: { value: "a" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Target tag to merge into" }), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm merge" }));
    await waitFor(() => expect(screen.getByText("Tags merged successfully.")).toBeInTheDocument());
    const betaRow = screen.getAllByText("Beta")[0]!.closest("tr");
    expect(betaRow).toHaveFocus();
    expect(screen.getAllByText("Tags merged successfully.")).toHaveLength(1);
  });

  it("does not duplicate a mutation in StrictMode", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<StrictMode><QueryClientProvider client={client}><TagSettings /></QueryClientProvider></StrictMode>);
    await screen.findAllByRole("button", { name: "Archive" });
    const active = screen.getByRole("region", { name: "Active tags" });
    fireEvent.click(within(active).getAllByRole("button", { name: "Archive" })[0]!);
    await waitFor(() => expect(commands.archiveTag).toHaveBeenCalledTimes(1));
  });

  it("is axe clean across all management sections", async () => {
    commands.listTags.mockResolvedValue([
      activeTag("a", "Alpha"), activeTag("b", "Beta"), archivedTag("old", "Old"), mergedTag("alias", "Alias"),
    ]);
    const { container } = renderSettings();
    await screen.findAllByText("Alpha");
    expect((await axe.run(container)).violations).toEqual([]);
  });

  it("shows only active tags in merge dropdowns", async () => {
    commands.listTags.mockResolvedValue([
      activeTag("a", "Alpha"),
      activeTag("c", "Gamma"),
      { ...activeTag("b", "Beta"), archived: true },
    ]);
    renderSettings();
    await screen.findByRole("combobox", { name: "Source tag to merge from" });
    const selects = screen.getAllByRole("combobox");
    const sourceOptions = Array.from(selects[0]!.querySelectorAll("option")).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(sourceOptions).toContain("a");
    expect(sourceOptions).toContain("c");
    expect(sourceOptions).not.toContain("b");
  });
});
