import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
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
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<p>Loading…</p>}>
        <TagSettings />
      </Suspense>
    </QueryClientProvider>,
  );
}

describe("TagSettings", () => {
  beforeEach(() => {
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

  it("creates a tag on Enter in input", async () => {
    commands.listTags
      .mockResolvedValueOnce([activeTag("a", "Alpha"), activeTag("b", "Beta")])
      .mockResolvedValue([
        activeTag("a", "Alpha"),
        activeTag("b", "Beta"),
        activeTag("c", "Gamma"),
      ]);
    renderSettings();
    await waitFor(() => screen.getAllByText("Alpha"));
    const input = screen.getByRole("textbox", { name: "New tag name" });
    fireEvent.change(input, { target: { value: "Gamma" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(commands.createTag).toHaveBeenCalledWith({ name: "Gamma" }));
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
    await waitFor(() => screen.getByText("Merge tags"));
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
    await waitFor(() => screen.getByText("Merge tags"));
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
    await waitFor(() => screen.getByText("Merge tags"));
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
    await waitFor(() => screen.getByText("Merge tags"));
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

  it("shows only active tags in merge dropdowns", async () => {
    commands.listTags.mockResolvedValue([
      activeTag("a", "Alpha"),
      activeTag("c", "Gamma"),
      { ...activeTag("b", "Beta"), archived: true },
    ]);
    renderSettings();
    await waitFor(() => screen.getByRole("heading", { name: "Merge tags" }));
    const selects = screen.getAllByRole("combobox");
    const sourceOptions = Array.from(selects[0]!.querySelectorAll("option")).map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(sourceOptions).toContain("a");
    expect(sourceOptions).toContain("c");
    expect(sourceOptions).not.toContain("b");
  });
});
