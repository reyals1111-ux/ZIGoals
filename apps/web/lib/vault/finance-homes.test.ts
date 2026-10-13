import {describe,expect,test} from 'vitest';
import {platformR4Schema,platformSchema,PLATFORM_KEY,financeVersion,type Platform} from '../positions';
import {ACCOUNTS_KEY,accountsSchema,type Account,type Accounts} from '../accounts/schema';
import {MILESTONE_DATES_KEY,type MilestoneDates} from '../goals/milestone-dates';
import {ACCOUNT,FIXTURE_AT,financeV4} from './format-fixtures';
import {FINANCE_HOMES_KEY,accountsIn,datesIn,emptyFinanceHomesMarker,reconcileFinanceHomes,type FinanceHomesMarker} from './finance-homes';
import {reconcileFinanceHomesNow} from '../finance-homes-store';

// Session AB-Cloud Part 1 ([TIER 3] (data formats / sync), ADR-023 C6): the finance-homes switch. The device keys stay what
// the pages read and write; finance v5 holds the synced copy; a three-way reconcile keeps them in step both ways.
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
const snapshot=(storage:Storage)=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)!).map(k=>[k,storage.getItem(k)]));
// Finance v4 whose Goal has one milestone (title, done, value: finance v4's own fields) and no date.
const v4=():Platform=>platformSchema.parse({...financeV4(),goals:financeV4().goals.map(g=>({...g,milestones:[{id:'m1',title:'Flights booked',done:false,target:'150000'}]}))});
const accounts=(...items:Account[]):Accounts=>accountsSchema.parse({version:1,items});
const dates=(map:Record<string,Record<string,string>>):MilestoneDates=>({version:1,dates:map});
const SECOND:Account={...ACCOUNT,id:'1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b',name:'Mortgage',kind:'mortgage',updatedAt:'2026-09-10T08:00:00.000Z'};
const edited=(a:Account,name:string,at:string):Account=>({...a,name,updatedAt:at});

describe('reconcileFinanceHomes',()=>{
 test('first run (migration): the device keys go into finance v5 unchanged, the device keys stay as they are',()=>{
  const r=reconcileFinanceHomes(v4(),{accounts:accounts(ACCOUNT),dates:dates({'1':{m1:'2026-12-01'}})},emptyFinanceHomesMarker());
  expect(r.changed).toBe(true);expect(r.platform.schemaVersion).toBe(5);
  expect(accountsIn(r.platform)).toEqual([ACCOUNT]);expect([...datesIn(r.platform)]).toEqual([['1/m1','2026-12-01']]);
  expect(r.accounts).toBeUndefined();expect(r.dates).toBeUndefined();
  expect(Object.keys(r.marker.accounts)).toEqual([ACCOUNT.id]);expect(r.marker.dates).toEqual({'1/m1':'2026-12-01'});
  // Every other byte of finance is as it was (only the version, the accounts and the milestone's date are new).
  const {schemaVersion:_a,accounts:_b,goals:g1,...rest1}=r.platform as Platform&{accounts?:unknown};void _a;void _b;
  const {schemaVersion:_c,goals:g0,...rest0}=v4();void _c;
  expect(rest1).toEqual(rest0);expect(g1.map(g=>({...g,milestones:g.milestones.map(m=>{const {targetDate:_t,...rest}=m as typeof m&{targetDate?:string};void _t;return rest;})}))).toEqual(g0);
 });
 test('nothing held on either side: the same finance object, no raise, no device write',()=>{
  const p=v4(),r=reconcileFinanceHomes(p,{accounts:accounts(),dates:dates({})},emptyFinanceHomesMarker());
  expect(r.platform).toBe(p);expect(r.changed).toBe(false);expect(r.accounts).toBeUndefined();expect(r.dates).toBeUndefined();
 });
 test('idempotent: a second run changes nothing',()=>{
  const first=reconcileFinanceHomes(v4(),{accounts:accounts(ACCOUNT,SECOND),dates:dates({'1':{m1:'2026-12-01'}})},emptyFinanceHomesMarker());
  const second=reconcileFinanceHomes(first.platform,{accounts:accounts(ACCOUNT,SECOND),dates:dates({'1':{m1:'2026-12-01'}})},first.marker);
  expect(second.platform).toBe(first.platform);expect(second.accounts).toBeUndefined();expect(second.dates).toBeUndefined();expect(second.marker).toEqual(first.marker);
 });
 const synced=()=>reconcileFinanceHomes(v4(),{accounts:accounts(ACCOUNT),dates:dates({'1':{m1:'2026-12-01'}})},emptyFinanceHomesMarker());
 test('only finance changed (another device synced it): the device keys take it',()=>{
  const base=synced(),remote=platformSchema.parse({...base.platform,accounts:accounts(edited(ACCOUNT,'Holiday pot','2026-09-12T08:00:00.000Z'),SECOND),
   goals:base.platform.goals.map(g=>({...g,milestones:g.milestones.map(m=>({...m,targetDate:'2027-01-15'}))}))});
  const r=reconcileFinanceHomes(remote,{accounts:accounts(ACCOUNT),dates:dates({'1':{m1:'2026-12-01'}})},base.marker);
  expect(r.changed).toBe(false);expect(r.accounts!.items.map(a=>a.name)).toEqual(['Holiday pot','Mortgage']);expect(r.dates).toEqual(dates({'1':{m1:'2027-01-15'}}));
 });
 test('only the device changed: finance takes it; a removal on the device removes it from finance (v5 kept)',()=>{
  const base=synced();
  const r=reconcileFinanceHomes(base.platform,{accounts:accounts(edited(ACCOUNT,'Renamed','2026-09-12T08:00:00.000Z')),dates:dates({})},base.marker);
  expect(accountsIn(r.platform)[0]!.name).toBe('Renamed');expect(datesIn(r.platform).size).toBe(0);expect(r.platform.schemaVersion).toBe(5);
  expect(r.marker.dates).toEqual({});
  const gone=reconcileFinanceHomes(r.platform,{accounts:accounts(),dates:dates({})},r.marker);
  expect(accountsIn(gone.platform)).toEqual([]);expect(gone.platform.schemaVersion).toBe(5);expect(gone.marker.accounts).toEqual({});
 });
 test('both changed: the later updatedAt wins on both devices; equal stamps settle the same way from either side',()=>{
  const base=synced(),mine=edited(ACCOUNT,'Mine','2026-09-12T08:00:00.000Z'),theirs=edited(ACCOUNT,'Theirs','2026-09-13T08:00:00.000Z');
  const remote=platformSchema.parse({...base.platform,accounts:accounts(theirs)});
  const r=reconcileFinanceHomes(remote,{accounts:accounts(mine),dates:dates({'1':{m1:'2026-12-01'}})},base.marker);
  expect(r.accounts!.items[0]!.name).toBe('Theirs');expect(accountsIn(r.platform)[0]!.name).toBe('Theirs');
  const tieA=edited(ACCOUNT,'Alpha','2026-09-12T08:00:00.000Z'),tieB=edited(ACCOUNT,'Beta','2026-09-12T08:00:00.000Z');
  const one=reconcileFinanceHomes(platformSchema.parse({...base.platform,accounts:accounts(tieB)}),{accounts:accounts(tieA),dates:null},base.marker);
  const other=reconcileFinanceHomes(platformSchema.parse({...base.platform,accounts:accounts(tieA)}),{accounts:accounts(tieB),dates:null},base.marker);
  expect(accountsIn(one.platform)).toEqual(accountsIn(other.platform));
 });
 test('removed on one side, edited on the other: the edit is kept (nothing lost)',()=>{
  const base=synced(),remote=platformSchema.parse({...base.platform,accounts:accounts(edited(ACCOUNT,'Still here','2026-09-12T08:00:00.000Z'))});
  const r=reconcileFinanceHomes(remote,{accounts:accounts(),dates:null},base.marker);
  expect(r.accounts!.items.map(a=>a.name)).toEqual(['Still here']);
 });
 test('both changed a date: the later date, the same on every device',()=>{
  const base=synced(),remote=platformSchema.parse({...base.platform,goals:base.platform.goals.map(g=>({...g,milestones:g.milestones.map(m=>({...m,targetDate:'2027-02-01'}))}))});
  const r=reconcileFinanceHomes(remote,{accounts:null,dates:dates({'1':{m1:'2027-03-01'}})},base.marker);
  expect([...datesIn(r.platform)]).toEqual([['1/m1','2027-03-01']]);expect(r.dates).toBeUndefined();
 });
 test('a date for a milestone finance does not hold stays on this device only',()=>{
  const r=reconcileFinanceHomes(v4(),{accounts:null,dates:dates({'1':{m1:'2026-12-01',gone:'2026-11-01'},'99':{m9:'2027-01-01'}})},emptyFinanceHomesMarker());
  expect([...datesIn(r.platform)]).toEqual([['1/m1','2026-12-01']]);expect(r.dates).toBeUndefined();expect(Object.keys(r.marker.dates)).toEqual(['1/m1']);
 });
 test('an unreadable device key (null) is left alone and its finance home untouched',()=>{
  const base=synced(),r=reconcileFinanceHomes(base.platform,{accounts:null,dates:null},base.marker);
  expect(r.platform).toBe(base.platform);expect(r.accounts).toBeUndefined();expect(r.marker).toEqual(base.marker);
 });
});

describe('the rollback floor and the older readers',()=>{
 test('#29–#31 refuse what this switch writes (the floor is #32); #32 and later read it and keep it at v5',()=>{
  const v5=reconcileFinanceHomes(v4(),{accounts:accounts(ACCOUNT),dates:dates({'1':{m1:'2026-12-01'}})},emptyFinanceHomesMarker()).platform;
  const raw=JSON.parse(JSON.stringify(v5));
  expect(platformR4Schema.safeParse(raw).success).toBe(false);
  const read=platformSchema.parse(raw);expect(financeVersion(read)).toBe(5);expect(accountsIn(read)).toEqual([ACCOUNT]);
 });
});

describe('reconcileFinanceHomesNow (the store)',()=>{
 const seed=(storage:Storage)=>{storage.setItem(PLATFORM_KEY,JSON.stringify(v4()));storage.setItem(ACCOUNTS_KEY,JSON.stringify(accounts(ACCOUNT)));storage.setItem(MILESTONE_DATES_KEY,JSON.stringify(dates({'1':{m1:'2026-12-01'}})));};
 test('switch off: nothing at all',async()=>{
  const storage=memoryStorage();seed(storage);const before=snapshot(storage);
  expect(await reconcileFinanceHomesNow(storage,{syncWrites:false})).toEqual({platform:false,keys:[]});expect(snapshot(storage)).toEqual(before);
 });
 test('the raise keeps a recovery copy of the v4 record; the device keys are not rewritten; the marker is written last',async()=>{
  const storage=memoryStorage();seed(storage);const oldFinance=storage.getItem(PLATFORM_KEY),deviceA=storage.getItem(ACCOUNTS_KEY),deviceD=storage.getItem(MILESTONE_DATES_KEY);
  expect(await reconcileFinanceHomesNow(storage,{syncWrites:true})).toEqual({platform:true,keys:[]});
  expect(JSON.parse(storage.getItem(PLATFORM_KEY)!).schemaVersion).toBe(5);
  expect(Object.keys(snapshot(storage)).filter(k=>k.startsWith(`${PLATFORM_KEY}:recovery:`)).map(k=>storage.getItem(k))).toEqual([oldFinance]);
  expect(storage.getItem(ACCOUNTS_KEY)).toBe(deviceA);expect(storage.getItem(MILESTONE_DATES_KEY)).toBe(deviceD);
  const marker=JSON.parse(storage.getItem(FINANCE_HOMES_KEY)!) as FinanceHomesMarker;expect(Object.keys(marker.accounts)).toEqual([ACCOUNT.id]);
  // A second run writes nothing.
  const after=snapshot(storage);expect(await reconcileFinanceHomesNow(storage,{syncWrites:true})).toEqual({platform:false,keys:[]});expect(snapshot(storage)).toEqual(after);
 });
 test('a person without finance or device records gets no finance record',async()=>{
  const storage=memoryStorage();storage.setItem(ACCOUNTS_KEY,JSON.stringify(accounts()));
  await reconcileFinanceHomesNow(storage,{syncWrites:true});expect(storage.getItem(PLATFORM_KEY)).toBeNull();
 });
 test('a device key edited while the reconcile runs is never overwritten: its keys and the marker wait for the next run',async()=>{
  const storage=memoryStorage();seed(storage);await reconcileFinanceHomesNow(storage,{syncWrites:true});
  // Another device's change arrives in finance; meanwhile this tab saves a new account into the device key mid-run.
  const finance=platformSchema.parse(JSON.parse(storage.getItem(PLATFORM_KEY)!));
  storage.setItem(PLATFORM_KEY,JSON.stringify({...finance,accounts:accounts(edited(ACCOUNT,'From the cloud','2026-09-12T08:00:00.000Z'))}));
  const marker=storage.getItem(FINANCE_HOMES_KEY),fresh=JSON.stringify(accounts(ACCOUNT,SECOND));
  const raw=storage.getItem.bind(storage);let reads=0;
  const racing={...storage,get length(){return storage.length;},key:storage.key.bind(storage),setItem:storage.setItem.bind(storage),removeItem:storage.removeItem.bind(storage),clear:storage.clear.bind(storage),
   getItem:(k:string)=>{if(k===PLATFORM_KEY&&++reads===2)storage.setItem(ACCOUNTS_KEY,fresh);return raw(k);}} as Storage;
  await reconcileFinanceHomesNow(racing,{syncWrites:true});
  expect(storage.getItem(ACCOUNTS_KEY)).toBe(fresh);expect(storage.getItem(FINANCE_HOMES_KEY)).toBe(marker);
  // The next run reconciles both: the cloud's rename and this tab's new account.
  await reconcileFinanceHomesNow(storage,{syncWrites:true});
  expect(JSON.parse(storage.getItem(ACCOUNTS_KEY)!).items.map((a:Account)=>a.name).sort()).toEqual(['From the cloud','Mortgage']);
 });
 void FIXTURE_AT;
});

describe('account sync: finance changed on both devices (mergePrivateData)',()=>{
 const text=(p:Platform)=>JSON.stringify(platformSchema.parse(p));
 const base=()=>reconcileFinanceHomes(v4(),{accounts:accounts(ACCOUNT),dates:dates({'1':{m1:'2026-12-01'}})},emptyFinanceHomesMarker()).platform;
 test('accounts changed on both: merged by item, the same result from either side; no refusal',async()=>{
  const {mergePrivateData}=await import('./cloud-sync');
  const b=base(),local=platformSchema.parse({...b,accounts:accounts(ACCOUNT,SECOND)}),remote=platformSchema.parse({...b,accounts:accounts(edited(ACCOUNT,'Renamed','2026-09-12T08:00:00.000Z'))});
  const one=mergePrivateData({finance:text(b)},{finance:text(local)},{finance:text(remote)}).finance!;
  const other=mergePrivateData({finance:text(b)},{finance:text(remote)},{finance:text(local)}).finance!;
  expect(accountsIn(platformSchema.parse(JSON.parse(one))).map(a=>a.name).sort()).toEqual(['Mortgage','Renamed']);
  expect(accountsIn(platformSchema.parse(JSON.parse(one))).map(a=>a.id).sort()).toEqual(accountsIn(platformSchema.parse(JSON.parse(other))).map(a=>a.id).sort());
 });
 test('a goal changed here and an account there: both kept',async()=>{
  const {mergePrivateData}=await import('./cloud-sync');
  const b=base(),local=platformSchema.parse({...b,goals:b.goals.map(g=>({...g,notes:'Book early'}))}),remote=platformSchema.parse({...b,accounts:accounts(ACCOUNT,SECOND)});
  const merged=platformSchema.parse(JSON.parse(mergePrivateData({finance:text(b)},{finance:text(local)},{finance:text(remote)}).finance!));
  expect(merged.goals[0]!.notes).toBe('Book early');expect(accountsIn(merged)).toHaveLength(2);expect([...datesIn(merged)]).toEqual([['1/m1','2026-12-01']]);
 });
 test('a v4 device and a v5 device: the merge is v5 and keeps the v4 side\'s goal edit',async()=>{
  const {mergePrivateData}=await import('./cloud-sync');
  const b=v4(),local=platformSchema.parse({...b,goals:b.goals.map(g=>({...g,notes:'Edited on the older device'}))}),remote=base();
  const merged=platformSchema.parse(JSON.parse(mergePrivateData({finance:text(b)},{finance:text(local)},{finance:text(remote)}).finance!));
  expect(merged.schemaVersion).toBe(5);expect(merged.goals[0]!.notes).toBe('Edited on the older device');expect(accountsIn(merged)).toEqual([ACCOUNT]);
 });
 test('financial changes on both sides are still refused, exactly as before',async()=>{
  const {mergePrivateData}=await import('./cloud-sync');
  const b=base(),local=platformSchema.parse({...b,goals:b.goals.map(g=>({...g,notes:'Here'}))}),remote=platformSchema.parse({...b,goals:b.goals.map(g=>({...g,notes:'There'}))});
  expect(()=>mergePrivateData({finance:text(b)},{finance:text(local)},{finance:text(remote)})).toThrow('Conflicting financial changes');
 });
});
