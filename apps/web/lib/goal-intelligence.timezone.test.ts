import {afterEach,describe,expect,test} from 'vitest';
import {contributionSchema,emptyPlatform,planScenario,platformSchema,positionSchema,privateGoalSchema,scenarioHorizon,type ContributionPlan,type Platform} from './positions';
import {captureValuations,fundingHealth,recordGoalChanges} from './goal-intelligence';

// Timezone project, phase 1 (Session N; docs/product/TIMEZONE_DESIGN.md, "The QA-04 path").
// Part 1 locks today's behaviour: Goal funding, plan and capture days are UTC, whatever the device zone. These
// tests pass now and must stay green through phase 2 (the helpers wired with "UTC").
// Part 2 stated the decided future behaviour as expected failures (rows Z1-Z13 in docs/testing/SKIPPED_TESTS.md):
// funding and plan days follow the plan's own zone. Phase 3 (R1, Session P, PR 2) reads `plan.timeZone`, so they are
// plain tests now. Nothing writes a zone until phase 4 (R2), so every stored plan is still UTC in practice: Part 1
// keeps locking that. The guards pin what a zoned record is (finance v4, IANA names only) and that the zone-less
// twins keep today's UTC answers, so a broken fixture can never make a row pass for the wrong reason.

const deviceZone=process.env.TZ;
afterEach(()=>{process.env.TZ=deviceZone;});
/** Device zones for the locks: UTC, both DST hemispheres, UTC+14 and -12, half-hour and 45-minute offsets,
 * 30-minute DST (Lord Howe) and a DST change at midnight (Santiago). */
const HOST_ZONES=['UTC','Europe/Brussels','America/New_York','Pacific/Kiritimati','Etc/GMT+12','Asia/Kolkata','Asia/Kathmandu','Australia/Adelaide','Pacific/Chatham','Australia/Lord_Howe','America/Santiago'] as const;

/** QA-04's Goal: EUR, a 500 EUR monthly plan due on the 15th, recorded the way the app records a new plan. */
const MONTHLY:ContributionPlan={amount:'50000',asset:'EUR',decimals:2,cadence:'monthly',nextDate:'2026-10-15',active:true};
function planned(plan:ContributionPlan=MONTHLY,created='2026-09-20T12:00:00Z'):Platform {
 const goal=privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:created,milestones:[],plan});
 return recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal]},Date.parse(created));
}
/** The decided format (TIMEZONE_DESIGN.md, "Plan zone"): the plan and every revision's terms carry `timeZone`.
 * Since phase 3 the schemas read it, and a record that carries a zone is finance v4, validated like any other. */
function zoned(s:Platform,timeZone:string):Platform {
 return platformSchema.parse({...s,schemaVersion:4,goals:s.goals.map(g=>({...g,plan:g.plan&&{...g.plan,timeZone},planRevisions:g.planRevisions?.map(r=>({...r,terms:r.terms&&{...r.terms,timeZone}}))}))});
}
const funding=(s:Platform,now:number)=>{const h=fundingHealth(s,'1',now);return {plannedThroughToday:h.plannedThroughToday,dueToday:h.dueToday,nextDate:h.nextDate,overdue:h.overdue,status:h.status};};

describe.each(HOST_ZONES)('today, on a %s device: funding, plan and capture days are UTC',zone=>{
 test('funding health around a UTC midnight and at QA-04\'s 21:30 New York',()=>{
  process.env.TZ=zone;
  const s=planned();
  // One millisecond before the due day in UTC: nothing is due yet.
  expect(funding(s,Date.parse('2026-10-14T23:59:59.999Z'))).toEqual({plannedThroughToday:'0',dueToday:'0',nextDate:'2026-10-15',overdue:false,status:'ON_TRACK'});
  // The due day starts at 00:00 UTC: the instalment is due today. Since phase 4 (Session W Part 17, T6-B) it counts as
  // planned only once that day has ended, so nobody is behind on the day they are meant to fund.
  expect(funding(s,Date.parse('2026-10-15T00:00:00.000Z'))).toEqual({plannedThroughToday:'0',dueToday:'50000',nextDate:'2026-10-15',overdue:false,status:'ON_TRACK'});
  // The last millisecond of the due day in UTC: still due today.
  expect(funding(s,Date.parse('2026-10-15T23:59:59.999Z'))).toEqual({plannedThroughToday:'0',dueToday:'50000',nextDate:'2026-10-15',overdue:false,status:'ON_TRACK'});
  // QA-04 with a UTC plan: 21:30 in New York is already 16 October in UTC, so the 15th has ended and is behind.
  expect(funding(s,Date.parse('2026-10-16T01:30:00.000Z'))).toEqual({plannedThroughToday:'50000',dueToday:'0',nextDate:'2026-11-15',overdue:true,status:'BEHIND'});
 });
 test('a valuation is captured once per UTC day',()=>{
  process.env.TZ=zone;
  const position=(value:string,observedAt:string)=>positionSchema.parse({id:'p',providerId:'manual',sourceType:'MANUAL',network:'manual',account:'local',asset:'EUR',denom:'EUR',quantity:'1',decimals:0,verification:'MANUAL',observedAt,liquidity:'LIQUID',provenance:'User entry',valuation:{value,currency:'EUR',decimals:2,source:'MANUAL',observedAt}});
  const revalue=(s:Platform,value:string,observedAt:string):Platform=>({...s,positions:[position(value,observedAt)]});
  const start:Platform={...planned(),positions:[position('80000','2026-10-14T20:00:00.000Z')],allocations:[{goalId:'1',positionId:'p',quantity:'1'}]};
  const first=captureValuations(start,[],Date.parse('2026-10-14T23:59:59.999Z'));
  expect(first.valuationSnapshots).toHaveLength(1);
  // A new value one millisecond later is a new UTC day: captured.
  const second=captureValuations(revalue(first,'81000','2026-10-14T23:59:59.999Z'),[],Date.parse('2026-10-15T00:00:00.000Z'));
  expect(second.valuationSnapshots).toHaveLength(2);
  // Another new value late on the same UTC day: not captured again.
  const third=captureValuations(revalue(second,'82000','2026-10-15T23:00:00.000Z'),[],Date.parse('2026-10-15T23:59:59.999Z'));
  expect(third.valuationSnapshots).toHaveLength(2);
  expect(third.valuationSnapshots.map(v=>v.capturedAt.slice(0,10))).toEqual(['2026-10-14','2026-10-15']);
 });
 test('scenario horizons and scheduled dates are UTC calendar arithmetic',()=>{
  process.env.TZ=zone;
  expect(scenarioHorizon('2026-10-15')).toBe('2027-10-15');
  expect(scenarioHorizon('2028-02-29')).toBe('2029-02-28');
  expect(scenarioHorizon('2026-03-29','2026-12-31')).toBe('2026-12-31');
  const goal=planned().goals[0]!;
  expect(planScenario(goal,'0',{...MONTHLY,nextDate:'2026-01-31'},'2026-05-31','2026-01-31').dates).toEqual(['2026-01-31','2026-02-28','2026-03-31','2026-04-30','2026-05-31']);
  // Weekly across both DST ends and Santiago's skipped midnight: always seven calendar days.
  expect(planScenario(goal,'0',{...MONTHLY,cadence:'weekly',nextDate:'2026-09-01'},'2026-11-03','2026-09-01').dates).toEqual(['2026-09-01','2026-09-08','2026-09-15','2026-09-22','2026-09-29','2026-10-06','2026-10-13','2026-10-20','2026-10-27','2026-11-03']);
 });
});

describe('guards for the rows below (plain tests; G1 updated in phase 3, Session P)',()=>{
 test('G1 since phase 3 a plan may carry an IANA zone, never a fixed offset, and a zoned record is finance v4',()=>{
  // Until Session P this guard pinned the opposite: `timeZone` refused, funding health REVIEW. R2 adds the writers.
  expect(contributionSchema.safeParse({...MONTHLY,timeZone:'America/New_York'}).success).toBe(true);
  expect(contributionSchema.safeParse({...MONTHLY,timeZone:'+05:30'}).success).toBe(false);
  expect(platformSchema.safeParse({...zoned(planned(),'America/New_York'),schemaVersion:3}).success).toBe(false);
  expect(zoned(planned(),'America/New_York').schemaVersion).toBe(4);
  const h=fundingHealth(zoned(planned(),'America/New_York'),'1',Date.parse('2026-10-16T01:30:00.000Z'));
  expect(h.status).not.toBe('REVIEW');
  expect(h.warnings).not.toContain('Plan requires a compatible price assumption.');
 });
 test('each row\'s zone-less twin shows today\'s UTC answer (nothing writes a zone until phase 4)',()=>{
  // The same instants as Z1-Z13, without a plan zone: the UTC day decides.
  expect(funding(planned(),Date.parse('2026-10-16T01:30:00.000Z')).nextDate).toBe('2026-11-15');
  expect(funding(planned(),Date.parse('2026-10-14T10:05:00.000Z')).plannedThroughToday).toBe('0');
  expect(funding(planned({...MONTHLY,nextDate:'2026-03-29'},'2026-03-01T12:00:00Z'),Date.parse('2026-03-28T23:30:00.000Z')).plannedThroughToday).toBe('0');
  expect(funding(planned({...MONTHLY,nextDate:'2026-09-06'},'2026-08-20T12:00:00Z'),Date.parse('2026-09-06T03:59:59.999Z')).dueToday).toBe('50000');
  expect(funding(planned({...MONTHLY,nextDate:'2026-09-06'},'2026-08-20T12:00:00Z'),Date.parse('2026-09-07T02:30:00.000Z')).nextDate).toBe('2026-10-06');
  expect(funding(planned(),Date.parse('2026-10-15T22:30:00.000Z')).nextDate).toBe('2026-10-15');
 });
});

// Decided behaviour (T1-T4, TIMEZONE_DESIGN.md): a plan's days are calendar dates in the plan's own zone.
// Each row: plan zone, the instant, what the plan's zone says, and the field that shows it. Plain tests since phase 3.
// Since phase 4 (Session W Part 17, T6-B), a row on the due day shows it as due today (`dueToday`), not yet planned.
describe('decided: funding days follow the plan\'s zone (phase 3, R1)',()=>{
 const due15={plan:MONTHLY,created:'2026-09-20T12:00:00Z'};
 test.each([
  // Z1 QA-04: 21:30 in New York on the due day. The instalment is due today, not last month's.
  ['Z1 America/New_York, 21:30 on the due day',due15,'America/New_York','2026-10-16T01:30:00.000Z',{nextDate:'2026-10-15'}],
  // Z2 UTC+14: five past midnight on the due day, which UTC still calls the 14th.
  ['Z2 Pacific/Kiritimati (UTC+14), 00:05 on the due day',due15,'Pacific/Kiritimati','2026-10-14T10:05:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  // Z3 UTC-12: five to midnight on the due day, which UTC already calls the 16th.
  ['Z3 Etc/GMT+12 (UTC-12), 23:55 on the due day',due15,'Etc/GMT+12','2026-10-16T11:55:00.000Z',{nextDate:'2026-10-15'}],
  // Z4 DST gap: 02:00-03:00 is skipped in Brussels on 29 March 2026.
  ['Z4 Europe/Brussels, 00:30 on the spring-forward day',{plan:{...MONTHLY,nextDate:'2026-03-29'},created:'2026-03-01T12:00:00Z'},'Europe/Brussels','2026-03-28T23:30:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  // Z5 DST overlap: 02:00-03:00 happens twice in Brussels on 25 October 2026.
  ['Z5 Europe/Brussels, 00:30 on the fall-back day',{plan:{...MONTHLY,nextDate:'2026-10-25'},created:'2026-09-20T12:00:00Z'},'Europe/Brussels','2026-10-24T22:30:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  // Z6-Z7 Santiago skips midnight on 6 September 2026 (the day starts at 01:00).
  ['Z6 America/Santiago, 23:59:59 just before the skipped midnight',{plan:{...MONTHLY,nextDate:'2026-09-06'},created:'2026-08-20T12:00:00Z'},'America/Santiago','2026-09-06T03:59:59.999Z',{plannedThroughToday:'0',dueToday:'0'}],
  ['Z7 America/Santiago, 23:30 on the 23-hour day',{plan:{...MONTHLY,nextDate:'2026-09-06'},created:'2026-08-20T12:00:00Z'},'America/Santiago','2026-09-07T02:30:00.000Z',{nextDate:'2026-09-06'}],
  // Z8-Z12 half-hour, 45-minute and 30-minute-DST zones, five past midnight on the due day.
  ['Z8 Asia/Kolkata (UTC+5:30)',due15,'Asia/Kolkata','2026-10-14T18:35:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  ['Z9 Asia/Kathmandu (UTC+5:45)',due15,'Asia/Kathmandu','2026-10-14T18:20:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  ['Z10 Pacific/Chatham (UTC+13:45 in summer)',due15,'Pacific/Chatham','2026-10-14T10:20:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  ['Z11 Australia/Lord_Howe (UTC+11, 30-minute DST)',due15,'Australia/Lord_Howe','2026-10-14T13:05:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
  ['Z12 Australia/Adelaide (UTC+10:30 in summer)',due15,'Australia/Adelaide','2026-10-14T13:35:00.000Z',{plannedThroughToday:'0',dueToday:'50000'}],
 ] as const)('%s',(_label,fixture,planZone,instant,expected)=>{
  const h=fundingHealth(zoned(planned(fixture.plan,fixture.created),planZone),'1',Date.parse(instant));
  expect(h.status).not.toBe('REVIEW');
  expect(h).toMatchObject(expected);
 });

 // Z13 travel: the plan stays in Brussels while the device moves. At 22:30 UTC on 15 October it is already the 16th
 // in Brussels (the 15th's instalment is past, the next one is November's), still the 15th in Los Angeles and UTC.
 test.each(['America/Los_Angeles','Asia/Tokyo'])('Z13 travel: a Brussels plan keeps Brussels days on a %s device',device=>{
  process.env.TZ=device;
  const h=fundingHealth(zoned(planned(),'Europe/Brussels'),'1',Date.parse('2026-10-15T22:30:00.000Z'));
  expect(h.status).not.toBe('REVIEW');
  expect(h).toMatchObject({nextDate:'2026-11-15',plannedThroughToday:'50000'});
 });
});
