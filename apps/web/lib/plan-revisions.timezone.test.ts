import {afterEach,describe,expect,test} from 'vitest';
import {emptyPlatform,privateGoalSchema,type ContributionPlan,type Platform} from './positions';
import {recordGoalChanges} from './goal-intelligence';
import * as revisions from './plan-revisions';
import {earliestPlanChange,planFingerprint,reviseGoalPlan,revisionInstallments} from './plan-revisions';

// Timezone project, phase 1 (Session N). Part 1 locks today's plan-revision days, which are UTC on every device.
// Part 2 states the decided future (TIMEZONE_DESIGN.md: T1 and "A zone change is a new plan revision, effective
// from the next day in the old zone") as expected failures Z14-Z16, registered in docs/testing/SKIPPED_TESTS.md.
// Z14-Z15 flip in phase 3 (R1 reads `timeZone`); Z16 flips in phase 4 (R2 adds the default).

const deviceZone=process.env.TZ;
afterEach(()=>{process.env.TZ=deviceZone;});
const HOST_ZONES=['UTC','Europe/Brussels','America/New_York','Pacific/Kiritimati','Etc/GMT+12','Asia/Kolkata','Asia/Kathmandu','Australia/Adelaide','Pacific/Chatham','Australia/Lord_Howe','America/Santiago'] as const;

const MONTHLY:ContributionPlan={amount:'50000',asset:'EUR',decimals:2,cadence:'monthly',nextDate:'2026-10-15',active:true};
const WEEKLY:ContributionPlan={...MONTHLY,cadence:'weekly',nextDate:'2026-09-01'};
function planned(plan:ContributionPlan=MONTHLY,created='2026-09-20T12:00:00Z'):Platform {
 const goal=privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:created,milestones:[],plan});
 return recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal]},Date.parse(created));
}
/** The decided format: the plan and every revision's terms carry `timeZone` (refused by today's strict schemas). */
function zoned(s:Platform,timeZone:string):Platform {
 return {...s,goals:s.goals.map(g=>({...g,plan:g.plan&&{...g.plan,timeZone},planRevisions:g.planRevisions?.map(r=>({...r,terms:r.terms&&{...r.terms,timeZone}}))}))} as unknown as Platform;
}

describe.each(HOST_ZONES)('today, on a %s device: plan-revision days are UTC',zone=>{
 test('a new plan takes effect on the UTC day it is recorded',()=>{
  process.env.TZ=zone;
  expect(planned(MONTHLY,'2026-10-15T23:59:59.999Z').goals[0]!.planRevisions![0]!.effectiveFrom).toBe('2026-10-15');
  expect(planned(MONTHLY,'2026-10-16T00:00:00.000Z').goals[0]!.planRevisions![0]!.effectiveFrom).toBe('2026-10-16');
 });
 test('the earliest change is the next UTC day, or after the last retained revision',()=>{
  process.env.TZ=zone;
  const s=planned(),g=s.goals[0]!;
  expect(earliestPlanChange(g,Date.parse('2026-10-15T23:59:59.999Z'))).toBe('2026-10-16');
  expect(earliestPlanChange(g,Date.parse('2026-10-16T00:00:00.000Z'))).toBe('2026-10-17');
  // QA-04's 21:30 New York is 16 October in UTC, so the earliest change is the 17th.
  expect(earliestPlanChange(g,Date.parse('2026-10-16T01:30:00.000Z'))).toBe('2026-10-17');
  const later=reviseGoalPlan(s,'1',{...MONTHLY,amount:'60000'},'2026-12-01',Date.parse('2026-10-16T01:30:00.000Z'),planFingerprint(g));
  expect(earliestPlanChange(later.goals[0]!,Date.parse('2026-10-16T01:30:00.000Z'))).toBe('2026-12-01');
  // Without any plan, a change may start today (UTC).
  expect(earliestPlanChange({...g,plan:undefined,planRevisions:undefined},Date.parse('2026-10-16T01:30:00.000Z'))).toBe('2026-10-16');
 });
 test('instalments keep their calendar dates across DST ends and Santiago\'s skipped midnight',()=>{
  process.env.TZ=zone;
  const s=planned(WEEKLY,'2026-08-20T12:00:00Z'),g=s.goals[0]!;
  expect(revisionInstallments(g,'2026-08-20','2026-11-03').map(x=>x.date)).toEqual(['2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-09-29','2026-10-06','2026-10-13','2026-10-20','2026-10-27','2026-11-03']);
  // A revision ends the day before the next one takes effect.
  const next=reviseGoalPlan(s,'1',{...WEEKLY,amount:'70000'},'2026-10-25',Date.parse('2026-10-01T12:00:00Z'),planFingerprint(g));
  expect(revisionInstallments(next.goals[0]!,'2026-10-13','2026-11-03').map(x=>[x.date,x.amount])).toEqual([['2026-10-13','50000'],['2026-10-20','50000'],['2026-10-27','70000'],['2026-11-03','70000']]);
 });
});

describe('guards for the expected failures below (plain tests that pass today)',()=>{
 const now=Date.parse('2026-10-16T01:30:00.000Z');
 test('today a plan that carries timeZone is refused when it is revised',()=>{
  // Z15 fails for this reason until R1 accepts the field. R1 updates this guard in the same PR.
  const s=zoned(planned(),'America/New_York');
  expect(()=>reviseGoalPlan(s,'1',{...MONTHLY,timeZone:'Asia/Tokyo'} as ContributionPlan,'2026-10-16',now,planFingerprint(s.goals[0]!))).toThrow(/timeZone/);
 });
 test('today the earliest change ignores a plan zone: it is the next UTC day',()=>{
  // Z14's twin.
  expect(earliestPlanChange(zoned(planned(),'America/New_York').goals[0]!,now)).toBe('2026-10-17');
 });
 test('no default plan zone exists yet',()=>{
  // Z16 fails for this reason until R2 adds the journal-zone default. R2 updates this guard in the same PR.
  expect('defaultPlanTimeZone' in revisions).toBe(false);
 });
});

describe('decided: plan-revision days follow the plan\'s zone',()=>{
 const now=Date.parse('2026-10-16T01:30:00.000Z');
 // Z14 At 21:30 on 15 October in New York, the next day in the plan's zone is the 16th.
 test.fails('Z14 the earliest change is the next day in the plan\'s zone',()=>{
  expect(earliestPlanChange(zoned(planned(),'America/New_York').goals[0]!,now)).toBe('2026-10-16');
 });
 // Z15 A zone change is a new revision that takes effect from the next day in the old zone; earlier instalments keep
 // their dates and ids.
 test.fails('Z15 a zone change starts the next day in the old zone and keeps earlier instalments',()=>{
  const s=zoned(planned(),'America/New_York');
  const before=revisionInstallments(s.goals[0]!,'2026-09-20','2026-10-15');
  const next=reviseGoalPlan(s,'1',{...MONTHLY,timeZone:'Asia/Tokyo'} as ContributionPlan,'2026-10-16',now,planFingerprint(s.goals[0]!));
  const latest=next.goals[0]!.planRevisions!.at(-1)!;
  expect(latest.effectiveFrom).toBe('2026-10-16');
  expect((latest.terms as {timeZone?:string}|null)?.timeZone).toBe('Asia/Tokyo');
  expect(revisionInstallments(next.goals[0]!,'2026-09-20','2026-10-15')).toEqual(before);
 });
 // Z16 (T1) A new plan's zone defaults to the journal zone, else UTC.
 test.fails('Z16 a new plan defaults to the journal zone, else UTC',()=>{
  const defaultPlanTimeZone=(revisions as Record<string,unknown>).defaultPlanTimeZone as ((journalTimeZone?:string)=>string)|undefined;
  expect(defaultPlanTimeZone?.('Europe/Brussels')).toBe('Europe/Brussels');
  expect(defaultPlanTimeZone?.(undefined)).toBe('UTC');
 });
});
