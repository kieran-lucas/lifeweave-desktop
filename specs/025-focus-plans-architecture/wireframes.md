# Focus Plans Interaction Prototypes

## Shared portfolio

```text
Plans
[Active] [Drafts] [Paused] [Completed]

AI Foundations                         Active
Aug 15 — Dec 20 · Computer Science/AI
Current phase: Mathematics foundation
3 variants · 4 phases · no automatic percentage
```

## Option A — Life document

```text
Life
└─ Computer Science
   └─ AI
      ├─ AI Foundations          <- temporary node
      ├─ Research Sprint         <- temporary node
      └─ Interview Preparation   <- temporary node
```

Failure exposed by the prototype: medium-term Plans alter durable tree
structure and compete with knowledge nodes.

## Option B — Standalone Plans workspace

```text
Today
Plans
Analytics
Life

Plan: AI Foundations
Lifecycle: Active
Dates: Aug 15 — Dec 20
Life area: Computer Science / AI

Outcome
Success criteria
Variants
  ● Textbook-first
  ○ Course-first
  ○ Project-first
Phases
  1 Mathematics foundation
  2 Classical machine learning
  3 Neural networks
  4 Capstone
Future linked Tasks
Review history
```

The Life relation is context, not ownership.

## Option C — Basic Leaf template

```text
Life leaf: AI Foundations
Document template: Focus Plan

[metadata inspector]
lifecycle
dates
variant
phase

[ordinary rich-text document]
```

Failure exposed by the prototype: the user must understand that an ordinary
document secretly owns workflow state; portfolio and Task-link behavior depend
on template metadata.

## Keyboard contract

- portfolio uses one heading and native buttons/tabs;
- Up/Down moves through Plan rows;
- Enter opens the selected Plan;
- `Ctrl+N` creates a Draft only from Plans;
- variant selector uses a radio group;
- phase reorder offers explicit Move up/Move down buttons in addition to drag;
- lifecycle changes use a labeled select or radio group;
- Escape closes the current layer only;
- focus returns to the invoker;
- no interaction depends on hover, color, or spatial position.

## Screen-reader outline

```text
main
  heading level 1: Plans
  tablist: lifecycle filters
  region: Active Plans
    article: AI Foundations
      lifecycle
      date range
      linked Life area
      current phase
  dialog/page: AI Foundations
    heading level 1
    definition list: lifecycle, dates, Life area
    region: Outcome
    region: Success criteria
    radiogroup: Plan variants
    ordered list: Phases
    region: Linked Tasks
    region: Review history
```

## Responsive rule

At narrow widths the portfolio and detail panes become sequential pages. No
canvas, graph, or spatial board is required.
