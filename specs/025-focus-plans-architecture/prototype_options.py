"""Storage-shape adapters A/B/C for Task 35."""
from __future__ import annotations

import copy
from typing import Any

from prototype_model import Adapter, StructuralCost

class OptionA(Adapter):
    option = "A_life_document"

    def _initialize(self) -> None:
        self.store = {
            "life_nodes": {"life-unassigned": {"parent_id": "life-root"}},
            "plan_documents": {},
        }

    def _plan(self, plan_id: str) -> dict[str, Any]:
        return self.store["plan_documents"][plan_id]["plan"]

    def _set_plan(self, plan_id: str, plan: dict[str, Any]) -> None:
        node_id = f"life-plan-{plan_id}"
        parent = plan["life_node_id"] or "life-unassigned"
        self.store["life_nodes"][node_id] = {"parent_id": parent}
        self.store["plan_documents"][plan_id] = {"life_node_id": node_id, "plan": plan}

    def _all_plan_ids(self) -> list[str]:
        return sorted(self.store["plan_documents"])

    def structural_cost(self, plan_count: int) -> StructuralCost:
        return StructuralCost(self.option, plan_count, plan_count, 1, True, True,
                              True, True, True, 8, 5)


class OptionB(Adapter):
    option = "B_standalone_entity"

    def _initialize(self) -> None:
        self.store = {"plans": {}}

    def _plan(self, plan_id: str) -> dict[str, Any]:
        return self.store["plans"][plan_id]

    def _set_plan(self, plan_id: str, plan: dict[str, Any]) -> None:
        self.store["plans"][plan_id] = plan

    def _all_plan_ids(self) -> list[str]:
        return sorted(self.store["plans"])

    def structural_cost(self, plan_count: int) -> StructuralCost:
        return StructuralCost(self.option, plan_count, 0, 0, False, True,
                              True, True, True, 3, 4)


class OptionC(Adapter):
    option = "C_basic_leaf_template"

    def _initialize(self) -> None:
        self.store = {
            "life_nodes": {"life-unassigned": {"parent_id": "life-root"}},
            "reader_documents": {},
            "plan_metadata": {},
        }

    def _plan(self, plan_id: str) -> dict[str, Any]:
        return self.store["plan_metadata"][plan_id]["plan"]

    def _set_plan(self, plan_id: str, plan: dict[str, Any]) -> None:
        metadata = self.store["plan_metadata"].get(plan_id)
        document_id = metadata["document_id"] if metadata else f"reader-{plan_id}"
        node_id = f"life-plan-{plan_id}"
        parent = plan["life_node_id"] or "life-unassigned"
        self.store["life_nodes"][node_id] = {"parent_id": parent}
        self.store["reader_documents"][document_id] = {
            "life_node_id": node_id,
            "template_id": "focus_plan",
            "outcome": plan["outcome"],
            "success_criteria": copy.deepcopy(plan["success_criteria"]),
        }
        self.store["plan_metadata"][plan_id] = {
            "document_id": document_id,
            "plan": plan,
        }

    def _all_plan_ids(self) -> list[str]:
        return sorted(self.store["plan_metadata"])

    def structural_cost(self, plan_count: int) -> StructuralCost:
        return StructuralCost(self.option, plan_count, plan_count, 1, True, False,
                              False, False, False, 9, 6)


ADAPTERS = (OptionA, OptionB, OptionC)
