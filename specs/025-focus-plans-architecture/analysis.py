#!/usr/bin/env python3
"""Deterministic Task 35 decision and sensitivity analysis."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

from analysis_data import *  # noqa: F401,F403

RESULT_PATH = Path(__file__).with_name("analysis-results.json")

class RNG:
    """Fixed xorshift64* PRNG with deterministic Box-Muller normals."""
    def __init__(self, seed: int) -> None:
        self.state = seed & ((1 << 64) - 1)
        self.cached: float | None = None

    def uniform(self) -> float:
        x = self.state
        x ^= (x >> 12) & ((1 << 64) - 1)
        x ^= (x << 25) & ((1 << 64) - 1)
        x ^= (x >> 27) & ((1 << 64) - 1)
        self.state = x
        value = (x * 2685821657736338717) & ((1 << 64) - 1)
        return (value + 1) / ((1 << 64) + 2)

    def normal(self) -> float:
        if self.cached is not None:
            value = self.cached
            self.cached = None
            return value
        radius = math.sqrt(-2.0 * math.log(self.uniform()))
        angle = 2.0 * math.pi * self.uniform()
        self.cached = radius * math.sin(angle)
        return radius * math.cos(angle)


def weighted_score(candidate: str, weights: dict[str, int]) -> float:
    return sum(weights[key] * SCORES[candidate][key] for key in CRITERIA) / 100.0


def aggregate_sigma(candidate: str, weights: dict[str, int]) -> float:
    return math.sqrt(sum(
        ((weights[key] / 100.0) * SIGMA[candidate][key]) ** 2
        for key in CRITERIA
    ))


def classification(candidate: str) -> str:
    values = HARD_FILTERS[candidate].values()
    if "FAIL" in values:
        return "FAIL"
    if "CONDITIONAL" in values:
        return "CONDITIONAL"
    return "PASS"


def run_profile(
    name: str,
    weights: dict[str, int],
    samples: int,
    seed_offset: int,
) -> dict[str, Any]:
    candidates = tuple(SCORES)
    means = {candidate: weighted_score(candidate, weights) for candidate in candidates}
    sigmas = {candidate: aggregate_sigma(candidate, weights) for candidate in candidates}
    rng = RNG(SEED + seed_offset)
    wins = {candidate: 0 for candidate in candidates}
    eligible_wins = {candidate: 0 for candidate in candidates}
    pairwise_b_over_c = 0
    pairwise_b_over_a = 0
    checkpoints = []
    checkpoint_targets = {samples // 4, samples // 2, (3 * samples) // 4, samples}

    for index in range(1, samples + 1):
        values = {
            candidate: means[candidate] + sigmas[candidate] * rng.normal()
            for candidate in candidates
        }
        winner = max(candidates, key=lambda candidate: (values[candidate], candidate))
        wins[winner] += 1
        eligible = [candidate for candidate in candidates if classification(candidate) == "PASS"]
        eligible_winner = max(eligible, key=lambda candidate: (values[candidate], candidate))
        eligible_wins[eligible_winner] += 1
        if values["B_standalone_entity"] > values["C_basic_leaf_template"]:
            pairwise_b_over_c += 1
        if values["B_standalone_entity"] > values["A_life_document"]:
            pairwise_b_over_a += 1
        if index in checkpoint_targets:
            checkpoints.append({
                "samples": index,
                "top1": {
                    candidate: round(wins[candidate] / index, 9)
                    for candidate in candidates
                },
            })

    return {
        "name": name,
        "weights": weights,
        "means": {key: round(value, 6) for key, value in means.items()},
        "aggregate_sigma": {key: round(value, 6) for key, value in sigmas.items()},
        "top1_all_options": {
            candidate: round(wins[candidate] / samples, 9)
            for candidate in candidates
        },
        "top1_eligible": {
            candidate: round(eligible_wins[candidate] / samples, 9)
            for candidate in candidates
        },
        "pairwise_b_over_c": round(pairwise_b_over_c / samples, 9),
        "pairwise_b_over_a": round(pairwise_b_over_a / samples, 9),
        "checkpoints": checkpoints,
    }


def generate(samples: int = SAMPLES_PER_PROFILE) -> dict[str, Any]:
    for name, weights in {**PROFILES, **STRESS_PROFILES}.items():
        if set(weights) != set(CRITERIA) or sum(weights.values()) != 100:
            raise ValueError(f"invalid profile {name}")
    if sum(BASE_WEIGHTS.values()) != 100:
        raise ValueError("base weights do not sum to 100")

    base_scores = {
        candidate: round(weighted_score(candidate, BASE_WEIGHTS), 6)
        for candidate in SCORES
    }
    ranked = sorted(base_scores, key=lambda candidate: (-base_scores[candidate], candidate))
    canonical = [
        run_profile(name, weights, samples, index * 1009)
        for index, (name, weights) in enumerate(PROFILES.items(), 1)
    ]
    stress = [
        run_profile(name, weights, samples, 100_000 + index * 1009)
        for index, (name, weights) in enumerate(STRESS_PROFILES.items(), 1)
    ]
    b_min = min(profile["top1_all_options"]["B_standalone_entity"] for profile in canonical)
    max_drift = 0.0
    for profile in canonical:
        final = profile["checkpoints"][-1]["top1"]["B_standalone_entity"]
        for checkpoint in profile["checkpoints"][:-1]:
            max_drift = max(max_drift, abs(
                checkpoint["top1"]["B_standalone_entity"] - final
            ))

    eligible_candidates = [
        candidate for candidate in SCORES if classification(candidate) == "PASS"
    ]
    if not eligible_candidates:
        raise AssertionError("no directly eligible option")
    selected = max(
        eligible_candidates,
        key=lambda candidate: (base_scores[candidate], candidate),
    )
    stability = "ROBUST" if b_min >= 0.80 and max_drift <= 0.01 else (
        "MODERATE" if b_min >= 0.60 else "UNSTABLE"
    )

    return {
        "format_version": 1,
        "model": "task35-focus-plans-v1.0",
        "seed": SEED,
        "samples_per_profile": samples,
        "canonical_profile_count": len(canonical),
        "stress_profile_count": len(stress),
        "criteria": list(CRITERIA),
        "base_weights": BASE_WEIGHTS,
        "hard_filter_classification": {
            candidate: classification(candidate) for candidate in SCORES
        },
        "base_scores": base_scores,
        "base_ranking": ranked,
        "base_lead_b_over_runner_up": round(
            base_scores[selected] - max(
                score for candidate, score in base_scores.items() if candidate != selected
            ), 6
        ),
        "canonical_profiles": canonical,
        "stress_profiles": stress,
        "selected_option": selected,
        "selected_option_stability": stability,
        "minimum_canonical_b_top1": round(b_min, 9),
        "maximum_convergence_drift": round(max_drift, 9),
        "decision": "SELECT_STANDALONE_FOCUS_PLAN_ENTITY",
        "task36_candidate": "standalone_focus_plan_core",
        "warning": (
            "Monte Carlo values express model sensitivity, not empirical adoption "
            "or product-success probabilities."
        ),
    }



def compact_results(results: dict[str, Any]) -> dict[str, Any]:
    """Return the canonical committed evidence without bulky reproducible inputs."""
    def compact_profile(profile: dict[str, Any]) -> dict[str, Any]:
        return {
            "name": profile["name"],
            "means": profile["means"],
            "top1_all_options": profile["top1_all_options"],
            "pairwise_b_over_a": profile["pairwise_b_over_a"],
            "pairwise_b_over_c": profile["pairwise_b_over_c"],
            "final_checkpoint": profile["checkpoints"][-1],
        }
    return {
        "format_version": results["format_version"],
        "model": results["model"],
        "seed": results["seed"],
        "samples_per_profile": results["samples_per_profile"],
        "criteria": results["criteria"],
        "base_weights": results["base_weights"],
        "hard_filter_classification": results["hard_filter_classification"],
        "base_scores": results["base_scores"],
        "base_ranking": results["base_ranking"],
        "base_lead_b_over_runner_up": results["base_lead_b_over_runner_up"],
        "canonical_profile_count": results["canonical_profile_count"],
        "stress_profile_count": results["stress_profile_count"],
        "canonical_profiles": [compact_profile(p) for p in results["canonical_profiles"]],
        "stress_profiles": [compact_profile(p) for p in results["stress_profiles"]],
        "selected_option": results["selected_option"],
        "selected_option_stability": results["selected_option_stability"],
        "minimum_canonical_b_top1": results["minimum_canonical_b_top1"],
        "maximum_convergence_drift": results["maximum_convergence_drift"],
        "decision": results["decision"],
        "task36_candidate": results["task36_candidate"],
        "warning": results["warning"],
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--samples", type=int, default=SAMPLES_PER_PROFILE)
    args = parser.parse_args()
    results = generate(args.samples)
    committed = compact_results(results)
    text = json.dumps(committed, ensure_ascii=False, indent=2, sort_keys=True) + "\n"

    if args.check:
        if not RESULT_PATH.exists() or RESULT_PATH.read_text(encoding="utf-8") != text:
            print("analysis-results.json is stale")
            return 1
        print(
            f"Task 35 analysis check passed: {len(PROFILES)} canonical profiles, "
            f"{args.samples} samples/profile"
        )
        return 0

    RESULT_PATH.write_text(text, encoding="utf-8", newline="\n")
    print(f"Wrote {RESULT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
