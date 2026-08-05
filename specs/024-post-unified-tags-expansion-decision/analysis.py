#!/usr/bin/env python3
"""
Task 34 — Post-Unified-Tags Expansion Decision sensitivity analysis.

This is sensitivity analysis over disclosed expert assumptions, not empirical
user evidence. It does not override hard-filter eligibility.

Seed: 20260805
Canonical profiles: 6
Stress profiles: 3
Samples: 1,000,000 per profile (9,000,000 total)
Method: Dirichlet weight perturbation × Gaussian aggregate-score perturbation
with variance induced by independent criterion uncertainty, clipped to [0, 10].
"""
from __future__ import annotations

import argparse
import json
import math
import platform
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np

SEED = 20260805
N_SAMPLES = 1_000_000
CHUNK_SIZE = 100_000
CONCENTRATION = 300.0
CHECKPOINTS = (100_000, 500_000, 1_000_000)
RESULT_PATH = Path(__file__).with_name("analysis-results.json")

CRITERIA = [
    "immediate_user_value",
    "workflow_frequency",
    "product_differentiation",
    "prerequisite_readiness",
    "data_safety_reversibility",
    "accessibility_feasibility",
    "implementation_boundedness",
    "evidence_testability",
    "maintenance_cost_low_burden",
    "performance_feasibility",
    "local_first_privacy_fit",
    "interoperability_recovery_clarity",
    "cross_pillar_leverage",
    "trust_non_manipulation",
]

BASE_WEIGHTS = [14, 10, 8, 9, 10, 8, 8, 7, 7, 5, 4, 4, 4, 2]

CANONICAL_PROFILES = [
    "base",
    "utility_workflow",
    "knowledge_interconnection",
    "task_execution",
    "safety_maintenance",
    "interoperability_longevity",
]

STRESS_PROFILES = [
    "accessibility_maintenance_stress",
    "product_identity_stress",
    "minimal_complexity_local_stress",
]

PROFILES = {
    "base": [14, 10, 8, 9, 10, 8, 8, 7, 7, 5, 4, 4, 4, 2],
    "utility_workflow": [20, 16, 6, 8, 8, 6, 10, 7, 5, 4, 3, 2, 4, 1],
    "knowledge_interconnection": [12, 9, 18, 7, 7, 7, 6, 6, 5, 5, 4, 5, 8, 1],
    "task_execution": [18, 15, 5, 10, 8, 7, 12, 8, 5, 4, 3, 2, 2, 1],
    "safety_maintenance": [8, 5, 4, 8, 19, 13, 7, 9, 10, 5, 4, 6, 1, 1],
    "interoperability_longevity": [8, 5, 8, 9, 14, 7, 7, 8, 8, 5, 4, 14, 2, 1],
    "accessibility_maintenance_stress": [8, 6, 5, 8, 10, 18, 8, 9, 15, 5, 4, 2, 1, 1],
    "product_identity_stress": [13, 9, 20, 8, 7, 6, 7, 6, 5, 5, 3, 3, 6, 2],
    "minimal_complexity_local_stress": [8, 6, 4, 12, 12, 8, 15, 10, 12, 6, 3, 2, 1, 1],
}

OUTCOMES = {
    "actual_time": "PASS",
    "deadline": "PASS",
    "saved_views": "PASS",
    "backlinks": "PASS",
    "generic_outline": "CONDITIONAL",
    "noteboard": "FAIL",
    "graph": "FAIL",
    "score": "FAIL",
    "prediction": "FAIL",
    "whole_tree_interchange": "PASS",
    "hardening": "PASS",
}

CANDIDATES = {
    "actual_time": {"title": "Actual-Time Tracking Core", "scores": [7.5, 7.5, 6.5, 7.5, 7.5, 7.5, 6.5, 8.0, 6.5, 7.5, 10.0, 7.5, 7.5, 7.5], "sigma": 0.75},
    "deadline": {"title": "Deadline Semantics + Deadline-Aware Planning", "scores": [8.5, 8.5, 6.5, 8.5, 8.5, 8.5, 8.5, 9.0, 8.0, 8.5, 10.0, 8.5, 8.5, 9.5], "sigma": 0.55},
    "saved_views": {"title": "Saved Filters / Saved Views", "scores": [8.0, 8.5, 7.5, 8.5, 8.0, 8.0, 7.5, 8.5, 7.0, 7.5, 10.0, 8.0, 9.0, 9.0], "sigma": 0.65},
    "backlinks": {"title": "Explicit Links + Backlinks Core", "scores": [8.0, 7.0, 8.5, 7.5, 7.5, 7.5, 6.5, 7.5, 6.0, 7.0, 10.0, 7.0, 9.0, 8.5], "sigma": 0.80},
    "generic_outline": {"title": "Generic Outline Beyond Basic Leaf Headings", "scores": [5.5, 5.0, 4.5, 5.0, 7.0, 8.0, 6.5, 7.0, 7.0, 8.0, 10.0, 7.0, 4.5, 9.0], "sigma": 0.90},
    "noteboard": {"title": "Noteboard", "scores": [5.0, 4.5, 7.0, 4.5, 5.5, 4.5, 4.5, 5.5, 4.0, 4.5, 10.0, 5.0, 5.0, 6.0], "sigma": 1.00},
    "graph": {"title": "Knowledge Graph", "scores": [5.5, 4.5, 8.0, 3.0, 4.5, 3.5, 4.0, 5.0, 3.0, 3.5, 10.0, 4.0, 7.0, 6.0], "sigma": 1.00},
    "score": {"title": "Objective Score", "scores": [5.0, 5.0, 6.0, 2.0, 4.0, 7.0, 5.0, 3.0, 5.0, 8.0, 10.0, 4.0, 6.0, 2.0], "sigma": 1.10},
    "prediction": {"title": "Prediction / Forecasting", "scores": [4.0, 4.0, 7.0, 2.0, 4.0, 7.0, 3.0, 2.0, 3.0, 5.0, 10.0, 3.0, 5.0, 2.0], "sigma": 1.20},
    "whole_tree_interchange": {"title": "Whole-Tree + Multi-Document Interchange", "scores": [7.0, 5.0, 8.5, 8.5, 8.5, 8.0, 6.5, 8.5, 6.5, 6.5, 10.0, 9.5, 8.5, 9.0], "sigma": 0.70},
    "hardening": {"title": "No Expansion / Hardening + Evidence", "scores": [6.5, 5.0, 3.5, 10.0, 10.0, 9.5, 9.0, 9.5, 9.0, 9.0, 10.0, 10.0, 6.0, 10.0], "sigma": 0.45},
}

EXPECTED = {
    "winner": "deadline",
    "stability": "UNSTABLE",
    "canonical_aggregate_top1": 0.5928183333333333,
    "base_score": 8.42,
    "base_lead": 0.3249999999999993,
}


def validate_model() -> None:
    assert len(CRITERIA) == 14
    assert sum(BASE_WEIGHTS) == 100
    assert set(PROFILES) == set(CANONICAL_PROFILES) | set(STRESS_PROFILES)
    for name, weights in PROFILES.items():
        assert len(weights) == len(CRITERIA), name
        assert sum(weights) == 100, (name, sum(weights))
        assert all(value > 0 for value in weights), name
    assert set(CANDIDATES) == set(OUTCOMES)
    for candidate, data in CANDIDATES.items():
        assert len(data["scores"]) == len(CRITERIA), candidate
        assert all(0 <= score <= 10 for score in data["scores"]), candidate
        assert 0.35 <= data["sigma"] <= 1.40, candidate
    assert OUTCOMES["score"] == "FAIL"
    assert OUTCOMES["prediction"] == "FAIL"
    assert OUTCOMES["graph"] != "PASS"


def weighted_scores(profile: str) -> dict[str, float]:
    weights = np.asarray(PROFILES[profile], dtype=np.float64)
    return {candidate: float(np.dot(weights, np.asarray(data["scores"], dtype=np.float64)) / 100.0) for candidate, data in CANDIDATES.items()}


def _pack(names: list[str], top1: np.ndarray, top3: np.ndarray, ranks: np.ndarray, score_sums: np.ndarray, pairs: np.ndarray, checkpoints: dict[str, dict[str, float]], samples: int) -> dict[str, Any]:
    return {
        "top1": {names[i]: float(top1[i] / samples) for i in range(len(names))},
        "top3": {names[i]: float(top3[i] / samples) for i in range(len(names))},
        "mean_rank": {names[i]: float(ranks[i] / samples) for i in range(len(names))},
        "mean_score": {names[i]: float(score_sums[i] / samples) for i in range(len(names))},
        "pairwise": {names[i]: {names[j]: (1.0 if i == j else float(pairs[i, j] / samples)) for j in range(len(names))} for i in range(len(names))},
        "checkpoints": checkpoints,
    }


def simulate_eligible(candidate_names: list[str], samples: int) -> tuple[dict[str, Any], dict[str, Any]]:
    score_matrix = np.asarray([CANDIDATES[name]["scores"] for name in candidate_names], dtype=np.float64)
    sigma = np.asarray([CANDIDATES[name]["sigma"] for name in candidate_names], dtype=np.float64)
    product_indices = [i for i, name in enumerate(candidate_names) if name != "hardening"]
    product_names = [candidate_names[i] for i in product_indices]
    all_results: dict[str, Any] = {}
    product_results: dict[str, Any] = {}

    for profile_index, (profile, raw_weights) in enumerate(PROFILES.items()):
        rng = np.random.default_rng(SEED + 1009 * (profile_index + 1))
        alpha = np.asarray(raw_weights, dtype=np.float64) / 100.0 * CONCENTRATION
        n = len(candidate_names)
        pn = len(product_names)
        top1, top3, rank_sum, score_sum = np.zeros(n, int), np.zeros(n, int), np.zeros(n), np.zeros(n)
        pairwise = np.zeros((n, n), int)
        p_top1, p_top3, p_rank_sum, p_score_sum = np.zeros(pn, int), np.zeros(pn, int), np.zeros(pn), np.zeros(pn)
        p_pairwise = np.zeros((pn, pn), int)
        checkpoints: dict[str, dict[str, float]] = {}
        product_checkpoints: dict[str, dict[str, float]] = {}
        processed = 0
        while processed < samples:
            batch = min(CHUNK_SIZE, samples - processed)
            weights = rng.dirichlet(alpha, size=batch)
            base_totals = weights @ score_matrix.T
            induced_scale = np.sqrt(np.sum(weights * weights, axis=1))[:, None] * sigma[None, :]
            totals = np.clip(base_totals + rng.normal(0.0, 1.0, size=base_totals.shape) * induced_scale, 0.0, 10.0)
            order = np.argsort(-totals, axis=1, kind="stable")
            top1 += np.bincount(order[:, 0], minlength=n)
            for column in range(min(3, n)):
                top3 += np.bincount(order[:, column], minlength=n)
            ranks = np.empty_like(order)
            rows = np.arange(batch)[:, None]
            ranks[rows, order] = np.arange(1, n + 1)
            rank_sum += ranks.sum(axis=0)
            score_sum += totals.sum(axis=0)
            for i in range(n):
                for j in range(i + 1, n):
                    wins = int(np.count_nonzero(totals[:, i] > totals[:, j]))
                    pairwise[i, j] += wins
                    pairwise[j, i] += batch - wins
            product_totals = totals[:, product_indices]
            p_order = np.argsort(-product_totals, axis=1, kind="stable")
            p_top1 += np.bincount(p_order[:, 0], minlength=pn)
            for column in range(min(3, pn)):
                p_top3 += np.bincount(p_order[:, column], minlength=pn)
            p_ranks = np.empty_like(p_order)
            p_ranks[rows, p_order] = np.arange(1, pn + 1)
            p_rank_sum += p_ranks.sum(axis=0)
            p_score_sum += product_totals.sum(axis=0)
            for i in range(pn):
                for j in range(i + 1, pn):
                    wins = int(np.count_nonzero(product_totals[:, i] > product_totals[:, j]))
                    p_pairwise[i, j] += wins
                    p_pairwise[j, i] += batch - wins
            processed += batch
            if processed in CHECKPOINTS:
                checkpoints[str(processed)] = {candidate_names[i]: float(top1[i] / processed) for i in range(n)}
                product_checkpoints[str(processed)] = {product_names[i]: float(p_top1[i] / processed) for i in range(pn)}
        all_results[profile] = _pack(candidate_names, top1, top3, rank_sum, score_sum, pairwise, checkpoints, samples)
        product_results[profile] = _pack(product_names, p_top1, p_top3, p_rank_sum, p_score_sum, p_pairwise, product_checkpoints, samples)
    return all_results, product_results


def conditional_diagnostic(candidate_names: list[str], samples: int = 100_000) -> dict[str, Any]:
    score_matrix = np.asarray([CANDIDATES[name]["scores"] for name in candidate_names], dtype=np.float64)
    sigma = np.asarray([CANDIDATES[name]["sigma"] for name in candidate_names], dtype=np.float64)
    output: dict[str, Any] = {}
    for profile_index, profile in enumerate(CANONICAL_PROFILES):
        rng = np.random.default_rng(SEED + 500_000 + 1009 * (profile_index + 1))
        alpha = np.asarray(PROFILES[profile], dtype=np.float64) / 100.0 * CONCENTRATION
        weights = rng.dirichlet(alpha, size=samples)
        base_totals = weights @ score_matrix.T
        induced_scale = np.sqrt(np.sum(weights * weights, axis=1))[:, None] * sigma[None, :]
        totals = np.clip(base_totals + rng.normal(0.0, 1.0, size=base_totals.shape) * induced_scale, 0.0, 10.0)
        winners = np.argmax(totals, axis=1)
        output[profile] = {"top1": {candidate_names[i]: float(np.count_nonzero(winners == i) / samples) for i in range(len(candidate_names))}}
    return {"samples_per_profile": samples, "profiles": output, "note": "Diagnostic prerequisite ranking only; conditional candidates remain ineligible."}


def aggregate_profiles(profile_results: dict[str, Any], selected_profiles: list[str]) -> dict[str, Any]:
    names = list(next(iter(profile_results.values()))["top1"])
    top1 = {name: float(np.mean([profile_results[p]["top1"][name] for p in selected_profiles])) for name in names}
    mean_rank = {name: float(np.mean([profile_results[p]["mean_rank"][name] for p in selected_profiles])) for name in names}
    ordered = sorted(names, key=lambda name: (-top1[name], mean_rank[name], name))
    winner, runner_up = ordered[0], ordered[1]
    minimum = min(profile_results[p]["top1"][winner] for p in selected_profiles)
    if top1[winner] >= 0.80 and minimum >= 0.55:
        stability = "ROBUST"
    elif top1[winner] >= 0.60:
        stability = "MODERATE"
    else:
        stability = "UNSTABLE"
    pairwise = float(np.mean([profile_results[p]["pairwise"][winner][runner_up] for p in selected_profiles]))
    drift = 0.0
    for profile in selected_profiles:
        final = profile_results[profile]["top1"][winner]
        for checkpoint in profile_results[profile]["checkpoints"].values():
            drift = max(drift, abs(checkpoint[winner] - final))
    return {"profiles": selected_profiles, "top1": top1, "mean_rank": mean_rank, "winner": winner, "runner_up": runner_up, "stability": stability, "minimum_winner_profile_top1": minimum, "pairwise_winner_vs_runner_up": pairwise, "max_convergence_drift": drift}


def build_results(samples: int) -> dict[str, Any]:
    validate_model()
    started = time.perf_counter()
    eligible = [name for name, outcome in OUTCOMES.items() if outcome == "PASS"]
    conditional = [name for name, outcome in OUTCOMES.items() if outcome == "CONDITIONAL"]
    eligible_results, product_only_results = simulate_eligible(eligible, samples)
    conditional_results = conditional_diagnostic(conditional)
    canonical = aggregate_profiles(eligible_results, CANONICAL_PROFILES)
    canonical_product_only = aggregate_profiles(product_only_results, CANONICAL_PROFILES)
    base_scores = weighted_scores("base")
    eligible_order = sorted(eligible, key=lambda name: (-base_scores[name], name))
    base_winner, base_runner_up = eligible_order[0], eligible_order[1]
    profile_winners = {profile: max(eligible, key=lambda name: (eligible_results[profile]["top1"][name], -eligible_results[profile]["mean_rank"][name], name)) for profile in PROFILES}
    return {"format_version": 1, "model_version": "task34-v1.0", "seed": SEED, "samples_per_profile": samples, "canonical_profiles": CANONICAL_PROFILES, "stress_profiles": STRESS_PROFILES, "total_profile_samples": samples * len(PROFILES), "method": {"weights": "Dirichlet positive normalized perturbation", "scores": "Gaussian aggregate perturbation using criterion-induced variance, clipped to [0,10]", "dirichlet_concentration": CONCENTRATION, "chunk_size": CHUNK_SIZE}, "environment": {"python": sys.version.split()[0], "numpy": np.__version__, "platform": platform.platform()}, "hard_filter_outcomes": OUTCOMES, "base_scores": base_scores, "base_eligible_winner": base_winner, "base_eligible_runner_up": base_runner_up, "base_lead": base_scores[base_winner] - base_scores[base_runner_up], "eligible": eligible, "conditional": conditional, "canonical_aggregate": canonical, "canonical_product_only": canonical_product_only, "conditional_diagnostic": conditional_results, "profile_winners": profile_winners, "profiles": eligible_results, "product_only_profiles": product_only_results, "runtime_seconds": time.perf_counter() - started, "interpretation": "Sensitivity analysis over disclosed expert assumptions; top-1 probability is not user-demand probability."}


def check_expected(results: dict[str, Any]) -> None:
    observed = {"winner": results["canonical_aggregate"]["winner"], "stability": results["canonical_aggregate"]["stability"], "canonical_aggregate_top1": results["canonical_aggregate"]["top1"][results["canonical_aggregate"]["winner"]], "base_score": results["base_scores"][results["base_eligible_winner"]], "base_lead": results["base_lead"]}
    for key in ("winner", "stability"):
        if observed[key] != EXPECTED[key]:
            raise SystemExit(f"{key} drift: observed={observed[key]!r}, expected={EXPECTED[key]!r}")
    for key in ("canonical_aggregate_top1", "base_score", "base_lead"):
        if not math.isclose(float(observed[key]), float(EXPECTED[key]), rel_tol=0.0, abs_tol=1e-12):
            raise SystemExit(f"{key} drift: observed={observed[key]!r}, expected={EXPECTED[key]!r}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=N_SAMPLES)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path, default=RESULT_PATH)
    args = parser.parse_args()
    if args.samples <= 0 or args.samples % CHUNK_SIZE != 0:
        raise SystemExit(f"samples must be a positive multiple of {CHUNK_SIZE}")
    results = build_results(args.samples)
    args.output.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.check:
        if args.samples != N_SAMPLES:
            raise SystemExit("--check requires the frozen one-million-sample run")
        check_expected(results)
    summary = {"winner": results["canonical_aggregate"]["winner"], "runner_up": results["canonical_aggregate"]["runner_up"], "stability": results["canonical_aggregate"]["stability"], "canonical_top1": results["canonical_aggregate"]["top1"][results["canonical_aggregate"]["winner"]], "base_score": results["base_scores"][results["base_eligible_winner"]], "base_lead": results["base_lead"], "pairwise_vs_runner_up": results["canonical_aggregate"]["pairwise_winner_vs_runner_up"], "max_convergence_drift": results["canonical_aggregate"]["max_convergence_drift"], "runtime_seconds": results["runtime_seconds"]}
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
