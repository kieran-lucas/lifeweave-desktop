#!/usr/bin/env python3
"""Deterministic Task 34 expansion-decision sensitivity analysis.

This models disclosed expert uncertainty; it is not user-demand evidence.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

SEED = 20260805
SAMPLES = 1_000_000
CHUNK = 100_000
CONCENTRATION = 300.0
OUTPUT = Path(__file__).with_name("analysis-results.json")

CRITERIA = [
    "immediate_user_value", "workflow_frequency", "product_differentiation",
    "prerequisite_readiness", "data_safety_reversibility",
    "accessibility_feasibility", "implementation_boundedness",
    "evidence_testability", "maintenance_cost_low_burden",
    "performance_feasibility", "local_first_privacy_fit",
    "interoperability_recovery_clarity", "cross_pillar_leverage",
    "trust_non_manipulation",
]
PROFILES = {
    "base": [14,10,8,9,10,8,8,7,7,5,4,4,4,2],
    "utility_workflow": [20,16,6,8,8,6,10,7,5,4,3,2,4,1],
    "knowledge_interconnection": [12,9,18,7,7,7,6,6,5,5,4,5,8,1],
    "task_execution": [18,15,5,10,8,7,12,8,5,4,3,2,2,1],
    "safety_maintenance": [8,5,4,8,19,13,7,9,10,5,4,6,1,1],
    "interoperability_longevity": [8,5,8,9,14,7,7,8,8,5,4,14,2,1],
    "accessibility_maintenance_stress": [8,6,5,8,10,18,8,9,15,5,4,2,1,1],
    "product_identity_stress": [13,9,20,8,7,6,7,6,5,5,3,3,6,2],
    "minimal_complexity_local_stress": [8,6,4,12,12,8,15,10,12,6,3,2,1,1],
}
CANONICAL = list(PROFILES)[:6]
STRESS = list(PROFILES)[6:]
OUTCOMES = {
    "actual_time":"PASS", "deadline":"PASS", "saved_views":"PASS",
    "backlinks":"PASS", "generic_outline":"CONDITIONAL", "noteboard":"FAIL",
    "graph":"FAIL", "score":"FAIL", "prediction":"FAIL",
    "whole_tree_interchange":"PASS", "hardening":"PASS",
}
CANDIDATES = {
    "actual_time": ([7.5,7.5,6.5,7.5,7.5,7.5,6.5,8,6.5,7.5,10,7.5,7.5,7.5], .75),
    "deadline": ([8.5,8.5,6.5,8.5,8.5,8.5,8.5,9,8,8.5,10,8.5,8.5,9.5], .55),
    "saved_views": ([8,8.5,7.5,8.5,8,8,7.5,8.5,7,7.5,10,8,9,9], .65),
    "backlinks": ([8,7,8.5,7.5,7.5,7.5,6.5,7.5,6,7,10,7,9,8.5], .80),
    "generic_outline": ([5.5,5,4.5,5,7,8,6.5,7,7,8,10,7,4.5,9], .90),
    "noteboard": ([5,4.5,7,4.5,5.5,4.5,4.5,5.5,4,4.5,10,5,5,6], 1.0),
    "graph": ([5.5,4.5,8,3,4.5,3.5,4,5,3,3.5,10,4,7,6], 1.0),
    "score": ([5,5,6,2,4,7,5,3,5,8,10,4,6,2], 1.10),
    "prediction": ([4,4,7,2,4,7,3,2,3,5,10,3,5,2], 1.20),
    "whole_tree_interchange": ([7,5,8.5,8.5,8.5,8,6.5,8.5,6.5,6.5,10,9.5,8.5,9], .70),
    "hardening": ([6.5,5,3.5,10,10,9.5,9,9.5,9,9,10,10,6,10], .45),
}
EXPECTED = {
    "winner":"deadline", "stability":"UNSTABLE",
    "top1":0.5928183333333333, "base_score":8.42,
    "base_lead":0.3249999999999993,
}


def validate() -> None:
    assert len(CRITERIA) == 14 and set(CANDIDATES) == set(OUTCOMES)
    for name, weights in PROFILES.items():
        assert len(weights) == 14 and sum(weights) == 100 and min(weights) > 0, name
    for name, (scores, sigma) in CANDIDATES.items():
        assert len(scores) == 14 and min(scores) >= 0 and max(scores) <= 10, name
        assert .35 <= sigma <= 1.4, name
    assert OUTCOMES["graph"] == OUTCOMES["score"] == OUTCOMES["prediction"] == "FAIL"


def base_scores() -> dict[str, float]:
    weights = np.asarray(PROFILES["base"], dtype=float)
    return {name: float(weights @ np.asarray(data[0], dtype=float) / 100) for name, data in CANDIDATES.items()}


def simulate(names: list[str], samples: int) -> dict[str, dict]:
    matrix = np.asarray([CANDIDATES[n][0] for n in names], dtype=float)
    sigma = np.asarray([CANDIDATES[n][1] for n in names], dtype=float)
    product_idx = [i for i,n in enumerate(names) if n != "hardening"]
    out: dict[str, dict] = {}
    for profile_index, (profile, raw) in enumerate(PROFILES.items()):
        rng = np.random.default_rng(SEED + 1009 * (profile_index + 1))
        alpha = np.asarray(raw, dtype=float) / 100 * CONCENTRATION
        top = np.zeros(len(names), dtype=np.int64)
        product_top = np.zeros(len(product_idx), dtype=np.int64)
        deadline_vs_hardening = 0
        deadline_vs_saved = 0
        checkpoints: dict[str, dict[str,float]] = {}
        done = 0
        while done < samples:
            batch = min(CHUNK, samples - done)
            weights = rng.dirichlet(alpha, size=batch)
            totals = weights @ matrix.T
            scale = np.sqrt(np.sum(weights * weights, axis=1))[:,None] * sigma[None,:]
            totals = np.clip(totals + rng.normal(size=totals.shape) * scale, 0, 10)
            winners = np.argmax(totals, axis=1)
            top += np.bincount(winners, minlength=len(names))
            pt = totals[:, product_idx]
            product_top += np.bincount(np.argmax(pt, axis=1), minlength=len(product_idx))
            deadline_vs_hardening += int(np.count_nonzero(totals[:,names.index("deadline")] > totals[:,names.index("hardening")]))
            deadline_vs_saved += int(np.count_nonzero(totals[:,names.index("deadline")] > totals[:,names.index("saved_views")]))
            done += batch
            if done in (100_000, 500_000, samples):
                checkpoints[str(done)] = {n: float(top[i]/done) for i,n in enumerate(names)}
        out[profile] = {
            "top1": {n: float(top[i]/samples) for i,n in enumerate(names)},
            "product_only_top1": {names[i]: float(product_top[j]/samples) for j,i in enumerate(product_idx)},
            "deadline_vs_hardening": deadline_vs_hardening / samples,
            "deadline_vs_saved_views": deadline_vs_saved / samples,
            "checkpoints": checkpoints,
        }
    return out


def aggregate(profiles: dict[str,dict], field: str, selected: list[str]) -> dict:
    names = list(profiles[selected[0]][field])
    top1 = {n: float(np.mean([profiles[p][field][n] for p in selected])) for n in names}
    order = sorted(names, key=lambda n: (-top1[n], n))
    winner, runner = order[:2]
    minimum = min(profiles[p][field][winner] for p in selected)
    stability = "ROBUST" if top1[winner] >= .8 and minimum >= .55 else "MODERATE" if top1[winner] >= .6 else "UNSTABLE"
    drift = max(abs(cp[winner] - profiles[p][field if field == "top1" else "product_only_top1"][winner])
                for p in selected for cp in profiles[p]["checkpoints"].values()) if field == "top1" else None
    return {"top1":top1, "winner":winner, "runner_up":runner, "minimum_winner_profile_top1":minimum, "stability":stability, "max_convergence_drift":drift}


def build(samples: int) -> dict:
    validate()
    eligible = [n for n,o in OUTCOMES.items() if o == "PASS"]
    profiles = simulate(eligible, samples)
    canonical = aggregate(profiles, "top1", CANONICAL)
    product = aggregate(profiles, "product_only_top1", CANONICAL)
    canonical["pairwise_winner_vs_runner_up"] = float(np.mean([profiles[p]["deadline_vs_hardening"] for p in CANONICAL]))
    product["pairwise_winner_vs_runner_up"] = float(np.mean([profiles[p]["deadline_vs_saved_views"] for p in CANONICAL]))
    scores = base_scores()
    ordered = sorted(eligible, key=lambda n:(-scores[n], n))
    return {
        "format_version":1, "model_version":"task34-v1.0", "seed":SEED,
        "samples_per_profile":samples, "canonical_profiles":CANONICAL,
        "stress_profiles":STRESS, "total_profile_samples":samples*len(PROFILES),
        "method":{"weights":"Dirichlet positive normalized perturbation", "scores":"Gaussian aggregate perturbation using criterion-induced variance, clipped to [0,10]", "dirichlet_concentration":CONCENTRATION, "chunk_size":CHUNK},
        "hard_filter_outcomes":OUTCOMES, "eligible":eligible,
        "conditional":[n for n,o in OUTCOMES.items() if o == "CONDITIONAL"],
        "base_scores":scores, "base_eligible_winner":ordered[0],
        "base_eligible_runner_up":ordered[1], "base_lead":scores[ordered[0]]-scores[ordered[1]],
        "canonical_aggregate":canonical, "canonical_product_only":product,
        "profile_winners":{p:max(eligible,key=lambda n:(profiles[p]["top1"][n],n)) for p in PROFILES},
        "profile_top1":{p:profiles[p]["top1"] for p in PROFILES},
        "product_only_profile_top1":{p:profiles[p]["product_only_top1"] for p in PROFILES},
        "conditional_diagnostic":{"generic_outline":{"outcome":"CONDITIONAL", "direct_activation_eligible":False}},
        "interpretation":"Sensitivity analysis over disclosed expert assumptions; top-1 probability is not user-demand probability.",
    }


def check(result: dict) -> None:
    observed = {
        "winner":result["canonical_aggregate"]["winner"],
        "stability":result["canonical_aggregate"]["stability"],
        "top1":result["canonical_aggregate"]["top1"]["deadline"],
        "base_score":result["base_scores"]["deadline"],
        "base_lead":result["base_lead"],
    }
    for key in ("winner","stability"):
        if observed[key] != EXPECTED[key]: raise SystemExit(f"{key} drift: {observed[key]!r}")
    for key in ("top1","base_score","base_lead"):
        if not math.isclose(observed[key], EXPECTED[key], rel_tol=0, abs_tol=1e-12):
            raise SystemExit(f"{key} drift: {observed[key]!r}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=SAMPLES)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    if args.samples <= 0 or args.samples % CHUNK: raise SystemExit(f"samples must be a positive multiple of {CHUNK}")
    result = build(args.samples)
    if args.check and args.samples != SAMPLES: raise SystemExit("--check requires 1,000,000 samples/profile")
    if args.check: check(result)
    args.output.write_text(json.dumps(result, indent=2, sort_keys=True)+"\n", encoding="utf-8")
    print(json.dumps({"winner":result["canonical_aggregate"]["winner"], "stability":result["canonical_aggregate"]["stability"], "top1":result["canonical_aggregate"]["top1"]["deadline"], "base_score":result["base_scores"]["deadline"], "base_lead":result["base_lead"]}, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__": raise SystemExit(main())
