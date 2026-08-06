import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import * as commands from "../../ipc/commands";
import { ReviewsPanel } from "./ReviewsPanel";

vi.mock("../../ipc/commands");

const emptyHistory = {
  review_count: 0,
  latest_reviewed_local_date: null,
  reviews: [],
};

const savedHistory = {
  review_count: 2,
  latest_reviewed_local_date: "2026-08-06",
  reviews: [
    {
      id: "review-2",
      reviewed_local_date: "2026-08-06",
      reflection: "Momentum held.",
      next_focus: "Start module three",
      created_at: "2026-08-06T10:00:00.000Z",
    },
    {
      id: "review-1",
      reviewed_local_date: "2026-08-01",
      reflection: "Slow start.",
      next_focus: null,
      created_at: "2026-08-01T10:00:00.000Z",
    },
  ],
};

const renderPanel = () =>
  render(<ReviewsPanel planId="plan-1" anchorLocalDate="2026-08-06" />);

describe("ReviewsPanel", () => {
  it("creates a review, shows newest-first history, and reports factual metadata", async () => {
    vi.mocked(commands.listFocusPlanReviews)
      .mockResolvedValueOnce(emptyHistory)
      .mockResolvedValue(savedHistory);
    vi.mocked(commands.createFocusPlanReview).mockResolvedValue(
      savedHistory.reviews[0]!,
    );

    const { container } = renderPanel();
    expect(await screen.findByText("No reviews recorded yet.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reflection"), {
      target: { value: "Momentum held." },
    });
    fireEvent.change(screen.getByLabelText("Next focus (optional)"), {
      target: { value: "Start module three" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    await waitFor(() =>
      expect(commands.createFocusPlanReview).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: "plan-1",
          reviewed_local_date: "2026-08-06",
          reflection: "Momentum held.",
          next_focus: "Start module three",
        }),
      ),
    );

    const history = await screen.findByRole("list", { name: "Review history" });
    const entries = within(history).getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("2026-08-06");
    expect(entries[1]).toHaveTextContent("2026-08-01");
    expect(screen.getByText(/2 reviews/)).toBeInTheDocument();
    expect(screen.getByText(/latest/)).toBeInTheDocument();

    // The draft is cleared only after a committed review.
    expect(screen.getByLabelText("Reflection")).toHaveValue("");
    expect(screen.getByLabelText("Reflection")).toHaveFocus();

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("retains the draft and announces the failure when a review is rejected", async () => {
    vi.mocked(commands.listFocusPlanReviews).mockResolvedValue(emptyHistory);
    vi.mocked(commands.createFocusPlanReview).mockRejectedValue({
      message: "Write a reflection before saving the review",
    });

    renderPanel();
    await screen.findByText("No reviews recorded yet.");
    fireEvent.change(screen.getByLabelText("Reflection"), {
      target: { value: "   typed but rejected" },
    });
    fireEvent.change(screen.getByLabelText("Review date"), {
      target: { value: "2026-08-02" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Write a reflection before saving the review");
    expect(screen.getByLabelText("Reflection")).toHaveValue("   typed but rejected");
    expect(screen.getByLabelText("Review date")).toHaveValue("2026-08-02");
  });

  it("blocks a duplicate submission while one is pending", async () => {
    vi.mocked(commands.listFocusPlanReviews).mockResolvedValue(emptyHistory);
    const release: { current: (() => void) | null } = { current: null };
    vi.mocked(commands.createFocusPlanReview).mockImplementation(
      () =>
        new Promise((resolve) => {
          release.current = () => resolve(savedHistory.reviews[0]!);
        }),
    );

    renderPanel();
    await screen.findByText("No reviews recorded yet.");
    fireEvent.change(screen.getByLabelText("Reflection"), {
      target: { value: "Momentum held." },
    });
    const submit = screen.getByRole("button", { name: "Save review" });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Saving review…" })).toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Saving review…" }));
    expect(commands.createFocusPlanReview).toHaveBeenCalledTimes(1);
    release.current?.();
  });

  it("keeps every review field keyboard reachable", async () => {
    vi.mocked(commands.listFocusPlanReviews).mockResolvedValue(savedHistory);
    renderPanel();
    await screen.findByRole("list", { name: "Review history" });
    for (const label of ["Review date", "Reflection", "Next focus (optional)"]) {
      const field = screen.getByLabelText(label);
      field.focus();
      expect(field).toHaveFocus();
    }
    expect(screen.getByRole("heading", { name: "Reviews" })).toBeInTheDocument();
  });
});
