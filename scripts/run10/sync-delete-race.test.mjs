import {expect,test} from 'vitest';
import {PrivateVault} from '../../workers/private-sync/worker.mjs';

test('an overlapping read is one snapshot and deletion fences every later read',async()=>{
 const hash='a'.repeat(64),data=new Map([
  [`session:${hash}`,{active:true}],['revision',1],['manifest',{vault:'fictional'}],['record:first',{id:'first',deleted:false}],
 ]);
 let releaseList,listed;const listStarted=new Promise(resolve=>{listed=resolve;}),listPause=new Promise(resolve=>{releaseList=resolve;});let pause=true,tail=Promise.resolve();
 const store={
  async get(key){return data.get(key);},
  async list(options={}){if(options.prefix==='record:'&&pause){pause=false;listed();await listPause;}return new Map([...data].filter(([key])=>(!options.prefix||key.startsWith(options.prefix))&&(!options.startAfter||key>options.startAfter)).slice(0,options.limit??Infinity));},
  async delete(keys){for(const key of keys)data.delete(key);},
  async put(key,value){data.set(key,value);},
  async transaction(fn){const prior=tail;let release;tail=new Promise(resolve=>{release=resolve;});await prior;try{return await fn(store);}finally{release();}},
 };
 const vault=new PrivateVault({storage:store}),headers={'x-zigoals-token-hash':hash};
 const read=vault.fetch(new Request('https://sync.test/v1/vault',{headers}));await listStarted;
 let deleted=false;const erase=vault.fetch(new Request('https://sync.test/v1/account',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})})).then(result=>{deleted=true;return result;});
 await Promise.resolve();expect(deleted).toBe(false);releaseList();
 const earlier=await read;expect(earlier.status).toBe(200);expect(await earlier.json()).toMatchObject({revision:1,records:[{id:'first'}]});
 expect((await erase).status).toBe(200);expect([...data.keys()]).toEqual(['account-deleted']);
 expect((await vault.fetch(new Request('https://sync.test/v1/vault',{headers}))).status).toBe(410);
});
