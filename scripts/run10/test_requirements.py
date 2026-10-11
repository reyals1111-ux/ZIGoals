import copy
import importlib.util
import json
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('validator',Path(__file__).with_name('validate_requirements.py'))
validator=importlib.util.module_from_spec(spec);spec.loader.exec_module(validator)
ROOT=Path(__file__).resolve().parents[2]
class ReconciliationTests(unittest.TestCase):
 def setUp(self):
  self.data=json.loads((ROOT/'docs/run10/REQUIREMENTS.json').read_text());self.prompt=(ROOT/'docs/run10/MASTER_PROMPT.md').read_text()
 def test_original_coverage_and_counts(self):
  errors,summary=validator.inspect_ledger(self.data,self.prompt,evidence_root=ROOT);self.assertEqual(errors,[]);self.assertEqual(summary['original_prompt_ids'],290);self.assertEqual(summary['workstream_counts']['JRN'],40)
 def test_lost_id_and_fake_completion_rejected(self):
  self.data['requirements'].pop();self.assertTrue(any('Missing original' in e for e in validator.inspect_ledger(self.data,self.prompt)[0]))
  r=self.data['requirements'][0];r['status']='VERIFIED';self.assertTrue(any('without a full source SHA' in e for e in validator.inspect_ledger(self.data,self.prompt)[0]))
 def test_incomplete_disposition_and_final_report_required(self):
  self.data['requirements'][0]['disposition']=None;errors,_=validator.inspect_ledger(self.data,self.prompt,final_report='Nothing missing');self.assertTrue(any('needs reason' in e for e in errors));self.assertTrue(any('absent from final report' in e for e in errors))
 def test_nonexistent_evidence_is_not_allowed_even_for_partial(self):
  self.data['requirements'][0]['evidence']=[{'kind':'TEST','path':'no-such-evidence-run10.txt','result':'PARTIAL'}];self.assertTrue(any('nonexistent' in e for e in validator.inspect_ledger(self.data,self.prompt,evidence_root=ROOT)[0]))
if __name__=='__main__':unittest.main()
