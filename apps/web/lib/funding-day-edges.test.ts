import {createHash} from 'node:crypto';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {emptyPlatform,privateGoalSchema,type ContributionPlan,type Platform} from './positions';
import {fundingHealth,recordGoalChanges} from './goal-intelligence';
// Session W Part 17 (T6-B): compared as the earlier due-day rule gave it (funding-before-t6.ts); the digest is main's.
import {fundingBeforeT6} from './funding-before-t6';
import {earliestPlanChange,revisionInstallments} from './plan-revisions';

// Timezone project, phase 2 (Session N): the edges of the parity proof. Instants no device clock produces (not a
// number, beyond the representable range, before 1900, after 9999) and stored dates outside the helpers' 1900-9999
// range must give exactly what main gave, error class and message included. The digest below was computed on main's
// code (57275a6) before the switch; see funding-day-parity.test.ts for the realistic range.

let ids=0;
beforeEach(()=>{ids=0;vi.spyOn(globalThis.crypto,'randomUUID').mockImplementation(()=>`00000000-0000-4000-8000-${String(++ids).padStart(12,'0')}` as `${string}-${string}-${string}-${string}-${string}`);});
afterEach(()=>{vi.restoreAllMocks();});

const EDGES:number[]=[Number.NaN,Infinity,-Infinity,8.64e15,8.64e15+1,-8.64e15,-8.64e15-1,8.64e15-86_400_000,8.64e15-86_400_000+1,0,-1,
 ...['-000001-12-31T23:59:59.999Z','0000-01-01T00:00:00.000Z','0001-01-01T00:00:00.000Z','1066-10-14T12:00:00.000Z','1899-12-31T23:59:59.999Z','1900-01-01T00:00:00.000Z','9999-12-30T23:59:59.999Z','9999-12-31T00:00:00.000Z','9999-12-31T23:59:59.999Z','+010000-01-01T00:00:00.000Z','+275760-09-12T00:00:00.000Z'].map(Date.parse)];
const PLAN:ContributionPlan={amount:'50000',asset:'EUR',decimals:2,cadence:'monthly',nextDate:'2026-10-15',active:true};
const goal=(fields:Record<string,unknown>)=>privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:'2026-09-20T12:00:00Z',milestones:[],...fields});
const FIXTURES:Record<string,()=>Platform>={
 revisions:()=>recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal({plan:PLAN})]},Date.parse('2026-09-20T12:00:00Z')),
 legacy:()=>({...emptyPlatform(),goals:[goal({plan:PLAN})]}),
 legacyTargetDate:()=>({...emptyPlatform(),goals:[goal({targetDate:'9999-12-31',plan:PLAN})]}),
 // Stored revision dates outside 1900-9999 (accepted by the stored date schema): the day before 1900-01-01.
 storedEdges:()=>{
  const s=recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal({plan:PLAN})]},Date.parse('2026-09-20T12:00:00Z'));
  const r=s.goals[0]!.planRevisions![0]!;
  return {...s,goals:[{...s.goals[0]!,planRevisions:[{...r,id:'plan:1:a',effectiveFrom:'1850-01-01'},{...r,id:'plan:1:b',effectiveFrom:'1900-01-01'},{...r,id:'plan:1:c',effectiveFrom:'9999-12-31'}]}]};
 },
};
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
const safe=(run:()=>unknown)=>{try{return {ok:run()};}catch(error){return {error:`${(error as Error).name}: ${(error as Error).message}`};}};

function rows(){
 const out:string[]=[];
 for(const [name,build] of Object.entries(FIXTURES)){
  ids=0;const s=build(),g=s.goals[0]!;
  for(const now of EDGES)out.push(canonical({name,now:String(now),funding:safe(()=>fundingBeforeT6(fundingHealth(s,'1',now))),earliest:safe(()=>earliestPlanChange(g,now))}));
  out.push(canonical({name,installments:safe(()=>revisionInstallments(g,'1850-01-01','2026-12-31').map(x=>[x.id,x.date]))}));
 }
 return out;
}

test('extreme instants and out-of-range stored dates give exactly what main gave',()=>{
 const all=rows();
 expect(all).toHaveLength(Object.keys(FIXTURES).length*(EDGES.length+1));
 expect(createHash('sha256').update(all.join('\n')).digest('hex')).toBe('7ee9cdda8c6771f0d18e9817904f317e1b472419103ccfa6d2e747fc3dbd79b6');
});
