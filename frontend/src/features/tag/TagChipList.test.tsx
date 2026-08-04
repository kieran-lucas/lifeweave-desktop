import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagChipList } from "./TagChipList";

const tag = (id: string, name: string) => ({ id, name });

describe("TagChipList", () => {
  it("renders nothing when tags is undefined", () => {
    const { container } = render(<TagChipList />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when tags is empty", () => {
    const { container } = render(<TagChipList tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders each tag with # prefix", () => {
    render(<TagChipList tags={[tag("a", "Alpha"), tag("b", "Beta")]} />);
    expect(screen.getByText("#Alpha")).toBeInTheDocument();
    expect(screen.getByText("#Beta")).toBeInTheDocument();
  });

  it("renders up to 4 tags by default without overflow", () => {
    const tags = ["A", "B", "C", "D"].map((n) => tag(n, n));
    render(<TagChipList tags={tags} />);
    expect(screen.queryByText(/\+/)).toBeNull();
    expect(screen.getByText("#A")).toBeInTheDocument();
    expect(screen.getByText("#D")).toBeInTheDocument();
  });

  it("shows overflow span when tags exceed maxVisible default of 4", () => {
    const tags = ["A", "B", "C", "D", "E"].map((n) => tag(n, n));
    render(<TagChipList tags={tags} />);
    const overflow = screen.getByText("+1");
    expect(overflow).toBeInTheDocument();
    expect(overflow).toHaveAttribute("aria-label", "1 more tags: E");
  });

  it("respects a custom maxVisible", () => {
    const tags = ["A", "B", "C"].map((n) => tag(n, n));
    render(<TagChipList tags={tags} maxVisible={2} />);
    expect(screen.getByText("#A")).toBeInTheDocument();
    expect(screen.getByText("#B")).toBeInTheDocument();
    expect(screen.queryByText("#C")).toBeNull();
    expect(screen.getByText("+1")).toHaveAttribute("aria-label", "1 more tags: C");
  });

  it("overflow aria-label lists all hidden names", () => {
    const tags = ["A", "B", "C", "D", "E", "F"].map((n) => tag(n, n));
    render(<TagChipList tags={tags} maxVisible={4} />);
    const overflow = screen.getByText("+2");
    expect(overflow).toHaveAttribute("aria-label", "2 more tags: E, F");
  });

  it("has accessible list label", () => {
    render(<TagChipList tags={[tag("x", "X")]} />);
    expect(screen.getByRole("list", { name: "Tags" })).toBeInTheDocument();
  });

  it("maxVisible=12 shows all 12 without overflow", () => {
    const tags = Array.from({ length: 12 }, (_, i) => tag(`t${i}`, `T${i}`));
    render(<TagChipList tags={tags} maxVisible={12} />);
    expect(screen.queryByText(/\+/)).toBeNull();
    expect(screen.getAllByRole("listitem").length).toBe(12);
  });

  it("maxVisible=12 shows overflow for 13 tags", () => {
    const tags = Array.from({ length: 13 }, (_, i) => tag(`t${i}`, `T${i}`));
    render(<TagChipList tags={tags} maxVisible={12} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
