import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NarrativeTemplateChooser } from "./NarrativeTemplateChooser";

const api = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../../../ipc/commands", () => ({ createNarrativeDocument: api.create }));
vi.mock("./NarrativeCanvasReader", () => ({ narrativeKey: (nodeId: string) => ["life", "narrative", nodeId] }));

function mount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><NarrativeTemplateChooser nodeId="leaf-1" /></QueryClientProvider>);
}

describe("NarrativeTemplateChooser", () => {
  beforeEach(() => api.create.mockReset());

  it("requires explicit confirmation and exposes the exact native radio choices", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Create Narrative Canvas" }));
    expect(api.create).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Choose a Canvas template" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Knowledge Dossier/ })).toBeChecked();
    expect(screen.getByText(/Overview.*Evidence.*Timeline/)).toBeInTheDocument();
    expect(screen.getByText(/Vision.*Plan.*Milestones.*Review/)).toBeInTheDocument();
  });

  it("cancels without creating and restores focus to the trigger", async () => {
    mount();
    const trigger = screen.getByRole("button", { name: "Create Narrative Canvas" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Create Narrative Canvas" })).toHaveFocus());
    expect(api.create).not.toHaveBeenCalled();
  });

  it("submits the selected template once with a stable retry operation id", async () => {
    api.create.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ id: "canvas" });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Create Narrative Canvas" }));
    fireEvent.click(screen.getByRole("radio", { name: /Project Blueprint/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create Canvas" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Canvas" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
    const first = api.create.mock.calls[0]![0]!;
    const second = api.create.mock.calls[1]![0]!;
    expect(first.template_id).toBe("project_blueprint");
    expect(second.template_id).toBe("project_blueprint");
    expect(second.operation_id).toBe(first.operation_id);
  });
});
