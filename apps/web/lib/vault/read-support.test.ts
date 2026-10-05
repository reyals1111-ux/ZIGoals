import {beforeEach,describe,expect,test,vi} from 'vitest';
import {z} from 'zod';
import {emptyPlatform,financeVersion,hasPlanZone,healthGoalSchema,platformSchema,platformV3Schema,PLATFORM_KEY} from '../positions';
import {emptyHabitData,habitDataSchema,habitDataV2Schema,logHabitCount,needsHabitsV3,HABITS_KEY} from '../habits';
import {healthSchema,healthV1Schema,healthR1Schema,fastingSessionSchema,HEALTH_STORAGE_KEY} from '../health';
import {dashboardSettingsSchema,dashboardSettingsV1Schema,weeklyReviewSchema,DASHBOARD_SETTINGS_KEY} from '../dashboard-settings';
import {reviseGoalPlan,planFingerprint} from '../plan-revisions';
import {importPrivateStore,readPrivateStore,updatePrivateStore} from '../private-storage';
import {CURRENT_VERSIONS,NEWER_SECTION_MESSAGE,modules,validateData} from './account-data';
import {createVault,type VaultManifest} from './crypto';
import {cloudSnapshot,synchronize,RevisionConflict,type CloudOperation,type CloudTransport,type Domain,type Journal,type PrivateData,type SyncState} from './cloud-sync';
import {FORMAT_PAIRS,FIXTURE_AT,HEALTH_GOAL,HABIT_HEALTH_LINK,FASTING_SESSION,WEEKLY_REVIEW,MONTHLY_PLAN,financeV3,financeV4,habitsV2,habitsV3,healthV1,healthV2,healthV3,settingsV1,settingsV2} from './format-fixtures';

// Session P (PR 2, 2026-10-03): read support ahead of the writers, the two-release rule of TIMEZONE_DESIGN.md
// ("Versioning and migration"). This build (R1) reads finance v4, habits v3, health v2 and settings v2, and still writes
// finance v3, habits v2, health v1 and settings v1: a record changes version only when a later build (R2, after the T4
// gap) writes one of the new fields. The proofs: new reads old (today's bytes survive unchanged), new reads new (the
// coming records parse here), old reads new (every build since the formats' first versions refuses a newer version by
// its `schemaVersion` alone, fails closed and keeps the bytes), and mixed devices through sync.
const DOMAINS=['finance','habits','health','settings'] as const;
const KEYS:Record<Domain,string>={finance:PLATFORM_KEY,habits:HABITS_KEY,health:HEALTH_STORAGE_KEY,settings:DASHBOARD_SETTINGS_KEY};
/** Today's readers, each the exact object schema every build since the format's first version uses for its version. */
const OLD:Record<Domain,z.ZodType>={finance:platformV3Schema,habits:habitDataV2Schema,health:healthV1Schema,settings:dashboardSettingsV1Schema};
const bytes=(value:unknown)=>JSON.stringify(value);
/** Bytes as the build writes them: normalized once through the module schema, like every record on disk. */
const stored=(domain:Domain,value:unknown)=>bytes(modules[domain].schema.parse(value));
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
const snapshot=(storage:Storage)=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)!).map(k=>[k,storage.getItem(k)]));
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

describe('new reads old: today\'s records read and write back byte-identical',()=>{
 test.each(DOMAINS)('%s: the bytes today\'s build writes are read here unchanged, at their own version',domain=>{
  const pair=FORMAT_PAIRS[domain],raw=stored(domain,pair.oldRecord());
  expect(JSON.parse(raw).schemaVersion).toBe(pair.today);
  expect(bytes(modules[domain].schema.parse(JSON.parse(raw)))).toBe(raw);
  // The same bytes through the old reader: this build changed nothing an older build reads.
  expect(bytes(OLD[domain].parse(JSON.parse(raw)))).toBe(raw);
  const storage=memoryStorage();storage.setItem(KEYS[domain],raw);
  expect(bytes(readPrivateStore(storage,KEYS[domain],modules[domain].schema,modules[domain].empty))).toBe(raw);
  expect(storage.getItem(KEYS[domain])).toBe(raw);
 });
 test('an edit on this build still writes today\'s version: no bump, no recovery copy',async()=>{
  const storage=memoryStorage();
  storage.setItem(PLATFORM_KEY,stored('finance',financeV3()));storage.setItem(HABITS_KEY,stored('habits',habitsV2()));
  const finance=await updatePrivateStore(storage,PLATFORM_KEY,platformSchema,emptyPlatform,s=>reviseGoalPlan(s,'1',{...MONTHLY_PLAN,amount:'60000'},'2026-12-01',Date.parse(FIXTURE_AT),planFingerprint(s.goals[0]!)));
  expect(finance.schemaVersion).toBe(3);expect(JSON.parse(storage.getItem(PLATFORM_KEY)!).schemaVersion).toBe(3);
  const habits=await updatePrivateStore(storage,HABITS_KEY,habitDataSchema,emptyHabitData,d=>logHabitCount(d,d.habits[0]!.id,'2026-09-08',1,'',new Date(FIXTURE_AT)));
  expect(habits.schemaVersion).toBe(2);expect(JSON.parse(storage.getItem(HABITS_KEY)!).schemaVersion).toBe(2);
  expect(Object.keys(snapshot(storage)).filter(k=>k.includes(':recovery:'))).toEqual([]);
  // Health 3 since Session U Part 9 (lib/vault/sync-writes.ts); the other three are R1's.
  expect(CURRENT_VERSIONS).toEqual({finance:4,habits:3,health:3,settings:2});
 });
 test('the empty records every module starts from are today\'s versions',()=>{
  expect(DOMAINS.map(d=>(modules[d].empty() as {schemaVersion:number}).schemaVersion)).toEqual([3,2,1,1]);
 });
});

describe('new reads new: the records a later build will write parse here, with their new fields',()=>{
 test.each(DOMAINS)('%s: the next version reads, keeps its version and round-trips byte-identical',domain=>{
  const pair=FORMAT_PAIRS[domain],raw=stored(domain,pair.newRecord());
  expect(JSON.parse(raw).schemaVersion).toBe(pair.next);
  expect(bytes(modules[domain].schema.parse(JSON.parse(raw)))).toBe(raw);
  const storage=memoryStorage();storage.setItem(KEYS[domain],raw);
  expect(bytes(readPrivateStore(storage,KEYS[domain],modules[domain].schema,modules[domain].empty))).toBe(raw);
 });
 test('finance v4: the plan zone and the health goal survive, and the version follows the fields',()=>{
  const v4=platformSchema.parse(financeV4());
  expect(v4.schemaVersion).toBe(4);expect(v4.goals[0]!.plan?.timeZone).toBe('Europe/Brussels');
  expect('healthGoals' in v4?v4.healthGoals:undefined).toEqual([HEALTH_GOAL]);
  expect(hasPlanZone(v4)).toBe(true);expect(financeVersion(v4)).toBe(4);
  const v3=platformSchema.parse(financeV3());
  expect(hasPlanZone(v3)).toBe(false);expect(financeVersion(v3)).toBe(3);
  // A zone in a revision's terms alone, or health goals alone, is v4 too.
  expect(financeVersion({...v3,goals:[{...v3.goals[0]!,plan:undefined,planRevisions:[{version:1,id:'plan:1:x',effectiveFrom:'2026-09-20',recordedAt:FIXTURE_AT,terms:{...MONTHLY_PLAN,timeZone:'UTC'},target:'600000',asset:'EUR',decimals:2,priorHistory:'known'}]}]})).toBe(4);
  expect(financeVersion({...v3,healthGoals:[HEALTH_GOAL]})).toBe(4);
  expect(financeVersion({...v3,healthGoals:[]})).toBe(3);
 });
 test('habits v3: the Health link and the entry source survive',()=>{
  const v3=habitDataSchema.parse(habitsV3());
  expect(v3.schemaVersion).toBe(3);expect(v3.habits[0]!.healthLink).toEqual(HABIT_HEALTH_LINK);expect(v3.habits[0]!.entries[0]!.source).toBe('health');
  expect(needsHabitsV3(v3)).toBe(true);expect(needsHabitsV3(habitsV2())).toBe(false);
  expect(needsHabitsV3({habits:[{entries:[{source:'manual'}]}]})).toBe(true);
 });
 test('health v2: the fasting session survives',()=>{
  const v2=healthSchema.parse(healthV2());
  expect(v2.schemaVersion).toBe(2);expect('fasting' in v2?v2.fasting:undefined).toEqual({version:1,sessions:[FASTING_SESSION]});
  // A running fast has no end yet.
  expect(fastingSessionSchema.parse({...FASTING_SESSION,endedAt:null,stoppedBy:undefined}).endedAt).toBeNull();
 });
 test('settings v2: the journal zone and the weekly review survive',()=>{
  const v2=dashboardSettingsSchema.parse(settingsV2());
  expect(v2.schemaVersion).toBe(2);
  expect('journalTimeZone' in v2?v2.journalTimeZone:undefined).toBe('Europe/Brussels');expect('weeklyReview' in v2?v2.weeklyReview:undefined).toEqual(WEEKLY_REVIEW);
  // Either field alone makes a v2 record.
  expect(dashboardSettingsSchema.parse({...settingsV1(),schemaVersion:2,journalTimeZone:'UTC'}).schemaVersion).toBe(2);
  expect(dashboardSettingsSchema.parse({...settingsV1(),schemaVersion:2}).schemaVersion).toBe(2);
 });
});

describe('what the versions guarantee: a record never carries fields its version does not know',()=>{
 const issues=(schema:z.ZodType,value:unknown)=>{const r=schema.safeParse(value);return r.success?[]:r.error.issues.map(i=>i.message);};
 test('finance: a v3 record with a plan zone is refused, so a zoned record is always v4',()=>{
  expect(issues(platformSchema,{...financeV4(),schemaVersion:3,healthGoals:undefined})).toContain('A plan time zone needs finance version 4.');
  expect(issues(platformSchema,{...financeV3(),healthGoals:[HEALTH_GOAL]})).not.toEqual([]);
  expect(issues(platformSchema,{...financeV4(),healthGoals:[HEALTH_GOAL,HEALTH_GOAL]})).toContain('Duplicate health goal identifier.');
  // Only IANA names: a fixed offset has no daylight-saving rules.
  expect(issues(platformSchema,{...financeV4(),goals:[{...financeV4().goals[0]!,plan:{...MONTHLY_PLAN,timeZone:'+05:30'}}]})).toContain('Choose an IANA time zone name, for example Europe/Brussels.');
  expect(issues(healthGoalSchema,{...HEALTH_GOAL,measure:'mood'})).not.toEqual([]);
  expect(issues(healthGoalSchema,{...HEALTH_GOAL,progress:'90%'})).not.toEqual([]);
 });
 test('habits: a v2 record with a Health link or an entry source is refused, so such a record is always v3',()=>{
  expect(issues(habitDataSchema,{...habitsV3(),schemaVersion:2})).toContain('Automatic check-ins from Health need habits version 3.');
  const v2=habitsV2();
  expect(issues(habitDataSchema,{...v2,habits:v2.habits.map(h=>({...h,entries:h.entries.map(e=>({...e,source:'manual'}))}))})).toContain('Automatic check-ins from Health need habits version 3.');
  expect(issues(habitDataSchema,{...habitsV3(),habits:habitsV3().habits.map(h=>({...h,healthLink:{...HABIT_HEALTH_LINK,measure:'mood'}}))})).not.toEqual([]);
 });
 test('health: a v1 record with fasting is refused; a fast ends after it starts',()=>{
  expect(issues(healthSchema,{...healthV2(),schemaVersion:1})).not.toEqual([]);
  expect(issues(fastingSessionSchema,{...FASTING_SESSION,endedAt:'2026-09-07T18:00:00.000Z'})).toContain('A fast ends after it starts.');
  expect(issues(fastingSessionSchema,{...FASTING_SESSION,targetHours:25})).not.toEqual([]);
  expect(issues(fastingSessionSchema,{...FASTING_SESSION,streak:3})).not.toEqual([]);
  expect(issues(healthSchema,{...healthV2(),fasting:{version:1,sessions:[FASTING_SESSION,FASTING_SESSION]}})).toContain('Duplicate fasting session.');
 });
 test('settings: a v1 record with a journal zone or a review is refused; one review per week',()=>{
  expect(issues(dashboardSettingsSchema,{...settingsV2(),schemaVersion:1})).not.toEqual([]);
  expect(issues(dashboardSettingsSchema,{...settingsV2(),journalTimeZone:'+02:00'})).toContain('Choose an IANA time zone name, for example Europe/Brussels.');
  expect(issues(weeklyReviewSchema,{...WEEKLY_REVIEW,reviews:[...WEEKLY_REVIEW.reviews,...WEEKLY_REVIEW.reviews]})).toContain('One review per week.');
  expect(issues(weeklyReviewSchema,{...WEEKLY_REVIEW,reviews:[{...WEEKLY_REVIEW.reviews[0]!,notes:{...WEEKLY_REVIEW.reviews[0]!.notes,score:7}}]})).not.toEqual([]);
 });
});

describe('old reads new: an older build refuses a newer record by its version alone, fails closed and keeps the bytes',()=>{
 test.each(DOMAINS)('%s: today\'s reader refuses the next version with the unsupported-version message and changes nothing',domain=>{
  const raw=stored(domain,FORMAT_PAIRS[domain].newRecord());
  expect(OLD[domain].safeParse(JSON.parse(raw)).success).toBe(false);
  const storage=memoryStorage();storage.setItem(KEYS[domain],raw);
  expect(()=>readPrivateStore(storage,KEYS[domain],OLD[domain],modules[domain].empty)).toThrow('Private data is invalid or uses an unsupported version. Original data was preserved.');
  expect(snapshot(storage)).toEqual({[KEYS[domain]]:raw});
 });
 test.each(DOMAINS)('%s: an older build cannot import the newer export, and a newer record is never replaced by an older backup',async domain=>{
  const older=stored(domain,FORMAT_PAIRS[domain].oldRecord()),newer=stored(domain,FORMAT_PAIRS[domain].newRecord());
  // The older build: the import is refused before anything is touched.
  const storage=memoryStorage();storage.setItem(KEYS[domain],older);
  await expect(importPrivateStore(storage,KEYS[domain],OLD[domain],newer)).rejects.toThrow('unsupported version');
  expect(snapshot(storage)).toEqual({[KEYS[domain]]:older});
  // This build, holding the newer record: a backup from the older version is refused as NEWER_VERSION.
  const current=memoryStorage();current.setItem(KEYS[domain],newer);
  await expect(importPrivateStore(current,KEYS[domain],modules[domain].schema,older)).rejects.toMatchObject({code:'NEWER_VERSION'});
  expect(snapshot(current)).toEqual({[KEYS[domain]]:newer});
 });
});

describe('the sync message for a section from a newer build',()=>{
 test.each(DOMAINS)('%s: a version above this build\'s is refused with the plain message, this build\'s versions pass',domain=>{
  const pair=FORMAT_PAIRS[domain];
  // One above the newest version this build reads (Health reads v3 since Session U Part 9, one past its pair's `next`).
  expect(()=>validateData({[domain]:bytes({...pair.newRecord(),schemaVersion:CURRENT_VERSIONS[domain]+1})})).toThrow(NEWER_SECTION_MESSAGE);
  expect(()=>validateData({[domain]:bytes({...pair.newRecord(),schemaVersion:99})})).toThrow(NEWER_SECTION_MESSAGE);
  expect(()=>validateData({[domain]:stored(domain,pair.oldRecord())})).not.toThrow();
  expect(()=>validateData({[domain]:stored(domain,pair.newRecord())})).not.toThrow();
 });
 test('an invalid record at a known version is still refused as invalid, never as "newer"',()=>{
  expect(()=>validateData({finance:bytes({...financeV4(),schemaVersion:3,healthGoals:undefined})})).toThrow(/finance version 4/);
  expect(()=>validateData({habits:bytes({...habitsV3(),schemaVersion:2})})).toThrow(/habits version 3/);
  expect(()=>validateData({settings:'{"schemaVersion":"2"}'})).toThrow();
  expect(()=>validateData({settings:'{"schemaVersion":"2"}'})).not.toThrow(NEWER_SECTION_MESSAGE);
 });
});

// Mixed devices through sync: the same in-memory cloud and journals as cloud-sync.test.ts.
type Row=CloudOperation['changes'][number];
class MemoryJournal implements Journal{state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};async read(){return structuredClone(this.state);}async write(state:SyncState){this.state=structuredClone(state);}}
class Cloud implements CloudTransport{
 revision=0;rows=new Map<string,Row>();receipts=new Map<string,{body:string;revision:number}>();calls:CloudOperation[]=[];
 constructor(public manifest:VaultManifest){}
 async read(){return {protocol:1 as const,revision:this.revision,manifest:this.manifest,records:structuredClone([...this.rows.values()]),cursor:null};}
 async write(input:CloudOperation){const operation=structuredClone(input);this.calls.push(operation);if(operation.vault!==this.manifest.vault)throw Error('Wrong vault');const body=JSON.stringify(operation),receipt=this.receipts.get(operation.operation);if(receipt){if(receipt.body!==body)throw Error('Operation reused');return {revision:receipt.revision};}if(operation.base!==this.revision)throw new RevisionConflict();for(const row of operation.changes){if(row.revision!==(this.rows.get(row.id)?.revision??0)+1)throw new RevisionConflict();}for(const row of operation.changes)this.rows.set(row.id,row);this.revision++;this.receipts.set(operation.operation,{body,revision:this.revision});return {revision:this.revision};}
}
const noop=()=>{};
/** An older build's validation: each section through today's reader (the version literal is what refuses a newer record). */
const validateOlder=(data:PrivateData)=>{for(const [domain,raw] of Object.entries(data))OLD[domain as Domain].parse(JSON.parse(raw!));};
/** A build newer than this one: it accepts what it wrote (used only to place a future record in the cloud). */
const validateNewer=()=>{};
async function cloud(){const vault=await createVault();return {vault,cloud:new Cloud(vault.manifest)};}
type Setup=Awaited<ReturnType<typeof cloud>>;
async function sync(s:Setup,journal:Journal,data:PrivateData,validate:(data:PrivateData,prior?:PrivateData)=>void=validateData){const result=await synchronize(s.cloud,journal,s.vault.key,s.vault.manifest,data,validate,noop);await result.commit();return result;}
const cloudData=async(s:Setup)=>(await cloudSnapshot(s.cloud,s.vault.key,s.vault.manifest)).data;

describe('mixed devices through sync',()=>{
 const V3=()=>stored('finance',financeV3()),V4=()=>stored('finance',financeV4()),H2=()=>stored('habits',habitsV2());
 test('an R1 device pulls a v4 finance section another device published, merges it and never writes it back as v3',async()=>{
  const s=await cloud(),a=new MemoryJournal(),b=new MemoryJournal();
  await sync(s,a,{finance:V3(),habits:H2()});
  // Device B holds the same records; device A (a later build) then publishes the zoned plan as v4.
  await sync(s,b,{finance:V3(),habits:H2()});
  await sync(s,a,{finance:V4(),habits:H2()});
  const pulled=await sync(s,b,{finance:V3(),habits:H2()});
  expect(pulled.data.finance).toBe(V4());expect(b.state.base.finance).toBe(V4());expect(b.state.pending).toBeNull();
  // B edits habits only: the v4 section travels untouched, no finance row is rewritten.
  const edited=logHabitCount(habitDataSchema.parse(JSON.parse(H2())),habitsV2().habits[0]!.id,'2026-09-08',1,'',new Date(FIXTURE_AT));
  const calls=s.cloud.calls.length;
  const again=await sync(s,b,{finance:V4(),habits:bytes(edited)});
  expect(again.data.finance).toBe(V4());expect((await cloudData(s)).finance).toBe(V4());
  expect(s.cloud.calls.slice(calls).flatMap(o=>o.changes.map(r=>r.domain))).not.toContain('finance');
  expect(JSON.parse((await cloudData(s)).habits!).habits[0].entries).toHaveLength(2);
 });
 test('an older build pulling a v4 finance section refuses it: nothing uploaded, cloud and journal unchanged',async()=>{
  const s=await cloud(),a=new MemoryJournal(),older=new MemoryJournal();
  await sync(s,a,{finance:V3(),habits:H2()});
  await sync(s,older,{finance:V3(),habits:H2()},validateOlder);
  await sync(s,a,{finance:V4(),habits:H2()});
  const before={cloud:structuredClone([...s.cloud.rows.values()]),revision:s.cloud.revision,calls:s.cloud.calls.length,journal:structuredClone(older.state)};
  const local={finance:V3(),habits:H2()};
  await expect(synchronize(s.cloud,older,s.vault.key,s.vault.manifest,local,validateOlder,noop)).rejects.toThrow();
  expect(s.cloud.calls.length).toBe(before.calls);expect(s.cloud.revision).toBe(before.revision);expect([...s.cloud.rows.values()]).toEqual(before.cloud);
  expect(older.state).toEqual(before.journal);expect(local).toEqual({finance:V3(),habits:H2()});
  expect((await cloudData(s)).finance).toBe(V4());
 });
 test('this build pulling a section from a build newer than itself shows the plain message: nothing uploaded, cloud and journal unchanged',async()=>{
  const s=await cloud(),newer=new MemoryJournal(),mine=new MemoryJournal();
  await sync(s,mine,{finance:V3(),habits:H2()});
  await sync(s,newer,{finance:V3(),habits:H2()},validateNewer);
  const future=bytes({...financeV4(),schemaVersion:5,futureField:true});
  await sync(s,newer,{finance:future,habits:H2()},validateNewer);
  const before={calls:s.cloud.calls.length,revision:s.cloud.revision,journal:structuredClone(mine.state)};
  await expect(synchronize(s.cloud,mine,s.vault.key,s.vault.manifest,{finance:V3(),habits:H2()},validateData,noop)).rejects.toThrow(NEWER_SECTION_MESSAGE);
  expect(s.cloud.calls.length).toBe(before.calls);expect(s.cloud.revision).toBe(before.revision);expect(mine.state).toEqual(before.journal);
  expect((await cloudData(s)).finance).toBe(future);
 });
 test('every section type: the next version syncs between two R1 devices like today\'s',async()=>{
  const s=await cloud(),a=new MemoryJournal(),b=new MemoryJournal();
  const next=Object.fromEntries(DOMAINS.map(d=>[d,stored(d,FORMAT_PAIRS[d].newRecord())])) as PrivateData;
  await sync(s,a,next);
  const pulled=await sync(s,b,{});
  expect(pulled.data).toEqual(next);expect(await cloudData(s)).toEqual(next);
  expect(DOMAINS.map(d=>JSON.parse(b.state.base[d]!).schemaVersion)).toEqual([4,3,2,2]);
 });
});

describe('Health v3 (Session U Part 9): this build reads and writes it; #27/#28 refuse it and keep the bytes',()=>{
 const V1=()=>stored('health',healthV1()),V2=()=>stored('health',healthV2()),V3=()=>stored('health',healthV3());
 /** Builds #27/#28 (R1): Health up to v2; a newer section is refused with the plain message (their CURRENT_VERSIONS). */
 const validateR1=(data:PrivateData)=>{for(const [domain,raw] of Object.entries(data)){const parsed=JSON.parse(raw!);if(domain==='health'){if(parsed.schemaVersion>2)throw Error(NEWER_SECTION_MESSAGE);healthR1Schema.parse(parsed);}else modules[domain as Domain].schema.parse(parsed);}};
 test('new reads new: v3 round-trips byte-identical with every group, and the sync check passes it',()=>{
  const raw=V3(),v3=healthSchema.parse(JSON.parse(raw));
  expect(v3.schemaVersion).toBe(3);expect(bytes(v3)).toBe(raw);
  expect(Object.keys(v3)).toEqual(expect.arrayContaining(['fasting','healthGoals','habitLinks','reviewNotes']));
  expect(()=>validateData({health:raw})).not.toThrow();
  // Each group is strict: a field no version knows is refused.
  expect(healthSchema.safeParse({...healthV3(),reviewNotes:{version:1,notes:{'2026-09-28':'x'},mood:3}}).success).toBe(false);
  expect(healthSchema.safeParse({...healthV3(),schemaVersion:2}).success).toBe(false);
 });
 test('#27/#28 refuse v3 locally and on import and keep the bytes; this build never replaces v3 by an older backup',async()=>{
  const storage=memoryStorage();storage.setItem(HEALTH_STORAGE_KEY,V3());
  expect(()=>readPrivateStore(storage,HEALTH_STORAGE_KEY,healthR1Schema,modules.health.empty)).toThrow('Private data is invalid or uses an unsupported version. Original data was preserved.');
  expect(snapshot(storage)).toEqual({[HEALTH_STORAGE_KEY]:V3()});
  const older=memoryStorage();older.setItem(HEALTH_STORAGE_KEY,V2());
  await expect(importPrivateStore(older,HEALTH_STORAGE_KEY,healthR1Schema,V3())).rejects.toThrow('unsupported version');
  expect(snapshot(older)).toEqual({[HEALTH_STORAGE_KEY]:V2()});
  await expect(importPrivateStore(storage,HEALTH_STORAGE_KEY,healthSchema,V2())).rejects.toMatchObject({code:'NEWER_VERSION'});
  expect(snapshot(storage)).toEqual({[HEALTH_STORAGE_KEY]:V3()});
 });
 test('sync: a #27/#28 device pulling v3 Health stops with the plain message; nothing uploaded, cloud and journal unchanged',async()=>{
  const s=await cloud(),mine=new MemoryJournal(),r1=new MemoryJournal();
  await sync(s,mine,{health:V2()});await sync(s,r1,{health:V2()},validateR1);
  await sync(s,mine,{health:V3()});
  const before={calls:s.cloud.calls.length,revision:s.cloud.revision,journal:structuredClone(r1.state)};
  await expect(synchronize(s.cloud,r1,s.vault.key,s.vault.manifest,{health:V2()},validateR1,noop)).rejects.toThrow(NEWER_SECTION_MESSAGE);
  expect(s.cloud.calls.length).toBe(before.calls);expect(s.cloud.revision).toBe(before.revision);expect(r1.state).toEqual(before.journal);
  expect((await cloudData(s)).health).toBe(V3());
 });
 test('sync: two devices that each raised Health (a fast to v2 here, a goal to v3 there) merge at v3 with both',async()=>{
  const s=await cloud(),a=new MemoryJournal(),b=new MemoryJournal();
  await sync(s,a,{health:V1()});await sync(s,b,{health:V1()});
  const withFast=stored('health',{...healthV1(),schemaVersion:2,fasting:{version:1,sessions:[FASTING_SESSION]}});
  const withGoal=stored('health',{...healthV1(),schemaVersion:3,healthGoals:{version:1,goals:[HEALTH_GOAL]}});
  await sync(s,a,{health:withFast});
  const merged=await sync(s,b,{health:withGoal});
  const health=JSON.parse(merged.data.health!);
  expect(health.schemaVersion).toBe(3);expect(health.fasting.sessions).toEqual([FASTING_SESSION]);expect(health.healthGoals.goals).toEqual([HEALTH_GOAL]);
  expect((await sync(s,a,{health:withFast})).data.health).toBe(merged.data.health);
 });
});
