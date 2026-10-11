// The health-link Worker's config check (Session W Part 8): the committed template passes as a template and not as a
// deployment; each unsafe change is named.
import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {linkConfigProblems} from './health-link-config.mjs';
import {stripComments} from './zigi-relay-config.mjs';

const template=JSON.parse(stripComments(readFileSync(new URL('../../workers/health-link/wrangler.local.jsonc',import.meta.url),'utf8')));
const deployable={...template,name:'zigoals-health-link',vars:{...template.vars,AUTH_ORIGIN:'https://abcdefgh.supabase.co',APP_ORIGIN:'https://alpha.zigoals.app',OURA_CLIENT_ID:'fixture-oura-client'}};
test('the committed template passes as a template, and is not deployable as it is',()=>{
 expect(linkConfigProblems(template,{template:true})).toEqual([]);
 expect(linkConfigProblems(template)).toEqual(['AUTH_ORIGIN must be the real account provider origin.','APP_ORIGIN must be the app\'s https origin (the redirect address is APP_ORIGIN/app/health).','name must be the deployed Worker\'s name, not the local template\'s.','No provider client id: set at least one (and its secret) or leave the Worker undeployed.']);
 expect(linkConfigProblems(deployable)).toEqual([]);
});
test('every unsafe change is named',()=>{
 const cases=/** @type {[any,string][]} */([
  [{...deployable,observability:{enabled:true}},'observability.enabled must be false: the Worker keeps no logs.'],
  [{...deployable,workers_dev:true},'workers_dev must be false.'],
  [{...deployable,vars:{...deployable.vars,OURA_CLIENT_SECRET:'FAKE-secret'}},'OURA_CLIENT_SECRET is a secret: set it with wrangler secret put, never in vars.'],
  [{...deployable,vars:{...deployable.vars,HEALTH_LINK_KILL_SWITCH:'false'}},'HEALTH_LINK_KILL_SWITCH must be "on" (paused) or "off".'],
  [{...deployable,vars:{...deployable.vars,HEALTH_LINK_DAILY_REQUESTS:'99999'}},'One account\'s daily requests cannot be more than the Worker\'s own daily requests.'],
  [{...deployable,vars:{...deployable.vars,EXTRA:'1'}},'Unknown var EXTRA.'],
  [{...deployable,kv_namespaces:[{binding:'X',id:'y'}]},'No kv_namespaces: the Worker stores nothing but counts.'],
  [{...deployable,durable_objects:{bindings:[]}},'Exactly one Durable Object binding: LINK_BUDGET → LinkBudget.'],
 ]);
 for(const [config,problem] of cases)expect(linkConfigProblems(config),problem).toContain(problem);
});
test('privacy by construction: no console call and no storage of a token or a record in the Worker\'s source; the template is paused',()=>{
 for(const file of ['worker.mjs','providers.mjs','budget.mjs','limits.mjs']){
  const source=readFileSync(new URL(`../../workers/health-link/${file}`,import.meta.url),'utf8');
  expect(source,file).not.toMatch(/console\./);
  expect(source,file).not.toMatch(/\.put\(|caches\.|\bKV\b|\bR2\b|\bD1\b/);
 }
 expect(template.vars.HEALTH_LINK_KILL_SWITCH).toBe('on');
 for(const name of Object.keys(template.vars))expect(name).not.toMatch(/SECRET|PUBLIC_KEY/);
});
