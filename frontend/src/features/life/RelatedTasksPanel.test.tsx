import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RelatedTasksPanel } from "./RelatedTasksPanel";

const api = vi.hoisted(() => ({ related: vi.fn() }));
vi.mock("../../ipc/commands", () => ({
  getRelatedTasksForLifeNode: api.related,
}));

const rows = [
  {
    id: "task-1",
    kind: "one_off" as const,
    title: "One off",
    group: "completed",
    navigation_local_date: "2026-08-02",
    series_id: null,
  },
  {
    id: "series-1",
    kind: "recurring" as const,
    title: "Recurring",
    group: "active",
    navigation_local_date: "2026-08-06",
    series_id: "series-1",
  },
];

function mount(anchorLocalDate = "2026-08-04", onNavigate = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const rendered = render(
    <QueryClientProvider client={client}>
      <RelatedTasksPanel
        nodeId="node-1"
        anchorLocalDate={anchorLocalDate}
        onNavigate={onNavigate}
      />
    </QueryClientProvider>,
  );
  return { ...rendered, client, onNavigate };
}

describe("RelatedTasksPanel", () => {
  beforeEach(() => api.related.mockReset());

  it("queries by node and anchor and refetches when the anchor key changes", async () => {
    api.related.mockResolvedValue([]);
    const view = mount();
    await waitFor(() =>
      expect(api.related).toHaveBeenCalledWith("node-1", "2026-08-04"),
    );
    view.rerender(
      <QueryClientProvider client={view.client}>
        <RelatedTasksPanel
          nodeId="node-1"
          anchorLocalDate="2026-08-05"
          onNavigate={view.onNavigate}
        />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(api.related).toHaveBeenCalledWith("node-1", "2026-08-05"),
    );
    expect(api.related).toHaveBeenCalledTimes(2);
  });

  it("shows accessible loading, error, and no-active-series states", async () => {
    let reject!: (reason: Error) => void;
    api.related.mockReturnValue(new Promise((_, fail) => (reject = fail)));
    const view = mount();
    expect(screen.getByText("Loading related tasks…")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    reject(new Error("offline"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Related tasks could not be loaded.",
    );
    view.unmount();

    api.related.mockResolvedValue([]);
    mount();
    expect(await screen.findByText("No active related tasks.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active (0)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed (0)" })).toBeInTheDocument();
  });

  it("renders group counts and navigates exact one-off and recurring identities", async () => {
    api.related.mockResolvedValue(rows);
    const navigate = vi.fn();
    mount("2026-08-04", navigate);
    expect(await screen.findByRole("heading", { name: "Active (1)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed (1)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "One off" }));
    fireEvent.click(screen.getByRole("button", { name: "Recurring" }));
    expect(navigate).toHaveBeenNthCalledWith(1, "2026-08-02", "task-1", null);
    expect(navigate).toHaveBeenNthCalledWith(2, "2026-08-06", null, "series-1");
  });

  it("uses native keyboard-focusable buttons and has no automated axe violations", async () => {
    api.related.mockResolvedValue(rows);
    const { container, onNavigate } = mount();
    const recurring = await screen.findByRole("button", { name: "Recurring" });
    recurring.focus();
    expect(recurring).toHaveFocus();
    expect(recurring.tagName).toBe("BUTTON");
    recurring.click();
    expect(onNavigate).toHaveBeenCalledWith("2026-08-06", null, "series-1");
    const accessibility = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it("renders nothing for the root and does not query it", () => {
    api.related.mockResolvedValue([]);
    const client = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <RelatedTasksPanel nodeId="life-root" anchorLocalDate="2026-08-04" />
      </QueryClientProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(api.related).not.toHaveBeenCalled();
  });
});
