#!/usr/bin/env python3
"""
Expansion portfolio sensitivity analysis — specs/013-post-narrative-expansion-decision

Seed:    20260803
Samples: 1,000,000 per profile × 5 profiles = 5,000,000 total
Method:  Dirichlet weight perturbation × Gaussian score perturbation (clipped to [0,10])
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

# ── constants ────────────────────────────────────────────────────────────────

SEED = 20260803
N_SAMPLES = 1_000_000
CHUNK_SIZE = 100_000
ACTIVATE_THRESHOLD = 7.0
LEAD_REQUIRED = 0.35

# 12 evaluation criteria (index order matches all weight/score vectors)
CRITERIA: list[str] = [
    "user_value",            # 0  daily productivity gain for the user
    "mission_alignment",     # 1  fit with life-and-tasks personal OS mission
    "identity_fit",          # 2  visual / emotional resonance with product vision
    "engineering_simplicity",# 3  small diff, few new abstractions
    "schema_stability",      # 4  migration complexity (low = stable)
    "integration_coherence", # 5  composability with existing features
    "maintenance_inv",       # 6  inverted maintenance burden (high = low burden)
    "reversibility",         # 7  ease of removal or redesign later
    "narrative_compat",      # 8  works with current single-scene Canvas schema
    "impl_risk_inv",         # 9  inverted implementation risk (high = low risk)
    "data_risk_inv",         # 10 inverted data-recovery risk
    "dep_risk_inv",          # 11 inverted dependency risk
]

# Profile weight vectors — integers summing to ~100; used directly as Dirichlet α
PROFILES: dict[str, list[int]] = {
    "base":                     [16, 10, 10, 12,  9,  9,  8,  7,  6,  5,  5,  3],
    "utility_first":            [25, 20,  8, 10,  7,  7,  6,  5,  4,  4,  2,  2],
    "visual_identity_first":    [12,  7, 25, 10,  8,  7,  7,  7,  5,  4,  5,  3],
    "safety_maintenance_first": [10,  7,  5, 25,  8,  8, 18,  7,  4,  4,  2,  2],
    "recovery_readiness_first": [10,  7,  6, 15,  8, 10,  8,  7,  5, 10, 10,  4],
}

# Candidate per-criterion scores [0–10] and overall score uncertainty σ
# Score σ represents epistemic uncertainty in the score vector (same σ applied to each criterion).
CANDIDATES: dict[str, dict] = {
    "multi_scene":      {"scores": [8, 7, 9, 7, 7, 7, 7, 9, 10, 7, 9, 8], "sigma": 0.60},
    "task_life_rel":    {"scores": [7, 5, 7, 8, 8, 7, 7, 9, 10, 7, 9, 7], "sigma": 0.70},
    "generic_outline":  {"scores": [5, 5, 4, 9, 8, 8, 8, 9, 10, 9, 6, 8], "sigma": 0.55},
    "no_expansion":     {"scores": [4, 6, 1, 9, 8, 9, 9, 7, 10, 8, 10, 8], "sigma": 0.40},
    "lossless_package": {"scores": [5, 3, 6, 8, 8, 7, 7, 8,  9, 9,  8, 7], "sigma": 0.70},
    "tags":             {"scores": [6, 6, 5, 7, 8, 6, 6, 8, 10, 6,  6, 7], "sigma": 0.75},
}

# ── simulation ───────────────────────────────────────────────────────────────

def _run_profile(
    rng: np.random.Generator,
    base_scores: np.ndarray,   # (n_cand, n_crit)
    sigmas: np.ndarray,        # (n_cand,)
    alpha: np.ndarray,         # (n_crit,) Dirichlet concentration
    n_samples: int,
    threshold: float,
    chunk_size: int,
) -> dict:
    n_cand, n_crit = base_scores.shape
    win_counts = np.zeros(n_cand, dtype=np.int64)
    score_sum  = np.zeros(n_cand, dtype=np.float64)
    above_thr  = np.zeros(n_cand, dtype=np.int64)
    rank_sum   = np.zeros(n_cand, dtype=np.int64)

    for start in range(0, n_samples, chunk_size):
        n = min(chunk_size, n_samples - start)

        # Dirichlet-perturbed weights: (n, n_crit), rows sum to 1
        w = rng.dirichlet(alpha, size=n)

        # Gaussian score noise: (n, n_cand, n_crit)
        noise = rng.standard_normal((n, n_cand, n_crit)) * sigmas[None, :, None]
        perturbed = np.clip(base_scores[None] + noise, 0.0, 10.0)

        # Weighted score for each sample × candidate: (n, n_cand)
        ws = np.einsum("tc,tnc->tn", w, perturbed)

        # Accumulate statistics
        win_counts += np.bincount(np.argmax(ws, axis=1), minlength=n_cand)
        score_sum  += ws.sum(axis=0)
        above_thr  += (ws > threshold).sum(axis=0).astype(np.int64)

        # Rank 1 = best score; build rank matrix via argsort trick
        order = np.argsort(-ws, axis=1)          # (n, n_cand) descending
        ranks = np.empty_like(order)
        rows  = np.arange(n)[:, None]
        ranks[rows, order] = np.arange(1, n_cand + 1)[None, :]
        rank_sum += ranks.sum(axis=0)

    return {
        "win_probability":    (win_counts / n_samples).tolist(),
        "mean_weighted_score":(score_sum  / n_samples).tolist(),
        "p_above_threshold":  (above_thr  / n_samples).tolist(),
        "mean_rank":          (rank_sum   / n_samples).tolist(),
    }


def run_simulation() -> dict:
    rng = np.random.default_rng(SEED)
    cand_names  = list(CANDIDATES.keys())
    base_scores = np.array([CANDIDATES[c]["scores"] for c in cand_names], dtype=np.float64)
    sigmas      = np.array([CANDIDATES[c]["sigma"]  for c in cand_names], dtype=np.float64)

    profile_results: dict[str, dict] = {}
    for pname, pweights in PROFILES.items():
        alpha = np.array(pweights, dtype=np.float64)
        raw = _run_profile(rng, base_scores, sigmas, alpha, N_SAMPLES, ACTIVATE_THRESHOLD, CHUNK_SIZE)
        # Store as candidate-keyed dicts
        profile_results[pname] = {
            key: {cand_names[i]: raw[key][i] for i in range(len(cand_names))}
            for key in raw
        }

    # Aggregate across profiles (equal weight per profile)
    n_profiles  = len(PROFILES)
    agg_win     = {c: sum(profile_results[p]["win_probability"][c]    for p in PROFILES) / n_profiles for c in cand_names}
    agg_score   = {c: sum(profile_results[p]["mean_weighted_score"][c] for p in PROFILES) / n_profiles for c in cand_names}
    agg_p_thr   = {c: sum(profile_results[p]["p_above_threshold"][c]   for p in PROFILES) / n_profiles for c in cand_names}
    agg_rank    = {c: sum(profile_results[p]["mean_rank"][c]           for p in PROFILES) / n_profiles for c in cand_names}

    ranked = sorted(cand_names, key=lambda c: agg_score[c], reverse=True)
    winner      = ranked[0]
    runner_up   = ranked[1]
    lead        = agg_score[winner] - agg_score[runner_up]
    winner_score = agg_score[winner]
    activate    = winner if winner_score >= ACTIVATE_THRESHOLD and lead >= LEAD_REQUIRED else "no_expansion"

    return {
        "seed":                   SEED,
        "n_samples_per_profile":  N_SAMPLES,
        "n_profiles":             n_profiles,
        "criteria":               CRITERIA,
        "candidates": {
            c: {"base_scores": CANDIDATES[c]["scores"], "sigma": CANDIDATES[c]["sigma"]}
            for c in cand_names
        },
        "profiles": {p: w for p, w in PROFILES.items()},
        "profile_results":        profile_results,
        "aggregate": {
            "win_probability":    agg_win,
            "mean_weighted_score": agg_score,
            "p_above_threshold":  agg_p_thr,
            "mean_rank":          agg_rank,
            "ranked_candidates":  ranked,
        },
        "decision": {
            "activate_next":       activate,
            "winner":              winner,
            "runner_up":           runner_up,
            "winner_score":        winner_score,
            "runner_up_score":     agg_score[runner_up],
            "lead_over_runner_up": lead,
            "threshold":           ACTIVATE_THRESHOLD,
            "lead_required":       LEAD_REQUIRED,
        },
    }

# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Expansion portfolio sensitivity simulation")
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent / "results.json"),
        help="Path to write results.json",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate existing results.json against expected decision (multi_scene, lead ≥ 0.35)",
    )
    args = parser.parse_args()

    if args.check:
        p = Path(args.output)
        if not p.exists():
            print(f"ERROR: {p} not found — run without --check first.", file=sys.stderr)
            sys.exit(1)
        with open(p) as f:
            data = json.load(f)
        d = data["decision"]
        ok = True
        if d["activate_next"] != "multi_scene":
            print(f"FAIL activate_next: expected multi_scene, got {d['activate_next']}", file=sys.stderr)
            ok = False
        if d["lead_over_runner_up"] < LEAD_REQUIRED:
            print(f"FAIL lead: {d['lead_over_runner_up']:.4f} < {LEAD_REQUIRED}", file=sys.stderr)
            ok = False
        if d["winner_score"] < ACTIVATE_THRESHOLD:
            print(f"FAIL score: {d['winner_score']:.4f} < {ACTIVATE_THRESHOLD}", file=sys.stderr)
            ok = False
        if ok:
            print(
                f"OK  activate_next={d['activate_next']}  "
                f"score={d['winner_score']:.4f}  "
                f"lead={d['lead_over_runner_up']:.4f}"
            )
            sys.exit(0)
        sys.exit(1)

    total = N_SAMPLES * len(PROFILES)
    print(f"Running {N_SAMPLES:,} samples × {len(PROFILES)} profiles = {total:,} total (seed={SEED}) …", flush=True)
    results = run_simulation()
    d = results["decision"]
    out = Path(args.output)
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Written -> {out}")
    print(
        f"Decision: ACTIVATE_NEXT={d['activate_next']}  "
        f"(score={d['winner_score']:.4f}, lead={d['lead_over_runner_up']:.4f})"
    )


if __name__ == "__main__":
    main()
