"""Deterministic fixtures, workloads, simulation, and benchmarks."""
from __future__ import annotations

import json
import random
import statistics
import time
from typing import Any, Iterable

from prototype_model import Adapter, LIFECYCLES, OPERATIONS, SEED, canonical_json, stable_hash
from prototype_options import ADAPTERS


def seed_ai_foundations(adapter: Adapter) -> str:
    plan_id = adapter.create_plan("AI Foundations", "life-ai")
    adapter.set_dates(plan_id, "2026-08-15", "2026-12-20")
    adapter.update_outcome(plan_id, "Build a rigorous foundation in mathematics, classical machine learning, neural networks, and one capstone project.")
    adapter.replace_success_criteria(plan_id, [
        "Finish the selected mathematics path",
        "Implement three classical ML algorithms",
        "Train and evaluate one small neural network",
        "Publish one local-first capstone dossier",
    ])
    first = adapter.export_canonical(plan_id)["selected_variant_id"]
    adapter.rename_variant(plan_id, first, "Textbook-first")
    course = adapter.add_variant(plan_id, "Course-first")
    project = adapter.add_variant(plan_id, "Project-first")
    for title in ("Mathematics foundation", "Classical machine learning", "Neural networks", "Capstone"):
        adapter.add_phase(plan_id, first, title)
    adapter.select_variant(plan_id, first)
    adapter.link_task(plan_id, "task-linear-algebra")
    adapter.link_task(plan_id, "task-regression")
    adapter.link_series(plan_id, "series-ai-study")
    adapter.set_lifecycle(plan_id, "active")
    assert course and project
    return plan_id


def exercise_full_contract(adapter_type: type[Adapter]) -> dict[str, Any]:
    adapter = adapter_type()
    covered: list[str] = []
    plan_id = adapter.create_plan("Contract Plan"); covered.append("create_plan")
    adapter.rename_plan(plan_id, "Contract Plan Renamed"); covered.append("rename_plan")
    adapter.set_lifecycle(plan_id, "active"); covered.append("set_lifecycle")
    adapter.set_dates(plan_id, "2026-08-01", "2026-12-01"); covered.append("set_dates")
    adapter.link_life(plan_id, "life-ai"); covered.append("link_life")
    adapter.unlink_life(plan_id); covered.append("unlink_life")
    first = adapter.export_canonical(plan_id)["selected_variant_id"]
    variant = adapter.add_variant(plan_id, "Alternative"); covered.append("add_variant")
    adapter.rename_variant(plan_id, variant, "Alternative renamed"); covered.append("rename_variant")
    adapter.select_variant(plan_id, variant); covered.append("select_variant")
    adapter.select_variant(plan_id, first)
    adapter.archive_variant(plan_id, variant); covered.append("archive_variant")
    adapter.restore_variant(plan_id, variant); covered.append("restore_variant")
    phase = adapter.add_phase(plan_id, first, "Foundation"); covered.append("add_phase")
    adapter.rename_phase(plan_id, first, phase, "Foundation renamed"); covered.append("rename_phase")
    adapter.reorder_phase(plan_id, first, phase, 0); covered.append("reorder_phase")
    adapter.archive_phase(plan_id, first, phase); covered.append("archive_phase")
    adapter.restore_phase(plan_id, first, phase); covered.append("restore_phase")
    adapter.update_outcome(plan_id, "Outcome"); covered.append("update_outcome")
    adapter.replace_success_criteria(plan_id, ["Criterion"]); covered.append("replace_success_criteria")
    adapter.save_recovery_draft(plan_id, {"outcome": "Recovered outcome"}); covered.append("save_recovery_draft")
    adapter.recover_draft(plan_id); covered.append("recover_draft")
    adapter.link_task(plan_id, "task-1"); covered.append("link_task")
    adapter.unlink_task(plan_id, "task-1"); covered.append("unlink_task")
    adapter.link_series(plan_id, "series-1"); covered.append("link_series")
    adapter.unlink_series(plan_id, "series-1"); covered.append("unlink_series")
    adapter.archive_plan(plan_id); covered.append("archive_plan")
    adapter.restore_plan(plan_id); covered.append("restore_plan")
    adapter.search_projection("Contract"); covered.append("search_projection")
    adapter.export_canonical(plan_id); covered.append("export_canonical")
    errors = adapter.validate_invariants(plan_id); covered.append("validate_invariants")
    clone_id = adapter.clone_plan_as_draft(plan_id); covered.append("clone_plan_as_draft")
    return {
        "option": adapter.option,
        "covered_operations": covered,
        "coverage_complete": tuple(covered) == OPERATIONS,
        "invariant_errors": errors + adapter.validate_invariants(clone_id),
        "original_hash": stable_hash(adapter.export_canonical(plan_id)),
        "clone_lifecycle": adapter.export_canonical(clone_id)["lifecycle"],
    }


def operation_cycle(adapter: Adapter, plan_id: str, rng: random.Random) -> bool:
    plan = adapter._plan(plan_id)
    variants = plan["variants"]
    active_variants = [value for value in variants if not value["archived"]]
    selected_id = plan["selected_variant_id"]
    selected = next(value for value in variants if value["id"] == selected_id)
    phases = selected["phases"]
    choice = rng.randrange(20)
    try:
        if plan["archived"]: adapter.restore_plan(plan_id)
        elif choice == 0: adapter.rename_plan(plan_id, f"AI Foundations {rng.randrange(7)}")
        elif choice == 1: adapter.set_lifecycle(plan_id, LIFECYCLES[rng.randrange(len(LIFECYCLES))])
        elif choice == 2: adapter.update_outcome(plan_id, f"Outcome revision {rng.randrange(97)}")
        elif choice == 3: adapter.replace_success_criteria(plan_id, [f"Criterion {rng.randrange(13)}", f"Criterion {rng.randrange(13)}"])
        elif choice == 4: adapter.save_recovery_draft(plan_id, {"outcome": f"Recovered {rng.randrange(31)}", "success_criteria": ["Recovered criterion"]})
        elif choice == 5:
            if plan.get("recovery_draft") is None: adapter.save_recovery_draft(plan_id, {"outcome": "Draft"})
            else: adapter.recover_draft(plan_id)
        elif choice == 6: adapter.link_task(plan_id, f"task-{rng.randrange(25)}")
        elif choice == 7: adapter.unlink_task(plan_id, f"task-{rng.randrange(25)}")
        elif choice == 8: adapter.link_series(plan_id, f"series-{rng.randrange(9)}")
        elif choice == 9: adapter.unlink_series(plan_id, f"series-{rng.randrange(9)}")
        elif choice == 10: adapter.link_life(plan_id, f"life-{rng.randrange(4)}")
        elif choice == 11: adapter.unlink_life(plan_id)
        elif choice == 12:
            if len(variants) < 8: adapter.add_variant(plan_id, f"Variant {len(variants)+1}")
            else:
                target = active_variants[rng.randrange(len(active_variants))]
                adapter.rename_variant(plan_id, target["id"], f"Variant {rng.randrange(17)}")
        elif choice == 13:
            target = active_variants[rng.randrange(len(active_variants))]
            adapter.select_variant(plan_id, target["id"])
        elif choice == 14:
            current = adapter._plan(plan_id)
            selected = next(v for v in current["variants"] if v["id"] == current["selected_variant_id"])
            if len(selected["phases"]) < 12: adapter.add_phase(plan_id, selected["id"], f"Phase {rng.randrange(101)}")
            elif selected["phases"]:
                phase = selected["phases"][rng.randrange(len(selected["phases"]))]
                adapter.rename_phase(plan_id, selected["id"], phase["id"], f"Phase {rng.randrange(101)}")
        elif choice == 15 and phases:
            phase = phases[rng.randrange(len(phases))]
            adapter.reorder_phase(plan_id, selected_id, phase["id"], rng.randrange(len(phases)))
        elif choice == 16 and phases:
            phase = phases[rng.randrange(len(phases))]
            if phase["archived"]: adapter.restore_phase(plan_id, selected_id, phase["id"])
            else: adapter.archive_phase(plan_id, selected_id, phase["id"])
        elif choice == 17:
            non_selected = [v for v in variants if v["id"] != selected_id]
            if non_selected:
                target = non_selected[rng.randrange(len(non_selected))]
                if target["archived"]: adapter.restore_variant(plan_id, target["id"])
                else: adapter.archive_variant(plan_id, target["id"])
        elif choice == 18: adapter.search_projection("AI")
        else:
            if rng.random() < 0.01: adapter.archive_plan(plan_id)
            else: adapter.validate_invariants(plan_id)
        return True
    except (ValueError, StopIteration, IndexError):
        return False


def run_simulation(adapter_type: type[Adapter], applied_target: int) -> dict[str, Any]:
    adapter = adapter_type(); plan_id = seed_ai_foundations(adapter); rng = random.Random(SEED)
    applied = attempted = errors = 0
    while applied < applied_target:
        attempted += 1
        try:
            if operation_cycle(adapter, plan_id, rng): applied += 1
        except Exception:
            errors += 1; raise
    errors_list = adapter.validate_invariants(plan_id)
    export = adapter.export_canonical(plan_id)
    return {"option": adapter.option, "applied": applied, "attempted": attempted, "uncaught_errors": errors, "invariant_errors": errors_list, "final_hash": stable_hash(export), "final_revision": export["revision"], "structural_cost": adapter.structural_cost(1).to_dict()}


def build_fixture(adapter_type: type[Adapter], count: int) -> Adapter:
    adapter = adapter_type()
    for index in range(count):
        plan_id = adapter.create_plan(f"Plan {index:04d}", f"life-{index % 8}")
        adapter.set_dates(plan_id, "2026-08-01", "2026-12-31")
        adapter.update_outcome(plan_id, f"Outcome {index} artificial intelligence")
        selected = adapter.export_canonical(plan_id)["selected_variant_id"]
        for phase_index in range(4): adapter.add_phase(plan_id, selected, f"Phase {phase_index}")
        adapter.link_task(plan_id, f"task-{index}")
    return adapter


def median_ms(samples: Iterable[float]) -> float:
    return round(statistics.median(samples) * 1000, 6)


def benchmark(adapter_type: type[Adapter], count: int) -> dict[str, Any]:
    adapter = build_fixture(adapter_type, count); plan_ids = adapter._all_plan_ids()
    repeats = 30 if count == 1 else 10 if count == 100 else 3
    def timed(fn):
        values = []
        for _ in range(repeats):
            start = time.perf_counter(); fn(); values.append(time.perf_counter() - start)
        return median_ms(values)
    return {
        "option": adapter.option, "plans": count,
        "portfolio_p50_ms": timed(lambda: [adapter.export_canonical(value)["title"] for value in plan_ids]),
        "open_plan_p50_ms": timed(lambda: adapter.export_canonical(plan_ids[-1])),
        "search_p50_ms": timed(lambda: adapter.search_projection("artificial intelligence")),
        "export_all_p50_ms": timed(lambda: canonical_json([adapter.export_canonical(value) for value in plan_ids])),
        "structural_cost": adapter.structural_cost(count).to_dict(),
    }


def generate_results(applied_target: int = 100_000) -> dict[str, Any]:
    seeded = []; seeded_hashes = {}
    for adapter_type in ADAPTERS:
        adapter = adapter_type(); plan_id = seed_ai_foundations(adapter); exported = adapter.export_canonical(plan_id)
        seeded_hashes[adapter.option] = stable_hash(exported)
        seeded.append({"option": adapter.option, "hash": seeded_hashes[adapter.option], "invariants": adapter.validate_invariants(plan_id), "search": adapter.search_projection("neural"), "structural_cost": adapter.structural_cost(12).to_dict()})
    contract_exercises = [exercise_full_contract(adapter_type) for adapter_type in ADAPTERS]
    simulations = [run_simulation(adapter_type, applied_target) for adapter_type in ADAPTERS]
    benchmarks = [benchmark(adapter_type, count) for count in (1, 100, 1000) for adapter_type in ADAPTERS]
    return {
        "format_version": 1, "seed": SEED, "operation_contract": list(OPERATIONS), "operation_count": len(OPERATIONS),
        "contract_exercises": contract_exercises, "seeded_fixture": seeded,
        "seeded_semantic_hashes_equal": len(set(seeded_hashes.values())) == 1,
        "simulations": simulations,
        "simulation_semantic_hashes_equal": len({result["final_hash"] for result in simulations}) == 1,
        "benchmarks": benchmarks,
        "warning": "Prototype-only measurements; not production performance evidence.",
    }


def deterministic_projection(results: dict[str, Any]) -> dict[str, Any]:
    projected = json.loads(json.dumps(results))
    for benchmark_result in projected.get("benchmarks", []):
        for key in tuple(benchmark_result):
            if key.endswith("_ms"): del benchmark_result[key]
    return projected


def validate_benchmark_evidence(results: dict[str, Any]) -> list[str]:
    errors: list[str] = []; expected = len(ADAPTERS) * 3; benchmarks = results.get("benchmarks", [])
    if len(benchmarks) != expected: errors.append(f"expected {expected} benchmark rows")
    required = {"portfolio_p50_ms", "open_plan_p50_ms", "search_p50_ms", "export_all_p50_ms"}
    for index, row in enumerate(benchmarks):
        missing = required - set(row)
        if missing: errors.append(f"benchmark {index} missing {sorted(missing)}"); continue
        for key in required:
            value = row[key]
            if not isinstance(value, (int, float)) or value < 0: errors.append(f"benchmark {index} invalid {key}")
    return errors
