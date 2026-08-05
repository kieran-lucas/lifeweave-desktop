#!/usr/bin/env python3
"""Deterministic sensitivity analysis for Task 35."""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Any

from analysis_data import *  # noqa: F401,F403

RESULT_PATH = Path(__file__).with_name("analysis-results.json")


def weighted_score(candidate: str, profile: dict[str, int]) -> float:
    return sum(profile[key] * SCORES[candidate][key] for key in CRITERIA) / 100.0


def classification(candidate: str) -> str:
    values = HARD_FILTERS[candidate].values()
    if "FAIL" in values: return "FAIL"
    if "CONDITIONAL" in values: return "CONDITIONAL"
    return "PASS"


def aggregate_sigma(candidate: str, profile: dict[str, int]) -> float:
    return math.sqrt(sum(((profile[key] / 100.0) * SIGMA[candidate][key]) ** 2 for key in CRITERIA))


def run_profile(name: str, profile: dict[str, int], samples: int, seed_offset: int) -> dict[str, Any]:
    rng = random.Random(SEED + seed_offset)
    candidates = tuple(SCORES)
    means = {candidate: weighted_score(candidate, profile) for candidate in candidates}
    sigmas = {candidate: aggregate_sigma(candidate, profile) for candidate in candidates}
    wins = {candidate: 0 for candidate in candidates}
    pair_b_c = pair_b_a = 0
    checkpoints = []
    marks = {samples // 4, samples // 2, samples * 3 // 4, samples}
    for index in range(1, samples + 1):
        values = {candidate: means[candidate] + rng.gauss(0.0, sigmas[candidate]) for candidate in candidates}
        winner = max(candidates, key=lambda candidate: (values[candidate], candidate)); wins[winner] += 1
        pair_b_c += values["B_standalone_entity"] > values["C_basic_leaf_template"]
        pair_b_a += values["B_standalone_entity"] > values["A_life_document"]
        if index in marks:
            checkpoints.append({"samples": index, "top1": {candidate: round(wins[candidate] / index, 9) for candidate in candidates}})
    return {
        "name": name,
        "weights": profile,
        "means": {key: round(value, 6) for key, value in means.items()},
        "aggregate_sigma": {key: round(value, 6) for key, value in sigmas.items()},
        "top1_all_options": {candidate: round(wins[candidate] / samples, 9) for candidate in candidates},
        "pairwise_b_over_c": round(pair_b_c / samples, 9),
        "pairwise_b_over_a": round(pair_b_a / samples, 9),
        "checkpoints": checkpoints,
    }


def generate(samples: int = SAMPLES_PER_PROFILE) -> dict[str, Any]:
    canonical = [run_profile(name, profile, samples, index * 1009) for index, (name, profile) in enumerate(PROFILES.items(), 1)]
    stress = [run_profile(name, profile, samples, 100_000 + index * 1009) for index, (name, profile) in enumerate(STRESS_PROFILES.items(), 1)]
    base_scores = {candidate: round(weighted_score(candidate, BASE_WEIGHTS), 6) for candidate in SCORES}
    eligible = [candidate for candidate in SCORES if classification(candidate) == "PASS"]
    selected = max(eligible, key=lambda candidate: (base_scores[candidate], candidate))
    b_min = min(row["top1_all_options"]["B_standalone_entity"] for row in canonical)
    drift = max(abs(point["top1"]["B_standalone_entity"] - row["top1_all_options"]["B_standalone_entity"]) for row in canonical for point in row["checkpoints"][:-1])
    return {
        "format_version": 2,
        "model": "task35-focus-plans-v2.0",
        "seed": SEED,
        "samples_per_profile": samples,
        "canonical_profile_count": len(canonical),
        "stress_profile_count": len(stress),
        "criteria": list(CRITERIA),
        "base_weights": BASE_WEIGHTS,
        "hard_filter_classification": {candidate: classification(candidate) for candidate in SCORES},
        "base_scores": base_scores,
        "base_ranking": sorted(base_scores, key=lambda candidate: (-base_scores[candidate], candidate)),
        "base_lead_b_over_runner_up": round(base_scores[selected] - max(score for candidate, score in base_scores.items() if candidate != selected), 6),
        "canonical_profiles": canonical,
        "stress_profiles": stress,
        "selected_option": selected,
        "selected_option_stability": "ROBUST" if b_min >= 0.80 and drift <= 0.01 else "MODERATE",
        "minimum_canonical_b_top1": round(b_min, 9),
        "maximum_convergence_drift": round(drift, 9),
        "decision": "SELECT_STANDALONE_FOCUS_PLAN_ENTITY",
        "task36_candidate": "standalone_focus_plan_core",
        "warning": "Monte Carlo values express model sensitivity, not empirical adoption or product-success probabilities.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--check", action="store_true"); parser.add_argument("--samples", type=int, default=SAMPLES_PER_PROFILE); args = parser.parse_args()
    text = json.dumps(generate(args.samples), ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.check:
        if not RESULT_PATH.exists() or RESULT_PATH.read_text(encoding="utf-8") != text:
            print("analysis-results.json is stale"); return 1
        print(f"Task 35 analysis check passed: {len(PROFILES)} canonical profiles; {args.samples} samples/profile")
        return 0
    RESULT_PATH.write_text(text, encoding="utf-8", newline="\n"); print(f"Wrote {RESULT_PATH}"); return 0


if __name__ == "__main__":
    raise SystemExit(main())
