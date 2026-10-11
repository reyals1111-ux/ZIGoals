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
// Session X Part 9: the Anthropic template passes as a template; its thinking choice and its exact address are checked.
test('the Anthropic template passes as a template; ZIGI_THINKING and the Anthropic address are checked',()=>{
 const anthropic=JSON.parse(stripComments(readFileSync(new URL('../../workers/zigi-relay/wrangler.anthropic.local.jsonc',import.meta.url),'utf8')));
 expect(relayConfigProblems(anthropic,{template:true})).toEqual([]);
 // Session Z-Cloud Part 6 (ADR-019 C40): the friends' template, Claude Sonnet 5.5 with money budgets; no thinking var.
 expect(anthropic.vars).toMatchObject({ZIGI_UPSTREAM_URL:'https://api.anthropic.com/v1/messages',ZIGI_MODEL:'claude-sonnet-5-5',ZIGI_KILL_SWITCH:'on',ZIGI_DAILY_USD:'1',ZIGI_MONTHLY_USD:'10',ZIGI_GLOBAL_DAILY_USD:'20',ZIGI_MONTHLY_REQUESTS:'600'});
 expect(Object.hasOwn(anthropic.vars,'ZIGI_THINKING')).toBe(false);
 const deployableAnthropic={...anthropic,name:'zigoals-zigi-relay',vars:{...anthropic.vars,AUTH_ORIGIN:'https://abcdefgh.supabase.co',APP_ORIGIN:'https://alpha.zigoals.app'}};
 expect(relayConfigProblems(deployableAnthropic)).toEqual([]);
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_THINKING:'on'}})).toContain('ZIGI_THINKING must be "off" or "model-default".');
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_THINKING:'model-default'}})).toEqual([]);
 // Only Sonnet 5.5 or Haiku 5.5 on Anthropic; the money budgets are amounts, a friend's day within their month and the relay's day.
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_MODEL:'claude-haiku-5-5'}})).toEqual([]);
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_MODEL:'claude-opus-5-5'}})).toContain('On Anthropic, ZIGI_MODEL must be one of claude-sonnet-5-5, claude-haiku-5-5.');
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_MONTHLY_USD:'ten'}})).toContain('ZIGI_MONTHLY_USD must be a positive amount in US dollars, such as "10" or "0.50".');
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_DAILY_USD:'11'}})).toContain('One account\'s daily money cannot be more than its monthly money.');
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_GLOBAL_DAILY_USD:'0.5'}})).toContain('One account\'s daily money cannot be more than the relay\'s own daily money.');
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_MONTHLY_REQUESTS:'0'}})).toContain('ZIGI_MONTHLY_REQUESTS must be a positive whole number.');
 expect(relayConfigProblems({...deployableAnthropic,vars:{...deployableAnthropic.vars,ZIGI_UPSTREAM_URL:'https://api.anthropic.com/v1/chat/completions'}})).toContain('On Anthropic, ZIGI_UPSTREAM_URL must be exactly https://api.anthropic.com/v1/messages (the relay translates to that API only).');
 // The OpenAI default template stays as it was: no thinking var, OpenAI's address.
 expect(Object.hasOwn(template.vars,'ZIGI_THINKING')).toBe(false);
 expect(template.vars.ZIGI_UPSTREAM_URL).toBe('https://api.openai.com/v1/chat/completions');
});
