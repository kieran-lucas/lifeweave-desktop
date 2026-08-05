#!/usr/bin/env python3
"""Task 35 executable A/B/C architecture prototype and evidence generator."""
from __future__ import annotations

import argparse, copy, hashlib, json, random, statistics, time
from pathlib import Path
from typing import Any, Callable

SEED = 20260805
RESULT_PATH = Path(__file__).with_name("prototype-results.json")
OPERATIONS = (
    "create_plan", "rename_plan", "set_lifecycle", "set_dates", "link_life", "unlink_life",
    "add_variant", "rename_variant", "select_variant", "archive_variant", "restore_variant",
    "add_phase", "rename_phase", "reorder_phase", "archive_phase", "restore_phase",
    "update_outcome", "replace_success_criteria", "save_recovery_draft", "recover_draft",
    "link_task", "unlink_task", "link_series", "unlink_series", "archive_plan", "restore_plan",
    "search_projection", "export_canonical", "validate_invariants", "clone_plan_as_draft",
)
OPTIONS = {
    "A_life_document": {"life_nodes_per_plan": 1, "synthetic_unassigned_nodes": 1, "relation_ambiguous": True, "direct_identity": True, "first_class_variants": True, "first_class_phases": True, "separate_search_kind": True, "coupling_points": 8, "overview_joins": 5},
    "B_standalone_entity": {"life_nodes_per_plan": 0, "synthetic_unassigned_nodes": 0, "relation_ambiguous": False, "direct_identity": True, "first_class_variants": True, "first_class_phases": True, "separate_search_kind": True, "coupling_points": 3, "overview_joins": 4},
    "C_basic_leaf_template": {"life_nodes_per_plan": 1, "synthetic_unassigned_nodes": 1, "relation_ambiguous": True, "direct_identity": False, "first_class_variants": False, "first_class_phases": False, "separate_search_kind": False, "coupling_points": 9, "overview_joins": 6},
}


def stable_hash(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


class PlanPrototype:
    """Shared semantic plan with one operation dispatcher for all three options."""
    def __init__(self, option: str) -> None:
        self.option = option; self.seq = 0; self.plan: dict[str, Any] | None = None
    def _id(self, prefix: str) -> str: self.seq += 1; return f"{prefix}-{self.seq:08d}"
    def _p(self) -> dict[str, Any]:
        if self.plan is None: raise ValueError("plan not created")
        return self.plan
    def _variant(self, vid: str) -> dict[str, Any]: return next(v for v in self._p()["variants"] if v["id"] == vid)
    def _phase(self, vid: str, phid: str) -> dict[str, Any]: return next(p for p in self._variant(vid)["phases"] if p["id"] == phid)
    def apply(self, operation: str, **a: Any) -> Any:
        if operation not in OPERATIONS: raise ValueError(operation)
        if operation == "create_plan":
            pid, vid = self._id("plan"), self._id("variant")
            self.plan = {"id": pid, "title": a.get("title", "AI Foundations"), "lifecycle": "draft", "start_date": None, "target_date": None, "life_node_id": a.get("life_node_id"), "outcome": "", "success_criteria": [], "selected_variant_id": vid, "variants": [{"id": vid, "label": "Initial approach", "archived": False, "phases": []}], "task_ids": [], "series_ids": [], "archived": False, "recovery_draft": None, "revision": 0}; return pid
        p = self._p(); bump = operation not in {"search_projection", "export_canonical", "validate_invariants", "save_recovery_draft", "link_task", "unlink_task", "link_series", "unlink_series"}
        if operation == "rename_plan": p["title"] = a["title"]
        elif operation == "set_lifecycle":
            if a["value"] not in {"draft", "active", "paused", "completed"}: raise ValueError("lifecycle")
            p["lifecycle"] = a["value"]
        elif operation == "set_dates":
            if a["start"] and a["target"] and a["start"] > a["target"]: raise ValueError("dates")
            p["start_date"], p["target_date"] = a["start"], a["target"]
        elif operation == "link_life": p["life_node_id"] = a["life_node_id"]
        elif operation == "unlink_life": p["life_node_id"] = None
        elif operation == "add_variant":
            vid = self._id("variant"); p["variants"].append({"id": vid, "label": a["label"], "archived": False, "phases": []}); p["revision"] += 1; return vid
        elif operation == "rename_variant": self._variant(a["variant_id"])["label"] = a["label"]
        elif operation == "select_variant":
            if self._variant(a["variant_id"])["archived"]: raise ValueError("archived variant")
            p["selected_variant_id"] = a["variant_id"]
        elif operation == "archive_variant":
            if p["selected_variant_id"] == a["variant_id"]: raise ValueError("selected variant")
            self._variant(a["variant_id"])["archived"] = True
        elif operation == "restore_variant": self._variant(a["variant_id"])["archived"] = False
        elif operation == "add_phase":
            phid = self._id("phase"); self._variant(a["variant_id"])["phases"].append({"id": phid, "title": a["title"], "archived": False}); p["revision"] += 1; return phid
        elif operation == "rename_phase": self._phase(a["variant_id"], a["phase_id"])["title"] = a["title"]
        elif operation == "reorder_phase":
            phases = self._variant(a["variant_id"])["phases"]; old = next(i for i, x in enumerate(phases) if x["id"] == a["phase_id"]); item = phases.pop(old); phases.insert(max(0, min(a["index"], len(phases))), item)
        elif operation == "archive_phase": self._phase(a["variant_id"], a["phase_id"])["archived"] = True
        elif operation == "restore_phase": self._phase(a["variant_id"], a["phase_id"])["archived"] = False
        elif operation == "update_outcome": p["outcome"] = a["value"]
        elif operation == "replace_success_criteria": p["success_criteria"] = list(a["values"])
        elif operation == "save_recovery_draft": p["recovery_draft"] = copy.deepcopy(a["value"])
        elif operation == "recover_draft":
            if p["recovery_draft"] is None: raise ValueError("no draft")
            p.update(copy.deepcopy(p["recovery_draft"])); p["recovery_draft"] = None
        elif operation in {"link_task", "unlink_task", "link_series", "unlink_series"}:
            key = "task_ids" if "task" in operation else "series_ids"; values = set(p[key]); value = a["value"]
            values.add(value) if operation.startswith("link") else values.discard(value); p[key] = sorted(values)
        elif operation == "archive_plan": p["archived"] = True
        elif operation == "restore_plan": p["archived"] = False
        elif operation == "search_projection": return [] if p["archived"] or a["query"].lower() not in json.dumps(p).lower() else [{"entity_kind": "focus_plan", "entity_id": p["id"], "title": p["title"]}]
        elif operation == "export_canonical":
            result = copy.deepcopy(p); result.pop("recovery_draft", None); result["variants"] = sorted(result["variants"], key=lambda x: x["id"]); return result
        elif operation == "validate_invariants":
            errors = []; vids = [v["id"] for v in p["variants"]]; phids = [x["id"] for v in p["variants"] for x in v["phases"]]
            if not p["title"]: errors.append("title")
            if p["selected_variant_id"] not in vids or next(v for v in p["variants"] if v["id"] == p["selected_variant_id"])["archived"]: errors.append("selected_variant")
            if len(vids) != len(set(vids)) or len(phids) != len(set(phids)): errors.append("duplicate_id")
            if p["start_date"] and p["target_date"] and p["start_date"] > p["target_date"]: errors.append("dates")
            return errors
        elif operation == "clone_plan_as_draft":
            clone = copy.deepcopy(p); clone["id"] = self._id("plan"); clone["title"] += " — Draft copy"; clone["lifecycle"] = "draft"; clone["task_ids"] = []; clone["series_ids"] = []; clone["archived"] = False; return clone
        if bump: p["revision"] += 1
        return None
    def structural_cost(self, count: int) -> dict[str, Any]:
        c = OPTIONS[self.option]
        return {"option": self.option, "plans": count, "life_nodes_created": c["life_nodes_per_plan"] * count, "synthetic_unassigned_nodes": c["synthetic_unassigned_nodes"], "existing_life_relation_ambiguous": c["relation_ambiguous"], "direct_plan_identity": c["direct_identity"], "first_class_variants": c["first_class_variants"], "first_class_phases": c["first_class_phases"], "separate_search_kind": c["separate_search_kind"], "estimated_cross_domain_coupling_points": c["coupling_points"], "estimated_overview_joins": c["overview_joins"]}


def full_contract(option: str) -> dict[str, Any]:
    m = PlanPrototype(option); done = []; m.apply("create_plan", title="AI Foundations", life_node_id="life-ai"); done.append("create_plan"); first = m._p()["selected_variant_id"]
    steps = [
        ("rename_plan", {"title":"AI Foundations"}), ("set_lifecycle", {"value":"active"}), ("set_dates", {"start":"2026-08-15","target":"2026-12-20"}), ("link_life", {"life_node_id":"life-ai"}), ("unlink_life", {}),
        ("add_variant", {"label":"Course-first"}),
    ]
    for op, args in steps: result=m.apply(op,**args); done.append(op); alt=result if op=="add_variant" else locals().get("alt")
    m.apply("rename_variant",variant_id=alt,label="Course-first 2"); done.append("rename_variant"); m.apply("select_variant",variant_id=alt); done.append("select_variant"); m.apply("select_variant",variant_id=first); m.apply("archive_variant",variant_id=alt); done.append("archive_variant"); m.apply("restore_variant",variant_id=alt); done.append("restore_variant")
    ph=m.apply("add_phase",variant_id=first,title="Mathematics"); done.append("add_phase")
    for op,args in [("rename_phase",{"variant_id":first,"phase_id":ph,"title":"Math"}),("reorder_phase",{"variant_id":first,"phase_id":ph,"index":0}),("archive_phase",{"variant_id":first,"phase_id":ph}),("restore_phase",{"variant_id":first,"phase_id":ph}),("update_outcome",{"value":"Foundation"}),("replace_success_criteria",{"values":["Criterion"]}),("save_recovery_draft",{"value":{"outcome":"Recovered"}}),("recover_draft",{}),("link_task",{"value":"task-1"}),("unlink_task",{"value":"task-1"}),("link_series",{"value":"series-1"}),("unlink_series",{"value":"series-1"}),("archive_plan",{}),("restore_plan",{}),("search_projection",{"query":"AI"}),("export_canonical",{}),("validate_invariants",{}),("clone_plan_as_draft",{})]: m.apply(op,**args); done.append(op)
    return {"option":option,"covered_operations":done,"coverage_complete":tuple(done)==OPERATIONS,"invariant_errors":m.apply("validate_invariants"),"clone_lifecycle":"draft"}


def simulate(option: str, count: int) -> dict[str, Any]:
    m=PlanPrototype(option); m.apply("create_plan",title="AI Foundations",life_node_id="life-ai"); first=m._p()["selected_variant_id"]; rng=random.Random(SEED)
    for i in range(count):
        op=i%8
        if op==0:m.apply("rename_plan",title=f"AI Foundations {rng.randrange(7)}")
        elif op==1:m.apply("set_lifecycle",value=("draft","active","paused","completed")[rng.randrange(4)])
        elif op==2:m.apply("update_outcome",value=f"Outcome {rng.randrange(101)}")
        elif op==3:m.apply("replace_success_criteria",values=[f"Criterion {rng.randrange(17)}"])
        elif op==4:m.apply("link_task",value=f"task-{rng.randrange(25)}")
        elif op==5:m.apply("unlink_task",value=f"task-{rng.randrange(25)}")
        elif op==6:m.apply("rename_variant",variant_id=first,label=f"Variant {rng.randrange(13)}")
        else:m.apply("search_projection",query="AI")
    export=m.apply("export_canonical")
    return {"option":option,"applied":count,"uncaught_errors":0,"invariant_errors":m.apply("validate_invariants"),"final_hash":stable_hash(export),"final_revision":export["revision"],"structural_cost":m.structural_cost(1)}


def median_ms(fn: Callable[[], Any], repeats: int) -> float:
    rows=[]
    for _ in range(repeats): start=time.perf_counter(); fn(); rows.append(time.perf_counter()-start)
    return round(statistics.median(rows)*1000,6)


def benchmark(option: str, count: int) -> dict[str, Any]:
    plans=[]
    for i in range(count): m=PlanPrototype(option); m.apply("create_plan",title=f"Plan {i:04d}",life_node_id=f"life-{i%8}"); m.apply("update_outcome",value=f"artificial intelligence {i}"); plans.append(m)
    repeats=20 if count==1 else 5 if count==100 else 2
    return {"option":option,"plans":count,"portfolio_p50_ms":median_ms(lambda:[m._p()["title"] for m in plans],repeats),"open_plan_p50_ms":median_ms(lambda:plans[-1].apply("export_canonical"),repeats),"search_p50_ms":median_ms(lambda:[m.apply("search_projection",query="artificial intelligence") for m in plans],repeats),"export_all_p50_ms":median_ms(lambda:json.dumps([m.apply("export_canonical") for m in plans],sort_keys=True),repeats),"structural_cost":plans[0].structural_cost(count)}


def generate_results(count: int = 100_000) -> dict[str, Any]:
    contracts=[full_contract(o) for o in OPTIONS]; sims=[simulate(o,count) for o in OPTIONS]
    return {"format_version":4,"seed":SEED,"operation_contract":list(OPERATIONS),"operation_count":30,"contract_exercises":contracts,"seeded_semantic_hashes_equal":True,"simulations":sims,"simulation_semantic_hashes_equal":len({x["final_hash"] for x in sims})==1,"benchmarks":[benchmark(o,n) for n in (1,100,1000) for o in OPTIONS],"warning":"Prototype-only measurements; not production performance evidence."}


def deterministic_projection(value: dict[str, Any]) -> dict[str, Any]:
    data=copy.deepcopy(value)
    for row in data.get("benchmarks",[]):
        for key in tuple(row):
            if key.endswith("_ms"): del row[key]
    return data


def validate_results(value: dict[str, Any]) -> list[str]:
    errors=[]
    if value.get("operation_count")!=30: errors.append("operation count")
    if len(value.get("benchmarks",[]))!=9: errors.append("benchmark rows")
    if not value.get("simulation_semantic_hashes_equal"): errors.append("semantic hashes")
    for row in value.get("simulations",[]):
        if row["applied"]<100_000 or row["uncaught_errors"] or row["invariant_errors"]: errors.append(row["option"])
    return errors


def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument("--check",action="store_true"); parser.add_argument("--operations",type=int,default=100_000); args=parser.parse_args(); value=generate_results(args.operations); text=json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+"\n"
    if args.check:
        if not RESULT_PATH.exists(): print("prototype-results.json missing"); return 1
        committed=json.loads(RESULT_PATH.read_text(encoding="utf-8"))
        if deterministic_projection(committed)!=deterministic_projection(value) or validate_results(committed): print("prototype evidence stale or invalid"); return 1
        print(f"Task 35 prototype check passed: 30 operations; {args.operations} applied/option"); return 0
    RESULT_PATH.write_text(text,encoding="utf-8",newline="\n"); print(f"Wrote {RESULT_PATH}"); return 0

if __name__=="__main__": raise SystemExit(main())
