import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,test,vi} from 'vitest';
import * as z from 'zod';
import {financeVersion,platformR4Schema,platformSchema,PLATFORM_KEY} from '../positions';
import {createEmptyHealth,healthR3Schema,healthSchema,HEALTH_STORAGE_KEY,type HealthData} from '../health';
import {dashboardSettingsR2Schema,dashboardSettingsSchema,presetSettings,saveWidget,DASHBOARD_SETTINGS_KEY,type DashboardSettings} from '../dashboard-settings';
import {importPrivateStore,readPrivateStore} from '../private-storage';
import {backupRefusal} from '../storage-error-copy';
import {NEWER_SECTION_MESSAGE,applyData,modules,validateData} from './account-data';
import {CURRENT_VERSIONS} from './versions';
import {createVault,type VaultManifest} from './crypto';
import {mergePrivateData,synchronize,RevisionConflict,STAMPED_GROUPS,type CloudOperation,type CloudTransport,type Domain,type Journal,type PrivateData,type Row,type SyncState} from './cloud-sync';
import {enableDurableStore,exportDurableStore,localDatabase} from './local';
import {withFasting,withHabitLinks,withWeeklyReview} from './sync-homes';
import {withHealthGroup,withSettingsGroup} from './w-homes';
import {readHealthGroup,readSettingsGroup,updateHealthGroup,updateSettingsGroup} from '../w-homes-store';
import {HEALTH_V4_GROUPS} from '../health';
import {SETTINGS_V3_GROUPS} from '../dashboard-settings';
import {FIXTURE_AT,HABIT_HEALTH_LINK,HABIT_ID,MEDITATION_SESSION,PERSONAL_LINK,SLEEP_HABIT_LINK,SLEEP_NIGHT,W_FORMAT_PAIRS,WEEKLY_REVIEW,FASTING_SESSION,financeV4,financeV5,healthV1,healthV3,healthV4,settingsV1,settingsV2,settingsV3} from './format-fixtures';

// Session W ([TIER 3] (data formats/storage keys), 2026-10-06): Health v4 and settings v3 are written by this build, lazily;
// finance v5 is read here and written by nothing. The proofs, as in read-support.test.ts for R1: new reads new (the new
// records parse here and round-trip byte-identical), old reads new (builds #29–#31 refuse them by version, keep the bytes,
// say so plainly: local storage, a module backup, sync, the export's modules), writers never lower a version and raise one
// only when a new group gets content, sync settles Session W's stamped values without stopping, and a version raised by
// sync keeps a recovery copy.
type WDomain=keyof typeof W_FORMAT_PAIRS;
const W_DOMAINS=['finance','health','settings'] as const;
const KEYS:Record<WDomain,string>={finance:PLATFORM_KEY,health:HEALTH_STORAGE_KEY,settings:DASHBOARD_SETTINGS_KEY};
/** Builds #29–#31: their readers (the exact objects this build keeps frozen) and the newest versions they read. */
const OLD:Record<WDomain,z.ZodType>={finance:platformR4Schema,health:healthR3Schema,settings:dashboardSettingsR2Schema};
const OLD_VERSIONS:Record<Domain,number>={finance:4,habits:3,health:3,settings:2};
const validateOld=(data:PrivateData)=>{for(const [domain,raw] of Object.entries(data)){const parsed=JSON.parse(raw!);if(parsed.schemaVersion>OLD_VERSIONS[domain as Domain])throw Error(NEWER_SECTION_MESSAGE);(domain in OLD?OLD[domain as WDomain]:modules[domain as Domain].schema).parse(parsed);}};
const bytes=(value:unknown)=>JSON.stringify(value);
const stored=(domain:Domain,value:unknown)=>bytes(modules[domain].schema.parse(value));
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
const snapshot=(storage:Storage)=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)!).map(k=>[k,storage.getItem(k)]));
const recoveries=(storage:Storage,key:string)=>Object.keys(snapshot(storage)).filter(k=>k.startsWith(`${key}:recovery:`)).map(k=>storage.getItem(k));
const later=(minutes:number)=>new Date(Date.parse(FIXTURE_AT)+minutes*60_000).toISOString();
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});
afterEach(()=>{vi.unstubAllGlobals();});

describe('the readers: new reads new, old refuses new, the next version is refused here',()=>{
 test.each(W_DOMAINS)('%s: the Session W record reads here at its version and round-trips byte-identical; the sync check passes it',domain=>{
  const pair=W_FORMAT_PAIRS[domain],raw=stored(domain,pair.newRecord());
  expect(JSON.parse(raw).schemaVersion).toBe(pair.newer);
  expect(bytes(modules[domain].schema.parse(JSON.parse(raw)))).toBe(raw);
  expect(()=>validateData({[domain]:raw})).not.toThrow();
  // The older twin is read unchanged too, at its own version: nothing an older build wrote changes here.
  const old=stored(domain,pair.oldRecord());
  expect(JSON.parse(old).schemaVersion).toBe(pair.older);expect(bytes(OLD[domain].parse(JSON.parse(old)))).toBe(old);
 });
 test.each(W_DOMAINS)('%s: builds #29–#31 refuse the Session W record by its version, in local storage and in a module backup, and keep the bytes',async domain=>{
  const raw=stored(domain,W_FORMAT_PAIRS[domain].newRecord()),storage=memoryStorage();storage.setItem(KEYS[domain],raw);
  const before=snapshot(storage);
  expect(OLD[domain].safeParse(JSON.parse(raw)).success).toBe(false);
  expect(()=>readPrivateStore(storage,KEYS[domain],OLD[domain],()=>({}))).toThrow('Private data is invalid or uses an unsupported version. Original data was preserved.');
  expect(snapshot(storage)).toEqual(before);
  await expect(importPrivateStore(memoryStorage(),KEYS[domain],OLD[domain],raw)).rejects.toThrow('unsupported version');
  expect(()=>validateOld({[domain]:raw})).toThrow(NEWER_SECTION_MESSAGE);
 });
 test('a Health or finance backup this build made is refused by #29–#31 as "made by a newer version"; this build restores it',()=>{
  expect(backupRefusal(stored('health',healthV4()),{module:'health',newest:3,limit:2_000_000})).toBe('NEWER_BACKUP');
  expect(backupRefusal(stored('finance',financeV5()),{module:'platform',newest:4,limit:2_000_000})).toBe('NEWER_BACKUP');
  expect(healthSchema.safeParse(JSON.parse(stored('health',healthV4()))).success).toBe(true);
 });
 test('the next unknown versions are refused here with the plain message: health 5, settings 4, finance 6',()=>{
  expect(CURRENT_VERSIONS).toEqual({finance:5,habits:3,health:4,settings:3});
  for(const domain of W_DOMAINS){
   const next={...W_FORMAT_PAIRS[domain].newRecord(),schemaVersion:CURRENT_VERSIONS[domain]+1};
   expect(()=>validateData({[domain]:bytes(next)}),domain).toThrow(NEWER_SECTION_MESSAGE);
   expect(modules[domain].schema.safeParse(next).success,domain).toBe(false);
  }
 });
 test('each new group is held only by its new version: Health v3 with sleep, settings v2 with links, finance v4 with accounts are refused',()=>{
  const v4=healthV4(),v3=settingsV3(),v5=financeV5();
  for(const group of HEALTH_V4_GROUPS)expect(healthSchema.safeParse({...healthV3(),[group]:v4[group]}).success,group).toBe(false);
  for(const group of SETTINGS_V3_GROUPS)expect(dashboardSettingsSchema.safeParse({...settingsV2(),[group]:v3[group]}).success,group).toBe(false);
  expect(platformSchema.safeParse({...financeV4(),accounts:v5.accounts}).success).toBe(false);
  expect(platformSchema.safeParse({...financeV4(),goals:v5.goals}).success).toBe(false);
  // A sleep link is a Health v4 link only; a v3 record with one is refused, a v4 record holds it.
  expect(healthSchema.safeParse({...healthV3(),habitLinks:{version:1,links:{[HABIT_ID]:SLEEP_HABIT_LINK},applied:[]}}).success).toBe(false);
  // Settings v1 and v2 never hold a Session W widget kind.
  const sleepWidget={id:'w-sleep',kind:'sleep',metric:'last-night',title:'',size:'compact',hidden:false,revision:1};
  expect(dashboardSettingsSchema.safeParse({...settingsV2(),widgets:[...settingsV2().widgets,sleepWidget]}).success).toBe(false);
  expect(dashboardSettingsSchema.safeParse({...settingsV1(),widgets:[...settingsV1().widgets,sleepWidget]}).success).toBe(false);
 });
});

describe('the writers: lazy raises, never down',()=>{
 test('a new group with content raises Health to v4 and settings to v3; an empty one changes nothing (same object)',()=>{
  const health=healthSchema.parse(healthV1()),settings=dashboardSettingsSchema.parse(settingsV1());
  expect(withHealthGroup(health,'sleep',{version:1,nights:[]},true)).toBe(health);
  expect(withSettingsGroup(settings,'links',{version:1,items:[]},true)).toBe(settings);
  const h=withHealthGroup(health,'sleep',{version:1,nights:[SLEEP_NIGHT]},false);
  expect(h.schemaVersion).toBe(4);expect(healthSchema.parse(h)).toEqual(h);expect(healthR3Schema.safeParse(h).success).toBe(false);
  expect(withHealthGroup(h,'sleep',{version:1,nights:[SLEEP_NIGHT]},false)).toBe(h);
  const s=withSettingsGroup(settings,'links',{version:1,items:[PERSONAL_LINK]},false);
  expect(s.schemaVersion).toBe(3);expect(dashboardSettingsSchema.parse(s)).toEqual(s);expect(dashboardSettingsR2Schema.safeParse(s).success).toBe(false);
  // Emptied later: the group stays (emptied), the version stays.
  const emptied=withHealthGroup(h,'sleep',{version:1,nights:[]},true);expect(emptied.schemaVersion).toBe(4);expect(emptied.sleep).toEqual({version:1,nights:[]});
 });
 test('the writers of Session P\'s records keep a v4 Health and a v3 settings record at their version',()=>{
  const h4=healthSchema.parse(healthV4()),s3=dashboardSettingsSchema.parse(settingsV3());
  expect(withFasting(h4,{version:1,sessions:[{...FASTING_SESSION,id:'fast-2026-09-09'}]}).schemaVersion).toBe(4);
  expect(withHabitLinks(h4,{version:1,links:{[HABIT_ID]:HABIT_HEALTH_LINK},applied:[]}).schemaVersion).toBe(4);
  const review={...WEEKLY_REVIEW,reviews:[...WEEKLY_REVIEW.reviews,{weekStart:'2026-10-05'}]};
  const both=withWeeklyReview(s3,h4,review);
  expect(both.settings.schemaVersion).toBe(3);expect(both.health.schemaVersion).toBe(4);
  expect(dashboardSettingsSchema.parse(both.settings).weeklyReview!.reviews).toHaveLength(2);
  // Unchanged review on a v3 record: the same object, nothing to write.
  expect(withWeeklyReview(s3,h4,WEEKLY_REVIEW).settings).toBe(s3);
 });
 test('a sleep or meditation link raises the habit links\' home to Health v4; a water link alone keeps v3',()=>{
  const h1=healthSchema.parse(healthV1()) as HealthData;
  expect(withHabitLinks(h1,{version:1,links:{[HABIT_ID]:HABIT_HEALTH_LINK},applied:[]}).schemaVersion).toBe(3);
  const raised=withHabitLinks(h1,{version:1,links:{[HABIT_ID]:SLEEP_HABIT_LINK as never},applied:[]});
  expect(raised.schemaVersion).toBe(4);expect(healthSchema.safeParse(raised).success).toBe(true);
 });
 test('saveWidget: a Session W kind moves settings to v3; an older kind leaves the version alone',()=>{
  const s1=presetSettings('balanced');
  const kept=saveWidget(s1,{id:'w-1',kind:'streak',metric:'best',title:'',size:'compact',hidden:false,revision:1});expect(kept.schemaVersion).toBe(1);
  const raised=saveWidget(s1,{id:'w-2',kind:'meditation',metric:'week',title:'',size:'compact',hidden:false,revision:1});
  expect(raised.schemaVersion).toBe(3);expect(dashboardSettingsR2Schema.safeParse(raised).success).toBe(false);
  expect(saveWidget(raised,{id:'w-3',kind:'streak',metric:'best',title:'',size:'compact',hidden:false,revision:1}).schemaVersion).toBe(3);
 });
 test('finance: v5 is kept at v5 by every writer\'s version rule; nothing here produces it',()=>{
  const v5=platformSchema.parse(financeV5());
  expect(financeVersion(v5)).toBe(5);
  expect(financeVersion(platformSchema.parse(financeV4()))).toBe(4);
 });
 test('the group store: the first write raises the module with a recovery copy of what it replaced, the next adds none, reading writes nothing',async()=>{
  const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,stored('health',healthV1()));storage.setItem(DASHBOARD_SETTINGS_KEY,stored('settings',settingsV1()));
  const v1=storage.getItem(HEALTH_STORAGE_KEY),s1=storage.getItem(DASHBOARD_SETTINGS_KEY),before=snapshot(storage);
  expect(await readHealthGroup('meditation',{storage})).toEqual({version:1,sessions:[]});
  expect(await readSettingsGroup('pages',{storage})).toEqual({version:1,items:{}});
  expect(snapshot(storage)).toEqual(before);
  // An empty change writes nothing at all.
  await updateHealthGroup('meditation',current=>current,{storage});expect(snapshot(storage)).toEqual(before);
  await updateHealthGroup('meditation',current=>({...current,sessions:[MEDITATION_SESSION]}),{storage});
  expect(JSON.parse(storage.getItem(HEALTH_STORAGE_KEY)!).schemaVersion).toBe(4);expect(recoveries(storage,HEALTH_STORAGE_KEY)).toEqual([v1]);
  await updateHealthGroup('meditation',current=>({...current,goal:{minutesPerWeek:60,updatedAt:FIXTURE_AT}}),{storage});
  expect(recoveries(storage,HEALTH_STORAGE_KEY)).toEqual([v1]);
  await updateSettingsGroup('pages',current=>({...current,items:{chess:{v:'shown',at:FIXTURE_AT}}}),{storage});
  expect(JSON.parse(storage.getItem(DASHBOARD_SETTINGS_KEY)!).schemaVersion).toBe(3);expect(recoveries(storage,DASHBOARD_SETTINGS_KEY)).toEqual([s1]);
  // #31 refuses the raised modules and keeps them as they are.
  const raised=snapshot(storage);
  expect(()=>readPrivateStore(storage,HEALTH_STORAGE_KEY,healthR3Schema,createEmptyHealth as ()=>z.infer<typeof healthR3Schema>)).toThrow('unsupported version');
  expect(()=>readPrivateStore(storage,DASHBOARD_SETTINGS_KEY,dashboardSettingsR2Schema,()=>presetSettings('balanced') as z.infer<typeof dashboardSettingsR2Schema>)).toThrow('unsupported version');
  expect(snapshot(storage)).toEqual(raised);
  // A change the module refuses (an invalid group) throws with nothing written.
  await expect(updateHealthGroup('sleep',current=>({...current,nights:[{...SLEEP_NIGHT,end:'2026-09-06T20:00:00.000Z'}]}),{storage})).rejects.toThrow();
  expect(snapshot(storage)).toEqual(raised);
 });
});

describe('sync: Session W\'s groups merge without stopping; everything else as before',()=>{
 const wrapHealth=(h:unknown):PrivateData=>({health:bytes(h)}),wrapSettings=(s:unknown):PrivateData=>({settings:bytes(s)});
 /** Parsed copies with the groups the fixtures hold, typed as the module types (each call a fresh copy). */
 const h4=()=>healthSchema.parse(healthV4()) as HealthData&{[G in 'sleep'|'moods'|'fasting']-?:NonNullable<HealthData[G]>};
 const s3=()=>dashboardSettingsSchema.parse(settingsV3()) as DashboardSettings&{[G in 'pages'|'chess']-?:NonNullable<DashboardSettings[G]>};
 const mergedHealth=(base:unknown,a:unknown,b:unknown)=>healthSchema.parse(JSON.parse(mergePrivateData(wrapHealth(base),wrapHealth(a),wrapHealth(b)).health!));
 const mergedSettings=(base:unknown,a:unknown,b:unknown)=>dashboardSettingsSchema.parse(JSON.parse(mergePrivateData(wrapSettings(base),wrapSettings(a),wrapSettings(b)).settings!)) as DashboardSettings;
 test('the stamped groups are exactly Health v4\'s and settings v3\'s new groups',()=>{
  expect(STAMPED_GROUPS).toEqual({health:[...HEALTH_V4_GROUPS],settings:[...SETTINGS_V3_GROUPS]});
 });
 test('the same page switch changed on two devices: the later choice wins, whichever device merges',()=>{
  const base=s3(),a=s3(),b=s3();
  a.pages.items.chess={v:'hidden',at:later(10)};b.pages.items.chess={v:'shown',at:later(20)};
  for(const [left,right] of [[a,b],[b,a]])expect(mergedSettings(base,left,right).pages!.items.chess).toEqual({v:'shown',at:later(20)});
  // Different switches on each device: both kept.
  const c=s3(),d=s3();c.pages.items.markets={v:'shown',at:later(5)};d.pages.items.portfolio={v:'hidden',at:later(6)};
  expect(mergedSettings(base,c,d).pages!.items).toMatchObject({markets:{v:'shown',at:later(5)},portfolio:{v:'hidden',at:later(6)}});
 });
 test('equal stamps settle on the same value on both devices',()=>{
  const base=h4(),a=h4(),b=h4();
  a.moods.days['2026-09-07']={mood:2,at:later(1)};b.moods.days['2026-09-07']={mood:5,at:later(1)};
  expect(mergedHealth(base,a,b).moods).toEqual(mergedHealth(base,b,a).moods);
 });
 test('a night edited on both devices keeps the later edit whole; a night added on each is kept; a deleted night stays deleted',()=>{
  const base=h4(),a=h4(),b=h4();
  a.sleep.nights[0]={...SLEEP_NIGHT,quality:2,updatedAt:later(30)};b.sleep.nights[0]={...SLEEP_NIGHT,note:'Woke at 3.',updatedAt:later(40)};
  a.sleep.nights.push({...SLEEP_NIGHT,id:'health_sleep-manual-fixture02',start:'2026-09-07T21:00:00.000Z',end:'2026-09-08T05:00:00.000Z'});
  for(const [left,right] of [[a,b],[b,a]]){const merged=mergedHealth(base,left,right);expect(merged.sleep!.nights.map(n=>n.id)).toEqual(['health_sleep-manual-fixture01','health_sleep-manual-fixture02']);expect(merged.sleep!.nights[0]).toEqual({...SLEEP_NIGHT,note:'Woke at 3.',updatedAt:later(40)});}
  const removed=h4();removed.sleep.nights=[];
  expect(mergedHealth(base,removed,base).sleep!.nights).toEqual([]);
 });
 test('two devices that each started a night while apart merge to two running nights, and sync does not stop',()=>{
  const base=h4(),a=h4(),b=h4();
  a.sleep.nights.push({...SLEEP_NIGHT,id:'health_sleep-timer-aaaaaaaa',start:later(600),end:null as never,source:'timer'});
  b.sleep.nights.push({...SLEEP_NIGHT,id:'health_sleep-timer-bbbbbbbb',start:later(610),end:null as never,source:'timer'});
  expect(mergedHealth(base,a,b).sleep!.nights.filter(n=>n.end===null)).toHaveLength(2);
 });
 test('the same imported night on two devices (one deterministic id, imported at different times) is one night',()=>{
  const base=healthV3(),imported={...SLEEP_NIGHT,id:'health_sleep-apple-health-0a1b2c3d',source:'apple-health' as const};
  const a={...base,schemaVersion:4,sleep:{version:1,nights:[{...imported,createdAt:later(1),updatedAt:later(1)}]}};
  const b={...base,schemaVersion:4,sleep:{version:1,nights:[{...imported,createdAt:later(2),updatedAt:later(2)}]}};
  for(const [left,right] of [[a,b],[b,a]])expect(mergedHealth(base,left,right).sleep!.nights).toEqual([{...imported,createdAt:later(2),updatedAt:later(2)}]);
 });
 test('a Health v3 device and a v4 device merge at v4',()=>{
  const base=healthV3(),a={...healthV3(),reviewNotes:{version:1,notes:{'2026-09-28':'Slept better.','2026-10-05':'Busy week.'}}},b=healthV4();
  const merged=mergedHealth(base,a,b);expect(merged.schemaVersion).toBe(4);expect(merged.reviewNotes!.notes['2026-10-05']).toBe('Busy week.');expect(merged.sleep).toEqual(b.sleep);
 });
 test('chess check-in markers merge to the union: the first application of a day is kept and an undo holds',()=>{
  const base=s3(),a=s3(),b=s3();
  a.chess.applied=[{date:'2026-09-07',appliedAt:FIXTURE_AT,undone:true} as never,{date:'2026-09-08',appliedAt:later(60)}];
  b.chess.applied=[{date:'2026-09-07',appliedAt:FIXTURE_AT},{date:'2026-09-08',appliedAt:later(30)},{date:'2026-09-09',appliedAt:later(90)}];
  for(const [left,right] of [[a,b],[b,a]])expect(mergedSettings(base,left,right).chess!.applied).toEqual([{date:'2026-09-07',appliedAt:FIXTURE_AT,undone:true},{date:'2026-09-08',appliedAt:later(30)},{date:'2026-09-09',appliedAt:later(90)}]);
 });
 test('outside Session W\'s groups nothing changed: a fasting session edited differently on two devices still stops for review',()=>{
  const base=h4(),a=h4(),b=h4();
  a.fasting.sessions[0]={...FASTING_SESSION,targetHours:14};b.fasting.sessions[0]={...FASTING_SESSION,targetHours:18};
  expect(()=>mergePrivateData(wrapHealth(base),wrapHealth(a),wrapHealth(b))).toThrow('Conflicting');
 });
});

describe('sync and older builds',()=>{
 class MemoryJournal implements Journal{state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};async read(){return structuredClone(this.state);}async write(state:SyncState){this.state=structuredClone(state);}}
 class Cloud implements CloudTransport{
  revision=0;rows=new Map<string,Row>();receipts=new Map<string,{body:string;revision:number}>();calls:CloudOperation[]=[];
  constructor(public manifest:VaultManifest){}
  async read(){return {protocol:1 as const,revision:this.revision,manifest:this.manifest,records:structuredClone([...this.rows.values()]),cursor:null};}
  async write(input:CloudOperation){const operation=structuredClone(input);this.calls.push(operation);const body=JSON.stringify(operation),receipt=this.receipts.get(operation.operation);if(receipt){if(receipt.body!==body)throw Error('Operation reused');return {revision:receipt.revision};}if(operation.base!==this.revision)throw new RevisionConflict();for(const row of operation.changes){if(row.revision!==(this.rows.get(row.id)?.revision??0)+1)throw new RevisionConflict();}for(const row of operation.changes)this.rows.set(row.id,row);this.revision++;this.receipts.set(operation.operation,{body,revision:this.revision});return {revision:this.revision};}
 }
 test('a #31 device pulling a section this build raised shows the plain message: nothing uploaded, its journal unchanged; this build keeps syncing it',async()=>{
  const vault=await createVault(),cloud=new Cloud(vault.manifest),mine=new MemoryJournal(),older=new MemoryJournal();
  const sync=async(journal:Journal,data:PrivateData,validate:(d:PrivateData,p?:PrivateData)=>void)=>{const r=await synchronize(cloud,journal,vault.key,vault.manifest,data,validate,()=>{});await r.commit();return r;};
  await sync(mine,{health:stored('health',healthV3()),settings:stored('settings',settingsV2())},validateData);
  await sync(older,{health:stored('health',healthV3()),settings:stored('settings',settingsV2())},validateOld);
  await sync(mine,{health:stored('health',healthV4()),settings:stored('settings',settingsV3())},validateData);
  const before={calls:cloud.calls.length,journal:structuredClone(older.state)};
  await expect(synchronize(cloud,older,vault.key,vault.manifest,{health:stored('health',healthV3()),settings:stored('settings',settingsV2())},validateOld,()=>{})).rejects.toThrow(NEWER_SECTION_MESSAGE);
  expect(cloud.calls.length).toBe(before.calls);expect(older.state).toEqual(before.journal);
  const again=await sync(new MemoryJournal(),{},validateData);
  expect(JSON.parse(again.data.health!).schemaVersion).toBe(4);expect(JSON.parse(again.data.settings!).schemaVersion).toBe(3);
 });
 test('a version raised by sync keeps the section it replaced as a recovery copy in the durable store (Session W); an ordinary sync edit adds none',async()=>{
  vi.stubGlobal('window',new EventTarget());vi.stubGlobal('BroadcastChannel',undefined);
  const storage=memoryStorage();
  try{
   storage.setItem(HEALTH_STORAGE_KEY,stored('health',healthV3()));
   await enableDurableStore(storage,HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth);
   const v3=await exportDurableStore(storage,HEALTH_STORAGE_KEY),copies=async()=>(await localDatabase.recovery('local',HEALTH_STORAGE_KEY)).filter(raw=>raw===v3);
   const already=(await localDatabase.recovery('local',HEALTH_STORAGE_KEY)).length;
   const v4=stored('health',healthV4());
   await applyData(storage,{health:v3},{health:v4},()=>{});
   // The durable store keeps fields and list rows apart, so compare the record, not the key order of its text.
   expect(JSON.parse(await exportDurableStore(storage,HEALTH_STORAGE_KEY))).toEqual(JSON.parse(v4));
   expect((await localDatabase.recovery('local',HEALTH_STORAGE_KEY)).length).toBe(already+1);expect((await copies()).length).toBeGreaterThan(0);
   const edited=stored('health',{...healthV4(),moods:{version:1,days:{'2026-09-07':{mood:5,at:later(5)}}}});
   await applyData(storage,{health:await exportDurableStore(storage,HEALTH_STORAGE_KEY)},{health:edited},()=>{});
   expect((await localDatabase.recovery('local',HEALTH_STORAGE_KEY)).length).toBe(already+1);
  }finally{localDatabase.close();}
 });
});
