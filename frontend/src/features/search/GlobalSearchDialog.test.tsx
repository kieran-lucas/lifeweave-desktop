import { createRef } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalSearchDialog from "./GlobalSearchDialog";

const mockProjection = {
  groups: [
    {
      kind: "tasks" as const,
      total_count: 2,
      results: [
        {
          entity_id: "t1",
          entity_kind: "task_one_off" as const,
          title: "Plan meeting",
          title_fragments: [],
          context_text: "General · 2026-08-03",
          snippet_fragments: [],
          navigation_target: { kind: "today" as const, local_date: "2026-08-03", task_id: "t1", series_id: null, original_local_date: null },
          rank: -1.2,
        },
        {
          entity_id: "t2",
          entity_kind: "task_one_off" as const,
          title: "Plan review",
          title_fragments: [],
          context_text: "General · 2026-08-04",
          snippet_fragments: [],
          navigation_target: { kind: "today" as const, local_date: "2026-08-04", task_id: "t2", series_id: null, original_local_date: null },
          rank: -1.0,
        },
      ],
    },
    {
      kind: "life" as const,
      total_count: 1,
      results: [
        {
          entity_id: "n1",
          entity_kind: "life_node" as const,
          title: "Work",
          title_fragments: [],
          context_text: "Life › Work",
          snippet_fragments: [],
          navigation_target: { kind: "life_browse" as const, node_id: "n1" },
          rank: -0.8,
        },
      ],
    },
  ],
  total_visible_results: 3,
};

const emptyProjection = { groups: [], total_visible_results: 0 };

const commands = vi.hoisted(() => ({
  searchGlobal: vi.fn(),
}));
vi.mock("../../ipc/commands", () => commands);

vi.mock("../calendar/date", () => ({
  localToday: () => "2026-08-03",
}));

function makeInvoker() {
  return createRef<HTMLButtonElement>();
}

function renderDialog({
  onClose = vi.fn(),
  onNavigate = vi.fn(),
  invokerRef = makeInvoker(),
} = {}) {
  return render(
    <GlobalSearchDialog onClose={onClose} onNavigate={onNavigate} invokerRef={invokerRef} />,
  );
}

// Flush pending Promises and React state updates that follow an async timer callback.
async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("GlobalSearchDialog", () => {
  beforeEach(() => {
    // Only fake setTimeout/clearTimeout to avoid breaking React 18 act() internals
    // (queueMicrotask and other scheduler primitives must remain real).
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    commands.searchGlobal.mockResolvedValue(mockProjection);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders the search input and focuses it on mount", () => {
    renderDialog();
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it("shows no results before 2 characters are typed", () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p" } });
    expect(commands.searchGlobal).not.toHaveBeenCalled();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("debounces and calls searchGlobal after 150ms", async () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    expect(commands.searchGlobal).not.toHaveBeenCalled();
    // Fire the debounce timer; searchGlobal is called synchronously in the async callback body
    // before its first internal await.
    act(() => { vi.advanceTimersByTime(150); });
    expect(commands.searchGlobal).toHaveBeenCalledTimes(1);
    expect(commands.searchGlobal).toHaveBeenCalledWith({
      query: "plan",
      observed_local_date: "2026-08-03",
    });
  });

  it("renders task and life group results after query resolves", async () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getByText("Plan meeting")).toBeInTheDocument();
    expect(screen.getByText("Plan review")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("shows result count in live region", async () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getByText(/3 results/)).toBeInTheDocument();
  });

  it("shows empty state when no results returned", async () => {
    commands.searchGlobal.mockResolvedValue(emptyProjection);
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zz" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("shows error state when search fails", async () => {
    commands.searchGlobal.mockRejectedValue(new Error("Search unavailable"));
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getByText("Search failed.")).toBeInTheDocument();
  });

  it("ArrowDown moves active option down", async () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getAllByRole("option").length).toBe(3);

    const input = screen.getByRole("combobox");
    // First result should be active by default (index 0).
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowUp does not go below index 0", async () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getAllByRole("option").length).toBe(3);

    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter navigates to the active option", async () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    render(
      <GlobalSearchDialog
        onClose={onClose}
        onNavigate={onNavigate}
        invokerRef={makeInvoker()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getAllByRole("option").length).toBe(3);

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "today", task_id: "t1" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking an option navigates and closes", async () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    render(
      <GlobalSearchDialog
        onClose={onClose}
        onNavigate={onNavigate}
        invokerRef={makeInvoker()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getAllByRole("option").length).toBe(3);

    fireEvent.click(screen.getByText("Work"));
    expect(onNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "life_browse", node_id: "n1" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape calls onClose", async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking the backdrop calls onClose", () => {
    const onClose = vi.fn();
    const { container } = renderDialog({ onClose });
    fireEvent.click(container.firstChild!);
    expect(onClose).toHaveBeenCalled();
  });

  it("Close button calls onClose", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("ignores stale responses when query changes during debounce", async () => {
    renderDialog();
    const input = screen.getByRole("combobox");

    commands.searchGlobal.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(emptyProjection), 500)),
    );

    fireEvent.change(input, { target: { value: "pl" } });
    // Fire first debounce — starts slow searchGlobal (seq=1) but does not await it.
    act(() => { vi.advanceTimersByTime(150); });

    // Change query before first response arrives.
    fireEvent.change(input, { target: { value: "plan" } });
    commands.searchGlobal.mockResolvedValue(mockProjection);
    // Fire second debounce (seq=2) and flush its fast response.
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();

    // Advance time so the slow first response arrives too (but seq check discards it).
    act(() => { vi.advanceTimersByTime(500); });
    await flushAsync();

    expect(screen.getAllByRole("option").length).toBe(3);
    // The stale empty result should not have replaced the fresh result.
    expect(screen.queryByText("No results.")).not.toBeInTheDocument();
  });

  it("uses combobox role on input and listbox on results container", async () => {
    renderDialog();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("aria-activedescendant points to the active option id", async () => {
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getAllByRole("option").length).toBe(3);

    const input = screen.getByRole("combobox");
    const firstOption = screen.getAllByRole("option")[0]!;
    expect(input).toHaveAttribute("aria-activedescendant", firstOption.id);
  });

  it("shows more-results note when total exceeds visible", async () => {
    commands.searchGlobal.mockResolvedValue({
      ...mockProjection,
      groups: [
        {
          kind: "tasks" as const,
          total_count: 10,
          results: mockProjection.groups[0]!.results,
        },
      ],
      total_visible_results: 2,
    });
    renderDialog();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "plan" } });
    act(() => { vi.advanceTimersByTime(150); });
    await flushAsync();
    expect(screen.getByText(/more task results/)).toBeInTheDocument();
  });
});
