#!/usr/bin/env python3
"""
Post-Narrative Expansion Decision — sensitivity analysis
specs/013-post-narrative-expansion-decision/analysis.py

This is sensitivity analysis over disclosed expert assumptions,
not empirical user evidence.

Seed:    20260803
Samples: 1,000,000 per profile × 5 profiles = 5,000,000 total
Method:  Dirichlet weight perturbation × Gaussian score perturbation (clipped [0,10])
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import TypedDict

import numpy as np

# ── constants ────────────────────────────────────────────────────────────────

SEED = 20260803
N_SAMPLES = 1_000_000
CHUNK_SIZE = 100_000
CONVERGENCE_CHECKPOINTS = [100_000, 500_000, 1_000_000]

# Activation thresholds (all must be met simultaneously)
THRESHOLD_BASE_SCORE = 7.0
THRESHOLD_BASE_LEAD = 0.35
THRESHOLD_AGGREGATE_TOP1 = 0.55

# ── approved criteria (do not substitute) ────────────────────────────────────

CRITERIA: list[str] = [
    "immediate_user_value",        # 0  weight 16
    "workflow_frequency",          # 1  weight 10
    "differentiation",             # 2  weight 10
    "data_safety_reversibility",   # 3  weight 12
    "accessibility_feasibility",   # 4  weight  9
    "implementation_boundedness",  # 5  weight  9
    "maintenance_cost",            # 6  weight  8  (10=low burden, 0=extreme burden)
    "performance_feasibility",     # 7  weight  7
    "local_first_privacy",         # 8  weight  6
    "interoperability_backup",     # 9  weight  5
    "prerequisite_readiness",      # 10 weight  5
    "evidence_testability",        # 11 weight  3
]
assert len(CRITERIA) == 12

# ── profile weight vectors (each must sum exactly to 100) ─────────────────────

PROFILES: dict[str, list[int]] = {
    "base": [
        16, 10, 10, 12,  9,  9,  8,  7,  6,  5,  5,  3
    ],
    "utility_first": [
        # Increase: immediate_user_value, workflow_frequency, implementation_boundedness
        26, 18,  7,  9,  6, 15,  5,  5,  4,  2,  2,  1
    ],
    "visual_identity_first": [
        # Increase: differentiation, immediate_user_value (where appropriate)
        20,  7, 26,  9,  6,  7,  6,  5,  6,  4,  3,  1
    ],
    "safety_maintenance_first": [
        # Increase: data_safety_reversibility, accessibility_feasibility,
        #           maintenance_cost, performance_feasibility
        10,  6,  5, 20, 15,  7, 15, 12,  4,  3,  2,  1
    ],
    "recovery_readiness_first": [
        # Increase: data_safety_reversibility, interoperability_backup,
        #           evidence_testability, accessibility_feasibility
        10,  6,  5, 18, 13,  8,  8,  7,  5, 10,  7,  3
    ],
}

def _validate_profiles() -> None:
    assert len(PROFILES) == 5, "Exactly 5 profiles required"
    for name, w in PROFILES.items():
        assert len(w) == 12, f"{name}: expected 12 weights, got {len(w)}"
        assert sum(w) == 100, f"{name}: weights sum to {sum(w)}, expected 100"
    base = PROFILES["base"]
    approved = [16, 10, 10, 12, 9, 9, 8, 7, 6, 5, 5, 3]
    assert base == approved, f"Base profile does not match approved weights\ngot:      {base}\nexpected: {approved}"

_validate_profiles()

# ── 14 hard-filter outcomes ───────────────────────────────────────────────────
# PASS = all 14 filters clear; eligible for activation
# CONDITIONAL = one or more filters unresolved; ineligible for immediate activation
# FAIL = one or more filters definitively fail; ineligible

HARD_FILTER_OUTCOMES: dict[str, str] = {
    "multi_scene":      "PASS",         # all 14 PASS
    "template_system":  "CONDITIONAL",  # prerequisite_readiness, scope_boundedness, user_value unresolved
    "visual_worlds":    "CONDITIONAL",  # accessibility, performance, prerequisites unresolved
    "lossless_package": "CONDITIONAL",  # user_value vs existing export; duplication conditional
    "tags":             "CONDITIONAL",  # semantics, duplication, prerequisites unresolved
    "backlinks":        "FAIL",         # prerequisites: no approved link-creation model
    "task_life_rel":    "CONDITIONAL",  # cardinality/ownership/display semantics unresolved
    "noteboard":        "FAIL",         # pillar integrity, user_value, duplication
    "graph":            "FAIL",         # accessibility, prerequisites, duplication
    "score":            "FAIL",         # prerequisites (formula OPEN), evidence_testability
    "prediction":       "FAIL",         # prerequisites (insufficient history), evidence_testability
    "generic_outline":  "CONDITIONAL",  # role not resolved beyond Task 19 heading outline
    "hardening_slice":  "PASS",         # all 14 PASS
}

assert len(HARD_FILTER_OUTCOMES) == 13, "Exactly 13 candidates required"
for v in HARD_FILTER_OUTCOMES.values():
    assert v in {"PASS", "CONDITIONAL", "FAIL"}

ELIGIBLE: list[str] = [c for c, o in HARD_FILTER_OUTCOMES.items() if o == "PASS"]
COMPARISON: list[str] = [c for c, o in HARD_FILTER_OUTCOMES.items() if o != "FAIL"]

# ── candidate score vectors and uncertainty ───────────────────────────────────
# Scores on each approved criterion, [0–10].
# Higher is always better. For maintenance_cost: 10 = low burden, 0 = extreme burden.
# σ = epistemic uncertainty applied as Gaussian noise per criterion (clipped to [0,10]).

CANDIDATES: dict[str, dict] = {
    # ELIGIBLE
    "multi_scene": {
        "scores": [8, 7, 9, 7, 8, 8, 7, 8, 10,  8, 10,  8],
        "sigma": 0.65,
        "title": "Narrative Multi-Scene Composition",
    },
    "hardening_slice": {
        "scores": [6, 5, 3, 9, 9, 9, 9, 8, 10,  9, 10,  9],
        "sigma": 0.55,
        "title": "No Expansion / Core Evidence + Release Readiness Hardening",
    },
    # CONDITIONAL
    "template_system": {
        "scores": [5, 4, 8, 6, 7, 5, 5, 8, 10,  6,  3,  5],
        "sigma": 0.90,
        "title": "Narrative Template System",
    },
    "visual_worlds": {
        "scores": [6, 4, 10, 5, 4, 4, 4, 5, 10,  7,  3,  4],
        "sigma": 1.00,
        "title": "Visual Worlds",
    },
    "lossless_package": {
        "scores": [5, 4, 6, 8, 8, 7, 7, 8, 10, 10,  7,  8],
        "sigma": 0.70,
        "title": "Lossless Canvas Package",
    },
    "tags": {
        "scores": [5, 5, 5, 6, 8, 5, 5, 8, 10,  5,  4,  5],
        "sigma": 0.85,
        "title": "Tags",
    },
    "task_life_rel": {
        "scores": [7, 7, 6, 6, 8, 5, 6, 8, 10,  6,  4,  7],
        "sigma": 0.80,
        "title": "Task/Life Relationships",
    },
    "generic_outline": {
        "scores": [5, 5, 4, 9, 9, 7, 8, 9, 10,  8,  5,  9],
        "sigma": 0.65,
        "title": "Generic Outline",
    },
    # FAIL (scored for diagnostic comparison only)
    "backlinks": {
        "scores": [4, 3, 7, 5, 5, 4, 4, 6, 10,  4,  1,  4],
        "sigma": 0.85,
        "title": "Backlinks",
    },
    "noteboard": {
        "scores": [2, 2, 5, 5, 5, 4, 3, 5, 10,  4,  3,  4],
        "sigma": 0.70,
        "title": "Noteboard",
    },
    "graph": {
        "scores": [3, 2, 7, 3, 2, 2, 2, 2, 10,  3,  1,  3],
        "sigma": 0.70,
        "title": "Graph",
    },
    "score": {
        "scores": [4, 4, 5, 6, 7, 4, 5, 8, 10,  5,  2,  2],
        "sigma": 0.80,
        "title": "Score",
    },
    "prediction": {
        "scores": [3, 3, 6, 5, 7, 3, 3, 5, 10,  4,  1,  1],
        "sigma": 0.90,
        "title": "Prediction",
    },
}

assert set(CANDIDATES) == set(HARD_FILTER_OUTCOMES), "Candidate sets must match"
for c, d in CANDIDATES.items():
    assert len(d["scores"]) == 12, f"{c}: expected 12 scores"

# Candidate order for indexing (deterministic)
CAND_NAMES: list[str] = list(CANDIDATES.keys())
N_CAND = len(CAND_NAMES)
N_CRIT = len(CRITERIA)

# ── base score computation ────────────────────────────────────────────────────

def compute_base_score(scores: list[int], weights: list[int]) -> float:
    return sum(s * w for s, w in zip(scores, weights)) / sum(weights)


def all_base_scores(profile_name: str) -> dict[str, float]:
    w = PROFILES[profile_name]
    return {c: compute_base_score(CANDIDATES[c]["scores"], w) for c in CAND_NAMES}

# ── simulation ────────────────────────────────────────────────────────────────

class ProfileStats(TypedDict):
    mean_score_all: dict[str, float]
    mean_score_eligible: dict[str, float]
    top1_eligible: dict[str, float]
    top3_eligible: dict[str, float]
    pairwise_vs_base_winner: dict[str, float]
    mean_rank_eligible: dict[str, float]


def _run_profile_chunked(
    rng: np.random.Generator,
    base_scores: np.ndarray,   # (N_CAND, N_CRIT)
    sigmas: np.ndarray,        # (N_CAND,)
    alpha: np.ndarray,         # (N_CRIT,) Dirichlet concentration
    eligible_idx: list[int],
    base_winner_idx: int,
    n_samples: int,
    chunk_size: int,
    convergence_checkpoints: list[int],
) -> tuple[dict, dict]:
    """Returns (stats, convergence_data)."""
    n_elig = len(eligible_idx)
    eligible_arr = np.array(eligible_idx, dtype=np.int32)

    # Accumulators (all candidates)
    score_sum_all = np.zeros(N_CAND, dtype=np.float64)

    # Accumulators (eligible only)
    win_counts    = np.zeros(n_elig, dtype=np.int64)
    top3_counts   = np.zeros(n_elig, dtype=np.int64)
    rank_sum      = np.zeros(n_elig, dtype=np.int64)
    pw_vs_winner  = np.zeros(n_elig, dtype=np.int64)   # count when elig_i > base winner

    processed = 0
    convergence_data: dict[int, dict] = {}

    for start in range(0, n_samples, chunk_size):
        n = min(chunk_size, n_samples - start)

        # Dirichlet-perturbed weights: (n, N_CRIT), rows sum to 1
        w = rng.dirichlet(alpha, size=n)

        # Score noise: (n, N_CAND, N_CRIT)
        noise = rng.standard_normal((n, N_CAND, N_CRIT)) * sigmas[None, :, None]
        perturbed = np.clip(base_scores[None] + noise, 0.0, 10.0)

        # Weighted score: (n, N_CAND)
        ws = np.einsum("tc,tnc->tn", w, perturbed)

        # All-candidate score accumulation
        score_sum_all += ws.sum(axis=0)

        # Eligible-only slice
        ws_elig = ws[:, eligible_arr]  # (n, n_elig)

        # Top-1 among eligible
        elig_winner_pos = np.argmax(ws_elig, axis=1)   # (n,) — position in eligible_arr
        win_counts += np.bincount(elig_winner_pos, minlength=n_elig)

        # Rank among eligible (rank 1 = best)
        order = np.argsort(-ws_elig, axis=1)
        ranks = np.empty_like(order)
        rows = np.arange(n)[:, None]
        ranks[rows, order] = np.arange(1, n_elig + 1)[None, :]
        rank_sum += ranks.sum(axis=0)

        # Top-3 among eligible
        top3_counts += (ranks <= 3).sum(axis=0)

        # Pairwise vs base winner
        # base_winner_idx is index in CAND_NAMES; map to eligible position
        if base_winner_idx in eligible_arr:
            bw_pos = np.where(eligible_arr == base_winner_idx)[0][0]
            bw_score = ws_elig[:, bw_pos]
            for i in range(n_elig):
                pw_vs_winner[i] += (ws_elig[:, i] > bw_score).sum()

        processed += n

        # Convergence checkpoints
        for cp in convergence_checkpoints:
            if processed == cp:
                convergence_data[cp] = {
                    "top1_eligible": {
                        CAND_NAMES[eligible_arr[i]]: float(win_counts[i] / processed)
                        for i in range(n_elig)
                    }
                }

    stats: dict = {
        "mean_score_all": {CAND_NAMES[i]: float(score_sum_all[i] / n_samples) for i in range(N_CAND)},
        "mean_score_eligible": {
            CAND_NAMES[eligible_arr[i]]: float(score_sum_all[eligible_arr[i]] / n_samples)
            for i in range(n_elig)
        },
        "top1_eligible": {
            CAND_NAMES[eligible_arr[i]]: float(win_counts[i] / n_samples)
            for i in range(n_elig)
        },
        "top3_eligible": {
            CAND_NAMES[eligible_arr[i]]: float(top3_counts[i] / n_samples)
            for i in range(n_elig)
        },
        "pairwise_vs_base_winner": {
            CAND_NAMES[eligible_arr[i]]: float(pw_vs_winner[i] / n_samples)
            for i in range(n_elig)
        },
        "mean_rank_eligible": {
            CAND_NAMES[eligible_arr[i]]: float(rank_sum[i] / n_samples)
            for i in range(n_elig)
        },
    }
    return stats, convergence_data


# ── main simulation driver ────────────────────────────────────────────────────

def run_simulation() -> dict:
    rng = np.random.default_rng(SEED)

    base_scores_arr = np.array([CANDIDATES[c]["scores"] for c in CAND_NAMES], dtype=np.float64)
    sigmas_arr = np.array([CANDIDATES[c]["sigma"] for c in CAND_NAMES], dtype=np.float64)

    eligible_idx = [CAND_NAMES.index(c) for c in ELIGIBLE]

    # Determine base-profile winner among eligible
    base_elig_scores = {c: compute_base_score(CANDIDATES[c]["scores"], PROFILES["base"]) for c in ELIGIBLE}
    base_winner = max(base_elig_scores, key=lambda c: base_elig_scores[c])
    base_winner_idx = CAND_NAMES.index(base_winner)

    # Compute all base profile scores (for reporting)
    all_profile_base: dict[str, dict[str, float]] = {
        p: all_base_scores(p) for p in PROFILES
    }

    profile_results: dict[str, dict] = {}
    all_convergence: dict[str, dict] = {}

    for pname, pweights in PROFILES.items():
        alpha = np.array(pweights, dtype=np.float64)
        stats, conv = _run_profile_chunked(
            rng, base_scores_arr, sigmas_arr, alpha,
            eligible_idx, base_winner_idx,
            N_SAMPLES, CHUNK_SIZE, CONVERGENCE_CHECKPOINTS,
        )
        profile_results[pname] = stats
        all_convergence[pname] = {str(k): v for k, v in conv.items()}

    # ── aggregate across profiles ─────────────────────────────────────────────
    n_profiles = len(PROFILES)

    agg_top1: dict[str, float] = {c: 0.0 for c in ELIGIBLE}
    agg_top3: dict[str, float] = {c: 0.0 for c in ELIGIBLE}
    agg_mean: dict[str, float] = {c: 0.0 for c in ELIGIBLE}
    agg_rank: dict[str, float] = {c: 0.0 for c in ELIGIBLE}
    agg_pw:   dict[str, float] = {c: 0.0 for c in ELIGIBLE}

    for pr in profile_results.values():
        for c in ELIGIBLE:
            agg_top1[c] += pr["top1_eligible"][c] / n_profiles
            agg_top3[c] += pr["top3_eligible"][c] / n_profiles
            agg_mean[c] += pr["mean_score_eligible"][c] / n_profiles
            agg_rank[c] += pr["mean_rank_eligible"][c] / n_profiles
            agg_pw[c]   += pr["pairwise_vs_base_winner"][c] / n_profiles

    ranked_eligible = sorted(ELIGIBLE, key=lambda c: agg_mean[c], reverse=True)
    agg_winner = ranked_eligible[0]
    agg_runner_up = ranked_eligible[1] if len(ranked_eligible) > 1 else None

    # ── base-profile specific metrics (activation gate uses BASE lead) ────────
    base_scores_elig = {c: compute_base_score(CANDIDATES[c]["scores"], PROFILES["base"]) for c in ELIGIBLE}
    ranked_base_elig = sorted(ELIGIBLE, key=lambda c: base_scores_elig[c], reverse=True)
    base_winner_cand = ranked_base_elig[0]
    base_runner_up_cand = ranked_base_elig[1] if len(ranked_base_elig) > 1 else None

    base_score_winner = base_scores_elig[base_winner_cand]
    base_score_runner_up = base_scores_elig[base_runner_up_cand] if base_runner_up_cand else None
    base_lead = (base_score_winner - base_score_runner_up) if base_score_runner_up is not None else None

    # ── activation gate ───────────────────────────────────────────────────────
    activation_checks: dict[str, dict] = {
        "base_score_above_threshold": {
            "value": base_score_winner,
            "threshold": THRESHOLD_BASE_SCORE,
            "pass": base_score_winner >= THRESHOLD_BASE_SCORE,
        },
        "base_lead_above_threshold": {
            "value": base_lead,
            "threshold": THRESHOLD_BASE_LEAD,
            "pass": (base_lead is not None and base_lead >= THRESHOLD_BASE_LEAD),
        },
        "aggregate_top1_above_threshold": {
            "value": agg_top1.get(agg_winner, 0.0),
            "threshold": THRESHOLD_AGGREGATE_TOP1,
            "pass": agg_top1.get(agg_winner, 0.0) >= THRESHOLD_AGGREGATE_TOP1,
        },
        "eligible_candidates_exist": {
            "value": len(ELIGIBLE),
            "threshold": 1,
            "pass": len(ELIGIBLE) >= 1,
        },
    }

    all_thresholds_met = all(v["pass"] for v in activation_checks.values())
    activate_next = base_winner_cand if all_thresholds_met else "NO_ACTIVATION"

    # Reason for NO_ACTIVATION if applicable
    no_activation_reason: str | None = None
    if not all_thresholds_met:
        failing = [k for k, v in activation_checks.items() if not v["pass"]]
        no_activation_reason = f"Threshold(s) not met: {', '.join(failing)}"

    # ── unadjusted diagnostic (all non-FAIL candidates treated as eligible) ──
    comparison_idx = [CAND_NAMES.index(c) for c in COMPARISON]
    unadj_base = sorted(COMPARISON, key=lambda c: compute_base_score(CANDIDATES[c]["scores"], PROFILES["base"]), reverse=True)
    unadj_winner = unadj_base[0]
    unadj_runner_up = unadj_base[1] if len(unadj_base) > 1 else None

    # ── convergence assessment ────────────────────────────────────────────────
    # Drift is measured within each profile across checkpoints (not across profiles).
    # A profile's win probability is expected to vary across profiles by design.
    convergence_within_tolerance = True
    convergence_max_drift: dict[str, float] = {}
    for c in ELIGIBLE:
        max_per_profile_drift = 0.0
        for pname, conv in all_convergence.items():
            vals = []
            for cp in CONVERGENCE_CHECKPOINTS:
                key = str(cp)
                if key in conv and c in conv[key]["top1_eligible"]:
                    vals.append(conv[key]["top1_eligible"][c])
            if len(vals) >= 2:
                drift = max(vals) - min(vals)
                max_per_profile_drift = max(max_per_profile_drift, drift)
        convergence_max_drift[c] = max_per_profile_drift
        if max_per_profile_drift > 0.05:
            convergence_within_tolerance = False

    return {
        "meta": {
            "seed": SEED,
            "n_samples_per_profile": N_SAMPLES,
            "n_profiles": n_profiles,
            "n_candidates": N_CAND,
            "n_eligible": len(ELIGIBLE),
            "description": (
                "This is sensitivity analysis over disclosed expert assumptions, "
                "not empirical user evidence."
            ),
        },
        "criteria": CRITERIA,
        "approved_base_weights": PROFILES["base"],
        "candidates": {
            c: {
                "title": CANDIDATES[c]["title"],
                "hard_filter_outcome": HARD_FILTER_OUTCOMES[c],
                "base_scores": CANDIDATES[c]["scores"],
                "sigma": CANDIDATES[c]["sigma"],
                "base_weighted_score": {
                    p: compute_base_score(CANDIDATES[c]["scores"], PROFILES[p])
                    for p in PROFILES
                },
            }
            for c in CAND_NAMES
        },
        "eligible_candidates": ELIGIBLE,
        "comparison_candidates": COMPARISON,
        "profiles": {p: PROFILES[p] for p in PROFILES},
        "per_profile_base_scores": all_profile_base,
        "profile_simulation_results": profile_results,
        "aggregate_eligible": {
            "top1_probability": agg_top1,
            "top3_probability": agg_top3,
            "mean_weighted_score": agg_mean,
            "mean_rank": agg_rank,
            "pairwise_vs_base_winner": agg_pw,
            "ranked": ranked_eligible,
        },
        "base_profile_eligible": {
            "scores": base_scores_elig,
            "ranked": ranked_base_elig,
            "winner": base_winner_cand,
            "runner_up": base_runner_up_cand,
            "winner_score": base_score_winner,
            "runner_up_score": base_score_runner_up,
            "lead": base_lead,
        },
        "unadjusted_diagnostic": {
            "note": (
                "Diagnostic only — includes CONDITIONAL candidates as if eligible. "
                "Not used for activation decision."
            ),
            "base_ranked": unadj_base,
            "base_winner": unadj_winner,
            "base_runner_up": unadj_runner_up,
            "base_scores": {
                c: compute_base_score(CANDIDATES[c]["scores"], PROFILES["base"])
                for c in COMPARISON
            },
        },
        "convergence": {
            "checkpoints": CONVERGENCE_CHECKPOINTS,
            "per_profile": all_convergence,
            "max_drift_per_eligible_candidate": convergence_max_drift,
            "within_tolerance": convergence_within_tolerance,
        },
        "activation_checks": activation_checks,
        "decision": {
            "activate_next": activate_next,
            "base_winner": base_winner_cand,
            "base_runner_up": base_runner_up_cand,
            "base_winner_score": base_score_winner,
            "base_runner_up_score": base_score_runner_up,
            "base_lead": base_lead,
            "aggregate_top1": agg_top1.get(agg_winner, 0.0),
            "aggregate_mean_winner": agg_mean.get(agg_winner, 0.0),
            "no_activation_reason": no_activation_reason,
            "thresholds": {
                "base_score": THRESHOLD_BASE_SCORE,
                "base_lead": THRESHOLD_BASE_LEAD,
                "aggregate_top1": THRESHOLD_AGGREGATE_TOP1,
            },
        },
    }

# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Post-narrative expansion sensitivity analysis"
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent / "results.json"),
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help=(
            "Validate results.json. Passes when either: "
            "(a) activate_next is a named candidate and all thresholds are met, "
            "or (b) activate_next is NO_ACTIVATION with a documented reason. "
            "Does NOT require a specific candidate name."
        ),
    )
    args = parser.parse_args()

    if args.check:
        p = Path(args.output)
        if not p.exists():
            print(f"ERROR: {p} not found — run without --check first.", file=sys.stderr)
            sys.exit(1)
        with open(p) as f:
            data = json.load(f)

        ok = True
        d = data["decision"]
        checks = data.get("activation_checks", {})
        meta = data.get("meta", {})
        conv = data.get("convergence", {})

        # Seed and sample count
        if meta.get("seed") != SEED:
            print(f"FAIL seed: {meta.get('seed')} != {SEED}", file=sys.stderr)
            ok = False
        if meta.get("n_samples_per_profile") != N_SAMPLES:
            print(f"FAIL samples: {meta.get('n_samples_per_profile')} != {N_SAMPLES}", file=sys.stderr)
            ok = False
        if meta.get("n_profiles") != 5:
            print(f"FAIL profiles: {meta.get('n_profiles')} != 5", file=sys.stderr)
            ok = False
        if meta.get("n_candidates") != 13:
            print(f"FAIL candidates: {meta.get('n_candidates')} != 13", file=sys.stderr)
            ok = False

        # Result consistency
        activate = d.get("activate_next", "")
        if activate == "NO_ACTIVATION":
            reason = d.get("no_activation_reason") or ""
            if not reason:
                print("FAIL NO_ACTIVATION missing reason", file=sys.stderr)
                ok = False
            else:
                print(f"OK  NO_ACTIVATION: {reason}")
        else:
            # Named activation — verify all thresholds passed
            for check_name, check_data in checks.items():
                if not check_data.get("pass", False):
                    print(
                        f"FAIL threshold {check_name}: "
                        f"value={check_data.get('value')} "
                        f"threshold={check_data.get('threshold')}",
                        file=sys.stderr,
                    )
                    ok = False
            if ok:
                print(
                    f"OK  activate_next={activate}  "
                    f"base_score={d.get('base_winner_score', 0):.4f}  "
                    f"base_lead={d.get('base_lead', 0):.4f}  "
                    f"agg_top1={d.get('aggregate_top1', 0):.4f}"
                )

        # Convergence
        if not conv.get("within_tolerance", True):
            print(
                f"WARN convergence drift exceeds 5%: {conv.get('max_drift_per_eligible_candidate')}",
                file=sys.stderr,
            )

        # Eligible candidates
        eligible_in_results = data.get("eligible_candidates", [])
        if set(eligible_in_results) != set(ELIGIBLE):
            print(
                f"FAIL eligible mismatch: got {sorted(eligible_in_results)}, expected {sorted(ELIGIBLE)}",
                file=sys.stderr,
            )
            ok = False

        sys.exit(0 if ok else 1)

    total = N_SAMPLES * len(PROFILES)
    print(
        f"Running {N_SAMPLES:,} samples x {len(PROFILES)} profiles = {total:,} total "
        f"(seed={SEED}, {len(ELIGIBLE)} eligible, {N_CAND} total) ...",
        flush=True,
    )
    results = run_simulation()
    d = results["decision"]

    out = Path(args.output)
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Written -> {out}")
    print(
        f"Decision: activate_next={d['activate_next']}  "
        f"base_score={d.get('base_winner_score', 0):.4f}  "
        f"base_lead={d.get('base_lead', 0):.4f}  "
        f"agg_top1={d.get('aggregate_top1', 0):.4f}"
    )


if __name__ == "__main__":
    main()
