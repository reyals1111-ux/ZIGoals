import {afterEach,describe,expect,test} from 'vitest';
import {setJournalTimeZone,journalTimeZone,journalZoneReady} from './journal-zone';
import {clearHabitTimezone,emptyHabitData,habitCalendarDay,saveHabitTimezone} from './habits';
import {healthDay} from './health-daily';
import {dashboardSettingsR2Schema,dashboardSettingsSchema,presetSettings,withJournalZone} from './dashboard-settings';
import {emptyPlatform,platformSchema,privateGoalSchema} from './positions';
import {recordGoalChanges} from './goal-intelligence';
import {defaultPlanTimeZone} from './plan-revisions';
import {settingsV3} from './vault/format-fixtures';

// Session W Part 17 (owner decision W2, TIMEZONE_PHASE4_DECISIONS.md T2-A, T1-B): one journal zone; Habits and Health
// resolve their day from their own zone (an override), then the journal zone, then the device's.
const deviceZone=process.env.TZ;
afterEach(()=>{setJournalTimeZone(null,false);process.env.TZ=deviceZone;});

describe('the resolution order: module zone, then journal zone, then device',()=>{
 const at=new Date('2026-10-15T22:30:00.000Z');// the 16th in Brussels, the 15th in New York and UTC
 test('no zone anywhere: the device decides, as before',()=>{
  process.env.TZ='America/New_York';
  expect(journalTimeZone()).toBeNull();expect(journalZoneReady()).toBe(false);
  expect(habitCalendarDay(emptyHabitData(),at)).toBe('2026-10-15');expect(healthDay(null,at)).toBe('2026-10-15');
 });
 test('a journal zone decides for both when neither module has its own',()=>{
  process.env.TZ='America/New_York';
  expect(setJournalTimeZone('Europe/Brussels',true)).toBe(true);expect(setJournalTimeZone('Europe/Brussels',true)).toBe(false);
  expect(habitCalendarDay(emptyHabitData(),at)).toBe('2026-10-16');expect(healthDay(null,at)).toBe('2026-10-16');
 });
 test('a module\'s own zone keeps its exact meaning over the journal zone',()=>{
  process.env.TZ='UTC';setJournalTimeZone('Europe/Brussels',true);
  expect(habitCalendarDay(saveHabitTimezone(emptyHabitData(),'Asia/Tokyo'),new Date('2026-10-15T14:59:00.000Z'))).toBe('2026-10-15');
  expect(habitCalendarDay(saveHabitTimezone(emptyHabitData(),'Asia/Tokyo'),new Date('2026-10-15T15:00:00.000Z'))).toBe('2026-10-16');
  expect(healthDay('America/Los_Angeles',at)).toBe('2026-10-15');
  // Following the journal zone again removes only the override.
  expect(clearHabitTimezone(saveHabitTimezone(emptyHabitData(),'Asia/Tokyo'))).toEqual(emptyHabitData());
  const plain=emptyHabitData();expect(clearHabitTimezone(plain)).toBe(plain);
 });
 test('the 49-day sweep across Brussels\' autumn change (5 October to 22 November 2026): every journal day, on a New York device',()=>{
  process.env.TZ='America/New_York';setJournalTimeZone('Europe/Brussels',true);
  const days:string[]=[];
  for(let d=0;d<49;d++){
   const date=new Date(Date.UTC(2026,9,5+d)).toISOString().slice(0,10);
   // Local midnight in Brussels found by search (the first minute whose Brussels date is this date), then one minute
   // after it, six hours in, and the last minute before the next local midnight (a 25-hour day on 25 October).
   const brussels=(t:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
   const midnight=(day:string)=>{let lo=Date.parse(`${day}T00:00:00Z`)-6*3_600_000,hi=Date.parse(`${day}T00:00:00Z`)+6*3_600_000;while(hi-lo>60_000){const mid=Math.floor((lo+hi)/120_000)*60_000;if(brussels(mid)>=day)hi=mid;else lo=mid;}return hi;};
   const start=midnight(date),end=midnight(new Date(Date.UTC(2026,9,6+d)).toISOString().slice(0,10));
   expect((end-start)/3_600_000,date).toBe(date==='2026-10-25'?25:24);
   for(const instant of [new Date(start),new Date(start+60_000),new Date(start+6*3_600_000),new Date(end-60_000)]){
    expect(habitCalendarDay(emptyHabitData(),instant),`${date} ${instant.toISOString()}`).toBe(date);
    expect(healthDay(null,instant),`${date} ${instant.toISOString()}`).toBe(date);
   }
   days.push(date);
  }
  expect(days).toHaveLength(49);expect(days[20]).toBe('2026-10-25');
  // The repeated hour on 25 October (02:00-03:00 twice): both passes are the 25th.
  for(const instant of ['2026-10-25T00:30:00.000Z','2026-10-25T01:30:00.000Z'])expect(habitCalendarDay(emptyHabitData(),new Date(instant))).toBe('2026-10-25');
 });
});

describe('writing the journal zone (settings v2, lazily, never down)',()=>{
 test('a v1 record becomes v2 only when a zone is chosen; removing it keeps the version; the same zone writes nothing',()=>{
  const v1=dashboardSettingsSchema.parse(presetSettings('balanced'));
  const v2=withJournalZone(v1,'Europe/Brussels');
  expect(v2).toMatchObject({schemaVersion:2,journalTimeZone:'Europe/Brussels'});expect(dashboardSettingsR2Schema.safeParse(v2).success).toBe(true);
  expect(withJournalZone(v2,'Europe/Brussels')).toBe(v2);expect(withJournalZone(v1,null)).toBe(v1);
  const cleared=withJournalZone(v2,null);expect(cleared.schemaVersion).toBe(2);expect('journalTimeZone' in cleared).toBe(false);
  // A settings v3 record stays v3.
  expect(withJournalZone(dashboardSettingsSchema.parse(settingsV3()),'Asia/Tokyo')).toMatchObject({schemaVersion:3,journalTimeZone:'Asia/Tokyo'});
  expect(()=>withJournalZone(v1,'+05:30')).toThrow();
 });
});

describe('T1: a new plan takes the journal zone; the record becomes finance v4, which builds #29-#31 read',()=>{
 test('defaultPlanTimeZone and a zoned new plan',()=>{
  expect(defaultPlanTimeZone('Europe/Brussels')).toBe('Europe/Brussels');expect(defaultPlanTimeZone(null)).toBe('UTC');expect(defaultPlanTimeZone(undefined)).toBe('UTC');
  const plan={amount:'50000',asset:'EUR',decimals:2,cadence:'monthly' as const,nextDate:'2026-10-15',active:true,timeZone:defaultPlanTimeZone('Europe/Brussels')};
  const goal=privateGoalSchema.parse({id:'1',name:'Holiday',type:'VALUE',status:'active',asset:'EUR',denom:'EUR',decimals:2,target:'600000',notes:'',createdAt:'2026-09-20T12:00:00Z',milestones:[],plan});
  const s=recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[goal]},Date.parse('2026-09-20T12:00:00Z'));
  expect(s.schemaVersion).toBe(4);expect(platformSchema.parse(s).goals[0]!.planRevisions![0]!.terms?.timeZone).toBe('Europe/Brussels');
  // A UTC plan stays zone-less and v3.
  const utc=recordGoalChanges(emptyPlatform(),{...emptyPlatform(),goals:[{...goal,plan:{...plan,timeZone:undefined}}]},Date.parse('2026-09-20T12:00:00Z'));
  expect(utc.schemaVersion).toBe(3);
 });
});
