import json, unittest
from pathlib import Path
import prototype as p
ROOT=Path(__file__).parent
class PrototypeTests(unittest.TestCase):
    def test_contract(self): self.assertEqual((len(p.OPERATIONS),len(set(p.OPERATIONS))),(30,30))
    def test_all_options_cover_contract(self):
        for option in p.OPTIONS:
            row=p.full_contract(option); self.assertTrue(row["coverage_complete"]); self.assertEqual(row["invariant_errors"],[])
    def test_simulation_equal(self):
        rows=[p.simulate(o,2000) for o in p.OPTIONS]; self.assertEqual(len({x["final_hash"] for x in rows}),1); self.assertTrue(all(not x["invariant_errors"] for x in rows))
    def test_structural_cost(self):
        rows={o:p.PlanPrototype(o).structural_cost(1000) for o in p.OPTIONS}; self.assertEqual(rows["B_standalone_entity"]["life_nodes_created"],0); self.assertEqual(rows["A_life_document"]["life_nodes_created"],1000); self.assertEqual(rows["C_basic_leaf_template"]["life_nodes_created"],1000)
    def test_validation(self):
        value=json.loads((ROOT/"prototype-results.json").read_text()); self.assertEqual(p.validate_results(value),[])
    def test_invalid_dates(self):
        m=p.PlanPrototype("B_standalone_entity"); m.apply("create_plan")
        with self.assertRaises(ValueError): m.apply("set_dates",start="2026-12-01",target="2026-01-01")
if __name__=="__main__": unittest.main()
