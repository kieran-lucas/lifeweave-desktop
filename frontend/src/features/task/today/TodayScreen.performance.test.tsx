import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AssessmentControl } from "../../completion/AssessmentControl";
import { TodayScreen } from "./TodayScreen";

vi.mock("../../completion/AssessmentControl", () => ({ AssessmentControl: vi.fn(() => null) }));
vi.mock("../LifeAreaCombobox", () => ({ LifeAreaCombobox: () => null }));
vi.mock("../FocusPlanCombobox", () => ({ FocusPlanCombobox: () => null }));
vi.mock("../../tag/TagPicker", () => ({ TagPicker: () => null }));
vi.mock("../../../ipc/commands", () => ({
  listTodayItems: async () => Array.from({ length: 200 }, (_, index) => ({
    kind: "one_off", id: `task-${index}`, title: `Task ${index}`, description: "",
    local_date: "2026-09-13", start_minute: 480, end_minute: 540,
    category_id: "general", category_name: "General", category_icon_key: "general",
    category_color_key: "neutral", priority: "medium", is_override: false,
    series_id: null, occurrence_id: null, original_local_date: null,
    evaluation: null, life_area: null, focus_plan: null, deadline: null, actual_time: null, tags: [],
  })),
  listTaskCategories: async () => [],
  listCompletionStates: async () => [],
  getActiveTaskActualTime: async () => null,
  createTask: vi.fn(), createRecurringTask: vi.fn(), deleteTask: vi.fn(),
  updateTask: vi.fn(), updateRecurringOccurrence: vi.fn(), evaluateTask: vi.fn(),
  undoTaskEvaluation: vi.fn(), discardTaskActualTime: vi.fn(), stopTaskActualTime: vi.fn(),
}));

it("typing a composer draft does not rerender the 200-row Today projection", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TodayScreen selectedDate="2026-09-13" anchorLocalDate="2026-09-14" /></QueryClientProvider>);
  await screen.findByText("Task 199");
  fireEvent.click(screen.getByRole("button", { name: "Plan task" }));
  const title = await screen.findByLabelText("Title", { exact: true }, { timeout: 10_000 });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {});
  vi.mocked(AssessmentControl).mockClear();
  const started = performance.now();
  for (let length = 1; length <= 20; length++) {
    fireEvent.change(title, { target: { value: "Typing a task title!".slice(0, length) } });
  }
  const rowRenders = vi.mocked(AssessmentControl).mock.calls.length;
  console.info(JSON.stringify({ fixture: "200 rows / 20 input events", rowRenders, jsdomInputMs: performance.now() - started }));
  expect(title).toHaveValue("Typing a task title!");
  expect(rowRenders).toBe(0);
});
