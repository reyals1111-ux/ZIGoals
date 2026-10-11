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
export const HABIT_ID='c3a1e5d2-7b64-4f0a-9c3e-1d2f3a4b5c6d',HEALTH_GOAL_ID='8f0f2a62-6d0b-4c53-9b6d-2c6e0c1a7a11';
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
 // Built in a UTC journal so the habit starts on 2026-09-07 on every machine (Session Y Part 2: under UTC+12:45 it began
 // on the 8th and the check-in was refused), then the zone is dropped: the record is the zone-less one today's build
 // writes, byte for byte what a UTC machine always built.
 const created=createHabit({...emptyHabitData(),timeZone:'UTC'},{title:'Drink water',category:'Health',description:'Two litres a day',notes:'',schedule:{kind:'daily'},target:1},new Date('2026-09-07T12:00:00.000Z'),HABIT_ID);
 const record=logHabitCount(created,HABIT_ID,'2026-09-07',1,'',new Date(FIXTURE_AT));
 delete record.timeZone;
 return record;
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
/** One automatic check-in marker (PR 3's H7), as Health v3 carries it with its link. */
export const AUTO_CHECK_IN={habitId:HABIT_ID,date:'2026-09-07',healthDate:'2026-09-07',measure:'water' as const,value:2100,appliedAt:FIXTURE_AT};
/**
 * Health v3 (Session U Part 9): the v2 twin plus a health goal, a habit's Health link with one automatic check-in, and a
 * weekly review's Health note, each byte-for-byte its device key's record. Builds #27/#28 (R1) refuse it.
 */
export function healthV3(){return {...healthV2(),schemaVersion:3 as const,healthGoals:{version:1 as const,goals:[HEALTH_GOAL]},habitLinks:{version:1 as const,links:{[HABIT_ID]:HABIT_HEALTH_LINK},applied:[AUTO_CHECK_IN]},reviewNotes:{version:1 as const,notes:{'2026-09-28':'Slept better.'}}};}

/** Settings v1: the balanced preset, exactly what today's build writes. */
export function settingsV1(){return presetSettings('balanced');}
/** The synced home of the weekly review (PR 3's G1), as settings v2 carries it: the chosen day and the person's own words. */
export const WEEKLY_REVIEW={version:1 as const,weekday:0,reviews:[{weekStart:'2026-09-28',completedAt:'2026-10-04T18:00:00.000Z',notes:{wentWell:'Walked every day.',intention:'Sleep earlier.'}}]};
/** Settings v2: the v1 twin plus the journal zone and one weekly review. Nothing writes it in R1. */
export function settingsV2(){return {...settingsV1(),schemaVersion:2 as const,journalTimeZone:'Europe/Brussels',weeklyReview:WEEKLY_REVIEW};}

/** Every domain: the version today's build writes and the one read ahead of its writer, with a record of each. */
export const FORMAT_PAIRS={finance:{today:3,next:4,oldRecord:financeV3,newRecord:financeV4},habits:{today:2,next:3,oldRecord:habitsV2,newRecord:habitsV3},health:{today:1,next:2,oldRecord:healthV1,newRecord:healthV2},settings:{today:1,next:2,oldRecord:settingsV1,newRecord:settingsV2}};

// Session W (2026-10-06): the records of this release's new groups. Each newer record is again its older twin plus exactly
// the new groups. Health v4 and settings v3 are written by this build, lazily (only when a new group first gets content);
// finance v5 is read here and written by nothing (its homes move in a later switch PR). Builds #29–#31 refuse all three
// and keep their bytes.
export const SLEEP_NIGHT={id:'health_sleep-manual-fixture01',kind:'night' as const,start:'2026-09-06T21:30:00.000Z',end:'2026-09-07T05:45:00.000Z',timeZone:'Europe/Brussels',latencyMin:15,quality:4,tags:['screens'],source:'manual' as const,createdAt:FIXTURE_AT,updatedAt:FIXTURE_AT};
export const MEDITATION_SESSION={id:'health_med-fixture-session01',startedAt:'2026-09-07T06:30:00.000Z',seconds:600,kind:'breathing' as const,pattern:'box' as const,moodBefore:3,moodAfter:4,timeZone:'Europe/Brussels',source:'breathing' as const,createdAt:FIXTURE_AT,updatedAt:FIXTURE_AT};
export const VITAL_DAY={id:'health_vital-apple-health-2026-09-07',date:'2026-09-07',source:'apple-health' as const,restingHr:58,activeKcal:420,updatedAt:FIXTURE_AT};
/** A habit ticked off by sleep (Health v4 only): at least 7 hours asleep. */
export const SLEEP_HABIT_LINK={version:1 as const,measure:'sleepMinutes' as const,rule:'at-least' as const,target:420,updatedAt:FIXTURE_AT};
/** Health v4: the v3 twin plus one night, one breathing session, one day of vitals, quick buttons, a mood and a sleep link. */
export function healthV4(){
 const v3=healthV3();
 return {...v3,schemaVersion:4 as const,habitLinks:{...v3.habitLinks,links:{...v3.habitLinks.links,'d4b2f6e3-8c75-4a1b-8d4f-2e3a4b5c6d7e':SLEEP_HABIT_LINK}},
  sleep:{version:1 as const,nights:[SLEEP_NIGHT],goal:{minutes:450,bedFrom:'22:30',bedTo:'23:30',updatedAt:FIXTURE_AT}},
  meditation:{version:1 as const,sessions:[MEDITATION_SESSION],goal:{minutesPerWeek:60,updatedAt:FIXTURE_AT}},
  vitals:{version:1 as const,days:[VITAL_DAY]},
  quick:{version:1 as const,waterSizesMl:[250,500,750],pinned:[],updatedAt:FIXTURE_AT},
  moods:{version:1 as const,days:{'2026-09-07':{mood:4,at:FIXTURE_AT}}}};
}
export const PERSONAL_LINK={id:'5b1c2d3e-4f50-4a61-8b72-9c8d7e6f5a4b',label:'My running club',url:'https://example.org/club',icon:'strava' as const,order:0,createdAt:FIXTURE_AT,updatedAt:FIXTURE_AT};
/** Settings v3: the v2 twin plus page choices, one link, chess, the wrap-up and a sleep widget. */
export function settingsV3(){
 const v2=settingsV2();
 return {...v2,schemaVersion:3 as const,widgets:[...v2.widgets,{id:'w-sleep',kind:'sleep' as const,metric:'last-night',title:'',size:'compact' as const,hidden:false,revision:1}],
  pages:{version:1 as const,items:{chess:{v:'shown' as const,at:FIXTURE_AT},markets:{v:'hidden' as const,at:FIXTURE_AT}},start:{id:'health' as const,at:FIXTURE_AT}},
  links:{version:1 as const,items:[PERSONAL_LINK]},
  chess:{version:1 as const,lichess:{username:'fixture_player',at:FIXTURE_AT},goals:[],applied:[{date:'2026-09-07',appliedAt:FIXTURE_AT}]},
  wrapUp:{version:1 as const,enabled:{v:true,at:FIXTURE_AT},time:{v:'19:00',at:FIXTURE_AT},days:{'2026-09-07':{intention:'Walk at lunch.',doneAt:FIXTURE_AT,at:FIXTURE_AT}}}};
}
export const ACCOUNT={id:'7e8f9a0b-1c2d-4e3f-8a4b-5c6d7e8f9a0b',kind:'savings' as const,name:'Rainy-day savings',currency:'EUR',snapshots:[{id:'0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d',date:'2026-09-07',value:'250000',decimals:2}],payments:[],createdAt:FIXTURE_AT,updatedAt:FIXTURE_AT};
/** Finance v5 (read only here): the v4 twin whose Goal has a dated milestone, plus one savings account. */
export function financeV5(){
 const v4=financeV4();
 return {...v4,schemaVersion:5 as const,goals:v4.goals.map(g=>({...g,milestones:[{id:'m1',title:'Flights booked',done:false,target:'150000',targetDate:'2026-12-01'}]})),accounts:{version:1 as const,items:[ACCOUNT]}};
}
/** Session W's pairs: the version builds #29–#31 read and write, and the one this release adds. */
export const W_FORMAT_PAIRS={finance:{older:4,newer:5,oldRecord:financeV4,newRecord:financeV5,written:false},health:{older:3,newer:4,oldRecord:healthV3,newRecord:healthV4,written:true},settings:{older:2,newer:3,oldRecord:settingsV2,newRecord:settingsV3,written:true}} as const;
