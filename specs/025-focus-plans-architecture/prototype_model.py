"""Shared semantic model for the Task 35 architecture prototype."""
from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SEED = 20260805
RESULT_PATH = Path(__file__).with_name("prototype-results.json")
LIFECYCLES = ("draft", "active", "paused", "completed")
OPERATIONS = (
    "create_plan", "rename_plan", "set_lifecycle", "set_dates",
    "link_life", "unlink_life", "add_variant", "rename_variant",
    "select_variant", "archive_variant", "restore_variant", "add_phase",
    "rename_phase", "reorder_phase", "archive_phase", "restore_phase",
    "update_outcome", "replace_success_criteria", "save_recovery_draft",
    "recover_draft", "link_task", "unlink_task", "link_series",
    "unlink_series", "archive_plan", "restore_plan", "search_projection",
    "export_canonical", "validate_invariants", "clone_plan_as_draft",
)


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def stable_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class StructuralCost:
    option: str
    plans: int
    life_nodes_created: int
    synthetic_unassigned_nodes: int
    existing_life_relation_ambiguous: bool
    direct_plan_identity: bool
    first_class_variants: bool
    first_class_phases: bool
    separate_search_kind: bool
    estimated_cross_domain_coupling_points: int
    estimated_overview_joins: int

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


class Adapter:
    option = "base"

    def __init__(self) -> None:
        self.counter = 0
        self.store: dict[str, Any] = {}
        self._initialize()

    def _initialize(self) -> None:
        raise NotImplementedError

    def new_id(self, prefix: str) -> str:
        self.counter += 1
        return f"{prefix}-{self.counter:08d}"

    def _plan(self, plan_id: str) -> dict[str, Any]:
        raise NotImplementedError

    def _set_plan(self, plan_id: str, plan: dict[str, Any]) -> None:
        raise NotImplementedError

    def _all_plan_ids(self) -> list[str]:
        raise NotImplementedError

    def structural_cost(self, plan_count: int) -> StructuralCost:
        raise NotImplementedError

    def create_plan(self, title: str, life_node_id: str | None = None) -> str:
        plan_id = self.new_id("plan")
        variant_id = self.new_id("variant")
        plan = {
            "id": plan_id,
            "title": title,
            "lifecycle": "draft",
            "start_date": None,
            "target_date": None,
            "life_node_id": life_node_id,
            "outcome": "",
            "success_criteria": [],
            "selected_variant_id": variant_id,
            "variants": [{
                "id": variant_id,
                "label": "Initial approach",
                "archived": False,
                "phases": [],
                "body": {"type": "doc", "content": []},
            }],
            "task_ids": [],
            "series_ids": [],
            "archived": False,
            "recovery_draft": None,
            "revision": 0,
        }
        self._set_plan(plan_id, plan)
        return plan_id

    def rename_plan(self, plan_id: str, title: str) -> None:
        plan = self._plan(plan_id)
        plan["title"] = title.strip()
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def set_lifecycle(self, plan_id: str, lifecycle: str) -> None:
        if lifecycle not in LIFECYCLES:
            raise ValueError("invalid lifecycle")
        plan = self._plan(plan_id)
        plan["lifecycle"] = lifecycle
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def set_dates(self, plan_id: str, start_date: str | None, target_date: str | None) -> None:
        if start_date and target_date and start_date > target_date:
            raise ValueError("start date after target date")
        plan = self._plan(plan_id)
        plan["start_date"] = start_date
        plan["target_date"] = target_date
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def link_life(self, plan_id: str, life_node_id: str) -> None:
        plan = self._plan(plan_id)
        plan["life_node_id"] = life_node_id
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def unlink_life(self, plan_id: str) -> None:
        plan = self._plan(plan_id)
        plan["life_node_id"] = None
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def add_variant(self, plan_id: str, label: str) -> str:
        plan = self._plan(plan_id)
        variant_id = self.new_id("variant")
        plan["variants"].append({
            "id": variant_id, "label": label, "archived": False,
            "phases": [], "body": {"type": "doc", "content": []},
        })
        plan["revision"] += 1
        self._set_plan(plan_id, plan)
        return variant_id

    def rename_variant(self, plan_id: str, variant_id: str, label: str) -> None:
        plan = self._plan(plan_id)
        self._variant(plan, variant_id)["label"] = label
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def select_variant(self, plan_id: str, variant_id: str) -> None:
        plan = self._plan(plan_id)
        variant = self._variant(plan, variant_id)
        if variant["archived"]:
            raise ValueError("cannot select archived variant")
        plan["selected_variant_id"] = variant_id
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def archive_variant(self, plan_id: str, variant_id: str) -> None:
        plan = self._plan(plan_id)
        variant = self._variant(plan, variant_id)
        if plan["selected_variant_id"] == variant_id:
            raise ValueError("cannot archive selected variant")
        variant["archived"] = True
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def restore_variant(self, plan_id: str, variant_id: str) -> None:
        plan = self._plan(plan_id)
        self._variant(plan, variant_id)["archived"] = False
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def add_phase(self, plan_id: str, variant_id: str, title: str) -> str:
        plan = self._plan(plan_id)
        variant = self._variant(plan, variant_id)
        phase_id = self.new_id("phase")
        variant["phases"].append({"id": phase_id, "title": title, "archived": False})
        plan["revision"] += 1
        self._set_plan(plan_id, plan)
        return phase_id

    def rename_phase(self, plan_id: str, variant_id: str, phase_id: str, title: str) -> None:
        plan = self._plan(plan_id)
        self._phase(self._variant(plan, variant_id), phase_id)["title"] = title
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def reorder_phase(self, plan_id: str, variant_id: str, phase_id: str, new_index: int) -> None:
        plan = self._plan(plan_id)
        phases = self._variant(plan, variant_id)["phases"]
        index = next(i for i, phase in enumerate(phases) if phase["id"] == phase_id)
        phase = phases.pop(index)
        phases.insert(max(0, min(new_index, len(phases))), phase)
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def archive_phase(self, plan_id: str, variant_id: str, phase_id: str) -> None:
        plan = self._plan(plan_id)
        self._phase(self._variant(plan, variant_id), phase_id)["archived"] = True
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def restore_phase(self, plan_id: str, variant_id: str, phase_id: str) -> None:
        plan = self._plan(plan_id)
        self._phase(self._variant(plan, variant_id), phase_id)["archived"] = False
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def update_outcome(self, plan_id: str, outcome: str) -> None:
        plan = self._plan(plan_id)
        plan["outcome"] = outcome
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def replace_success_criteria(self, plan_id: str, criteria: list[str]) -> None:
        plan = self._plan(plan_id)
        plan["success_criteria"] = list(criteria)
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def save_recovery_draft(self, plan_id: str, draft: dict[str, Any]) -> None:
        plan = self._plan(plan_id)
        plan["recovery_draft"] = copy.deepcopy(draft)
        self._set_plan(plan_id, plan)

    def recover_draft(self, plan_id: str) -> None:
        plan = self._plan(plan_id)
        draft = plan["recovery_draft"]
        if draft is None:
            raise ValueError("no recovery draft")
        for key in ("outcome", "success_criteria"):
            if key in draft:
                plan[key] = copy.deepcopy(draft[key])
        plan["recovery_draft"] = None
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def link_task(self, plan_id: str, task_id: str) -> None:
        plan = self._plan(plan_id)
        if task_id not in plan["task_ids"]:
            plan["task_ids"].append(task_id)
            plan["task_ids"].sort()
        self._set_plan(plan_id, plan)

    def unlink_task(self, plan_id: str, task_id: str) -> None:
        plan = self._plan(plan_id)
        plan["task_ids"] = [value for value in plan["task_ids"] if value != task_id]
        self._set_plan(plan_id, plan)

    def link_series(self, plan_id: str, series_id: str) -> None:
        plan = self._plan(plan_id)
        if series_id not in plan["series_ids"]:
            plan["series_ids"].append(series_id)
            plan["series_ids"].sort()
        self._set_plan(plan_id, plan)

    def unlink_series(self, plan_id: str, series_id: str) -> None:
        plan = self._plan(plan_id)
        plan["series_ids"] = [value for value in plan["series_ids"] if value != series_id]
        self._set_plan(plan_id, plan)

    def archive_plan(self, plan_id: str) -> None:
        plan = self._plan(plan_id)
        plan["archived"] = True
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def restore_plan(self, plan_id: str) -> None:
        plan = self._plan(plan_id)
        plan["archived"] = False
        plan["revision"] += 1
        self._set_plan(plan_id, plan)

    def search_projection(self, query: str) -> list[dict[str, str]]:
        needle = normalize(query)
        result: list[dict[str, str]] = []
        for plan_id in self._all_plan_ids():
            plan = self._plan(plan_id)
            if plan["archived"]:
                continue
            text = " ".join([
                plan["title"], plan["outcome"], " ".join(plan["success_criteria"]),
                " ".join(variant["label"] for variant in plan["variants"]),
                " ".join(phase["title"] for variant in plan["variants"] for phase in variant["phases"]),
            ])
            if needle in normalize(text):
                result.append({"entity_kind": "focus_plan", "entity_id": plan_id, "title": plan["title"]})
        return sorted(result, key=lambda item: (item["title"], item["entity_id"]))

    def export_canonical(self, plan_id: str) -> dict[str, Any]:
        plan = self._plan(plan_id)
        exported = copy.deepcopy(plan)
        exported.pop("recovery_draft", None)
        exported["variants"] = sorted(exported["variants"], key=lambda value: value["id"])
        for variant in exported["variants"]:
            variant["phases"] = list(variant["phases"])
        return exported

    def validate_invariants(self, plan_id: str) -> list[str]:
        plan = self._plan(plan_id)
        errors: list[str] = []
        if not plan["id"] or not plan["title"].strip(): errors.append("missing identity/title")
        if plan["lifecycle"] not in LIFECYCLES: errors.append("invalid lifecycle")
        if plan["start_date"] and plan["target_date"] and plan["start_date"] > plan["target_date"]: errors.append("date order")
        variant_ids = [variant["id"] for variant in plan["variants"]]
        if len(variant_ids) != len(set(variant_ids)): errors.append("duplicate variant id")
        if plan["selected_variant_id"] not in variant_ids: errors.append("selected variant missing")
        selected = self._variant(plan, plan["selected_variant_id"])
        if selected["archived"]: errors.append("selected variant archived")
        phase_ids = [phase["id"] for variant in plan["variants"] for phase in variant["phases"]]
        if len(phase_ids) != len(set(phase_ids)): errors.append("duplicate phase id")
        if len(plan["task_ids"]) != len(set(plan["task_ids"])): errors.append("duplicate task link")
        if len(plan["series_ids"]) != len(set(plan["series_ids"])): errors.append("duplicate series link")
        return errors

    def clone_plan_as_draft(self, plan_id: str) -> str:
        source = self.export_canonical(plan_id)
        clone_id = self.new_id("plan")
        source["id"] = clone_id
        source["title"] += " — Draft copy"
        source["lifecycle"] = "draft"
        source["archived"] = False
        source["task_ids"] = []
        source["series_ids"] = []
        source["revision"] = 0
        id_map: dict[str, str] = {}
        for variant in source["variants"]:
            old = variant["id"]
            variant["id"] = self.new_id("variant")
            id_map[old] = variant["id"]
            for phase in variant["phases"]: phase["id"] = self.new_id("phase")
        source["selected_variant_id"] = id_map[source["selected_variant_id"]]
        source["recovery_draft"] = None
        self._set_plan(clone_id, source)
        return clone_id

    @staticmethod
    def _variant(plan: dict[str, Any], variant_id: str) -> dict[str, Any]:
        return next(value for value in plan["variants"] if value["id"] == variant_id)

    @staticmethod
    def _phase(variant: dict[str, Any], phase_id: str) -> dict[str, Any]:
        return next(value for value in variant["phases"] if value["id"] == phase_id)


def normalize(value: str) -> str:
    import unicodedata
    normalized = unicodedata.normalize("NFKD", value)
    return " ".join("".join(char for char in normalized if not unicodedata.combining(char)).replace("đ", "d").replace("Đ", "D").lower().split())
