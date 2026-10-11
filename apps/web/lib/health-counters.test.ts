import 'fake-indexeddb/auto';
import {beforeEach,expect,test,vi} from 'vitest';
import {createEmptyHealth,healthSchema,HEALTH_STORAGE_KEY,type HealthData} from './health';
import {DEFAULT_COUNTERS,MAX_COUNTERS,addCounter,changeCount,countOn,counterHistory,deleteCounter,editCounter,exerciseData} from './health-counters';
import {mergePrivateData} from './vault/cloud-sync';
import {encryptBackup,decryptBackup} from './vault/backup';
import {VaultDatabase} from './vault/database';
import {enableDurableStore,exportDurableStore,restoreDurableStore} from './vault/local';
import {importPrivateStore} from './private-storage';
import {buildShowcase} from './showcase-data';

const day='2026-09-29',next='2026-09-30';
const parse=(h:unknown)=>healthSchema.parse(h);
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

test('older Health data loads unchanged and shows the three default counters without writing them',()=>{
 const old=createEmptyHealth(),raw=JSON.stringify(old);
 expect(JSON.stringify(parse(JSON.parse(raw)))).toBe(raw);
 expect('exercise' in parse(JSON.parse(raw))).toBe(false);
 expect(exerciseData(old).counters.map(c=>c.name)).toEqual(['Push-ups','Pull-ups','Squats']);
 expect(countOn(old,DEFAULT_COUNTERS[0]!.id,day)).toBeNull();
 // A "−" on a day with no entry changes nothing, so nothing is written.
 expect(changeCount(old,DEFAULT_COUNTERS[0]!.id,day,-1)).toBe(old);
});

test('counts are daily, never below zero, and a day without a record is no entry',()=>{
 const push=DEFAULT_COUNTERS[0]!.id;let h:HealthData=createEmptyHealth();
 h=changeCount(h,push,day,1);h=changeCount(h,push,day,1);h=changeCount(h,push,day,10);
 expect(countOn(h,push,day)).toBe(12);expect(countOn(h,push,next)).toBeNull();
 h=changeCount(h,push,day,-20);expect(countOn(h,push,day)).toBe(0);
 h=changeCount(h,push,next,5);
 expect(counterHistory(h,push,['2026-09-28',day,next])).toEqual([null,0,5]);
 expect(parse(h).exercise!.days.map(d=>d.id)).toEqual([`${push}@${day}`,`${push}@${next}`]);
 expect(()=>changeCount(h,'health_counter-unknown',day,1)).toThrow('existing counter');
 expect(()=>changeCount(h,push,day,1.5)).toThrow('whole number');
});

test('custom counters: add up to six, rename, change icon, delete with their history',()=>{
 let h:HealthData=createEmptyHealth();
 h=addCounter(h,'  Plank   holds ','core','health_counter-custom-01');
 expect(exerciseData(h).counters.at(-1)).toEqual({id:'health_counter-custom-01',name:'Plank holds',icon:'core'});
 h=addCounter(h,'Burpees','jump','health_counter-custom-02');h=addCounter(h,'Lunges','squat','health_counter-custom-03');
 expect(exerciseData(h).counters).toHaveLength(MAX_COUNTERS);
 expect(()=>addCounter(h,'One more','run','health_counter-custom-04')).toThrow('up to 6');
 expect(()=>addCounter(createEmptyHealth(),' ','run','health_counter-custom-05')).toThrow('1 to 40');
 expect(()=>addCounter(createEmptyHealth(),'X','dance' as never,'health_counter-custom-06')).toThrow('icons');
 h=editCounter(h,'health_counter-custom-01',{name:'Planks',icon:'stretch'});
 expect(exerciseData(h).counters.find(c=>c.id==='health_counter-custom-01')).toEqual({id:'health_counter-custom-01',name:'Planks',icon:'stretch'});
 h=changeCount(h,'health_counter-custom-02',day,8);
 h=deleteCounter(h,'health_counter-custom-02');
 expect(exerciseData(h).counters.map(c=>c.id)).not.toContain('health_counter-custom-02');
 expect(exerciseData(h).days).toEqual([]);
 expect(parse(h)).toEqual(h);
});

test('the schema refuses malformed counter data',()=>{
 const base=createEmptyHealth();
 const bad=(exercise:unknown)=>healthSchema.safeParse({...base,exercise}).success;
 expect(bad({version:1,counters:[],days:[]})).toBe(true);
 expect(bad({version:2,counters:[],days:[]})).toBe(false);
 expect(bad({version:1,counters:[{id:'health_counter-a1b2c3d4',name:'X',icon:'pushup',extra:1}],days:[]})).toBe(false);
 expect(bad({version:1,counters:[],days:[{id:'health_counter-a1b2c3d4@2026-09-29',counterId:'health_counter-a1b2c3d4',date:'2026-09-29',count:-1}]})).toBe(false);
 expect(bad({version:1,counters:[],days:[{id:'health_counter-other000@2026-09-29',counterId:'health_counter-a1b2c3d4',date:'2026-09-29',count:1}]})).toBe(false);
 expect(bad({version:1,counters:Array.from({length:7},(_,i)=>({id:`health_counter-x${i}000000`,name:'X',icon:'run'})),days:[]})).toBe(false);
 // Counter IDs join the Health-wide unique ID check.
 expect(healthSchema.safeParse({...base,weights:[{id:'health_counter-pushups',date:day,grams:70000,createdAt:'2026-09-29T00:00:00.000Z',updatedAt:'2026-09-29T00:00:00.000Z'}],exercise:{version:1,counters:[...DEFAULT_COUNTERS],days:[]}}).success).toBe(false);
});

test('sync: two devices that count on different days (or different counters) merge by identity',()=>{
 const base=createEmptyHealth(),push=DEFAULT_COUNTERS[0]!.id,squat=DEFAULT_COUNTERS[2]!.id;
 const a=changeCount(base,push,day,10),b=changeCount(changeCount(base,push,next,4),squat,day,20);
 const merged=parse(JSON.parse(mergePrivateData({health:JSON.stringify(base)},{health:JSON.stringify(a)},{health:JSON.stringify(b)}).health!));
 expect(countOn(merged,push,day)).toBe(10);expect(countOn(merged,push,next)).toBe(4);expect(countOn(merged,squat,day)).toBe(20);
 expect(exerciseData(merged).counters).toEqual([...DEFAULT_COUNTERS]);
 // The same day edited on both devices is a real conflict and goes to review.
 const c=changeCount(a,push,day,1),d=changeCount(a,push,day,2);
 expect(()=>mergePrivateData({health:JSON.stringify(a)},{health:JSON.stringify(c)},{health:JSON.stringify(d)})).toThrow('Conflicting');
});

test('backup and restore carry counters exactly (encrypted backup, legacy and durable stores)',async()=>{
 let h:HealthData=createEmptyHealth();
 h=addCounter(h,'Planks','core','health_counter-custom-01');h=changeCount(h,'health_counter-custom-01',day,3);h=changeCount(h,DEFAULT_COUNTERS[1]!.id,next,7);
 const raw=JSON.stringify(parse(h)),backup=await encryptBackup({health:raw}),restored=await decryptBackup(backup.file,backup.recovery);
 expect(restored.health).toBe(raw);
 const legacy=memoryStorage();await importPrivateStore(legacy,HEALTH_STORAGE_KEY,healthSchema,restored.health!);
 expect(parse(JSON.parse(legacy.getItem(HEALTH_STORAGE_KEY)!))).toEqual(parse(h));
 const durable=memoryStorage(),db=new VaultDatabase(crypto.randomUUID());durable.setItem(HEALTH_STORAGE_KEY,JSON.stringify(createEmptyHealth()));
 await enableDurableStore(durable,HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth,db);await restoreDurableStore(durable,HEALTH_STORAGE_KEY,healthSchema,restored.health!,db);
 expect(parse(JSON.parse(await exportDurableStore(durable,HEALTH_STORAGE_KEY,db)))).toEqual(parse(h));
});

test('Showcase counters are fictional examples inside the Showcase dataset only',()=>{
 const showcase=buildShowcase('2026-09-29'),health=parse(JSON.parse(Object.entries(showcase.records).find(([k])=>k===HEALTH_STORAGE_KEY)![1]));
 expect(exerciseData(health).counters.map(c=>c.name)).toEqual(['Push-ups','Pull-ups','Squats']);
 expect(countOn(health,DEFAULT_COUNTERS[0]!.id,'2026-09-29')).toBeGreaterThan(0);
});
