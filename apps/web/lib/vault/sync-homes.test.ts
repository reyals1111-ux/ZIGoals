import {describe,expect,test} from 'vitest';
import {healthSchema,healthR1Schema,type HealthData} from '../health';
import {dashboardSettingsSchema} from '../dashboard-settings';
import {addHealthGoal,editHealthGoal,removeHealthGoal} from '../health-goals/store';
import {markAutoCheckInUndone} from '../habit-health-links/store';
import {saveReviewNotes,setReviewWeekday} from '../weekly-review/store';
import {emptyWeeklyReview,type WeeklyReview} from '../weekly-review/schema';
import type {HabitHealthLinks} from '../habit-health-links/schema';
import {AUTO_CHECK_IN,FASTING_SESSION,FIXTURE_AT,HABIT_HEALTH_LINK,HABIT_ID,HEALTH_GOAL,WEEKLY_REVIEW,healthV1,settingsV1} from './format-fixtures';
import {deviceHasNew,emptyHomesMarker,fastingIn,habitLinksIn,healthGoalsIn,homesMarkerSchema,mergeDeviceIntoHealth,mergeDeviceIntoSettings,recordDigest,weeklyReviewIn,withFasting,withHabitLinks,withHealthGoals,withWeeklyReview,type DeviceRecords,type HomesMarker} from './sync-homes';

// Session U Part 9 ([TIER 3] (sync), docs/product/SYNC_HOMES.md): where Session P's four device-only records live with the
// switch on, as pure functions. The store-level tests (both switch states, the device keys untouched, the rollback to #28
// and forward again) are in lib/sync-homes-store.test.ts.
const health=():HealthData=>healthSchema.parse(healthV1());
const goals=(...list:typeof HEALTH_GOAL[])=>({version:1 as const,goals:list});
const links=(applied:HabitHealthLinks['applied']=[]):HabitHealthLinks=>({version:1,links:{[HABIT_ID]:HABIT_HEALTH_LINK},applied});
const review=(health='Slept better.'):WeeklyReview=>saveReviewNotes(WEEKLY_REVIEW as WeeklyReview,'2026-09-28',{health});
const later=(minutes:number)=>new Date(Date.parse(FIXTURE_AT)+minutes*60_000);
/** Both modules merged, and the marker as the store writes it afterwards. */
function mergeAll(h:HealthData,s:ReturnType<typeof settingsV1>,device:DeviceRecords,marker:HomesMarker=emptyHomesMarker()){
 const a=mergeDeviceIntoHealth(h,device,marker),b=mergeDeviceIntoSettings(s,device,marker);
 return {health:a.health,settings:b.settings,marker:homesMarkerSchema.parse({...marker,...a.marker,...b.marker})};
}

describe('the writers are lazy and never lower a version',()=>{
 test('an empty record where there was none changes nothing, not even the version',()=>{
  const h=health(),s=settingsV1();
  expect(withFasting(h,{version:1,sessions:[]})).toBe(h);
  expect(withHealthGoals(h,{version:1,goals:[]})).toBe(h);
  expect(withHabitLinks(h,{version:1,links:{},applied:[]})).toBe(h);
  const split=withWeeklyReview(s,h,emptyWeeklyReview());
  expect(split.settings).toBe(s);expect(split.health).toBe(h);
 });
 test('fasting makes Health v2, which #27/#28 read; goals, links and Health notes make v3, which they refuse',()=>{
  const v2=withFasting(health(),{version:1,sessions:[FASTING_SESSION]});
  expect(v2.schemaVersion).toBe(2);expect(healthSchema.parse(v2)).toEqual(v2);expect(healthR1Schema.safeParse(v2).success).toBe(true);
  for(const v3 of [withHealthGoals(v2,goals(HEALTH_GOAL)),withHabitLinks(health(),links()),withWeeklyReview(settingsV1(),health(),review()).health]){
   expect(v3.schemaVersion).toBe(3);expect(healthSchema.parse(v3)).toEqual(v3);expect(healthR1Schema.safeParse(v3).success).toBe(false);
  }
 });
 test('emptying a group keeps the version; writing the same record again returns the same object',()=>{
  const v3=withHealthGoals(withFasting(health(),{version:1,sessions:[FASTING_SESSION]}),goals(HEALTH_GOAL));
  expect(withHealthGoals(v3,goals()).schemaVersion).toBe(3);expect(withFasting(v3,{version:1,sessions:[]}).schemaVersion).toBe(3);
  expect(withFasting(v3,{version:1,sessions:[FASTING_SESSION]})).toBe(v3);expect(withHealthGoals(v3,goals(HEALTH_GOAL))).toBe(v3);
 });
});

describe('the weekly review spans two homes',()=>{
 test('its Health notes go to Health v3, everything else to settings v2, and it reads back whole',()=>{
  const r=review(),split=withWeeklyReview(settingsV1(),health(),r);
  expect(split.settings.schemaVersion).toBe(2);expect(JSON.stringify(split.settings)).not.toContain('Slept better.');
  expect(dashboardSettingsSchema.parse(split.settings)).toEqual(split.settings);
  expect((split.health as {reviewNotes?:unknown}).reviewNotes).toEqual({version:1,notes:{'2026-09-28':'Slept better.'}});
  expect(JSON.stringify(split.health)).not.toContain('Walked every day.');
  expect(weeklyReviewIn(split.settings,split.health)).toEqual(r);
 });
 test('a review without Health notes leaves Health alone; a chosen day alone is kept',()=>{
  const h=health();
  expect(withWeeklyReview(settingsV1(),h,WEEKLY_REVIEW as WeeklyReview).health).toBe(h);
  const day=withWeeklyReview(settingsV1(),h,setReviewWeekday(emptyWeeklyReview(),3));
  expect(weeklyReviewIn(day.settings,day.health)).toEqual({version:1,weekday:3,reviews:[]});
 });
 test('removing the last Health note keeps Health v3 with no notes',()=>{
  const first=withWeeklyReview(settingsV1(),health(),review());
  const cleared=withWeeklyReview(first.settings,first.health,saveReviewNotes(review(),'2026-09-28',{health:''}));
  expect(cleared.health.schemaVersion).toBe(3);expect((cleared.health as {reviewNotes?:unknown}).reviewNotes).toEqual({version:1,notes:{}});
  expect(weeklyReviewIn(cleared.settings,cleared.health).reviews[0]!.notes).toEqual({wentWell:'Walked every day.',intention:'Sleep earlier.'});
 });
});

describe('merging the device keys into the homes',()=>{
 const device=():DeviceRecords=>({fasting:{version:1,sessions:[FASTING_SESSION]},healthGoals:goals(HEALTH_GOAL),habitLinks:links([AUTO_CHECK_IN]),weeklyReview:review()});
 test('the first load moves every record home; the marker holds one digest per record; the next load changes nothing',()=>{
  const first=mergeAll(health(),settingsV1(),device());
  expect(fastingIn(first.health).sessions).toEqual([FASTING_SESSION]);expect(healthGoalsIn(first.health)).toEqual(goals(HEALTH_GOAL));
  expect(habitLinksIn(first.health)).toEqual(links([AUTO_CHECK_IN]));expect(weeklyReviewIn(first.settings,first.health)).toEqual(review());
  expect(first.health.schemaVersion).toBe(3);expect(first.settings.schemaVersion).toBe(2);
  expect(first.marker).toEqual({version:1,fasting:{[FASTING_SESSION.id]:recordDigest(FASTING_SESSION)},healthGoals:{[HEALTH_GOAL.id]:recordDigest(HEALTH_GOAL)},links:{[HABIT_ID]:recordDigest(HABIT_HEALTH_LINK)},applied:{[`${HABIT_ID}:2026-09-07`]:recordDigest(AUTO_CHECK_IN)},reviews:{'2026-09-28':recordDigest(review().reviews[0])},weekday:recordDigest(0)});
  expect(deviceHasNew(device(),first.marker)).toBe(false);
  const again=mergeAll(first.health,first.settings,device(),first.marker);
  expect(again.health).toBe(first.health);expect(again.settings).toBe(first.settings);
 });
 test('a record deleted here never comes back from the device key',()=>{
  const first=mergeAll(health(),settingsV1(),device());
  const deleted=withHealthGoals(first.health,removeHealthGoal(healthGoalsIn(first.health),HEALTH_GOAL.id));
  expect(mergeDeviceIntoHealth(deleted,device(),first.marker).health).toBe(deleted);
  expect(healthGoalsIn(deleted).goals).toEqual([]);
 });
 test('rolled back to an older build and forward again: what it changed in its device key is merged and wins; nothing here is lost',()=>{
  const first=mergeAll(health(),settingsV1(),device());
  // Here, after the merge: a second goal that only this build knows.
  const own=addHealthGoal(healthGoalsIn(first.health),{name:'Drink water',measure:'water',direction:'at-least',target:{value:'2000',decimals:0},unit:'mL',window:{kind:'rolling',weeks:2}},later(5),'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a01');
  const here=withHealthGoals(first.health,own);
  // The older build (its device key): edits the first goal, adds one, undoes the day's automatic check-in, writes a note.
  const old:DeviceRecords={...device(),
   healthGoals:addHealthGoal(editHealthGoal(goals(HEALTH_GOAL),HEALTH_GOAL.id,{...HEALTH_GOAL,name:'Walk more, every day'},later(60)),{name:'Stand up',measure:'activeMinutes',direction:'at-least',target:{value:'30',decimals:0},unit:'min',window:{kind:'rolling',weeks:1}},later(61),'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a02'),
   habitLinks:markAutoCheckInUndone(links([AUTO_CHECK_IN]),HABIT_ID,'2026-09-07'),
   weeklyReview:review('Back pain is gone.')};
  const forward=mergeAll(here,first.settings,old,first.marker);
  expect(healthGoalsIn(forward.health).goals.map(g=>g.name)).toEqual(['Walk more, every day','Drink water','Stand up']);
  expect(habitLinksIn(forward.health).applied).toEqual([{...AUTO_CHECK_IN,undone:true}]);
  expect(weeklyReviewIn(forward.settings,forward.health).reviews[0]!.notes?.health).toBe('Back pain is gone.');
  expect(deviceHasNew(old,forward.marker)).toBe(false);
  expect(mergeAll(forward.health,forward.settings,old,forward.marker).health).toBe(forward.health);
 });
 test('a goal edited both here and by an older build since the merge: the newer edit stays',()=>{
  const first=mergeAll(health(),settingsV1(),device());
  const here=withHealthGoals(first.health,editHealthGoal(healthGoalsIn(first.health),HEALTH_GOAL.id,{...HEALTH_GOAL,name:'Edited here, later'},later(90)));
  const old:DeviceRecords={healthGoals:editHealthGoal(goals(HEALTH_GOAL),HEALTH_GOAL.id,{...HEALTH_GOAL,name:'Edited on the older build'},later(60))};
  expect(healthGoalsIn(mergeDeviceIntoHealth(here,old,first.marker).health).goals[0]!.name).toBe('Edited here, later');
  const older:DeviceRecords={healthGoals:editHealthGoal(goals(HEALTH_GOAL),HEALTH_GOAL.id,{...HEALTH_GOAL,name:'Edited on the older build, later'},later(120))};
  expect(healthGoalsIn(mergeDeviceIntoHealth(here,older,first.marker).health).goals[0]!.name).toBe('Edited on the older build, later');
 });
 test('never merged, but already here through sync: the newer goal or link stays, the first check-in of a day stays and an undo holds',()=>{
  const synced=withHabitLinks(withHealthGoals(health(),goals({...HEALTH_GOAL,name:'Walk more (other device)',updatedAt:later(10).toISOString()})),links([{...AUTO_CHECK_IN,appliedAt:later(-30).toISOString()}]));
  const mine:DeviceRecords={healthGoals:goals(HEALTH_GOAL),habitLinks:{...links([{...AUTO_CHECK_IN,undone:true}]),links:{[HABIT_ID]:{...HABIT_HEALTH_LINK,target:2500,updatedAt:later(20).toISOString()}}}};
  const merged=mergeDeviceIntoHealth(synced,mine,emptyHomesMarker()).health;
  expect(healthGoalsIn(merged).goals[0]!.name).toBe('Walk more (other device)');
  expect(habitLinksIn(merged).links[HABIT_ID]!.target).toBe(2500);
  expect(habitLinksIn(merged).applied).toEqual([{...AUTO_CHECK_IN,appliedAt:later(-30).toISOString(),undone:true}]);
 });
 test('a week this device never merged but another device already reviewed: its status stays, and empty fields take this device\'s words',()=>{
  const other=withWeeklyReview(settingsV1(),health(),{version:1,weekday:2,reviews:[{weekStart:'2026-09-28',skipped:true,notes:{goals:'Other device.'}}]});
  const mine:DeviceRecords={weeklyReview:{version:1,weekday:5,reviews:[{weekStart:'2026-09-28',completedAt:FIXTURE_AT,notes:{goals:'This device.',wentWell:'A calm week.',health:'Slept well.'}}]}};
  const merged=mergeAll(other.health,other.settings,mine);
  expect(weeklyReviewIn(merged.settings,merged.health)).toEqual({version:1,weekday:2,reviews:[{weekStart:'2026-09-28',skipped:true,notes:{goals:'Other device.',wentWell:'A calm week.',health:'Slept well.'}}]});
 });
 test('a fast an older build started waits, unmerged, while another fast runs here',()=>{
  const runningHere={...FASTING_SESSION,id:'fast-here',endedAt:null,stoppedBy:undefined},runningThere={...FASTING_SESSION,id:'fast-there',endedAt:null,stoppedBy:undefined};
  const here=withFasting(health(),{version:1,sessions:[runningHere]});
  const merged=mergeDeviceIntoHealth(here,{fasting:{version:1,sessions:[FASTING_SESSION,runningThere]}},emptyHomesMarker());
  expect(fastingIn(merged.health).sessions.map(s=>s.id)).toEqual(['fast-here',FASTING_SESSION.id]);
  expect(Object.keys(merged.marker.fasting!)).toEqual([FASTING_SESSION.id]);
 });
});
