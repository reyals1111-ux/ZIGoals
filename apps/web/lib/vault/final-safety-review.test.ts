import 'fake-indexeddb/auto';
import {expect,test,vi} from 'vitest';
import {emptyPlatform,platformSchema,PLATFORM_KEY} from '../positions';
import {appendFinancialEvidence,voidFinancialEvent} from '../financial-events';
import {applyData,validateData} from './account-data';
import {enableDurableStore,exportDurableStore,localDatabase} from './local';
import {synchronize,type CloudOperation,type SyncState,type PrivateData} from './cloud-sync';
import {createVault} from './crypto';

function financialFixture(){
 const portfolio={id:'fictional-review',name:'Fictional statement',currency:'USD',createdAt:'2026-09-23T10:00:00Z'};
 return appendFinancialEvidence(appendFinancialEvidence(emptyPlatform(),{portfolio}),{event:{id:'accepted-income',portfolioId:portfolio.id,kind:'income',amount:{value:'10000',decimals:2,currency:'USD'},occurredAt:'2026-01-01T00:00:00Z',recordedAt:portfolio.createdAt,source:'MANUAL',sourceLabel:'Fictional statement',note:''}});
}
const wrap=(data:unknown):PrivateData=>({finance:JSON.stringify(data)});

test('account sync refuses rewriting accepted immutable financial evidence under an existing ID',async()=>{
 const values=new Map<string,string>();
 const storage={get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);},clear:()=>values.clear()} as Storage;
 vi.stubGlobal('navigator',{locks:{request:async(_key:string,fn:()=>unknown)=>fn()}});
 vi.stubGlobal('window',new EventTarget());
 vi.stubGlobal('BroadcastChannel',undefined);
 try{
  const before=financialFixture();
  storage.setItem(PLATFORM_KEY,JSON.stringify(before));
  await enableDurableStore(storage,PLATFORM_KEY,platformSchema,emptyPlatform);
  const captured=await exportDurableStore(storage,PLATFORM_KEY);
  const after=platformSchema.parse({...before,financialEvents:before.financialEvents!.map(e=>'amount' in e?{...e,amount:{...e.amount,value:'90000'}}:e)});
  await expect(applyData(storage,{finance:captured},{finance:JSON.stringify(after)},()=>{})).rejects.toThrow(/immutable|append-only|evidence/i);
  expect((await localDatabase.read('local',PLATFORM_KEY))?.data).toEqual(before);
 }finally{localDatabase.close();vi.unstubAllGlobals();}
});

test('sync evidence validation rejects removal and mutation but admits append-only corrections',()=>{
 const before=financialFixture(),changed=platformSchema.parse({...before,financialEvents:before.financialEvents!.map(e=>'amount' in e?{...e,amount:{...e.amount,value:'90000'}}:e)});
 const removed=platformSchema.parse({...before,financialEvents:[]});
 // The second parameter is the accepted prior snapshot, not an explicit backup-replace request.
 expect(()=>validateData(wrap(changed),wrap(before))).toThrow(/immutable|append-only|evidence/i);
 expect(()=>validateData(wrap(removed),wrap(before))).toThrow(/immutable|append-only|evidence/i);
 const corrected=voidFinancialEvent(before,'accepted-income','income-void','2026-09-23T11:00:00Z','Fictional correction');
 expect(()=>validateData(wrap(corrected),wrap(before))).not.toThrow();
 expect(corrected.financialEvents![0]).toEqual(before.financialEvents![0]);
 // Schema validation remains usable for explicit replace/import without a sync prior.
 expect(()=>validateData(wrap(changed))).not.toThrow();
});

test('a locally replaced historical event cannot publish over previously acknowledged cloud history',async()=>{
 const vault=await createVault(),rows=new Map<string,CloudOperation['changes'][number]>();let revision=0,writes=0;
 let state:SyncState={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};
 const journal={read:async()=>structuredClone(state),write:async(value:SyncState)=>{state=structuredClone(value);}};
 const transport={read:async()=>({protocol:1,revision,manifest:vault.manifest,records:[...rows.values()],cursor:null}),write:async(operation:CloudOperation)=>{expect(operation.base).toBe(revision);for(const row of operation.changes)rows.set(row.id,row);writes++;return {revision:++revision};}};
 const before=financialFixture(),first=await synchronize(transport,journal,vault.key,vault.manifest,wrap(before),validateData,()=>{});await first.commit();
 const acceptedWrites=writes,acceptedState=structuredClone(state),changed=platformSchema.parse({...before,financialEvents:before.financialEvents!.map(e=>'amount' in e?{...e,amount:{...e.amount,value:'90000'}}:e)});
 await expect(synchronize(transport,journal,vault.key,vault.manifest,wrap(changed),validateData,()=>{})).rejects.toThrow(/immutable|append-only|evidence/i);
 expect(writes).toBe(acceptedWrites);expect(state).toEqual(acceptedState);
});
