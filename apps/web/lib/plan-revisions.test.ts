import {describe,it,expect} from 'vitest';
import {emptyPlatform,privateGoalSchema,positionSchema,platformSchema,assertGoalEditsUnlocked,closeGoal,type Platform} from './positions';
import {recordGoalChanges,fundingHealth,captureValuations,reverseContribution} from './goal-intelligence';
import {reviseGoalPlan,planFingerprint,revisionInstallments,reopenGoal,canceledRevisionInstallments,effectiveContributionPlan} from './plan-revisions';
import {fundGoal} from './contribution-funding';
import {privateGoalSummary} from './goal-summary';
const now=Date.parse('2026-09-20T12:00:00Z'),at=new Date(now).toISOString();
const plan={amount:'10000',asset:'USD',decimals:2,cadence:'weekly' as const,nextDate:'2026-09-20',active:true};
const goal=()=>privateGoalSchema.parse({id:'1',name:'Reserve',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',notes:'',createdAt:at,milestones:[],plan});
const initial=():Platform=>recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal()]},now);
const revise=(s:Platform,amount:string,effectiveFrom='2026-09-21',time=now)=>reviseGoalPlan(s,'1',{...plan,amount},effectiveFrom,time,planFingerprint(s.goals[0]!));
describe('immutable plans and Goal milestones',()=>{
 it('captures initial terms and retains earlier obligations when future terms change',()=>{
  const s=initial(),next=revise(s,'20000');
  expect(s.goals[0]!.planRevisions).toHaveLength(1);
  expect(next.goals[0]!.planRevisions?.[0]).toEqual(s.goals[0]!.planRevisions?.[0]);
  expect(revisionInstallments(next.goals[0]!,'2026-09-20','2026-10-04').map(x=>[x.date,x.amount])).toEqual([['2026-09-20','10000'],['2026-09-27','20000'],['2026-10-04','20000']]);
  expect(fundingHealth(next,'1',now).plannedThroughToday).toBe('10000');
  expect(privateGoalSummary(next,next.goals[0]!,[],now).metadata.find(x=>x.label==='Contribution plan')?.value).toBe('$100 / weekly');
  expect(next.allocations).toEqual(s.allocations);
 });
 it('does not invent old terms when first revising a legacy plan',()=>{
  const g={...goal(),createdAt:'2025-01-01T00:00:00Z',plan:{...plan,nextDate:'2025-01-01'}};
  const next=revise({...emptyPlatform(),goals:[g]},'20000');
  expect(next.goals[0]!.planRevisions?.[0]).toMatchObject({effectiveFrom:'2026-09-20',priorHistory:'unknown'});
  expect(revisionInstallments(next.goals[0]!,'2025-01-01','2026-09-19')).toEqual([]);
  expect(fundingHealth(next,'1',now).warnings.join(' ')).toMatch(/earlier plan terms.*unknown/i);
  expect(fundingHealth(next,'1',now).status).toBe('REVIEW');
 });
 it('fails safely instead of summing revision history with a changed Goal currency',()=>{
  const g={...initial().goals[0]!,asset:'EUR'};
  expect(()=>revisionInstallments(g,'2026-09-20','2026-10-01')).toThrow(/unit/i);
 });
 it('rejects retroactive edits and a stale editor without overwriting the new revision',()=>{
  const s=initial(),next=revise(s,'20000');
  expect(()=>revise(s,'2','2026-09-20')).toThrow(/future day/i);
  expect(()=>reviseGoalPlan(next,'1',plan,'2026-09-22',now,planFingerprint(s.goals[0]!))).toThrow(/changed/i);
  expect(()=>assertGoalEditsUnlocked(next,{...next,goals:[{...next.goals[0]!,planRevisions:[]}]})).toThrow(/append-only/i);
 });
 it('preserves month-end anchors across leap days, pauses and resumes, with explicit canceled future IDs',()=>{
  const time=Date.parse('2028-01-31T23:59:59Z'),monthly={...plan,cadence:'monthly' as const,nextDate:'2028-01-31'};
  const s=recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[{...goal(),createdAt:new Date(time).toISOString(),plan:monthly}]},time);
  expect(revisionInstallments(s.goals[0]!,'2028-01-31','2028-03-31').map(x=>x.date)).toEqual(['2028-01-31','2028-02-29','2028-03-31']);
  const paused=reviseGoalPlan(s,'1',{...monthly,active:false},'2028-02-01',time,planFingerprint(s.goals[0]!));
  expect(effectiveContributionPlan(paused.goals[0]!,'2028-01-31')?.active).toBe(true);
  expect(effectiveContributionPlan(paused.goals[0]!,'2028-02-01')?.active).toBe(false);
  expect(canceledRevisionInstallments(paused.goals[0]!,'2028-03-31').map(x=>x.date)).toEqual(['2028-02-29','2028-03-31']);
  const resumed=reviseGoalPlan(paused,'1',monthly,'2028-03-01',time+1,planFingerprint(paused.goals[0]!));
  expect(revisionInstallments(resumed.goals[0]!,'2028-01-31','2028-03-31').map(x=>x.date)).toEqual(['2028-01-31','2028-03-31']);
  expect(revisionInstallments(resumed.goals[0]!,'2028-03-31','2028-03-31')[0]!.id).not.toBe(canceledRevisionInstallments(resumed.goals[0]!,'2028-03-31').at(-1)!.id);
 });
 it('does not complete at rounded 99.6%, repeat a retained completion on refresh, or drop its original valuation evidence',()=>{
  const s=initial(),p=positionSchema.parse({id:'p',providerId:'manual',sourceType:'MANUAL',network:'manual',account:'local',asset:'USD',denom:'USD',quantity:'100000',decimals:2,verification:'MANUAL',observedAt:at,liquidity:'LIQUID',provenance:'User entry',valuation:{value:'99600',currency:'USD',decimals:2,source:'MANUAL',observedAt:at}});
  const almost=recordGoalChanges(s,{...s,positions:[p],allocations:[{goalId:'1',positionId:'p',quantity:'100000'}]},now);
  expect(almost.goals[0]!.lifecycle).toBeUndefined();
  const completed=recordGoalChanges(almost,{...almost,positions:[{...p,valuation:{...p.valuation!,value:'100000'}}]},now+1);
  expect(completed.goals[0]!.lifecycle?.[0]?.evidence?.[0]?.valuation).toMatchObject({value:'100000',currency:'USD',source:'MANUAL'});
  expect(captureValuations(completed,[],now+86400000).goals[0]!.lifecycle).toHaveLength(1);
  const targetChange=recordGoalChanges(completed,{...completed,goals:[{...completed.goals[0]!,target:'50000'}]},now+2*86400000);
  expect(targetChange.goals[0]!.lifecycle?.filter(e=>e.kind==='completed')).toHaveLength(2);
 });
 it('ignores Habit link metadata but records target and deadline assumptions',()=>{
  const s=initial(),linked={...s,goals:[{...s.goals[0]!,plan:{...plan,habitId:'habit'}}]};
  expect(recordGoalChanges(s,linked,now).goals[0]!.planRevisions).toEqual(s.goals[0]!.planRevisions);
  const changed=recordGoalChanges(s,{...s,goals:[{...s.goals[0]!,target:'200000',targetDate:'2027-01-01'}]},now);
  expect(changed.goals[0]!.planRevisions?.at(-1)).toMatchObject({target:'200000',targetDate:'2027-01-01'});
 });
 it('binds funding to a revision installment, supports partial/reversal and never matches by date alone',()=>{
  const p=positionSchema.parse({id:'cash',providerId:'Cash',sourceType:'MANUAL',network:'manual',account:'local',asset:'USD',denom:'USD',quantity:'0',decimals:2,assetClass:'Cash',verification:'MANUAL',liquidity:'LIQUID',observedAt:at,provenance:'User entry'});
  let s={...initial(),positions:[p]};const installment=revisionInstallments(s.goals[0]!,'2026-09-20','2026-09-20')[0]!;
  const input={id:'payment',goalId:'1',positionId:'cash',quantity:'4000',occurredAt:at,scheduledDate:installment.date,planRevisionId:installment.revisionId,installmentId:installment.id};
  s=fundGoal(s,input,[],now);
  expect(s.contributions[0]).toMatchObject({planRevisionId:installment.revisionId,installmentId:installment.id});
  expect(fundGoal(s,input,[],now)).toBe(s);
  expect(revisionInstallments(s.goals[0]!,'2026-09-20','2026-09-20',s.contributions,now)[0]!.remaining).toBe('6000');
  const reversed=reverseContribution(s,'payment','reverse',at);
  expect(revisionInstallments(s.goals[0]!,'2026-09-20','2026-09-20',reversed.contributions,now)[0]!.remaining).toBe('10000');
  expect(()=>fundGoal(initial(),{...input,newPosition:p,positionId:undefined,planRevisionId:undefined,installmentId:undefined},[],now)).toThrow(/installment/i);
 });
 it('retains completion evidence beyond history compaction and current attainment decline',()=>{
  const s=initial(),p=positionSchema.parse({id:'p',providerId:'manual',sourceType:'MANUAL',network:'manual',account:'local',asset:'USD',denom:'USD',quantity:'100000',decimals:2,verification:'MANUAL',observedAt:at,liquidity:'LIQUID',provenance:'User entry',valuation:{value:'100000',currency:'USD',decimals:2,source:'MANUAL',observedAt:at}});
  const completed=recordGoalChanges(s,platformSchema.parse({...s,positions:[p],allocations:[{goalId:'1',positionId:'p',quantity:'100000'}]}),now);
  const milestone=completed.goals[0]!.lifecycle?.find(e=>e.kind==='completed');
  expect(milestone).toMatchObject({at,current:'100000',target:'100000'});
  const locked={...s,goals:[{...s.goals[0]!,locked:true}],positions:[p],allocations:[{goalId:'1',positionId:'p',quantity:'100000'}]};
  expect(()=>assertGoalEditsUnlocked(locked,captureValuations(locked,[],now))).not.toThrow();
  const declined=recordGoalChanges(completed,platformSchema.parse({...completed,allocations:[]}),now+86400000);
  expect(declined.goals[0]!.status).toBe('active');
  expect(declined.goals[0]!.lifecycle).toContainEqual(milestone);
  expect(captureValuations({...declined,goalHistory:[]},[],now+2*86400000).goals[0]!.lifecycle).toContainEqual(milestone);
  const closed=recordGoalChanges(declined,closeGoal(declined,'1'),now+2*86400000);
  const reopened=reopenGoal(closed,'1',now+3*86400000);
  expect(reopened.allocations).toEqual([]);
  expect(reopened.goals[0]!.lifecycle?.at(-1)?.kind).toBe('reopened');
  expect(platformSchema.parse(JSON.parse(JSON.stringify(reopened))).goals[0]!.lifecycle).toEqual(reopened.goals[0]!.lifecycle);
 });
});
