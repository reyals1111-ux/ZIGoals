import {test} from 'vitest';
import assert from 'node:assert/strict';
import {summarizePlaywright} from './pre-run11-browser.mjs';

const spec=(title,projectName,status,results=[],expectedStatus='passed')=>({title,file:'example.spec.ts',line:4,tests:[{projectName,status,expectedStatus,results}]});
const doc=specs=>({suites:[{title:'example.spec.ts',specs}],stats:{expected:0,unexpected:0,skipped:0},errors:[]});

test('counts planned, passed, failed, skipped, not-run and interrupted separately',()=>{
 const planned=doc([
  spec('passed','desktop','skipped'),spec('failed','desktop','skipped'),spec('explicit skip','mobile','skipped',[],'skipped'),
  spec('not run','mobile','skipped'),spec('interrupted','desktop','skipped'),
 ]);
 const actual=doc([
  spec('passed','desktop','expected',[{status:'passed'}]),
  spec('failed','desktop','unexpected',[{status:'failed',error:{message:'Expected visible',stack:'at example.spec.ts:4'}}]),
  spec('explicit skip','mobile','skipped',[],'skipped'),spec('not run','mobile','skipped'),
  spec('interrupted','desktop','unexpected',[{status:'interrupted'}]),
 ]);
 const r=summarizePlaywright(planned,actual,{exitCode:1});
 assert.deepEqual(r.counts,{planned:5,passed:1,failed:1,skipped:1,not_run:1,interrupted:1});
 assert.deepEqual(r.failures.map(x=>[x.file,x.title,x.project,x.message]),[['example.spec.ts','failed','desktop','Expected visible']]);
 assert.equal(r.complete,false);
});
test('missing final JSON is an interrupted run, not a pass',()=>{
 const r=summarizePlaywright(doc([spec('one','desktop','skipped')]),null,{exitCode:143});
 assert.deepEqual(r.counts,{planned:1,passed:0,failed:0,skipped:0,not_run:0,interrupted:1});
 assert.equal(r.complete,false);
});
test('invalid reporter shape is rejected instead of inventing counts',()=>{
 assert.throws(()=>summarizePlaywright({suites:[]},{suites:[{specs:[{tests:[{}]}]}]},{exitCode:0}),/report shape/);
});
