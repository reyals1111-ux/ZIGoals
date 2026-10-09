import 'fake-indexeddb/auto';
import {test,expect,vi} from 'vitest';
import {readFile,mkdtemp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createHabit,emptyHabitData,habitDataSchema,HABITS_KEY} from '../../apps/web/lib/habits';
import {enableDurableStore,exportDurableStore} from '../../apps/web/lib/vault/local';
import {VaultDatabase} from '../../apps/web/lib/vault/database';
const {build}=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url))('esbuild');
const fixture=new URL('./fixtures/preparation-client/',import.meta.url).pathname,bundle=join(await mkdtemp(join(tmpdir(),'run11-old-client-')),'client.mjs');
await build({stdin:{contents:`export * as oldPrivate from './apps/web/lib/private-storage';export * as oldDurable from './apps/web/lib/vault/local';export {habitDataSchema as oldSchema,emptyHabitData as oldEmpty} from './apps/web/lib/habits';`,resolveDir:fixture,loader:'ts'},outfile:bundle,bundle:true,platform:'node',format:'esm',alias:{'@zigoals/shared-types':fixture+'packages/shared-types/src/index.ts'},nodePaths:[new URL('../../apps/web/node_modules',import.meta.url).pathname]});
const {oldPrivate,oldDurable,oldSchema,oldEmpty}=await import(pathToFileURL(bundle).href);
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size;}};}
const current=()=>createHabit({...emptyHabitData(),timeZone:'Europe/Brussels'},{title:'Historical client protected pending work',category:'Personal',description:'',notes:'Original fictional journal',schedule:{kind:'daily'},target:1},new Date('2026-09-23T12:00:00Z'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
test('frozen preparation client bytes match their source receipt',async()=>{const base=new URL('./fixtures/preparation-client/',import.meta.url),receipt=JSON.parse(await readFile(new URL('SOURCE.json',base),'utf8'));expect(receipt.source).toBe('3ca2f42303724ef1317aded6982c9fdd6fd8775d');for(const [path,hash]of Object.entries(receipt.files))expect(createHash('sha256').update(await readFile(new URL(path,base))).digest('hex'),path).toBe(hash);});
test('historical normal client refuses newer Habit fields and preserves local and durable pending work for the current client',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_key,work)=>work()}});const s=storage(),data=current(),raw=JSON.stringify(data),db=new VaultDatabase(crypto.randomUUID());
 try{s.setItem(HABITS_KEY,raw);expect(()=>oldPrivate.readPrivateStore(s,HABITS_KEY,oldSchema,oldEmpty)).toThrow('unsupported version');await expect(oldPrivate.updatePrivateStore(s,HABITS_KEY,oldSchema,oldEmpty,()=>oldEmpty())).rejects.toThrow('unsupported version');expect(s.getItem(HABITS_KEY)).toBe(raw);
 // Session Y B5 (ADR-018 Y23): a 'local' space keeps no outbox, so the pending work to protect is an account space's.
 const account='account:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';await db.commit(account,HABITS_KEY,0,data,crypto.randomUUID(),raw);const pending=await db.pending(account);expect(pending).toHaveLength(1);
 await enableDurableStore(s,HABITS_KEY,habitDataSchema,emptyHabitData,db);expect(await db.pending('local')).toEqual([]);await expect(oldDurable.readDurableStore(s,HABITS_KEY,oldSchema,db)).rejects.toThrow();await expect(oldDurable.updateDurableStore(s,HABITS_KEY,oldSchema,()=>oldEmpty(),db)).rejects.toThrow();expect(await oldDurable.exportDurableStore(s,HABITS_KEY,db)).toBe(raw);expect(await db.pending(account)).toEqual(pending);expect(await db.pending('local')).toEqual([]);expect(await db.recovery('local',HABITS_KEY)).toEqual([raw]);expect(JSON.parse(await exportDurableStore(s,HABITS_KEY,db))).toEqual(data);
 }finally{db.close();vi.unstubAllGlobals();}
});
