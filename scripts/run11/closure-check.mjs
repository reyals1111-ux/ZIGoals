#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const statuses=new Set(['NOT_STARTED','IN_PROGRESS','IMPLEMENTED_UNVERIFIED','VERIFIED','BLOCKED_EXTERNAL','BLOCKED_SAFETY','DEFERRED_BOUNDED','NOT_APPLICABLE_WITH_EVIDENCE']);
export function validateClosure(scope,ledger,exists){
 const errors=[],ids=[...scope.original_requirements_with_execution_overlay,...scope.polish_readiness_entries].map(r=>r.id),rows=ledger.requirements??[],map=new Map(rows.map(r=>[r.id,r]));
 if(new Set(ids).size!==ids.length)errors.push('Scope contains duplicate IDs.');
 if(map.size!==rows.length)errors.push('Closure contains duplicate IDs.');
 for(const id of ids)if(!map.has(id))errors.push('Missing '+id);
 for(const row of rows){
  const fail=message=>errors.push(row.id+': '+message);
  if(!ids.includes(row.id))fail('unknown ID');
  if(!statuses.has(row.status))fail('unknown status');
  for(const field of ['implementation','local_proof','external_proof','owner'])if(typeof row[field]!=='string'||!row[field].trim())fail('missing '+field);
  if(!Array.isArray(row.evidence))fail('missing evidence list');else for(const path of row.evidence)if(typeof path!=='string'||!exists(path))fail('missing evidence '+path);
  if(!Array.isArray(row.dependencies))fail('missing dependencies');else for(const id of row.dependencies){const dep=map.get(id);if(!dep)fail('unknown dependency '+id);else if(row.status==='VERIFIED'&&!['VERIFIED','NOT_APPLICABLE_WITH_EVIDENCE'].includes(dep.status))fail('unresolved verified dependency '+id);}
  if(row.status==='VERIFIED'){
   if(!/^[a-f0-9]{40}$/.test(row.source??''))fail('verified source must be an exact commit');
   if(row.local_proof!=='pass'||!row.evidence?.length)fail('verified local proof/evidence missing');
  }else if(typeof row.delta!=='string'||!row.delta.trim())fail('unverified item requires a disposition');
 }
 return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),scope=JSON.parse(readFileSync(resolve(root,'docs/run11/SCOPE_MAP.json'),'utf8')),ledger=JSON.parse(readFileSync(resolve(root,'docs/run11/CLOSURE.json'),'utf8'));
 const errors=validateClosure(scope,ledger,p=>!isAbsolute(p)&&!p.split('/').includes('..')&&existsSync(resolve(root,p)));
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else{const counts={};for(const row of ledger.requirements)counts[row.status]=(counts[row.status]??0)+1;console.log(JSON.stringify({ids:ledger.requirements.length,counts,semanticAcceptance:'requires source-bound evidence review; this validator checks structural integrity only'},null,2));}
}
