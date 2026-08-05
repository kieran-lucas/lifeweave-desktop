"""Frozen Task 35 criteria, weights, scores, uncertainty, filters, and profiles."""
from __future__ import annotations

SEED = 20260805
SAMPLES_PER_PROFILE = 200_000
CRITERIA = (
    "domain_semantic_clarity", "life_boundary_preservation", "task_integration_readiness",
    "variant_draft_modeling", "lifecycle_correctness", "data_safety_recovery",
    "navigation_workflow_fit", "search_tag_backup_interop", "implementation_boundedness",
    "migration_rollback_clarity", "accessibility_architecture", "performance_query_boundedness",
    "editor_content_reuse", "testability_observability",
)
BASE_WEIGHTS = {
    "domain_semantic_clarity": 15, "life_boundary_preservation": 12,
    "task_integration_readiness": 11, "variant_draft_modeling": 10,
    "lifecycle_correctness": 9, "data_safety_recovery": 9,
    "navigation_workflow_fit": 8, "search_tag_backup_interop": 7,
    "implementation_boundedness": 6, "migration_rollback_clarity": 4,
    "accessibility_architecture": 3, "performance_query_boundedness": 2,
    "editor_content_reuse": 2, "testability_observability": 2,
}
SCORES = {
    "A_life_document": {
        "domain_semantic_clarity": 5.5, "life_boundary_preservation": 2.0, "task_integration_readiness": 4.5,
        "variant_draft_modeling": 7.5, "lifecycle_correctness": 7.0, "data_safety_recovery": 7.0,
        "navigation_workflow_fit": 4.5, "search_tag_backup_interop": 6.5, "implementation_boundedness": 4.0,
        "migration_rollback_clarity": 4.0, "accessibility_architecture": 7.5, "performance_query_boundedness": 7.0,
        "editor_content_reuse": 7.5, "testability_observability": 6.5,
    },
    "B_standalone_entity": {
        "domain_semantic_clarity": 9.5, "life_boundary_preservation": 9.5, "task_integration_readiness": 9.0,
        "variant_draft_modeling": 9.0, "lifecycle_correctness": 9.0, "data_safety_recovery": 9.0,
        "navigation_workflow_fit": 9.0, "search_tag_backup_interop": 8.5, "implementation_boundedness": 6.5,
        "migration_rollback_clarity": 8.0, "accessibility_architecture": 9.0, "performance_query_boundedness": 8.0,
        "editor_content_reuse": 7.0, "testability_observability": 9.0,
    },
    "C_basic_leaf_template": {
        "domain_semantic_clarity": 6.0, "life_boundary_preservation": 2.5, "task_integration_readiness": 5.0,
        "variant_draft_modeling": 5.5, "lifecycle_correctness": 6.0, "data_safety_recovery": 7.0,
        "navigation_workflow_fit": 5.5, "search_tag_backup_interop": 7.0, "implementation_boundedness": 6.5,
        "migration_rollback_clarity": 5.0, "accessibility_architecture": 7.5, "performance_query_boundedness": 7.5,
        "editor_content_reuse": 9.5, "testability_observability": 6.5,
    },
}
SIGMA = {
    candidate: {
        criterion: (0.70 if candidate != "B_standalone_entity" else (0.70 if criterion in {
            "implementation_boundedness", "migration_rollback_clarity", "performance_query_boundedness", "editor_content_reuse"
        } else 0.45))
        for criterion in CRITERIA
    }
    for candidate in SCORES
}
HARD_FILTERS = {
    "A_life_document": {**{f"F{i}": "PASS" for i in range(1, 19)}, "F1": "FAIL", "F2": "FAIL", "F3": "FAIL", "F9": "CONDITIONAL", "F14": "CONDITIONAL", "F15": "CONDITIONAL"},
    "B_standalone_entity": {f"F{i}": "PASS" for i in range(1, 19)},
    "C_basic_leaf_template": {**{f"F{i}": "PASS" for i in range(1, 19)}, "F1": "FAIL", "F2": "FAIL", "F3": "FAIL", "F4": "CONDITIONAL", "F5": "CONDITIONAL", "F6": "CONDITIONAL", "F7": "CONDITIONAL", "F8": "CONDITIONAL", "F9": "FAIL", "F11": "CONDITIONAL", "F14": "CONDITIONAL", "F15": "CONDITIONAL"},
}


def weights(**overrides: int) -> dict[str, int]:
    result = dict(BASE_WEIGHTS); result.update(overrides)
    total = sum(result.values())
    if total != 100: raise ValueError(f"profile sums to {total}")
    return result

PROFILES = {
    "balanced": BASE_WEIGHTS,
    "semantic_integrity": weights(domain_semantic_clarity=20, life_boundary_preservation=18, task_integration_readiness=10, variant_draft_modeling=8, lifecycle_correctness=10, data_safety_recovery=9, navigation_workflow_fit=7, search_tag_backup_interop=5, implementation_boundedness=4, migration_rollback_clarity=3, accessibility_architecture=2, performance_query_boundedness=1, editor_content_reuse=1, testability_observability=2),
    "task_execution": weights(domain_semantic_clarity=12, life_boundary_preservation=8, task_integration_readiness=20, variant_draft_modeling=8, lifecycle_correctness=12, data_safety_recovery=8, navigation_workflow_fit=12, search_tag_backup_interop=5, implementation_boundedness=5, migration_rollback_clarity=2, accessibility_architecture=3, performance_query_boundedness=2, editor_content_reuse=1, testability_observability=2),
    "data_recovery": weights(domain_semantic_clarity=10, life_boundary_preservation=8, task_integration_readiness=8, variant_draft_modeling=8, lifecycle_correctness=8, data_safety_recovery=20, navigation_workflow_fit=5, search_tag_backup_interop=10, implementation_boundedness=5, migration_rollback_clarity=8, accessibility_architecture=4, performance_query_boundedness=2, editor_content_reuse=1, testability_observability=3),
    "accessibility_workflow": weights(domain_semantic_clarity=15, life_boundary_preservation=10, task_integration_readiness=8, variant_draft_modeling=7, lifecycle_correctness=8, data_safety_recovery=8, navigation_workflow_fit=15, search_tag_backup_interop=5, implementation_boundedness=5, migration_rollback_clarity=3, accessibility_architecture=10, performance_query_boundedness=1, editor_content_reuse=2, testability_observability=3),
    "implementation_boundedness": weights(domain_semantic_clarity=8, life_boundary_preservation=6, task_integration_readiness=8, variant_draft_modeling=5, lifecycle_correctness=6, data_safety_recovery=7, navigation_workflow_fit=6, search_tag_backup_interop=6, implementation_boundedness=18, migration_rollback_clarity=10, accessibility_architecture=4, performance_query_boundedness=7, editor_content_reuse=6, testability_observability=3),
}
STRESS_PROFILES = {
    "editor_reuse_extreme": weights(domain_semantic_clarity=1, life_boundary_preservation=1, task_integration_readiness=1, variant_draft_modeling=1, lifecycle_correctness=1, data_safety_recovery=5, navigation_workflow_fit=1, search_tag_backup_interop=4, implementation_boundedness=25, migration_rollback_clarity=10, accessibility_architecture=2, performance_query_boundedness=8, editor_content_reuse=35, testability_observability=5),
    "minimum_new_domain": weights(domain_semantic_clarity=5, life_boundary_preservation=3, task_integration_readiness=4, variant_draft_modeling=4, lifecycle_correctness=4, data_safety_recovery=10, navigation_workflow_fit=4, search_tag_backup_interop=10, implementation_boundedness=25, migration_rollback_clarity=15, accessibility_architecture=3, performance_query_boundedness=5, editor_content_reuse=5, testability_observability=3),
    "life_tree_reuse_bias": weights(domain_semantic_clarity=8, life_boundary_preservation=2, task_integration_readiness=4, variant_draft_modeling=5, lifecycle_correctness=6, data_safety_recovery=9, navigation_workflow_fit=20, search_tag_backup_interop=8, implementation_boundedness=12, migration_rollback_clarity=8, accessibility_architecture=6, performance_query_boundedness=5, editor_content_reuse=5, testability_observability=2),
}
