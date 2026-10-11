import {beforeEach,describe,expect,test,vi} from 'vitest';
import {HEALTH_STORAGE_KEY,createEmptyHealth,healthR1Schema,healthSchema,saveWeight,type HealthData} from './health';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings} from './dashboard-settings';
import {FASTING_KEY,fastingSchema} from './fasting/schema';
import {HEALTH_GOALS_KEY,healthGoalsSchema} from './health-goals/schema';
import {HABIT_HEALTH_LINKS_KEY,habitHealthLinksSchema} from './habit-health-links/schema';
import {WEEKLY_REVIEW_KEY,weeklyReviewSchema,type WeeklyReview} from './weekly-review/schema';
import {startFast} from './fasting/engine';
import {addHealthGoal} from './health-goals/store';
import {recordAutoCheckIn,setHabitHealthLink} from './habit-health-links/store';
import {saveReviewNotes} from './weekly-review/store';
import {readPrivateStore,updatePrivateStore} from './private-storage';
import {SYNC_HOMES_KEY} from './vault/sync-homes';
import {ensureDeviceRecordsMerged,homeRecordsIn,mergeDeviceRecords,readHome,updateHome} from './sync-homes-store';
import {AUTO_CHECK_IN,FASTING_SESSION,FIXTURE_AT,HABIT_HEALTH_LINK,HABIT_ID,HEALTH_GOAL,WEEKLY_REVIEW,healthV1,healthV2,healthV3,settingsV1,settingsV2} from './vault/format-fixtures';

// Session U follow-up F1 ([TIER 3] (sync)): the build ships with SYNC_WRITES off (asserted in sync-homes-store.test.ts).
// With the switch off this build reads Health v2/v3 and settings v2 when they are present, writes exactly what #28
// writes (the device keys, and Health and settings only through their own screens at the version they already have),
// never converts device data, and #28 reads everything it writes (healthR1Schema is #28's Health reader; the settings
// and device-record schemas are unchanged since #28, e336227). The switch is passed explicitly, so these stay true of
// the switch-off state after the switch-ON PR (docs/product/SYNC_WRITES_ON.md).
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
const snapshot=(storage:Storage)=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)!).map(k=>[k,storage.getItem(k)]));
const at=new Date(FIXTURE_AT),off={syncWrites:false};
/** #28's readers of everything this build can write: its Health reader, and the unchanged settings and device schemas. */
const R1={[HEALTH_STORAGE_KEY]:healthR1Schema,[DASHBOARD_SETTINGS_KEY]:dashboardSettingsSchema,[FASTING_KEY]:fastingSchema,[HEALTH_GOALS_KEY]:healthGoalsSchema,[HABIT_HEALTH_LINKS_KEY]:habitHealthLinksSchema,[WEEKLY_REVIEW_KEY]:weeklyReviewSchema} as const;
const weight=(h:HealthData)=>saveWeight(h,{id:'health_off-weight',date:'2026-09-08',grams:78000},FIXTURE_AT);
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

describe('switch off',()=>{
 test('reads Health v2 and v3 and settings v2 when present, and a Health edit keeps the v3 groups byte for byte',async()=>{
  for(const health of [healthV2(),healthV3()]){
   const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(health));storage.setItem(DASHBOARD_SETTINGS_KEY,JSON.stringify(settingsV2()));
   expect(readPrivateStore(storage,HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth)).toEqual(health);
   expect(readPrivateStore(storage,DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings)).toEqual(settingsV2());
   const edited=await updatePrivateStore(storage,HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth,weight);
   expect(edited.schemaVersion).toBe(health.schemaVersion);
   expect({...JSON.parse(storage.getItem(HEALTH_STORAGE_KEY)!),weights:health.weights}).toEqual(health);
   // Nothing about the homes is read or merged while the switch is off.
   expect(await ensureDeviceRecordsMerged(storage,off)).toBe(false);expect(storage.getItem(SYNC_HOMES_KEY)).toBeNull();
  }
 });
 test('writes exactly what #28 writes: the device keys, Health and settings untouched, every value readable by #28',async()=>{
  const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(healthV1()));storage.setItem(DASHBOARD_SETTINGS_KEY,JSON.stringify(settingsV1()));
  const before=snapshot(storage);
  await updateHome('fasting',c=>startFast(c,{id:'fast-off',now:at,targetHours:16,timeZone:'Europe/Brussels'}),{storage,...off});
  await updateHome('healthGoals',c=>addHealthGoal(c,{name:'Water',measure:'water',direction:'at-least',target:{value:'2000',decimals:0},unit:'mL',window:{kind:'rolling',weeks:2}},at,'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a01'),{storage,...off});
  await updateHome('habitLinks',c=>recordAutoCheckIn(setHabitHealthLink(c,HABIT_ID,HABIT_HEALTH_LINK),AUTO_CHECK_IN),{storage,...off});
  await updateHome('weeklyReview',c=>saveReviewNotes(c,'2026-09-28',{wentWell:'Fine.',health:'Rested.'}),{storage,...off});
  await updatePrivateStore(storage,HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth,weight);
  const after=snapshot(storage);
  // Exactly the four device keys are new; Health changed only by its own edit and stays v1; settings untouched; no
  // marker and no recovery copy (nothing raised a version).
  expect(Object.keys(after).filter(k=>!(k in before)).sort()).toEqual([FASTING_KEY,HABIT_HEALTH_LINKS_KEY,HEALTH_GOALS_KEY,WEEKLY_REVIEW_KEY].sort());
  expect(after[DASHBOARD_SETTINGS_KEY]).toBe(before[DASHBOARD_SETTINGS_KEY]);
  expect(JSON.parse(after[HEALTH_STORAGE_KEY]!).schemaVersion).toBe(1);
  for(const [key,text] of Object.entries(after))expect(()=>(R1 as Record<string,{parse:(v:unknown)=>unknown}>)[key]!.parse(JSON.parse(text!)),key).not.toThrow();
  // And reads back from the device keys, as #28 does.
  expect((await readHome('fasting',{storage,...off})).sessions.map(s=>s.id)).toEqual(['fast-off']);
  expect((await readHome('weeklyReview',{storage,...off})).reviews[0]!.notes).toEqual({wentWell:'Fine.',health:'Rested.'});
 });
 test('never converts device data: the device keys, Health and settings stay byte for byte as they were',async()=>{
  const storage=memoryStorage();
  storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(healthV1()));storage.setItem(DASHBOARD_SETTINGS_KEY,JSON.stringify(settingsV1()));
  storage.setItem(FASTING_KEY,JSON.stringify({version:1,sessions:[FASTING_SESSION]}));storage.setItem(HEALTH_GOALS_KEY,JSON.stringify({version:1,goals:[HEALTH_GOAL]}));
  storage.setItem(HABIT_HEALTH_LINKS_KEY,JSON.stringify({version:1,links:{[HABIT_ID]:HABIT_HEALTH_LINK},applied:[AUTO_CHECK_IN]}));
  storage.setItem(WEEKLY_REVIEW_KEY,JSON.stringify(saveReviewNotes(WEEKLY_REVIEW as WeeklyReview,'2026-09-28',{health:'Rested.'})));
  const before=snapshot(storage);
  expect(await ensureDeviceRecordsMerged(storage,off)).toBe(false);expect(await mergeDeviceRecords(storage,off)).toBe(false);
  for(const kind of ['fasting','healthGoals','habitLinks','weeklyReview'] as const)await readHome(kind,{storage,...off});
  expect(snapshot(storage)).toEqual(before);
  // The Showcase and export readers take the same keys.
  expect(homeRecordsIn(before,false).healthGoals.goals).toEqual([HEALTH_GOAL]);
 });
});
