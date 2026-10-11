import {beforeEach,expect,test,vi} from 'vitest';
import {LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY,exportLocalSimulation,restoreLocalSimulation} from './local-simulation-backup';
import {applyLocal,initialLedger} from '../local-ledger';

// A legacy simulation restore replaces two keys (the simulated ledger and its plans).
// If the browser refuses either write, neither key may change and no recovery copy may be left behind.
function storage(refuse?:(key:string)=>boolean){const m=new Map<string,string>();return {map:m,get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{if(refuse?.(k))throw new DOMException('The quota has been exceeded.','QuotaExceededError');m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()};}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});
const plans=(name:string)=>JSON.stringify({schemaVersion:1,chainId:'local-simulation',walletAddress:'local-demo-user',goals:{'1':{name,category:'Travel',targetValue:'1200',currency:'ZIG',targetDate:'2027-09-15',startingAmount:'0',monthlyContribution:'50',riskPreference:'Conservative',liquidityPreference:'Anytime',deadlineFlexible:false,notes:''}}});
function backupSection(){
 const source=storage();let l=applyLocal(initialLedger(),{kind:'create'},'2026-09-17T00:00:00.000Z');l=applyLocal(l,{kind:'deposit',id:'1',amount:'100000000000000000000'},'2026-09-17T01:00:00.000Z');
 source.setItem(LOCAL_LEDGER_KEY,JSON.stringify(l));source.setItem(LOCAL_PLANS_KEY,plans('Backed-up trip'));return exportLocalSimulation(source as Storage)!.section;
}
function current(refuse?:(key:string)=>boolean){const s=storage(refuse);s.map.set(LOCAL_LEDGER_KEY,JSON.stringify(initialLedger()));s.map.set(LOCAL_PLANS_KEY,plans('Current trip'));return s;}

test.each([['the plans',LOCAL_PLANS_KEY],['the ledger',LOCAL_LEDGER_KEY]])('when writing %s is refused, both keys keep their bytes and no recovery copy is left',async(_label,refused)=>{
 const s=current(key=>key===refused),before=new Map(s.map);
 await expect(restoreLocalSimulation(s as Storage,backupSection())).rejects.toThrow();
 expect(new Map(s.map)).toEqual(before);
});
test('when a recovery copy cannot be written, nothing changes',async()=>{
 const s=current(key=>key.includes(':recovery:')),before=new Map(s.map);
 await expect(restoreLocalSimulation(s as Storage,backupSection())).rejects.toThrow();
 expect(new Map(s.map)).toEqual(before);
});
test('a successful restore still replaces both keys and keeps one recovery copy per changed key',async()=>{
 const s=current(),section=JSON.parse(backupSection());
 await restoreLocalSimulation(s as Storage,JSON.stringify(section));
 expect(s.getItem(LOCAL_LEDGER_KEY)).toBe(section.ledger);expect(s.getItem(LOCAL_PLANS_KEY)).toBe(section.plans);
 expect([...s.map.keys()].filter(k=>k.includes(':recovery:'))).toHaveLength(2);
});
