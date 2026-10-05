import {expect,test} from 'vitest';
import {mkdtemp,copyFile,readFile,writeFile,stat,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {validateOwnerPolicy,writeMarketPolicy,parseArgs,FIXTURE_LIMITS,DEFAULT_DAILY_ROWS} from './market-policy.mjs';
import {DEFAULT_DAILY_ROW_BUDGET} from '../../apps/web/lib/server/market-client-limits.ts';
import {DurableMarketAccount} from '../../apps/web/lib/server/durable-market-account.ts';

// Every figure here is fictional. Runs in a throwaway git repository with this checkout's .gitignore,
// so nothing is written into the real checkout.
const repo=resolve(import.meta.dirname,'../..');
const now=Date.UTC(2031,4,10,12);
const template=JSON.parse(await readFile(join(repo,'scripts/run11/market-policy.template.json'),'utf8'));
function filled(change=o=>o){
 const owner=structuredClone(template);
 owner.provider={checkedOn:'2031-05-08',perMinuteLimit:173,monthlyCredits:45678,creditsUsedThisPeriod:1234,reset:{kind:'utc-calendar-month',windowId:null,windowStart:null,windowEnd:null},endpointCosts:{quote:2,catalog:3,history:4,insights:5,token:6,rwa:'disabled'},exclusiveAccountUse:true};
 change(owner);return owner;
}
class Storage{
 rows=new Map();
 async get(key){return structuredClone(this.rows.get(key));}async put(key,value){this.rows.set(key,structuredClone(value));}async delete(key){this.rows.delete(key);}
 async transaction(fn){const tx=new Storage();tx.rows=structuredClone(this.rows);const result=await fn(tx);this.rows=tx.rows;return result;}
}
const work=id=>({operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id},currency:'USD'}});
async function coordinatorAccepts(policy){
 const account=new DurableMarketAccount(new Storage(),()=>now,JSON.stringify(policy));
 expect(await account.apply({action:'inspect'})).toMatchObject({ok:true});
 const w=work('fictional-coin'),{lease}=await account.apply({action:'acquire',work:w});
 const quote=await account.apply({action:'enqueue',priority:'interactive',kind:'request',associations:[{work:w,lease}]});
 expect(await account.apply({action:'reserve',id:quote.id})).toMatchObject({ok:true});
 return account;
}
async function sandbox(){
 const root=await mkdtemp(join(tmpdir(),'market-policy-'));execFileSync('git',['init','-q'],{cwd:root});
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 return root;
}

test('the committed template is rejected until the owner fills every figure',()=>{
 const {errors}=validateOwnerPolicy(template,{now});
 for(const field of ['provider.checkedOn','provider.perMinuteLimit','provider.monthlyCredits','provider.creditsUsedThisPeriod','provider.exclusiveAccountUse','provider.reset.kind','provider.endpointCosts.quote','provider.endpointCosts.history'])expect(errors.join('\n')).toContain(field);
});

test('filled UTC-calendar figures produce a policy the real coordinator accepts; disabled reads fail closed',async()=>{
 const result=validateOwnerPolicy(filled(),{now});
 expect(result.errors).toEqual([]);
 expect(result.policy).toMatchObject({policy:{providerMinuteLimit:173,providerMonthlyLimit:45678,operating:{minute:30,monthly:5000}},calendar:{timeZone:'UTC',confirmed:true},quoteCost:2,operationCosts:{catalog:3,history:4,insights:5,token:6}});
 expect(result.policy.month).toBeUndefined();expect(result.policy.operationCosts.rwa).toBeUndefined();
 expect(result.enabled).toEqual(['quote','catalog','history','insights','token']);expect(result.disabled).toEqual(['rwa']);
 const account=await coordinatorAccepts(result.policy);
 const history=await account.apply({action:'enqueue-read',operation:'history'});
 expect(history).toMatchObject({ok:true});expect(await account.apply({action:'reserve',id:history.id})).toMatchObject({ok:true});
 expect(await account.apply({action:'enqueue-read',operation:'rwa'})).toMatchObject({ok:false,reason:'POLICY_UNAVAILABLE'});
});

test('an exact billing window becomes the month period and the coordinator accepts it',async()=>{
 const result=validateOwnerPolicy(filled(o=>{o.provider.reset={kind:'exact-window',windowId:'plan-2031-05',windowStart:'2031-04-17T00:00:00Z',windowEnd:'2031-05-17T00:00:00Z'};}),{now});
 expect(result.errors).toEqual([]);
 expect(result.policy.month).toEqual({id:'plan-2031-05',start:Date.UTC(2031,3,17),end:Date.UTC(2031,4,17)});expect(result.policy.calendar).toBeUndefined();
 await coordinatorAccepts(result.policy);
});

test('the public Demo plan shape is not mistaken for a fixture',()=>{
 expect(validateOwnerPolicy(filled(o=>{o.provider.perMinuteLimit=100;o.provider.monthlyCredits=10000;o.provider.creditsUsedThisPeriod=0;}),{now}).errors).toEqual([]);
});

test.each([
 ['a repository fixture limit pair',o=>{[o.provider.perMinuteLimit,o.provider.monthlyCredits]=FIXTURE_LIMITS[2];o.provider.creditsUsedThisPeriod=0;o.operating.operating.monthly=900;o.operating.optionalCeiling.monthly=500;},'match a repository test fixture'],
 ['more operating credits than remain this period',o=>{o.provider.creditsUsedThisPeriod=41000;},'exceeds the credits left this period'],
 ['used credits at or above the plan',o=>{o.provider.creditsUsedThisPeriod=45678;},'provider.creditsUsedThisPeriod'],
 ['an operating minute ceiling above the plan',o=>{o.provider.perMinuteLimit=20;},'operating.operating.minute must not exceed'],
 ['a monitoring reserve above its maximum',o=>{o.operating.monitoringReserve.minute=3;},'operating.monitoringReserve.minute must not exceed'],
 ['a monitoring maximum not below the operating ceiling',o=>{o.operating.monitoringMaximum.monthly=5000;o.operating.monitoringReserve.monthly=100;},'operating.monitoringMaximum.monthly must be below'],
 ['an optional ceiling that eats the monitoring reserve',o=>{o.operating.optionalCeiling.minute=30;},'operating.optionalCeiling.minute must not exceed'],
 ['figures checked more than a week ago',o=>{o.provider.checkedOn='2031-05-01';},'provider.checkedOn'],
 ['figures dated in the future',o=>{o.provider.checkedOn='2031-05-11';},'provider.checkedOn'],
 ['a shared plan',o=>{o.provider.exclusiveAccountUse=false;},'provider.exclusiveAccountUse'],
 ['a disabled quote cost',o=>{o.provider.endpointCosts.quote='disabled';},'provider.endpointCosts.quote'],
 ['a zero endpoint cost',o=>{o.provider.endpointCosts.history=0;},'provider.endpointCosts.history'],
 ['an unknown endpoint',o=>{o.provider.endpointCosts.search=1;},'unknown operation'],
 ['a fractional figure',o=>{o.provider.perMinuteLimit=172.5;},'provider.perMinuteLimit'],
 ['a fixture clock key',o=>{o.coordinator.LOCAL_TEST_NOW='1';},'fixture or proposal fields'],
 ['a pasted proposal',o=>{o.proposed_policy={};},'fixture or proposal fields'],
 ['window fields on a calendar reset',o=>{o.provider.reset.windowId='plan-2031-05';},'must be null for utc-calendar-month'],
 ['an expired billing window',o=>{o.provider.reset={kind:'exact-window',windowId:'plan-2031-04',windowStart:'2031-03-17T00:00:00Z',windowEnd:'2031-04-17T00:00:00Z'};},'must contain the current time'],
 ['a window that is not one billing month',o=>{o.provider.reset={kind:'exact-window',windowId:'plan-2031-q2',windowStart:'2031-04-01T00:00:00Z',windowEnd:'2031-07-01T00:00:00Z'};},'one billing month'],
 ['a synthetic window label',o=>{o.provider.reset={kind:'exact-window',windowId:'synthetic',windowStart:'2031-04-17T00:00:00Z',windowEnd:'2031-05-17T00:00:00Z'};},'provider.reset.windowId'],
 ['a non-UTC window timestamp',o=>{o.provider.reset={kind:'exact-window',windowId:'plan-2031-05',windowStart:'2031-04-17T00:00:00+02:00',windowEnd:'2031-05-17T00:00:00Z'};},'UTC ISO timestamps'],
 ['an unbounded lease',o=>{o.coordinator.leaseMs=120000;},'coordinator.leaseMs'],
 ['a throttle without its bounds',o=>{o.coordinator.accountThrottle={distinctEndpoints:1,windowMs:60000};},'coordinator.accountThrottle'],
 ['a wrong schema',o=>{o.schema='other';},'filled copy of scripts/run11/market-policy.template.json'],
])('rejects %s',(_,change,message)=>{
 const {errors,policy}=validateOwnerPolicy(filled(change),{now});
 expect(policy).toBeUndefined();expect(errors.join('\n')).toContain(message);
});

test('writes only from an ignored 0600 owner file to an ignored 0600 output, never overwriting or printing figures',async()=>{
 const root=await sandbox(),owner='plan.market-policy.owner.json',out='plan.market-policy.private.json';
 await writeFile(join(root,owner),JSON.stringify(filled()));
 await chmod(join(root,owner),0o644);
 expect(()=>writeMarketPolicy(root,{ownerFile:owner,out},{now})).toThrow('not mode 0600');
 await chmod(join(root,owner),0o600);
 await writeFile(join(root,'plan.json'),JSON.stringify(filled()),{mode:0o600});
 expect(()=>writeMarketPolicy(root,{ownerFile:'plan.json',out},{now})).toThrow('not ignored by git');
 expect(()=>writeMarketPolicy(root,{ownerFile:owner,out:'policy.json'},{now})).toThrow('ignored by git');
 const lines=writeMarketPolicy(root,{ownerFile:owner,out},{now});
 expect((await stat(join(root,out))).mode&0o777).toBe(0o600);
 expect(spawnSync('git',['check-ignore','-q',join(root,out)],{cwd:root}).status).toBe(0);
 expect(JSON.parse(await readFile(join(root,out),'utf8'))).toEqual(validateOwnerPolicy(filled(),{now}).policy);
 for(const figure of ['173','45678','1234','5000'])expect(lines.join('\n')).not.toContain(figure);
 expect(lines.join('\n')).toContain('Disabled, fail closed: rwa');
 expect(()=>writeMarketPolicy(root,{ownerFile:owner,out},{now})).toThrow('Refusing to overwrite');
});

test('a rejected owner file writes nothing and its error names fields, not figures',async()=>{
 const root=await sandbox(),owner='plan.market-policy.owner.json',out='plan.market-policy.private.json';
 await writeFile(join(root,owner),JSON.stringify(filled(o=>{o.provider.creditsUsedThisPeriod=41000;})),{mode:0o600});
 let message='';try{writeMarketPolicy(root,{ownerFile:owner,out},{now});}catch(error){message=error.message;}
 expect(message).toContain('nothing written');for(const figure of ['173','45678','41000'])expect(message).not.toContain(figure);
 await expect(stat(join(root,out))).rejects.toThrow();
});

test('the CLI takes exactly two flags and fails without printing values',()=>{
 expect(parseArgs(['--owner-file','a.market-policy.owner.json','--out','a.market-policy.private.json'])).toEqual({ownerFile:'a.market-policy.owner.json',out:'a.market-policy.private.json'});
 for(const argv of [[],['--owner-file','a'],['--owner-file','a','--out','b','--now','1'],['--out','b','--out','c']])expect(()=>parseArgs(argv)).toThrow('Usage');
 const run=spawnSync(process.execPath,['scripts/run11/market-policy.mjs','--owner-file','missing.market-policy.owner.json','--out','missing.market-policy.private.json'],{cwd:repo,encoding:'utf8'});
 expect(run.status).toBe(1);expect(run.stderr).toContain('missing');expect(run.stdout).toBe('');
});

// Session U Part 2d: the daily row budget (rows the account object writes per UTC day) is an owner choice.
test('dailyRowBudget: the template keeps the default, 100000 reaches the coordinator, absent means the default',async()=>{
 expect(DEFAULT_DAILY_ROWS).toBe(DEFAULT_DAILY_ROW_BUDGET);
 expect(template.coordinator.dailyRowBudget).toBe(DEFAULT_DAILY_ROWS);
 expect(validateOwnerPolicy(filled(),{now}).policy.dailyRowBudget).toBe(20000);
 const raised=validateOwnerPolicy(filled(o=>{o.coordinator.dailyRowBudget=100000;}),{now});
 expect(raised.errors).toEqual([]);expect(raised.policy.dailyRowBudget).toBe(100000);
 const account=await coordinatorAccepts(raised.policy);
 expect(await account.apply({action:'inspect'})).toMatchObject({ok:true,dailyRowBudget:100000});
 const absent=validateOwnerPolicy(filled(o=>{delete o.coordinator.dailyRowBudget;}),{now});
 expect(absent.errors).toEqual([]);expect('dailyRowBudget' in absent.policy).toBe(false);
 expect(await (await coordinatorAccepts(absent.policy)).apply({action:'inspect'})).toMatchObject({dailyRowBudget:20000});
});
test.each([999,10000001,1.5,'100000',null,-1])('dailyRowBudget %s is refused by name, without the figure',value=>{
 const {errors}=validateOwnerPolicy(filled(o=>{o.coordinator.dailyRowBudget=value;}),{now});
 expect(errors).toHaveLength(1);expect(errors[0]).toMatch(/^coordinator\.dailyRowBudget must be 1000 to 10000000 rows a day, or absent for the default 20000/);
});

// Session U Part 2e: the public Alpha's share of the daily rows is an owner choice, off unless set.
test('partition: absent by default; {publicPercent} reaches the coordinator; anything else is refused by name',async()=>{
 expect(template.coordinator.partition).toBeUndefined();
 expect('partition' in validateOwnerPolicy(filled(),{now}).policy).toBe(false);
 const split=validateOwnerPolicy(filled(o=>{o.coordinator.partition={publicPercent:50};}),{now});
 expect(split.errors).toEqual([]);expect(split.policy.partition).toEqual({publicPercent:50});
 expect(await (await coordinatorAccepts(split.policy)).apply({action:'inspect'})).toMatchObject({ok:true,publicRowBudget:10000});
 for(const partition of [{publicPercent:9},{publicPercent:91},{publicPercent:'50'},{publicPercent:50,friends:50},{},null,[50],50]){
  const {errors}=validateOwnerPolicy(filled(o=>{o.coordinator.partition=partition;}),{now});
  expect(errors).toEqual(['coordinator.partition must be {"publicPercent": 10 to 90}, or absent for no partition (docs/run11/ALPHA_PRICES_ROLLOUT.md, "Two apps, one budget").']);
 }
});

// Session U Part 2f: the public callers' new works per day; absent means an eighth of the daily row budget.
test('publicColdWorks: absent by default (an eighth of the rows); a whole number reaches the coordinator',async()=>{
 expect(template.coordinator.publicColdWorks).toBeUndefined();
 expect(await (await coordinatorAccepts(validateOwnerPolicy(filled(),{now}).policy)).apply({action:'inspect'})).toMatchObject({publicWorkCap:2500});
 const set=validateOwnerPolicy(filled(o=>{o.coordinator.publicColdWorks=400;}),{now});
 expect(set.errors).toEqual([]);expect(set.policy.publicColdWorks).toBe(400);
 expect(await (await coordinatorAccepts(set.policy)).apply({action:'inspect'})).toMatchObject({publicWorkCap:400});
 for(const value of [0,-1,1.5,'400',10000001,null])expect(validateOwnerPolicy(filled(o=>{o.coordinator.publicColdWorks=value;}),{now}).errors).toEqual(['coordinator.publicColdWorks must be 1 to 10000000 new works a day, or absent for an eighth of the daily row budget (docs/run11/ALPHA_PRICES_ROLLOUT.md, "Two apps, one budget").']);
});
