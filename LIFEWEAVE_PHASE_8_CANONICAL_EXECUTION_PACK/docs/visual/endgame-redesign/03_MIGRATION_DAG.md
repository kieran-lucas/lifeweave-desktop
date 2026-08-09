# 03 — Migration DAG and Closure Model

## Ordered program

```text
F0
└─ S01 Global/Shell
   ├─ S02 Today Core → S03 Task Compose → S04 Planning/Saved Views → Q1
   ├─ S05 Calendar/Analytics → S06 Focus Plans → Q2
   ├─ S07 Life Browse/Edit/Graph → S08 Reader/Editor/Links → S09 Interchange → Q3
   │                                       └─ S10 Narrative Reader/Markdown → S11 Narrative Studio → Q4
   └─ S12 Settings → Q5

Q1..Q5 + all stages closed
→ ONE final whole-app adversarial/coherence pass
→ fixed F_final
→ resolve F_final
→ mandatory final gates
→ FREEZE
```

For the unattended top-level Goal, execute linearly:
`F0 → S01 → S02 → S03 → S04 → Q1 → S05 → S06 → Q2 → S07 → S08 → S09 → Q3 → S10 → S11 → Q4 → S12 → Q5 → FINAL`.

## Stage inventory

| Stage | Scope | Rows | Count | Reasoning intent |
|---|---|---:|---:|---|
| F0 | shared grammar + selective verification harness | engineering prereqs | 0 | design decisions then mechanical |
| S01 | global shell + overlays | G-01..G-06, SH-01..SH-02 | 8 | high judgment |
| S02 | Today core + inspector + timer/assessment | T-01..T-10, MC-01 | 11 | high judgment |
| S03 | task compose/edit + shared task inputs | T-11..T-17, MC-02..03 | 9 | medium |
| S04 | planning + deadlines + saved views | T-18..T-22 | 5 | medium |
| S05 | Calendar + Analytics | C-01..02, A-01..09 | 11 | high judgment |
| S06 | Focus Plans | P-01..07 | 7 | high judgment |
| S07 | Life Browse/Edit/Graph | L-01..08, LG-01..04 | 12 | high judgment |
| S08 | Reader + Basic Editor + Links | R-01..05, E-01..03, LL-01..02, RT-01 | 11 | high judgment |
| S09 | portable/branch/tree interchange | PK-01..02, BR-01..02, TR-01..02 | 6 | medium |
| S10 | Narrative Reader + Markdown | N-01..09, MD-01..02 | 11 | high judgment |
| S11 | Narrative Studio | NS-01..10 | 10 | high judgment |
| S12 | Settings | S-01..08 | 8 | medium |

## Row state machine

`PENDING → IN_PROGRESS → LOCAL_VERIFIED → VERIFIED`

Exceptional:
- `VERIFICATION_DEBT` — only nondiagnostic harness debt under repository risk-based closure rules;
- `BLOCKED_PRODUCT` — safe in-scope implementation is impossible.

A row may move backward from VERIFIED only for a reproducible regression causally linked to a later shared change, violated invariant, data/safety risk, or explicit Product Owner decision.

## Stage close

A stage closes when:
- exact assigned rows are LOCAL_VERIFIED;
- local gate passes;
- exactly one scoped review was performed and fixed finding set resolved;
- ledger/evidence persisted;
- diff is in scope;
- scoped commit/checkpoint created.

Closing a stage freezes its subjective design search space. Continue to the next packet under the same top-level Goal.

## Checkpoint promotion

Q1–Q5 batch expensive native and regression evidence. A checkpoint promotes relevant LOCAL_VERIFIED rows to VERIFIED when prescribed evidence passes.

A checkpoint failure reopens only causally implicated rows.
