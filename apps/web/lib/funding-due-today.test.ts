import {afterEach,describe,expect,test} from 'vitest';
import {emptyPlatform,platformSchema,privateGoalSchema,type ContributionPlan,type Platform} from './positions';
import {appendContribution,fundingHealth,recordGoalChanges} from './goal-intelligence';

// Session W Part 17 (owner decision W2, TIMEZONE_PHASE4_DECISIONS.md T6-B): an instalment counts as planned once its day
// has ended in the plan's zone; until then the plan says it is due today. What is already funded counts at once, so
// funding on the due day reads "on track", never "ahead". The funding history, past instalments and their ids are unchanged.
const deviceZone=process.env.TZ;
afterEach(()=>{process.env.TZ=deviceZone;});
const MONTHLY:ContributionPlan={amount:'50000',asset:'EUR',decimals:2,cadence:'monthly',nextDate:'2026-10-15',active:true};
function planned(timeZone?:string,plan:ContributionPlan=MONTHLY):Platform{
 const goal=privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:'2026-09-20T12:00:00Z',milestones:[],plan:timeZone?{...plan,timeZone}:plan});
 const s=recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal]},Date.parse('2026-09-20T12:00:00Z'));
 return platformSchema.parse(s);
}
const fund=(s:Platform,quantity:string,at:string,date='2026-10-15')=>{const r=s.goals[0]!.planRevisions!.at(-1)!;return appendContribution(s,{id:`f-${quantity}-${at}`,goalId:'1',direction:'IN',quantity,asset:'EUR',decimals:2,occurredAt:at,provenance:'MANUAL_ATTRIBUTION',fundingMode:'FUND_GOAL',scheduledDate:date,planRevisionId:r.id,installmentId:`${r.id}:${date}`});};
const view=(s:Platform,at:string)=>{const h=fundingHealth(s,'1',Date.parse(at));return {plannedThroughToday:h.plannedThroughToday,dueToday:h.dueToday,variance:h.variance,overdue:h.overdue,status:h.status,nextDate:h.nextDate,planZone:h.planZone};};

describe('T6-B: due today, never behind on the due day',()=>{
 test('QA-04 flips: New York plan, 21:30 local on the due day, not funded: due today, not behind, next contribution the 15th',()=>{
  for(const device of ['UTC','America/New_York','Asia/Tokyo']){
   process.env.TZ=device;
   expect(view(planned('America/New_York'),'2026-10-16T01:30:00.000Z'),device).toEqual({plannedThroughToday:'0',dueToday:'50000',variance:'0',overdue:false,status:'ON_TRACK',nextDate:'2026-10-15',planZone:'America/New_York'});
  }
 });
 test('the next day in the plan\'s zone, still not funded: behind by the instalment',()=>{
  expect(view(planned('America/New_York'),'2026-10-16T04:00:00.000Z')).toEqual({plannedThroughToday:'50000',dueToday:'0',variance:'-50000',overdue:true,status:'BEHIND',nextDate:'2026-11-15',planZone:'America/New_York'});
 });
 test('funded on the due day: on track at once, not ahead; the next day it stays on track',()=>{
  const s=fund(planned('America/New_York'),'50000','2026-10-15T18:00:00.000Z');
  expect(view(s,'2026-10-15T20:00:00.000Z')).toMatchObject({plannedThroughToday:'50000',dueToday:'0',variance:'0',overdue:false,status:'ON_TRACK',nextDate:'2026-11-15'});
  expect(view(s,'2026-10-16T05:00:00.000Z')).toMatchObject({plannedThroughToday:'50000',dueToday:'0',variance:'0',overdue:false,status:'ON_TRACK'});
 });
 test('half funded on the due day: half is planned, half still due; the next day the rest is behind',()=>{
  const s=fund(planned('America/New_York'),'25000','2026-10-15T18:00:00.000Z');
  expect(view(s,'2026-10-15T20:00:00.000Z')).toMatchObject({plannedThroughToday:'25000',dueToday:'25000',variance:'0',overdue:false,status:'ON_TRACK',nextDate:'2026-10-15'});
  expect(view(s,'2026-10-16T05:00:00.000Z')).toMatchObject({plannedThroughToday:'50000',dueToday:'0',variance:'-25000',overdue:true,status:'BEHIND'});
 });
 test('a zone-less plan is a UTC plan: its due day is the UTC day, the same rule',()=>{
  expect(view(planned(),'2026-10-15T23:59:59.999Z')).toMatchObject({plannedThroughToday:'0',dueToday:'50000',status:'ON_TRACK',planZone:'UTC'});
  expect(view(planned(),'2026-10-16T00:00:00.000Z')).toMatchObject({plannedThroughToday:'50000',dueToday:'0',status:'BEHIND'});
 });
 test('a legacy plan (no revisions) follows the same rule',()=>{
  const goal=privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:'2026-09-20T12:00:00Z',milestones:[],plan:MONTHLY});
  const s={...emptyPlatform(),goals:[goal]};
  expect(fundingHealth(s,'1',Date.parse('2026-10-15T12:00:00Z'))).toMatchObject({plannedThroughToday:'0',dueToday:'50000',overdue:false});
  expect(fundingHealth(s,'1',Date.parse('2026-10-16T12:00:00Z'))).toMatchObject({plannedThroughToday:'50000',dueToday:'0',overdue:true});
 });
});
