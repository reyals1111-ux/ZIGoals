import 'fake-indexeddb/auto';
import {beforeEach,expect,test,vi} from 'vitest';
import {VaultDatabase} from './database';
import {enableDurableStore,exportDurableStore,restoreDurableStore} from './local';
import {importPrivateStore} from '../private-storage';
import {encryptBackup,decryptBackup} from './backup';
import {modules} from './account-data';
import type {Domain} from './cloud-sync';
import {emptyPlatform,platformSchema} from '../positions';
import {appendFinancialEvidence,makeManualFx,voidFinancialEvent,type FinancialEvent} from '../financial-events';
import {createHabit,emptyHabitData,habitDataSchema,HABITS_KEY} from '../habits';
import {startHabitTimer,pauseHabitTimer,commitHabitTimer} from '../habit-actions';
import {createEmptyHealth,saveWeight,saveActivity,healthSchema} from '../health';
import {addCounter,changeCount} from '../health-counters';
import {saveMeasurement} from '../body-measurements';

// Regression lock for the record types the main round-trip fixture does not contain:
// exercise counters, timed body measurements, Habit timers and their receipts, and
// financial evidence with a manual FX conversion and a void. Export -> encrypted backup ->
// fresh profile -> import must give back exactly the same data, in both storage modes.
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});
const at='2026-09-23T10:00:00.000Z',money=(value:string,currency='USD')=>({value,decimals:2,currency});

function health(){
 let h=createEmptyHealth();
 h=addCounter(h,'Plank seconds','core','health_counter-plank');
 for(const [day,delta] of [['2026-09-21',30],['2026-09-22',45],['2026-10-25',60]] as const)h=changeCount(h,'health_counter-plank',day,delta);
 h=changeCount(h,'health_counter-pushups',"2026-09-22",12);
 h=saveMeasurement(h,{id:'health_measure-waist',kind:'waist',quantityMilli:81500,unit:'cm',observedAt:'2026-10-25T02:30:00+01:00',timezone:'Europe/Brussels',sourceLabel:'Fictional tape'},at);
 h=saveMeasurement(h,{id:'health_measure-weight',kind:'weight',quantityMilli:160400,unit:'lb',observedAt:'2026-11-01T01:30:00-05:00',timezone:'America/New_York',sourceLabel:'Fictional scale'},at);
 h=saveMeasurement(h,{id:'health_measure-weight',kind:'weight',quantityMilli:160200,unit:'lb',observedAt:'2026-11-01T01:30:00-05:00',timezone:'America/New_York',sourceLabel:'Fictional scale'},'2026-11-01T08:00:00.000Z');
 h=saveWeight(h,{id:'health_weight-leap',date:'2028-02-29',grams:72500},at);
 h=saveActivity(h,{id:'health_walk-yearend',date:'2026-12-31',name:'New Year’s Eve walk 🎆',steps:4200,minutes:40},at);
 return healthSchema.parse(h);
}
function habits(){
 const id='00000000-0000-4000-8000-00000000c10c',start=new Date('2026-09-20T10:00:00Z');
 let d=createHabit(emptyHabitData(),{title:'Fictional reading ⏱',category:'Learning',description:'',notes:'',schedule:{kind:'daily'},measurement:{kind:'duration',unit:'minutes'},target:30},start,id);
 d=startHabitTimer(d,id,'5b7c4d2e-0000-4000-8000-000000000001',start,'Europe/Brussels');
 d=commitHabitTimer(pauseHabitTimer(d,id,'5b7c4d2e-0000-4000-8000-000000000001',new Date(+start+754_321)),id,'5b7c4d2e-0000-4000-8000-000000000001',new Date(+start+754_321));
 d=startHabitTimer(d,id,'5b7c4d2e-0000-4000-8000-000000000002',new Date(+start+3_600_000),'Europe/Brussels'); // left running
 return habitDataSchema.parse({...d,timeZone:'Europe/Brussels'});
}
function finance(){
 const portfolio={id:'statement',name:'Fictional statement «EUR»',currency:'USD',createdAt:at};
 const common=(id:string,occurredAt:string)=>({id,portfolioId:'statement',occurredAt,recordedAt:at,source:'MANUAL' as const,sourceLabel:'Fictional complete statement',note:''});
 let s=appendFinancialEvidence(emptyPlatform(),{portfolio});
 for(const event of [{...common('start','2026-01-01T00:00:00Z'),kind:'valuation',amount:money('10000'),role:'boundary'},{...common('fee','2026-02-01T00:00:00Z'),kind:'fee',amount:money('150')},{...common('end','2026-03-01T00:00:00Z'),kind:'valuation',amount:money('11000'),role:'boundary'}] as FinancialEvent[])s=appendFinancialEvidence(s,{event});
 s=appendFinancialEvidence(s,{fx:makeManualFx({id:'fx',occurredAt:'2026-02-01T00:00:00Z',recordedAt:at,sourceLabel:'Fictional bank receipt',original:money('10000','EUR'),quoteCurrency:'USD',quoteDecimals:2,rate:{value:'112345',decimals:5}})});
 s=voidFinancialEvent(s,'fee','fee-void',at,'Entered twice');
 return platformSchema.parse(s);
}

async function roundTrip(domain:Domain,raw:string,mode:'durable'|'legacy'){
 const {key,schema,empty}=modules[domain],source=memoryStorage(),sourceDb=new VaultDatabase(crypto.randomUUID());source.setItem(key,raw);
 let exported=raw;if(mode==='durable'){await enableDurableStore(source,key,schema,empty,sourceDb);exported=await exportDurableStore(source,key,sourceDb);}
 const backup=await encryptBackup({[domain]:exported}),restored=(await decryptBackup(backup.file,backup.recovery))[domain]!;
 const target=memoryStorage(),targetDb=new VaultDatabase(crypto.randomUUID());
 if(mode==='durable'){await enableDurableStore(target,key,schema,empty,targetDb);await restoreDurableStore(target,key,schema,restored,targetDb);return exportDurableStore(target,key,targetDb);}
 await importPrivateStore(target,key,schema,restored);return target.getItem(key)!;
}
test.each([
 ['health','exercise counters, timed measurements with a correction, leap-day weight and year-end activity',()=>JSON.stringify(health())],
 ['habits','a committed timer receipt, a running timer and a saved journal time zone',()=>JSON.stringify(habits())],
 ['finance','financial evidence with a manual FX conversion and a void',()=>JSON.stringify(finance())],
] as const)('%s: %s round-trip exactly, durable and legacy',async(domain,_what,make)=>{
 const raw=make(),expected=modules[domain].schema.parse(JSON.parse(raw));
 for(const mode of ['durable','legacy'] as const)expect(JSON.parse(await roundTrip(domain,raw,mode)),`${domain} ${mode}`).toEqual(expected);
},60000);
test('the fixture really contains the records it claims',()=>{
 const h=health(),hb=habits().habits[0]!,f=finance();
 expect(h.exercise?.days.length).toBe(4);expect(h.measurements).toHaveLength(2);expect(h.measurements?.find(m=>m.id==='health_measure-weight')?.corrections).toHaveLength(1);
 expect(hb.timerReceipts).toHaveLength(1);expect(hb.timer?.state).toBe('running');expect(hb.entries[0]!.count).toBeCloseTo(754.321/60,9);
 expect(f.financialEvents?.some(e=>e.kind==='void')).toBe(true);expect(f.manualFx).toHaveLength(1);
});
test('a version 1 Habits backup restores as its version 2 migration, in a fresh profile',async()=>{
 const v1=JSON.stringify({schemaVersion:1,kind:'zigoals-habits',habits:[]}),target=memoryStorage();
 await importPrivateStore(target,HABITS_KEY,habitDataSchema,v1);
 expect(JSON.parse(target.getItem(HABITS_KEY)!)).toEqual(habitDataSchema.parse(JSON.parse(v1)));
 expect(JSON.parse(target.getItem(HABITS_KEY)!).schemaVersion).toBe(2);
});
