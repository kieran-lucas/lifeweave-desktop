import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MilestonesScreen } from "./MilestonesScreen";
import { MilestoneTimeline } from "./MilestoneTimeline";
import * as api from "../../ipc/commands";
import type { MilestoneView } from "../../ipc/generated/MilestoneView";
import { daysBetween, initialRange, TIMELINE_INSET } from "./timeline";

vi.mock("../../ipc/commands", () => ({ listMilestones: vi.fn(), saveMilestone: vi.fn(), mutateMilestone: vi.fn() }));
vi.mock("../calendar/useLocalDateRollover", () => ({ useLocalDateRollover: () => "2026-11-14" }));
const item: MilestoneView = { id: "11111111-1111-4111-8111-111111111111", title: "Thi SPhO", date: "2026-12-17", description: "Ôn tập vật lý", pinned: true, revision: 0, created_at: "2026-11-14T00:00:00Z", updated_at: "2026-11-14T00:00:00Z", deleted_at: null };
let stored: MilestoneView[];
const scrollTo = vi.fn();
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MilestonesScreen /></QueryClientProvider>); }
beforeEach(() => {
  stored = [];
  HTMLElement.prototype.scrollTo = scrollTo;
  scrollTo.mockClear();
  scrollTo.mockImplementation(function(this: HTMLElement, options: ScrollToOptions) { if (options.left !== undefined) this.scrollLeft = options.left; });
  vi.mocked(api.listMilestones).mockImplementation(async () => [...stored]);
  vi.mocked(api.saveMilestone).mockImplementation(async input => {
    const saved = { ...item, ...input, revision: input.expected_revision === null ? 0 : input.expected_revision + 1 };
    stored = [...stored.filter(old => old.id !== saved.id), saved]; return saved;
  });
  vi.mocked(api.mutateMilestone).mockImplementation(async input => {
    const old = stored.find(value => value.id === input.id)!;
    const saved = { ...old, revision: old.revision + 1, pinned: input.action === "pin" ? true : input.action === "unpin" ? false : old.pinned,
      deleted_at: input.action === "delete" ? "2026-11-14T00:00:00Z" : null };
    stored = stored.map(value => value.id === saved.id ? saved : value); return saved;
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Milestones flows", () => {
  it("keeps an empty timeline navigable and creates a Unicode milestone with deterministic dialog focus", async () => {
    mount();
    await waitFor(() => expect(api.listMilestones).toHaveBeenCalled());
    expect(screen.getByRole("region", { name: "Milestone timeline" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Milestone details" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Swipe, scroll/)).not.toBeInTheDocument();
    expect(screen.queryByText("Select a milestone to see its details.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Go to date")).not.toBeInTheDocument();
    const opener = screen.getAllByRole("button", { name: "Pin milestone" })[0]!;
    fireEvent.click(opener);
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Thi SPhO" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-12-17" } });
    fireEvent.click(screen.getByRole("button", { name: "Save milestone" }));
    expect(await screen.findByRole("heading", { name: "Thi SPhO" })).toBeVisible();
    expect(screen.getByText("33 days left")).toBeVisible();
    expect(opener).toHaveFocus();
    expect(api.saveMilestone).toHaveBeenCalledWith(expect.objectContaining({ title: "Thi SPhO", date: "2026-12-17", pinned: true, expected_revision: null }));
  });
  it("selects, edits in-place, unpins, repins, confirms deletion, and restores", async () => {
    stored = [item]; mount();
    const buttons = await screen.findAllByRole("button", { name: "Thi SPhO, 17 December 2026" });
    fireEvent.click(buttons[1]!);
    expect(screen.getByText("Ôn tập vật lý")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Thi SPhO — đã sửa" } });
    fireEvent.click(screen.getByRole("button", { name: "Save milestone" }));
    expect(await screen.findByRole("heading", { name: "Thi SPhO — đã sửa" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Unpin" }));
    expect(await screen.findByRole("button", { name: "Pin to timeline" })).toBeVisible();
    expect(document.querySelectorAll("[data-milestone-label]")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Pin to timeline" }));
    await screen.findByRole("button", { name: "Unpin" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Thi SPhO — đã sửa" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete milestone" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "All milestones" }));
    fireEvent.click(await screen.findByText("Deleted milestones (1)"));
    const restore = await screen.findByRole("button", { name: /Restore/ });
    fireEvent.click(restore);
    await waitFor(() => expect(document.querySelectorAll("[data-milestone-label]")).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Thi SPhO — đã sửa" })).toHaveFocus());
  });
  it("preserves a failed draft, shows the error, and Escape restores focus", async () => {
    vi.mocked(api.saveMilestone).mockRejectedValue({ code: "Storage" }); mount();
    await waitFor(() => expect(api.listMilestones).toHaveBeenCalled());
    const opener = screen.getAllByRole("button", { name: "Pin milestone" })[0]!; fireEvent.click(opener);
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Keep draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save milestone" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save");
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Keep draft");
    fireEvent.keyDown(window, { key: "Escape" }); expect(opener).toHaveFocus();
  });
  it("keeps the page quiet and reaches unpinned moments through the library", async () => {
    stored = [item, { ...item, id: "second", title: "App Paper" }, { ...item, id: "third", title: "Research", pinned: false }]; mount();
    await screen.findByRole("button", { name: "2 milestones on 17 December 2026" });
    fireEvent.click(screen.getByRole("button", { name: "All milestones" }));
    fireEvent.click(await screen.findByRole("button", { name: /Research/ }));
    expect(screen.getByRole("heading", { name: "Research" })).toBeVisible();
    expect(document.querySelectorAll("[data-milestone-label]")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "2 milestones on 17 December 2026" })).toBeVisible();
  });
  it("keeps focus on same-day detail controls when switching milestones", async () => {
    stored = [item, { ...item, id: "second", title: "App Paper" }]; mount();
    fireEvent.click(await screen.findByRole("button", { name: "2 milestones on 17 December 2026" }));
    const sibling = within(screen.getByRole("region", { name: "Milestone details" })).getByRole("button", { name: "App Paper" });
    sibling.focus(); fireEvent.click(sibling);
    expect(screen.getByRole("heading", { name: "App Paper" })).toBeVisible();
    expect(sibling).toHaveFocus();
  });
});
describe("timeline gesture and tracking contracts", () => {
  it("initially focuses Today once, never recenters on rollover or data edits, and honors the Today control", () => {
    const props = { today: "2026-11-14", milestones: [item], selectedId: null, onSelect: vi.fn(), navigation: null };
    const view = render(<MilestoneTimeline {...props} />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    scrollTo.mockClear();
    view.rerender(<MilestoneTimeline {...props} today="2026-11-15" milestones={[{ ...item, title: "Changed" }]} />);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.querySelector("[data-today-indicator]")).toHaveAccessibleName("Today, 15 November 2026");
    fireEvent.click(screen.getByRole("button", { name: "Today" })); expect(scrollTo).toHaveBeenCalledTimes(1);
  });
  it("converts vertical wheel to smooth X movement, constrains diagonal input, and preserves native horizontal input", async () => {
    render(<MilestoneTimeline today="2026-11-14" milestones={[]} selectedId={null} onSelect={vi.fn()} navigation={null} />);
    const node = screen.getByRole("region", { name: "Milestone timeline" });
    Object.defineProperties(node, { scrollWidth: { value: 3000 }, clientWidth: { value: 800 } });
    node.scrollLeft = 200;
    scrollTo.mockClear();
    const normal = new WheelEvent("wheel", { deltaY: 80, bubbles: true, cancelable: true });
    act(() => node.dispatchEvent(normal)); expect(normal.defaultPrevented).toBe(true);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ left: 280, behavior: "smooth" }));
    const horizontal = new WheelEvent("wheel", { deltaX: 80, bubbles: true, cancelable: true });
    act(() => node.dispatchEvent(horizontal)); expect(horizontal.defaultPrevented).toBe(false);
    const shifted = new WheelEvent("wheel", { shiftKey: true, deltaY: 80, bubbles: true, cancelable: true });
    act(() => node.dispatchEvent(shifted)); expect(shifted.defaultPrevented).toBe(true);
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ left: 360, behavior: "smooth" }));
    const diagonal = new WheelEvent("wheel", { deltaX: 12, deltaY: 40, bubbles: true, cancelable: true });
    act(() => node.dispatchEvent(diagonal)); expect(diagonal.defaultPrevented).toBe(true); expect(node.scrollLeft).toBe(372); expect(node.scrollTop).toBe(0);
    node.scrollLeft = 0;
    const edge = new WheelEvent("wheel", { deltaY: -80, bubbles: true, cancelable: true });
    act(() => node.dispatchEvent(edge)); expect(edge.defaultPrevented).toBe(true);
    const zoom = new WheelEvent("wheel", { ctrlKey: true, deltaY: 80, bubbles: true, cancelable: true });
    act(() => node.dispatchEvent(zoom)); expect(zoom.defaultPrevented).toBe(false);
  });
  it("preserves the visible date before prepending months on explicit navigation", () => {
    const props = { today: "2026-11-14", milestones: [], selectedId: null, onSelect: vi.fn(), navigation: null };
    const view = render(<MilestoneTimeline {...props} />);
    const node = screen.getByRole("region", { name: "Milestone timeline" });
    node.scrollLeft = 100;
    const scale = Number(document.querySelector<HTMLElement>("[data-day-width]")!.dataset.dayWidth);
    scrollTo.mockClear();
    view.rerender(<MilestoneTimeline {...props} navigation={{ date: "2025-08-01", sequence: 1 }} />);
    const start = document.querySelector<HTMLElement>("[data-timeline-start]")!.dataset.timelineStart!;
    expect(scrollTo.mock.calls[0]![0].left).toBeCloseTo(100 + daysBetween(start, initialRange(props.today).start) * scale);
    expect(scrollTo.mock.calls[0]![0].behavior).toBe("instant");
    expect(scrollTo.mock.calls[1]![0]).toEqual(expect.objectContaining({ behavior: "smooth" }));
  });
  it("preserves the exact visible day fraction when the viewport is resized", () => {
    let resize = () => {};
    vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
    render(<MilestoneTimeline today="2026-11-14" milestones={[]} selectedId={null} onSelect={vi.fn()} navigation={null} />);
    const node = screen.getByRole("region", { name: "Milestone timeline" });
    const beforeScale = Number(document.querySelector<HTMLElement>("[data-day-width]")!.dataset.dayWidth);
    node.scrollLeft += 123.5;
    const before = (node.scrollLeft - TIMELINE_INSET) / beforeScale;
    Object.defineProperty(node, "clientWidth", { value: 1280 });
    act(() => resize());
    const afterScale = Number(document.querySelector<HTMLElement>("[data-day-width]")!.dataset.dayWidth);
    expect((node.scrollLeft - TIMELINE_INSET) / afterScale).toBeCloseTo(before, 8);
  });
});
