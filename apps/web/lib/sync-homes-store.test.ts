import {beforeEach,describe,expect,test,vi} from 'vitest';
import {HEALTH_STORAGE_KEY,createEmptyHealth,healthR1Schema} from './health';
import {DASHBOARD_SETTINGS_KEY} from './dashboard-settings';
import {FASTING_KEY} from './fasting/schema';
import {HEALTH_GOALS_KEY} from './health-goals/schema';
import {HABIT_HEALTH_LINKS_KEY} from './habit-health-links/schema';
import {WEEKLY_REVIEW_KEY,type WeeklyReview} from './weekly-review/schema';
import {startFast,stopFast} from './fasting/engine';
import {addHealthGoal,type HealthGoalDraft} from './health-goals/store';
import {recordAutoCheckIn,setHabitHealthLink} from './habit-health-links/store';
import {saveReviewNotes} from './weekly-review/store';
import {importPrivateStore,readPrivateStore} from './private-storage';
import {SYNC_HOMES_KEY} from './vault/sync-homes';
import {SYNC_WRITES} from './vault/sync-writes';
import {DEVICE_HOME_KEYS,ensureDeviceRecordsMerged,mergeDeviceRecords,readHome,updateHome} from './sync-homes-store';
import {AUTO_CHECK_IN,FASTING_SESSION,FIXTURE_AT,HABIT_HEALTH_LINK,HABIT_ID,HEALTH_GOAL,WEEKLY_REVIEW,healthV1,settingsV1} from './vault/format-fixtures';

// Session U Part 9 ([TIER 3] (sync)): the stores of Session P's four records in both switch states, over browser storage
// (the durable database is covered in vault/durable-recovery-copies.test.ts). Switch off is exactly the device keys;
// switch on writes Health and settings, never a device key, and merges the device keys in once.
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
const snapshot=(storage:Storage)=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)!).map(k=>[k,storage.getItem(k)]));
const json=(storage:Storage,key:string)=>JSON.parse(storage.getItem(key)!);
const recoveries=(storage:Storage,key:string)=>Object.keys(snapshot(storage)).filter(k=>k.startsWith(`${key}:recovery:`)).map(k=>storage.getItem(k));
const at=new Date(FIXTURE_AT);
const draft=(name:string):HealthGoalDraft=>({name,measure:'water',direction:'at-least',target:{value:'2000',decimals:0},unit:'mL',window:{kind:'rolling',weeks:2}});
const fast=(id:string)=>(current:Parameters<typeof startFast>[0])=>startFast(current,{id,now:at,targetHours:16,timeZone:'Europe/Brussels'});
const on={syncWrites:true},off={syncWrites:false};
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

test('this build ships with the switch on (lib/vault/sync-writes.ts; Session W Part 1, owner decision W1)',()=>{expect(SYNC_WRITES).toBe(true);});

describe('switch off: exactly the device keys, as before',()=>{
 test('each record reads from and writes to its own device key; Health and settings are untouched',async()=>{
  const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(healthV1()));const health=storage.getItem(HEALTH_STORAGE_KEY);
  await updateHome('fasting',fast('fast-off'),{storage,...off});
  await updateHome('healthGoals',c=>addHealthGoal(c,draft('Water'),at,'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a01'),{storage,...off});
  await updateHome('habitLinks',c=>setHabitHealthLink(c,HABIT_ID,HABIT_HEALTH_LINK),{storage,...off});
  await updateHome('weeklyReview',c=>saveReviewNotes(c,'2026-09-28',{wentWell:'Fine.',health:'Rested.'}),{storage,...off});
  expect(json(storage,FASTING_KEY).sessions.map((s:{id:string})=>s.id)).toEqual(['fast-off']);
  expect(json(storage,HEALTH_GOALS_KEY).goals).toHaveLength(1);expect(json(storage,HABIT_HEALTH_LINKS_KEY).links[HABIT_ID]).toEqual(HABIT_HEALTH_LINK);
  expect(json(storage,WEEKLY_REVIEW_KEY).reviews[0].notes).toEqual({wentWell:'Fine.',health:'Rested.'});
  expect(storage.getItem(HEALTH_STORAGE_KEY)).toBe(health);expect(storage.getItem(DASHBOARD_SETTINGS_KEY)).toBeNull();
  expect((await readHome('fasting',{storage,...off})).sessions[0]!.id).toBe('fast-off');
  expect(await mergeDeviceRecords(storage,off)).toBe(false);expect(storage.getItem(SYNC_HOMES_KEY)).toBeNull();
 });
});

describe('switch on: the homes',()=>{
 test('a fast goes to Health v2, with the v1 bytes kept as a recovery copy; no device key is written',async()=>{
  const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(healthV1()));const v1=storage.getItem(HEALTH_STORAGE_KEY);
  const next=await updateHome('fasting',fast('fast-on'),{storage,...on});
  expect(next.sessions.map(s=>s.id)).toEqual(['fast-on']);
  expect(json(storage,HEALTH_STORAGE_KEY).schemaVersion).toBe(2);expect(json(storage,HEALTH_STORAGE_KEY).fasting.sessions[0].id).toBe('fast-on');
  expect(recoveries(storage,HEALTH_STORAGE_KEY)).toEqual([v1]);
  for(const key of DEVICE_HOME_KEYS)expect(storage.getItem(key)).toBeNull();
  // #27/#28 still read v2.
  expect(readPrivateStore(storage,HEALTH_STORAGE_KEY,healthR1Schema,createEmptyHealth).schemaVersion).toBe(2);
  await updateHome('fasting',c=>stopFast(c,'fast-on',new Date(Date.parse(FIXTURE_AT)+3_600_000)),{storage,...on});
  expect((await readHome('fasting',{storage,...on})).sessions[0]!.endedAt).not.toBeNull();expect(recoveries(storage,HEALTH_STORAGE_KEY)).toEqual([v1]);
 });
 test('a health goal, a link or a Health note raises Health to v3, which #27/#28 refuse while keeping the bytes',async()=>{
  for(const write of [
   (storage:Storage)=>updateHome('healthGoals',c=>addHealthGoal(c,draft('Water'),at,'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a01'),{storage,...on}),
   (storage:Storage)=>updateHome('habitLinks',c=>recordAutoCheckIn(setHabitHealthLink(c,HABIT_ID,HABIT_HEALTH_LINK),AUTO_CHECK_IN),{storage,...on}),
   (storage:Storage)=>updateHome('weeklyReview',c=>saveReviewNotes(c,'2026-09-28',{health:'Rested.'}),{storage,...on}),
  ]){
   const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(healthV1()));const v1=storage.getItem(HEALTH_STORAGE_KEY);
   await write(storage);
   expect(json(storage,HEALTH_STORAGE_KEY).schemaVersion).toBe(3);expect(recoveries(storage,HEALTH_STORAGE_KEY)).toEqual([v1]);
   const before=snapshot(storage);
   expect(()=>readPrivateStore(storage,HEALTH_STORAGE_KEY,healthR1Schema,createEmptyHealth)).toThrow('Private data is invalid or uses an unsupported version. Original data was preserved.');
   expect(snapshot(storage)).toEqual(before);
   for(const key of DEVICE_HOME_KEYS)expect(storage.getItem(key)).toBeNull();
  }
 });
 test('the weekly review: settings v2 holds it without its Health note, Health v3 holds the note, and it reads back whole',async()=>{
  const storage=memoryStorage();storage.setItem(DASHBOARD_SETTINGS_KEY,JSON.stringify(settingsV1()));
  const review=await updateHome('weeklyReview',c=>saveReviewNotes(c,'2026-09-28',{wentWell:'Fine.',health:'Rested.'}),{storage,...on});
  expect(json(storage,DASHBOARD_SETTINGS_KEY).schemaVersion).toBe(2);expect(json(storage,DASHBOARD_SETTINGS_KEY).weeklyReview.reviews).toEqual([{weekStart:'2026-09-28',notes:{wentWell:'Fine.'}}]);
  expect(json(storage,HEALTH_STORAGE_KEY).reviewNotes).toEqual({version:1,notes:{'2026-09-28':'Rested.'}});
  expect(await readHome('weeklyReview',{storage,...on})).toEqual(review);
  expect(storage.getItem(WEEKLY_REVIEW_KEY)).toBeNull();
 });
 test('an invalid result throws and writes nothing',async()=>{
  const storage=memoryStorage();await updateHome('fasting',fast('fast-1'),{storage,...on});const before=snapshot(storage);
  await expect(updateHome('fasting',c=>({...c,sessions:[...c.sessions,{...c.sessions[0]!,id:'fast-2'}]}),{storage,...on})).rejects.toThrow('A fast is already running.');
  expect(snapshot(storage)).toEqual(before);
 });
});

describe('the device keys merge in once, and are never rewritten',()=>{
 const seed=(storage:Storage)=>{
  storage.setItem(HEALTH_STORAGE_KEY,JSON.stringify(healthV1()));storage.setItem(DASHBOARD_SETTINGS_KEY,JSON.stringify(settingsV1()));
  storage.setItem(FASTING_KEY,JSON.stringify({version:1,sessions:[FASTING_SESSION]}));storage.setItem(HEALTH_GOALS_KEY,JSON.stringify({version:1,goals:[HEALTH_GOAL]}));
  storage.setItem(HABIT_HEALTH_LINKS_KEY,JSON.stringify({version:1,links:{[HABIT_ID]:HABIT_HEALTH_LINK},applied:[AUTO_CHECK_IN]}));
  storage.setItem(WEEKLY_REVIEW_KEY,JSON.stringify(saveReviewNotes(WEEKLY_REVIEW as WeeklyReview,'2026-09-28',{health:'Rested.'})));
  return Object.fromEntries(DEVICE_HOME_KEYS.map(k=>[k,storage.getItem(k)]));
 };
 test('the first load moves every record home; the second load writes nothing',async()=>{
  const storage=memoryStorage(),device=seed(storage);
  expect(await mergeDeviceRecords(storage,on)).toBe(true);
  expect((await readHome('fasting',{storage,...on})).sessions).toEqual([FASTING_SESSION]);
  expect((await readHome('healthGoals',{storage,...on})).goals).toEqual([HEALTH_GOAL]);
  expect((await readHome('habitLinks',{storage,...on})).applied).toEqual([AUTO_CHECK_IN]);
  expect((await readHome('weeklyReview',{storage,...on})).reviews[0]!.notes).toEqual({wentWell:'Walked every day.',intention:'Sleep earlier.',health:'Rested.'});
  expect(Object.fromEntries(DEVICE_HOME_KEYS.map(k=>[k,storage.getItem(k)]))).toEqual(device);
  const after=snapshot(storage);
  expect(await mergeDeviceRecords(storage,on)).toBe(false);
  expect(snapshot(storage)).toEqual(after);
 });
 test('one merge at a time per storage view, and none while nothing changed',async()=>{
  const storage=memoryStorage();seed(storage);
  const first=ensureDeviceRecordsMerged(storage,on);expect(ensureDeviceRecordsMerged(storage,on)).toBe(first);
  expect(await first).toBe(true);
  const settled=ensureDeviceRecordsMerged(storage,on);expect(await settled).toBe(false);expect(ensureDeviceRecordsMerged(storage,on)).toBe(settled);
  expect(await ensureDeviceRecordsMerged(storage,off)).toBe(false);
 });
 test('rolled back to #28 and forward again: #28 keeps working from its device keys, and the roll-forward merges what it did',async()=>{
  const storage=memoryStorage();seed(storage);
  await mergeDeviceRecords(storage,on);
  await updateHome('healthGoals',c=>addHealthGoal(c,draft('Only here'),at,'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a01'),{storage,...on});
  // #28: Health v3 is refused and kept as it is; the goals screen reads and writes its device key.
  const v3=storage.getItem(HEALTH_STORAGE_KEY);
  expect(()=>readPrivateStore(storage,HEALTH_STORAGE_KEY,healthR1Schema,createEmptyHealth)).toThrow('unsupported version');
  await expect(importPrivateStore(memoryStorage(),HEALTH_STORAGE_KEY,healthR1Schema,v3!)).rejects.toThrow('unsupported version');
  await updateHome('healthGoals',c=>addHealthGoal(c,draft('Made on #28'),at,'0b6f6c3e-58f3-4a77-9d2a-0f2c4f8f1a02'),{storage,...off});
  expect(storage.getItem(HEALTH_STORAGE_KEY)).toBe(v3);
  // Forward: one merge, nothing lost on either side.
  expect(await mergeDeviceRecords(storage,on)).toBe(true);
  expect((await readHome('healthGoals',{storage,...on})).goals.map(g=>g.name)).toEqual(['Walk more','Only here','Made on #28']);
  expect(json(storage,HEALTH_GOALS_KEY).goals.map((g:{name:string})=>g.name)).toEqual(['Walk more','Made on #28']);
  expect(await mergeDeviceRecords(storage,on)).toBe(false);
 });
});
