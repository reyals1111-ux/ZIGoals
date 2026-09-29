import {beforeEach,expect,test,vi} from 'vitest';
import {encryptBackup,decryptBackup} from './backup';
import {LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY,exportLocalSimulation,restoreLocalSimulation} from './local-simulation-backup';
import {summarizeBackupModules} from './backup-preview';
import {applyLocal,initialLedger} from '../local-ledger';
import {emptyPlatform} from '../positions';

// Legacy "Local simulation" Goals (simulated ledger + their saved plans) must survive
// export → encrypted backup → wipe → restore byte for byte, as an optional backup section.
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});
const ledger=()=>{let l=applyLocal(initialLedger(),{kind:'create'},'2026-09-17T00:00:00.000Z');l=applyLocal(l,{kind:'deposit',id:'1',amount:'100000000000000000000'},'2026-09-17T01:00:00.000Z');l=applyLocal(l,{kind:'create'},'2026-09-18T00:00:00.000Z');l=applyLocal(l,{kind:'close',id:'2'},'2026-09-19T00:00:00.000Z');return JSON.stringify(l);};
const plans=()=>JSON.stringify({schemaVersion:1,chainId:'local-simulation',walletAddress:'local-demo-user',goals:{'1':{name:'Kyoto in spring 🌸 "quoted" \\ back',category:'Travel',targetValue:'1200',currency:'ZIG',targetDate:'2027-09-18',startingAmount:'0',monthlyContribution:'100',riskPreference:'Conservative',liquidityPreference:'Anytime',deadlineFlexible:false,notes:'line separator'}}});
function seeded(){const s=memoryStorage();s.setItem(LOCAL_LEDGER_KEY,ledger());s.setItem(LOCAL_PLANS_KEY,plans());return s;}

test('local simulation Goals round-trip byte-identically through an encrypted backup',async()=>{
 const source=seeded(),section=exportLocalSimulation(source)!;expect(section).not.toBeNull();
 const backup=await encryptBackup({finance:JSON.stringify(emptyPlatform()),simulation:section});
 expect(JSON.parse(backup.file).version).toBe(2);expect(backup.file).not.toContain('Kyoto');
 const restored=await decryptBackup(backup.file,backup.recovery);expect(restored.simulation).toBe(section);
 const target=memoryStorage();await restoreLocalSimulation(target,restored.simulation!);
 expect(target.getItem(LOCAL_LEDGER_KEY)).toBe(source.getItem(LOCAL_LEDGER_KEY));expect(target.getItem(LOCAL_PLANS_KEY)).toBe(source.getItem(LOCAL_PLANS_KEY));expect(target.length).toBe(2);
 expect(summarizeBackupModules({simulation:section})).toEqual([{domain:'simulation',label:'Local simulation Goals',version:1,restoredVersion:1,counts:[{label:'Goals',count:2},{label:'Simulation activity',count:4},{label:'Goal plans',count:1}],from:'2026-09-17',through:'2026-09-19'}]);
});
test('a profile without local simulation records keeps the format 1 backup unchanged',async()=>{
 expect(exportLocalSimulation(memoryStorage())).toBeNull();
 const data={finance:JSON.stringify(emptyPlatform())},backup=await encryptBackup(data);
 expect(JSON.parse(backup.file).version).toBe(1);expect(await decryptBackup(backup.file,backup.recovery)).toEqual(data);
});
test('plans alone, or a ledger alone, are carried and restored exactly',async()=>{
 for(const only of [LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY]){const source=seeded();source.removeItem(only===LOCAL_LEDGER_KEY?LOCAL_PLANS_KEY:LOCAL_LEDGER_KEY);
  const target=memoryStorage();target.setItem(only===LOCAL_LEDGER_KEY?LOCAL_PLANS_KEY:LOCAL_LEDGER_KEY,'stale');await restoreLocalSimulation(target,exportLocalSimulation(source)!);
  expect(target.getItem(only)).toBe(source.getItem(only));expect(target.getItem(only===LOCAL_LEDGER_KEY?LOCAL_PLANS_KEY:LOCAL_LEDGER_KEY)).toBeNull();}
});
test('the format version must match the sections it carries',async()=>{
 const simulation=exportLocalSimulation(seeded())!,v2=await encryptBackup({simulation}),v1=await encryptBackup({finance:JSON.stringify(emptyPlatform())});
 await expect(decryptBackup(JSON.stringify({...JSON.parse(v2.file),version:1}),v2.recovery)).rejects.toThrow('Backup format version does not match its sections.');
 await expect(decryptBackup(JSON.stringify({...JSON.parse(v1.file),version:2}),v1.recovery)).rejects.toThrow('Backup format version does not match its sections.');
 await expect(decryptBackup(JSON.stringify({...JSON.parse(v2.file),version:3}),v2.recovery)).rejects.toThrow();
});
test('damaged records refuse the backup and a damaged section restores nothing',async()=>{
 const damaged=seeded();damaged.setItem(LOCAL_LEDGER_KEY,damaged.getItem(LOCAL_LEDGER_KEY)!.replace('"balance":"','"balance":"1'));
 expect(()=>exportLocalSimulation(damaged)).toThrow('Local simulation records are unreadable.');
 const target=seeded(),before=[target.getItem(LOCAL_LEDGER_KEY),target.getItem(LOCAL_PLANS_KEY)];
 const bad=JSON.stringify({schemaVersion:1,kind:'zigoals-local-simulation',ledger:damaged.getItem(LOCAL_LEDGER_KEY),plans:plans()});
 await expect(restoreLocalSimulation(target,bad)).rejects.toThrow();await expect(restoreLocalSimulation(target,JSON.stringify({schemaVersion:2,kind:'zigoals-local-simulation',ledger:null,plans:plans()}))).rejects.toThrow();
 expect([target.getItem(LOCAL_LEDGER_KEY),target.getItem(LOCAL_PLANS_KEY)]).toEqual(before);expect(target.length).toBe(2);
});
test('restoring over different records retains the prior bytes',async()=>{
 const target=memoryStorage();target.setItem(LOCAL_LEDGER_KEY,'{"prior":"ledger bytes"}');
 await restoreLocalSimulation(target,exportLocalSimulation(seeded())!);
 const kept=[...Array(target.length).keys()].map(i=>target.key(i)!).filter(k=>k.startsWith(`${LOCAL_LEDGER_KEY}:recovery:`));
 expect(kept).toHaveLength(1);expect(target.getItem(kept[0]!)).toBe('{"prior":"ledger bytes"}');
});
