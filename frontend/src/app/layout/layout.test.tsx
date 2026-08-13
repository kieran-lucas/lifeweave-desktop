import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DialogBackdrop, DialogBody, DialogFooter, DialogHeader, DialogSurface } from "./DialogSurface";
import { PageFrame, PageHeader, SectionStack } from "./PageFrame";
import * as styles from "./layout.css";

/**
 * DOM contracts for the layout primitives (ADR 0044).
 *
 * jsdom reports every rectangle as zero, so nothing here claims that anything is centred,
 * contained, or non-overlapping. Those are measured in
 * `e2e-tests/specs/phase21-global-layout.e2e.ts` against the real WebView box model.
 *
 * The source-level invariants — no page-local width, no `100vw`, no concealed overflow — are a
 * repository governance check (`scripts/check_layout_authority.py`), because they are structural
 * rules about the tree rather than behaviour of a component.
 */

describe("PageFrame", () => {
  it("declares its type and carries the geometry hook native phase 21 measures", () => {
    render(
      <PageFrame type="wide" as="section" aria-label="Wide surface">
        content
      </PageFrame>,
    );
    const frame = screen.getByLabelText("Wide surface");
    expect(frame.tagName).toBe("SECTION");
    expect(frame).toHaveAttribute("data-page-frame");
    expect(frame).toHaveAttribute("data-page-type", "wide");
    expect(frame.className).toContain(styles.pageFrame.wide);
  });

  it("defaults to the standard frame and gives each type a distinct class", () => {
    render(<PageFrame aria-label="Default surface">content</PageFrame>);
    expect(screen.getByLabelText("Default surface")).toHaveAttribute(
      "data-page-type",
      "standard",
    );
    const classes = new Set([
      styles.pageFrame.standard,
      styles.pageFrame.wide,
      styles.pageFrame.focused,
      styles.pageFrame.reading,
    ]);
    // Four declared types keep distinct semantic/test hooks even when the two desktop workspace
    // variants are both fluid. The reading variant remains independently width-constrained.
    expect(classes.size).toBe(4);
  });

  it("marks an edge-to-edge frame without creating another page type", () => {
    render(<PageFrame type="wide" flush aria-label="Flush workspace">content</PageFrame>);
    const frame = screen.getByLabelText("Flush workspace");
    expect(frame).toHaveAttribute("data-page-type", "wide");
    expect(frame).toHaveAttribute("data-page-flush");
  });

  it("puts page identity and page actions on one header axis", () => {
    render(
      <PageHeader actions={<button type="button">Act</button>}>
        <h1>Title</h1>
      </PageHeader>,
    );
    const header = screen.getByRole("banner");
    expect(within(header).getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Act" })).toBeInTheDocument();
  });

  it("omits the action region entirely when a page has no actions", () => {
    render(
      <PageHeader>
        <h1>Quiet</h1>
      </PageHeader>,
    );
    expect(screen.getByRole("banner").querySelectorAll("div")).toHaveLength(1);
  });

  it("renders a section stack around its children", () => {
    render(
      <SectionStack as="section">
        <p>one</p>
        <p>two</p>
      </SectionStack>,
    );
    expect(screen.getByText("one").parentElement?.className).toContain(styles.sectionStack);
  });
});

describe("DialogSurface", () => {
  it("builds backdrop → surface → header / body / footer and keeps the modal contract", () => {
    render(
      <DialogBackdrop>
        <DialogSurface as="section" role="dialog" aria-modal="true" aria-label="Example">
          <DialogHeader>
            <h2>Heading</h2>
          </DialogHeader>
          <DialogBody>
            <input aria-label="Field" />
          </DialogBody>
          <DialogFooter>
            <button type="button">Cancel</button>
          </DialogFooter>
        </DialogSurface>
      </DialogBackdrop>,
    );
    const surface = screen.getByRole("dialog");
    // ADR 0039's modal detection depends on this exact pairing. The backdrop itself may portal to
    // the document body to escape animated/container-query ancestors, but the surface stays its
    // direct child and retains the same modal semantics.
    expect(surface).toHaveAttribute("aria-modal", "true");
    expect(surface).toHaveAttribute("data-dialog-surface");
    expect(surface).toHaveAttribute("data-dialog-width", "standard");
    expect(surface.parentElement?.className).toContain(styles.dialogBackdrop);
    expect(within(surface).getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(within(surface).getByLabelText("Field")).toBeInTheDocument();
    expect(within(surface).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("gives each width variant a distinct class", () => {
    const classes = new Set([
      styles.dialogSurface.compact,
      styles.dialogSurface.standard,
      styles.dialogSurface.wide,
    ]);
    expect(classes.size).toBe(3);
  });

  it("forwards a ref so a dialog can keep its own focus management", () => {
    let captured: HTMLElement | null = null;
    render(
      <DialogSurface
        as="section"
        role="dialog"
        aria-modal="true"
        aria-label="Ref"
        surfaceRef={(node: HTMLElement | null) => {
          captured = node;
        }}
      >
        body
      </DialogSurface>,
    );
    expect(captured).not.toBeNull();
    expect(screen.getByRole("dialog")).toBe(captured);
  });
});

describe("form geometry", () => {
  it("gives full, half and third field spans distinct classes", () => {
    const spans = new Set([
      styles.fieldSpan.full,
      styles.fieldSpan.half,
      styles.fieldSpan.third,
    ]);
    expect(spans.size).toBe(3);
  });
});
