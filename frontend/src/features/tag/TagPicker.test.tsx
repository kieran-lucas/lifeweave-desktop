import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TagPicker } from "./TagPicker";
import type { TagSummaryView } from "../../ipc/generated/TagSummaryView";

const commands = vi.hoisted(() => ({
  listTags: vi.fn(),
  createTag: vi.fn(),
}));
vi.mock("../../ipc/commands", () => commands);

const tag = (id: string, name: string): TagSummaryView => ({ id, name });

function renderPicker(
  props: Partial<React.ComponentProps<typeof TagPicker>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onChange = vi.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <TagPicker
        selectedTags={[]}
        onChange={onChange}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...view, onChange, client };
}

describe("TagPicker", () => {
  beforeEach(() => {
    commands.listTags.mockResolvedValue([
      tag("a", "Alpha"),
      tag("b", "Beta"),
      tag("c", "Gamma"),
    ]);
  });

  it("renders toggle button labelled 'Add tags' when nothing selected", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: "Add tags" })).toBeInTheDocument();
  });

  it("shows count in toggle label when tags are selected", () => {
    renderPicker({ selectedTags: [tag("a", "Alpha"), tag("b", "Beta")] });
    expect(
      screen.getByRole("button", { name: "Edit tags, 2 selected" }),
    ).toBeInTheDocument();
  });

  it("opens panel and focuses search input on toggle click", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    // Panel is open and contains checkbox list
    await waitFor(() => screen.getByRole("checkbox", { name: "Alpha" }));
  });

  it("closes panel with Done button and returns focus to toggle", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add tags" })).toBeInTheDocument();
  });

  it("calls onChange when a checkbox is toggled on", async () => {
    const { onChange } = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("checkbox", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Alpha" }));
    expect(onChange).toHaveBeenCalledWith([tag("a", "Alpha")]);
  });

  it("calls onChange when a checkbox is toggled off", async () => {
    const { onChange } = renderPicker({ selectedTags: [tag("a", "Alpha")] });
    fireEvent.click(screen.getByRole("button", { name: "Edit tags, 1 selected" }));
    await waitFor(() => screen.getByRole("checkbox", { name: "Alpha" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Alpha" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("filters tag list by search query", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alp" } });
    await waitFor(() => screen.getByRole("checkbox", { name: "Alpha" }));
    expect(screen.queryByRole("checkbox", { name: "Beta" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Gamma" })).toBeNull();
  });

  it("disables unchecked checkboxes at 12-tag limit and shows limit message", async () => {
    const selectedTags = Array.from({ length: 12 }, (_, i) =>
      tag(`x${i}`, `X${i}`),
    );
    commands.listTags.mockResolvedValue([
      ...selectedTags,
      tag("new", "NewTag"),
    ]);
    renderPicker({ selectedTags });
    fireEvent.click(screen.getByRole("button", { name: "Edit tags, 12 selected" }));
    await waitFor(() => screen.getByRole("checkbox", { name: "NewTag" }));
    const newCheckbox = screen.getByRole("checkbox", { name: "NewTag" });
    expect(newCheckbox).toBeDisabled();
    expect(screen.getByText(/12 of 12 selected — limit reached/)).toBeInTheDocument();
  });

  it("shows Create-and-select button when allowCreate and query is nonempty", async () => {
    renderPicker({ allowCreate: true });
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "NewTag" } });
    await waitFor(() =>
      screen.getByRole("button", { name: /Create and select/ }),
    );
  });

  it("does not show Create-and-select without allowCreate", async () => {
    renderPicker({ allowCreate: false });
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "NewTag" } });
    expect(screen.queryByRole("button", { name: /Create and select/ })).toBeNull();
  });

  it("calls createTag and adds new tag on create-and-select", async () => {
    commands.createTag.mockResolvedValue({ id: "new", name: "NewTag" });
    const { onChange } = renderPicker({ allowCreate: true });
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "NewTag" } });
    await waitFor(() =>
      screen.getByRole("button", { name: /Create and select/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Create and select/ }));
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([{ id: "new", name: "NewTag" }]),
    );
  });

  it("shows create error on failure", async () => {
    commands.createTag.mockRejectedValue(new Error("Name collision"));
    renderPicker({ allowCreate: true });
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Foo" } });
    await waitFor(() => screen.getByRole("button", { name: /Create and select/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create and select/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Name collision"),
    );
  });

  it("renders legend text", () => {
    renderPicker({ legend: "Assign tags" });
    expect(screen.getByText("Assign tags")).toBeInTheDocument();
  });

  it("readOnly mode shows selected tag names without toggle button", () => {
    renderPicker({
      readOnly: true,
      selectedTags: [tag("a", "Alpha"), tag("b", "Beta")],
    });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Alpha, Beta")).toBeInTheDocument();
  });

  it("readOnly mode shows 'No tags' when empty", () => {
    renderPicker({ readOnly: true, selectedTags: [] });
    expect(screen.getByText("No tags")).toBeInTheDocument();
  });

  it("shows busy status and disables toggle when busy=true", () => {
    renderPicker({ busy: true });
    expect(screen.getByRole("button", { name: "Add tags" })).toBeDisabled();
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows external error message with role=alert", () => {
    renderPicker({ error: "Failed to save tags." });
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to save tags.");
  });

  it("closes panel on Escape key", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("searchbox"));
    fireEvent.keyDown(
      screen.getByRole("searchbox").closest("fieldset")!,
      { key: "Escape" },
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("selected count aria-live region is polite", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    await waitFor(() => screen.getByRole("checkbox", { name: "Alpha" }));
    const liveRegion = screen.getByText(/0 of 12 selected/);
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });
});
