import {createHash} from 'node:crypto';
import {afterEach,beforeEach,describe,expect,test,vi} from 'vitest';
import {addDays} from '../../../packages/goal-engine/src/time/calendar-date';
import {planDays,zonedDate} from '../../../packages/goal-engine/src/time/zoned-day';
import {emptyPlatform,positionSchema,privateGoalSchema,type ContributionPlan,type Platform} from './positions';
import {appendContribution,captureValuations,fundingHealth,recordGoalChanges} from './goal-intelligence';
import {earliestPlanChange,planFingerprint,reviseGoalPlan} from './plan-revisions';
import {privateGoalSummary} from './goal-summary';
import {fundingBeforeT6} from './funding-before-t6';

// Timezone project, phase 2 (Session N): wiring the time helpers into funding and plan days with zone "UTC" must change
// nothing. Two proofs:
// 1. Helper level: the helpers give exactly what the old UTC string expressions gave, over more than 15,000
//    deterministic instants across the helpers' whole 1900-9999 range, every UTC midnight boundary to the millisecond
//    included.
// 2. Output level: a SHA-256 digest of the full outputs of fundingHealth, earliestPlanChange, privateGoalSummary
//    (whose applicable-plan day is not switched; owner decision N12) and the valuation-capture days, over more than
//    10,000 instants near the fixtures' instalment dates, on three device zones. The digest was computed on main's
//    code (57275a6) and committed before the switch; the switch must leave it unchanged.

const DAY=86_400_000;
const OLD={
 today:(now:number)=>new Date(now).toISOString().slice(0,10),
 tomorrow:(now:number)=>new Date(now+DAY).toISOString().slice(0,10),
 shift:(date:string,n:number)=>new Date(Date.parse(`${date}T00:00:00Z`)+n*DAY).toISOString().slice(0,10),
};
/** Deterministic pseudo-random numbers in [0, 1) (mulberry32), so every run sees the same instants. */
function random(seed:number){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const FIRST=Date.parse('1900-01-01T00:00:00.000Z'),LAST=Date.parse('9999-12-30T23:59:59.999Z');

describe('1. the helpers equal the old UTC expressions',()=>{
 const next=random(20261002);
 const instants:number[]=[];
 for(let i=0;i<10_000;i++)instants.push(FIRST+Math.floor(next()*(LAST-FIRST)));
 for(let i=0;i<4_000;i++)instants.push(Date.parse('1970-01-01T00:00:00Z')+Math.floor(next()*(Date.parse('2100-01-01T00:00:00Z')-Date.parse('1970-01-01T00:00:00Z'))));
 // Both sides of 400 UTC midnights, to the millisecond, spread over 1900-9999.
 for(let i=0;i<400;i++){const midnight=Math.floor((FIRST+next()*(LAST-FIRST-DAY))/DAY)*DAY+DAY;instants.push(midnight-1,midnight,midnight+1);}
 for(const edge of ['1900-01-01T00:00:00.000Z','1970-01-01T00:00:00.000Z','2000-02-29T23:59:59.999Z','2026-10-15T00:00:00.000Z','2028-02-29T00:00:00.000Z','9999-12-30T23:59:59.999Z'])instants.push(Date.parse(edge));
 test(`today and tomorrow on ${instants.length} instants`,()=>{
  expect(instants.length).toBeGreaterThanOrEqual(15_000);
  let checked=0;
  for(const now of instants){
   const days=planDays(now,'UTC');
   if(days.today!==OLD.today(now)||days.tomorrow!==OLD.tomorrow(now)||zonedDate(now,'UTC')!==OLD.today(now))throw Error(`differs at ${new Date(now).toISOString()}: ${JSON.stringify(days)}`);
   checked++;
  }
  expect(checked).toBe(instants.length);
 });
 test('calendar steps of -400 to +400 days from 2,000 dates',()=>{
  let checked=0;
  for(let i=0;i<2_000;i++){
   const date=OLD.today(Date.parse('1901-02-01T00:00:00Z')+Math.floor(next()*(Date.parse('9998-11-01T00:00:00Z')-Date.parse('1901-02-01T00:00:00Z'))));
   for(const n of [-400,-31,-7,-1,0,1,7,31,365,366,400])if(addDays(date,n)!==OLD.shift(date,n))throw Error(`${date} ${n}`);else checked++;
  }
  expect(checked).toBe(22_000);
 });
});

// ---------------- 2. Output digest ----------------
let ids=0;
beforeEach(()=>{ids=0;vi.spyOn(globalThis.crypto,'randomUUID').mockImplementation(()=>`00000000-0000-4000-8000-${String(++ids).padStart(12,'0')}` as `${string}-${string}-${string}-${string}-${string}`);});
afterEach(()=>{vi.restoreAllMocks();});
const deviceZone=process.env.TZ;
afterEach(()=>{process.env.TZ=deviceZone;});

const EUR=(plan:Partial<ContributionPlan>):ContributionPlan=>({amount:'50000',asset:'EUR',decimals:2,cadence:'monthly',nextDate:'2026-10-15',active:true,...plan});
const goal=(fields:Record<string,unknown>)=>privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:'2026-09-20T12:00:00Z',milestones:[],...fields});
const recorded=(g:ReturnType<typeof goal>)=>recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[g]},Date.parse(g.createdAt));
const manual=(value:string)=>positionSchema.parse({id:'p',providerId:'manual',sourceType:'MANUAL',network:'manual',account:'local',asset:'EUR',denom:'EUR',quantity:'1',decimals:0,verification:'MANUAL',observedAt:'2026-09-20T12:00:00.000Z',liquidity:'LIQUID',provenance:'User entry',valuation:{value,currency:'EUR',decimals:2,source:'MANUAL',observedAt:'2026-09-20T12:00:00.000Z'}});
const funded=(s:Platform,id:string,date:string,legacy=false)=>{
 const r=s.goals[0]!.planRevisions?.at(-1);
 return appendContribution(s,{id,goalId:'1',direction:'IN',quantity:'50000',asset:'EUR',decimals:2,occurredAt:`${date}T20:00:00.000Z`,provenance:'MANUAL_ATTRIBUTION',fundingMode:'FUND_GOAL',scheduledDate:date,...(legacy||!r?{}:{planRevisionId:r.id,installmentId:`${r.id}:${date}`})});
};

/** Fixtures that exercise every day decision: plan revisions and legacy plans, due-day and month-end edges, a leap
 * day, a paused plan, a completed Goal, a target date, funded instalments and a revision that changes the terms. */
const FIXTURES:Record<string,{build:()=>Platform;anchor:string}>={
 monthly15:{anchor:'2026-10-15',build:()=>recorded(goal({plan:EUR({})}))},
 monthly31:{anchor:'2026-03-31',build:()=>recorded(goal({createdAt:'2026-01-10T12:00:00Z',plan:EUR({nextDate:'2026-01-31'})}))},
 weeklyRevised:{anchor:'2026-10-25',build:()=>{const s=recorded(goal({createdAt:'2026-08-20T12:00:00Z',plan:EUR({cadence:'weekly',nextDate:'2026-09-01'})}));return reviseGoalPlan(s,'1',EUR({cadence:'weekly',nextDate:'2026-09-01',amount:'70000'}),'2026-10-25',Date.parse('2026-10-01T12:00:00Z'),planFingerprint(s.goals[0]!));}},
 legacyMonthly:{anchor:'2026-10-15',build:()=>({...emptyPlatform(),goals:[goal({plan:EUR({})})]})},
 legacyLeapYearly:{anchor:'2028-02-29',build:()=>({...emptyPlatform(),goals:[goal({createdAt:'2027-12-01T12:00:00Z',target:'200000',plan:EUR({cadence:'yearly',nextDate:'2028-02-29'})})]})},
 paused:{anchor:'2026-10-15',build:()=>recorded(goal({plan:EUR({active:false})}))},
 completed:{anchor:'2026-10-15',build:()=>({...recorded(goal({plan:EUR({})})),positions:[manual('900000')],allocations:[{goalId:'1',positionId:'p',quantity:'1'}]})},
 targetDate:{anchor:'2026-12-15',build:()=>recorded(goal({targetDate:'2027-03-15',plan:EUR({})}))},
 fundedRevisions:{anchor:'2026-11-15',build:()=>funded(funded(recorded(goal({plan:EUR({})})),'f1','2026-10-15'),'f2','2026-11-15')},
 fundedLegacy:{anchor:'2026-11-15',build:()=>funded({...emptyPlatform(),goals:[goal({plan:EUR({})})]},'f1','2026-10-15',true)},
};
const PER_FIXTURE=1_000;
/** Instants near a fixture's decisions: both sides of each UTC midnight within 30 days of its anchor, plus random
 * instants within 400 days of it. */
function instantsNear(anchor:string,seed:number):number[] {
 const base=Date.parse(`${anchor}T00:00:00Z`),next=random(seed),result:number[]=[];
 for(let d=-30;d<=30;d++){const midnight=base+d*DAY;result.push(midnight-1,midnight,midnight+1,midnight+DAY/2);}
 while(result.length<PER_FIXTURE)result.push(base+Math.floor((next()*2-1)*400*DAY));
 return result;
}
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v:unknown)=>typeof v==='bigint'?`${v}n`:v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
const safe=(run:()=>unknown)=>{try{return {ok:run()};}catch(error){return {error:`${(error as Error).name}: ${(error as Error).message}`};}};
function fixtureDigest(name:string):{digest:string;instants:number} {
 const fixture=FIXTURES[name]!;
 ids=0;const s=fixture.build();
 const hash=createHash('sha256');let count=0;
 for(const [i,now] of instantsNear(fixture.anchor,name.length*7919+name.charCodeAt(0)).entries()){
  ids=1000;
  const g=s.goals[0]!;
  // Session W Part 17 (T6-B): the output as the earlier due-day rule gave it; any other change still changes the digest.
  const before=safe(()=>fundingBeforeT6(fundingHealth(s,'1',now)));
  // The summary's funding label is the funding status (goal-summary.ts), so it is read through the same earlier rule.
  const summary=safe(()=>{const v=privateGoalSummary(s,g,[],now);return 'ok' in before&&g.type!=='PROJECT'?{...v,fundingHealth:(before.ok as {status:string}).status.replaceAll('_',' ')}:v;});
  const row:Record<string,unknown>={now,funding:before,earliest:safe(()=>earliestPlanChange(g,now)),summary};
  if(i%10===0){ids=2000;row.capture=safe(()=>{const c=captureValuations({...s,positions:s.positions.length?s.positions:[manual('80000')],allocations:s.allocations.length?s.allocations:[{goalId:'1',positionId:'p',quantity:'1'}]},[],now);return {days:c.historyCaptureDays,snapshots:c.valuationSnapshots.map(v=>v.capturedAt),history:c.goalHistory.map(h=>[h.kind,h.capturedAt])};});}
  hash.update(canonical(row));hash.update('\n');count++;
 }
 return {digest:hash.digest('hex'),instants:count};
}

// Computed on main 57275a6, before the switch. Never edit these to make a change pass: a different digest means the
// behaviour changed.
const GOLDEN:Record<string,string>={
 monthly15:'bd0df05ec702e59ea5f4bfd5346d5b4a4bdd1e5bccc3bc4b451d76bec7534b64',
 monthly31:'64ab2b3b0994b5064db0091df28b7c08ab1365c1233a7c9e18c5f0a8c73050d3',
 weeklyRevised:'2f7a96e608f72773e608062276b77286fb0b86e48caa6d1bf08472c13fb3b299',
 legacyMonthly:'92c5fb3bfddb39f0fdf827bbf69a689bf1047c75e7d0445bb4a01977cc613708',
 legacyLeapYearly:'d2a618aabec6ae3ea967ad8ddd10effac9ac4ff0e6a411d7cfb97b48aa4ca9c9',
 paused:'13bfe986a5542692cf250896c02895cba4ca7e1377e6fa910b102d5841ecfdee',
 completed:'40bc3a07276384ccc5017ed0f75b802219d9e846e868f6ef5cc695db9df937df',
 targetDate:'40189aeccaeada7ee7b682fb5430b705c3a3113b4652eb770aa6a4fd39ed7d1d',
 fundedRevisions:'1654f4c18aa1c1e10369f59333ef7801eb7f01b0154698783057135f78cb46fe',
 fundedLegacy:'292d9fff3f985173cb45ca05239af9ef11c5c09b1c9cb439d6f03233f448ff95',
};

describe('2. funding, plan, summary and capture outputs are unchanged (golden digest)',()=>{
 // Session W Part 17 (owner decision W2, T6-B): today's instalment now counts as planned only once its day has ended in
 // the plan's zone (or as far as it is funded). The digests below are untouched; they are compared with the output
 // mapped back through exactly that rule (funding-before-t6.ts), and the test after this block proves where the two differ.
 for(const zone of ['UTC','America/New_York','Asia/Kolkata']){
  test(`${Object.keys(FIXTURES).length * PER_FIXTURE} instants on a ${zone} device`,()=>{
   process.env.TZ=zone;
   const digests:Record<string,string>={};let total=0;
   for(const name of Object.keys(FIXTURES)){const r=fixtureDigest(name);digests[name]=r.digest;total+=r.instants;}
   expect(total).toBeGreaterThanOrEqual(10_000);
   expect(digests).toEqual(GOLDEN);
  },120_000);
 }
});

describe('3. T6-B (Session W Part 17): the due-day rule changes the output on due days only, by what is still due today',()=>{
 for(const zone of ['UTC','America/New_York']){
  test(`every fixture instant on a ${zone} device`,()=>{
   process.env.TZ=zone;let due=0,checked=0;
   for(const name of Object.keys(FIXTURES)){
    const fixture=FIXTURES[name]!;ids=0;const s=fixture.build();
    for(const now of instantsNear(fixture.anchor,name.length*7919+name.charCodeAt(0))){
     let h:ReturnType<typeof fundingHealth>;try{h=fundingHealth(s,'1',now);}catch{continue;}
     checked++;
     if(h.dueToday==='0')continue;
     due++;
     // Something is due only on a plan day that is an instalment date of the effective terms, with an unfunded part.
     expect(h.nextDate,`${name} ${new Date(now).toISOString()}`).toBe(new Date(now).toISOString().slice(0,10));
     expect(BigInt(h.dueToday)>0n).toBe(true);
     expect(h.overdue).toBe(BigInt(h.variance)<0n);
    }
   }
   expect(checked).toBeGreaterThan(5_000);expect(due).toBeGreaterThan(50);
  },120_000);
 }
});
