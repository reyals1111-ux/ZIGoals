// The relay's config check (Session V Part 17): the committed template passes as a template and not as a deployment;
// each unsafe change is named.
import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {relayConfigProblems,stripComments} from './zigi-relay-config.mjs';

const template=JSON.parse(stripComments(readFileSync(new URL('../../workers/zigi-relay/wrangler.local.jsonc',import.meta.url),'utf8')));
const deployable={...template,name:'zigoals-zigi-relay',vars:{...template.vars,AUTH_ORIGIN:'https://abcdefgh.supabase.co',APP_ORIGIN:'https://alpha.zigoals.app'}};

test('the committed template passes as a template, and is not deployable as it is',()=>{
 expect(relayConfigProblems(template,{template:true})).toEqual([]);
 expect(relayConfigProblems(template)).toEqual(['AUTH_ORIGIN must be the real account provider origin.','APP_ORIGIN must be the app\'s https origin.','name must be the deployed Worker\'s name, not the local template\'s.']);
 expect(relayConfigProblems(deployable)).toEqual([]);
});
test('every unsafe change is named',()=>{
 const cases=/** @type {[any,string][]} */([
  [{...deployable,observability:{enabled:true}},'observability.enabled must be false: the relay keeps no logs.'],
  [{...deployable,workers_dev:true},'workers_dev must be false.'],
  [{...deployable,tail_consumers:[{service:'x'}]},'No tail consumers: nothing may read the relay\'s requests.'],
  [{...deployable,kv_namespaces:[{binding:'X',id:'y'}]},'No kv_namespaces: the relay stores nothing but counts.'],
  [{...deployable,vars:{...deployable.vars,ZIGI_UPSTREAM_KEY:['sk','test','FAKE'].join('-')}},'ZIGI_UPSTREAM_KEY is a secret: set it with wrangler secret put, never in vars.'],
  [{...deployable,vars:{...deployable.vars,ZIGI_ALLOWLIST:'x'}},'ZIGI_ALLOWLIST is a secret: set it with wrangler secret put, never in vars.'],
  [{...deployable,vars:{...deployable.vars,ZIGI_KILL_SWITCH:'false'}},'ZIGI_KILL_SWITCH must be "on" (paused) or "off".'],
  [{...deployable,vars:{...deployable.vars,ZIGI_DAILY_TOKENS:'9999999'}},'One account\'s daily tokens cannot be more than the relay\'s own daily tokens.'],
  [{...deployable,vars:{...deployable.vars,ZIGI_UPSTREAM_URL:'http://api.openai.com/v1/chat/completions'}},'ZIGI_UPSTREAM_URL must be an https address.'],
  [{...deployable,vars:{...deployable.vars,EXTRA:'1'}},'Unknown var EXTRA.'],
  [{...deployable,durable_objects:{bindings:[]}},'Exactly one Durable Object binding: ZIGI_BUDGET → RelayBudget.'],
 ]);
 for(const [config,problem] of cases)expect(relayConfigProblems(config),problem).toContain(problem);
 expect(stripComments('{"a":"// kept","b":1 // gone\n/* gone */}')).toBe('{"a":"// kept","b":1 \n}');
});
