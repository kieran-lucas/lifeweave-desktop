import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { expect, it, vi } from "vitest";
import { LifeAreaCombobox } from "./LifeAreaCombobox";

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../../ipc/commands", () => ({ listTaskLifeTargets: api.list }));
const mount = (
  onChange = vi.fn(),
  current?: {
    id: string;
    title: string;
    breadcrumb: string;
    archived: boolean;
  },
  onKeyDown = vi.fn(),
) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <main onKeyDown={onKeyDown}>
        <LifeAreaCombobox
          value={current?.id ?? null}
          {...(current ? { current } : {})}
          onChange={onChange}
        />
      </main>
    </QueryClientProvider>,
  );

it("filters diacritics, selects by keyboard, clears, and has no axe violations", async () => {
  api.list.mockResolvedValue([
    { id: "study", title: "Nghiên cứu", breadcrumb: "Career › Nghiên cứu" },
  ]);
  const change = vi.fn();
  mount(change);
  const input = await screen.findByRole("combobox", { name: "Life area" });
  fireEvent.change(input, { target: { value: "nghien" } });
  await screen.findByRole("option", { name: /Nghiên cứu/ });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(change).toHaveBeenCalledWith("study");
  expect(input).toHaveValue("Career › Nghiên cứu");
  const results = await axe.run(document.body, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("shows and clears an archived current relationship", async () => {
  api.list.mockResolvedValue([]);
  const change = vi.fn();
  mount(change, {
    id: "old",
    title: "Old area",
    breadcrumb: "Old area",
    archived: true,
  });
  expect(
    await screen.findByText("Archived life area: Old area"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Clear Life area" }));
  expect(change).toHaveBeenCalledWith(null);
});

it("closes the popup when focus leaves the field", async () => {
  api.list.mockResolvedValue([
    { id: "study", title: "Study", breadcrumb: "Life › Study" },
  ]);
  mount();
  const input = await screen.findByRole("combobox", { name: "Life area" });
  fireEvent.focus(input);
  expect(await screen.findByRole("listbox")).toBeInTheDocument();
  fireEvent.blur(input);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

it("keeps Escape inside an open popup before the parent dialog sees it", async () => {
  api.list.mockResolvedValue([
    { id: "study", title: "Study", breadcrumb: "Life › Study" },
  ]);
  const bubbled = vi.fn();
  mount(vi.fn(), undefined, bubbled);
  const input = await screen.findByRole("combobox", { name: "Life area" });
  fireEvent.focus(input);
  expect(await screen.findByRole("listbox")).toBeInTheDocument();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(bubbled).not.toHaveBeenCalled();
});
