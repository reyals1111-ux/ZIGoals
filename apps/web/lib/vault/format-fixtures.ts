import {emptyPlatform,privateGoalSchema,type ContributionPlan} from '../positions';
import {createHabit,emptyHabitData,logHabitCount} from '../habits';
import {createEmptyHealth} from '../health';
import {presetSettings} from '../dashboard-settings';

// Session P (PR 2, 2026-10-03): the smallest valid record of every stored format this build reads: today's versions
// (finance v3, habits v2, health v1, settings v1, the only ones anything writes) and the ones read ahead of their
// writers (timezone phase 3, R1: finance v4 and settings v2; the read-only sync homes of PR 3's device-only records:
// habits v3, health v2). Each newer record is its older twin plus exactly the new fields, so a test can show what an
// older build refuses, what this one reads unchanged and what nothing writes yet. A fixture like power-user-fixture.ts:
// nothing in the app imports it.
export const FIXTURE_AT='2026-09-08T12:00:00.000Z';
const HABIT_ID='c3a1e5d2-7b64-4f0a-9c3e-1d2f3a4b5c6d',HEALTH_GOAL_ID='8f0f2a62-6d0b-4c53-9b6d-2c6e0c1a7a11';
export const MONTHLY_PLAN:ContributionPlan={amount:'50000',asset:'EUR',decimals:2,cadence:'monthly',nextDate:'2026-10-15',active:true};
const goal=(plan:ContributionPlan)=>privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:'2026-09-20T12:00:00.000Z',milestones:[],plan});

/** Finance v3: one Goal with a zone-less monthly plan, exactly what today's build writes. */
export function financeV3(){return {...emptyPlatform(),goals:[goal(MONTHLY_PLAN)]};}
/** The synced home of a health goal (PR 3's G3), as finance v4 carries it. */
export const HEALTH_GOAL={version:1 as const,id:HEALTH_GOAL_ID,name:'Walk more',measure:'steps' as const,direction:'at-least' as const,target:{value:'8000',decimals:0},unit:'steps',window:{kind:'rolling' as const,weeks:4},status:'active' as const,createdAt:FIXTURE_AT,updatedAt:FIXTURE_AT};
/** Finance v4: the v3 twin whose plan carries its zone, plus one health goal. Nothing writes it in R1. */
export function financeV4(){return {...financeV3(),schemaVersion:4 as const,goals:[goal({...MONTHLY_PLAN,timeZone:'Europe/Brussels'})],healthGoals:[HEALTH_GOAL]};}

/** Habits v2: one daily habit with one check-in, exactly what today's build writes. */
export function habitsV2(){
 const created=createHabit(emptyHabitData(),{title:'Drink water',category:'Health',description:'Two litres a day',notes:'',schedule:{kind:'daily'},target:1},new Date('2026-09-07T12:00:00.000Z'),HABIT_ID);
 return logHabitCount(created,HABIT_ID,'2026-09-07',1,'',new Date(FIXTURE_AT));
}
/** The synced home of a "done automatically from Health" rule (PR 3's H7), as habits v3 carries it. */
export const HABIT_HEALTH_LINK={version:1 as const,measure:'water' as const,rule:'at-least' as const,target:2000,updatedAt:FIXTURE_AT};
/** Habits v3: the v2 twin whose habit carries a Health link and whose check-in records its source. Nothing writes it in R1. */
export function habitsV3(){const v2=habitsV2();return {...v2,schemaVersion:3 as const,habits:v2.habits.map(h=>({...h,healthLink:HABIT_HEALTH_LINK,entries:h.entries.map(e=>({...e,source:'health' as const}))}))};}

/** Health v1: one weight, exactly what today's build writes. */
export function healthV1(){return {...createEmptyHealth(),weights:[{id:'health_fixture-weight-01',date:'2026-09-07',grams:78400,createdAt:FIXTURE_AT,updatedAt:FIXTURE_AT}]};}
/** The synced home of a fasting session (PR 3's HE6), as health v2 carries it: hours and a target, nothing else. */
export const FASTING_SESSION={id:'fast-2026-09-07',startedAt:'2026-09-07T19:00:00.000Z',endedAt:'2026-09-08T11:00:00.000Z',targetHours:16,timeZone:'Europe/Brussels',habitId:HABIT_ID,stoppedBy:'person' as const};
/** Health v2: the v1 twin plus one fasting session. Nothing writes it in R1. */
export function healthV2(){return {...healthV1(),schemaVersion:2 as const,fasting:{version:1 as const,sessions:[FASTING_SESSION]}};}

/** Settings v1: the balanced preset, exactly what today's build writes. */
export function settingsV1(){return presetSettings('balanced');}
/** The synced home of the weekly review (PR 3's G1), as settings v2 carries it: the chosen day and the person's own words. */
export const WEEKLY_REVIEW={version:1 as const,weekday:0,reviews:[{weekStart:'2026-09-28',completedAt:'2026-10-04T18:00:00.000Z',notes:{wentWell:'Walked every day.',intention:'Sleep earlier.'}}]};
/** Settings v2: the v1 twin plus the journal zone and one weekly review. Nothing writes it in R1. */
export function settingsV2(){return {...settingsV1(),schemaVersion:2 as const,journalTimeZone:'Europe/Brussels',weeklyReview:WEEKLY_REVIEW};}

/** Every domain: the version today's build writes and the one read ahead of its writer, with a record of each. */
export const FORMAT_PAIRS={finance:{today:3,next:4,oldRecord:financeV3,newRecord:financeV4},habits:{today:2,next:3,oldRecord:habitsV2,newRecord:habitsV3},health:{today:1,next:2,oldRecord:healthV1,newRecord:healthV2},settings:{today:1,next:2,oldRecord:settingsV1,newRecord:settingsV2}};
