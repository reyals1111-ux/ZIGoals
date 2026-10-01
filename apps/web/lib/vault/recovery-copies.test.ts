import {beforeEach,expect,test,vi} from 'vitest';
import {importPrivateStore} from '../private-storage';
import {buildShowcase} from '../showcase-data';
import {habitDataSchema,HABITS_KEY,type HabitData} from '../habits';
import {healthSchema,HEALTH_STORAGE_KEY,type HealthData} from '../health';
import {LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY,exportLocalSimulation,restoreLocalSimulation} from './local-simulation-backup';
import {applyLocal,initialLedger} from '../local-ledger';

// QA-02 (Session F): every module restore keeps a ":recovery:" copy of the bytes it replaced and none was
// ever removed, so after a few large restores localStorage is full and every restore fails ("A newer stored
// version cannot be replaced by this app." in the UI). Owner decision: after a successful restore keep only
// the newest copy per module. Storage below behaves like Chromium's localStorage: one quota for keys plus
// values, in UTF-16 code units (10 MiB), checked on every setItem; replacing a value counts the difference.
const QUOTA=5_242_880;
type Store=Storage&{map:Map<string,string>;used:()=>number};
function quotaStorage(quota=QUOTA,refuseRemove?:(key:string)=>boolean):Store{
 const m=new Map<string,string>(),used=()=>[...m].reduce((n,[k,v])=>n+k.length+v.length,0);
 return {map:m,used,get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,
  setItem:(k:string,v:string)=>{v=String(v);if(used()-(m.has(k)?k.length+m.get(k)!.length:0)+k.length+v.length>quota)throw new DOMException('The quota has been exceeded.','QuotaExceededError');m.set(k,v);},
  removeItem:(k:string)=>{if(refuseRemove?.(k))throw new DOMException('The quota has been exceeded.','QuotaExceededError');m.delete(k);},clear:()=>m.clear()} as Store;
}
/** The same physical storage seen through an account prefix, like getAppStorage's account view. */
function prefixed(base:Store,prefix:string):Storage{
 const keys=()=>[...base.map.keys()].filter(k=>k.startsWith(prefix));
 return {get length(){return keys().length;},key:(i:number)=>keys()[i]?.slice(prefix.length)??null,getItem:k=>base.getItem(prefix+k),setItem:(k,v)=>base.setItem(prefix+k,v),removeItem:k=>base.removeItem(prefix+k),clear:()=>keys().forEach(k=>base.removeItem(k))};
}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

// Real module data (the Showcase generator), scaled to large backups with distinct record identities.
const showcase=buildShowcase('2026-10-01').records,baseHabits=JSON.parse(showcase[HABITS_KEY]!) as HabitData,baseHealth=JSON.parse(showcase[HEALTH_STORAGE_KEY]!) as HealthData;
const habitsBackup=(count:number)=>JSON.stringify(habitDataSchema.parse({...baseHabits,habits:Array.from({length:count},(_,n)=>({...baseHabits.habits[n%baseHabits.habits.length]!,id:`92000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`}))}));
const healthBackup=(copies:number)=>JSON.stringify(healthSchema.parse({...baseHealth,diary:Array.from({length:copies},(_,k)=>baseHealth.diary.map(row=>({...row,id:`${row.id}-${k}`}))).flat()}));
const A=habitsBackup(190),B=habitsBackup(180),H1=healthBackup(20),H2=healthBackup(19);
const copies=(s:Storage,key:string)=>Array.from({length:s.length},(_,i)=>s.key(i)!).filter(k=>k.startsWith(`${key}:recovery:`)).map(k=>s.getItem(k));
const restore=(s:Storage,key:string,raw:string)=>key===HABITS_KEY?importPrivateStore(s,key,habitDataSchema,raw):importPrivateStore(s,key,healthSchema,raw);
function seeded(quota=QUOTA){const s=quotaStorage(quota);s.setItem(HABITS_KEY,showcase[HABITS_KEY]!);s.setItem(HEALTH_STORAGE_KEY,showcase[HEALTH_STORAGE_KEY]!);return s;}
const codeOf=(error:unknown)=>(error as {code?:unknown})?.code;

test("Session F's sequence of large restores keeps working: one recovery copy per module, the newest",async()=>{
 const s=seeded();
 expect(A.length).toBeGreaterThan(780_000);expect(H1.length).toBeGreaterThan(840_000);
 const sequence:[string,string][]=[[HABITS_KEY,A],[HABITS_KEY,B],[HEALTH_STORAGE_KEY,H1],[HABITS_KEY,A],[HABITS_KEY,B],[HEALTH_STORAGE_KEY,H2],[HABITS_KEY,A],[HABITS_KEY,B],[HEALTH_STORAGE_KEY,H1],[HABITS_KEY,A]];
 for(const [step,[key,raw]] of sequence.entries()){
  const replaced=s.getItem(key);
  await expect(restore(s,key,raw),`restore ${step+1}`).resolves.toBeDefined();
  expect(s.getItem(key)).toBe(raw);
  expect(copies(s,key),`copies after restore ${step+1}`).toEqual([replaced]);
 }
 expect(copies(s,HEALTH_STORAGE_KEY)).toEqual([H2]);expect(s.used()).toBeLessThan(QUOTA*0.7);
});

test('copies already piled up by earlier builds are cleared by the next restore, which makes room for itself',async()=>{
 const s=seeded();s.setItem(HABITS_KEY,A);
 for(let n=0;n<5;n++)s.setItem(`${HABITS_KEY}:recovery:legacy-${n}`,n%2?A:B);
 const health=copies(s,HEALTH_STORAGE_KEY);
 await restore(s,HABITS_KEY,B);
 expect(s.getItem(HABITS_KEY)).toBe(B);expect(copies(s,HABITS_KEY)).toEqual([A]);expect(copies(s,HEALTH_STORAGE_KEY)).toEqual(health);
});

test('a restore that cannot fit even after making room is refused with an accurate code and message, and changes nothing',async()=>{
 // Even with the older copy removed, the free space stays below the size of the copy this restore must keep.
 const s=seeded();s.setItem(HABITS_KEY,A);s.setItem(`${HABITS_KEY}:recovery:older`,B);
 s.setItem('zigoals:other-data',''.padEnd(QUOTA-s.used()-20_000,'x'));expect(QUOTA-s.used()+B.length).toBeLessThan(A.length);
 const before=new Map(s.map);let error:unknown;
 try{await restore(s,HABITS_KEY,B);}catch(caught){error=caught;}
 expect(codeOf(error)).toBe('STORAGE_FULL');
 expect((error as Error).message).toMatch(/^Your browser storage is full/);expect((error as Error).message).toMatch(/quota/i);
 expect((error as Error).message).not.toMatch(/newer/i);
 expect(new Map(s.map)).toEqual(before);
});

test('a refused newer-version restore keeps every copy and is reported as a newer version, not as full storage',async()=>{
 const s=seeded(),newer=JSON.stringify({...JSON.parse(showcase[HABITS_KEY]!),schemaVersion:99});s.setItem(HABITS_KEY,newer);s.setItem(`${HABITS_KEY}:recovery:older`,A);
 const before=new Map(s.map);let error:unknown;
 try{await restore(s,HABITS_KEY,B);}catch(caught){error=caught;}
 expect(codeOf(error)).toBe('NEWER_VERSION');expect(new Map(s.map)).toEqual(before);
});

test.each([['unreadable','{ damaged HABITS'],['invalid','{"schemaVersion":2,"kind":"zigoals-habits","habits":"not a list"}']])('an %s current store is replaced but no older copy is deleted',async(_,current)=>{
 const s=seeded();s.setItem(HABITS_KEY,current);s.setItem(`${HABITS_KEY}:recovery:older-1`,A);s.setItem(`${HABITS_KEY}:recovery:older-2`,B);
 await restore(s,HABITS_KEY,A);
 expect(s.getItem(HABITS_KEY)).toBe(A);expect(copies(s,HABITS_KEY).sort()).toEqual([A,B,current].sort());
});

test('modules and account spaces are independent: a Habits restore never touches Health copies or another space',async()=>{
 const s=seeded(),account=prefixed(s,'zigoals:account:v1:11111111-1111-4111-8111-111111111111:');
 s.setItem(`${HEALTH_STORAGE_KEY}:recovery:older`,H1);account.setItem(HABITS_KEY,B);account.setItem(`${HABITS_KEY}:recovery:account-older`,A);
 await restore(s,HABITS_KEY,A);await restore(s,HABITS_KEY,B);
 expect(copies(s,HABITS_KEY)).toEqual([A]);expect(copies(s,HEALTH_STORAGE_KEY)).toEqual([H1]);
 expect(copies(account,HABITS_KEY)).toEqual([A]);expect(account.getItem(HABITS_KEY)).toBe(B);
 await restore(account,HABITS_KEY,A);
 expect(copies(account,HABITS_KEY)).toEqual([B]);expect(copies(s,HABITS_KEY)).toEqual([A]);expect(s.getItem(HABITS_KEY)).toBe(B);
});

test('a storage error while deleting older copies leaves them and still reports the restore as done',async()=>{
 const base=seeded(),s=quotaStorage(QUOTA,key=>key.includes(':recovery:'));for(const [k,v] of base.map)s.setItem(k,v);
 s.setItem(`${HABITS_KEY}:recovery:older`,B);const current=s.getItem(HABITS_KEY);
 await expect(restore(s,HABITS_KEY,A)).resolves.toBeDefined();
 expect(s.getItem(HABITS_KEY)).toBe(A);expect(copies(s,HABITS_KEY).sort()).toEqual([B,current].sort());
});

test('a restore that fails while making room puts every held copy back',async()=>{
 const small=showcase[HABITS_KEY]!,s=seeded();s.setItem(HABITS_KEY,A);s.setItem(`${HABITS_KEY}:recovery:older-1`,small);s.setItem(`${HABITS_KEY}:recovery:older-2`,small+' ');
 s.setItem('zigoals:other-data',''.padEnd(QUOTA-s.used()-20_000,'x'));expect(QUOTA-s.used()+2*small.length+1).toBeLessThan(A.length);
 const before=new Map(s.map);
 await expect(restore(s,HABITS_KEY,B)).rejects.toThrow(/storage is full/);
 expect(new Map(s.map)).toEqual(before);
});

// Legacy "Local simulation" Goals: two keys, the same rule per key.
const plans=(name:string)=>JSON.stringify({schemaVersion:1,chainId:'local-simulation',walletAddress:'local-demo-user',goals:{'1':{name,category:'Travel',targetValue:'1200',currency:'ZIG',targetDate:'2027-09-15',startingAmount:'0',monthlyContribution:'50',riskPreference:'Conservative',liquidityPreference:'Anytime',deadlineFlexible:false,notes:''}}});
function simulationSection(name:string,deposit:string){
 const source=quotaStorage();let l=applyLocal(initialLedger(),{kind:'create'},'2026-09-17T00:00:00.000Z');l=applyLocal(l,{kind:'deposit',id:'1',amount:deposit},'2026-09-17T01:00:00.000Z');
 source.setItem(LOCAL_LEDGER_KEY,JSON.stringify(l));source.setItem(LOCAL_PLANS_KEY,plans(name));return exportLocalSimulation(source)!.section;
}
test('legacy simulation restores keep only the newest copy of each key',async()=>{
 const s=quotaStorage();s.setItem(LOCAL_LEDGER_KEY,JSON.stringify(initialLedger()));s.setItem(LOCAL_PLANS_KEY,plans('Current trip'));
 const one=simulationSection('First trip','100000000000000000000'),two=simulationSection('Second trip','200000000000000000000');
 await restoreLocalSimulation(s,one);const replaced=[s.getItem(LOCAL_LEDGER_KEY),s.getItem(LOCAL_PLANS_KEY)];
 await restoreLocalSimulation(s,two);
 expect(copies(s,LOCAL_LEDGER_KEY)).toEqual([replaced[0]]);expect(copies(s,LOCAL_PLANS_KEY)).toEqual([replaced[1]]);
});
