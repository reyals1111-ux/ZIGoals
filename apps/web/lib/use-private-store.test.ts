// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement,useEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import * as z from 'zod';

// Durable reads are held open per key so the test controls when each one resolves.
const reads=vi.hoisted(()=>new Map<string,(value:{name:string})=>void>());
vi.mock('./vault/local',()=>({
 isDurableMarker:(raw:string|null)=>raw==='durable',
 readDurableStore:(_storage:Storage,key:string)=>new Promise(resolve=>reads.set(key,resolve)),
 updateDurableStore:vi.fn(),restoreDurableStore:vi.fn(),exportDurableStore:vi.fn(),
}));
const local=await import('./vault/local');
const {usePrivateStore}=await import('../components/use-private-store');
const schema=z.object({name:z.string()}),empty=()=>({name:'empty'});
function Probe({storeKey}:{storeKey:string}){const store=usePrivateStore(storeKey,schema,empty);return createElement('output',null,`${store.loaded}:${store.data.name}`);}
let root:Root,container:HTMLDivElement;
const flush=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();reads.clear();container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});

test('a read still running when the key changes never applies the old key\'s data',async()=>{
 localStorage.setItem('zigoals:store-a','durable');localStorage.setItem('zigoals:store-b','durable');
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:store-a'})));await flush();
 expect(reads.has('zigoals:store-a')).toBe(true);
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:store-b'})));await flush();
 await act(async()=>reads.get('zigoals:store-b')!({name:'B'}));await flush();
 expect(container.textContent).toBe('true:B');
 // The earlier read for A resolves late; it must not replace B.
 await act(async()=>reads.get('zigoals:store-a')!({name:'A'}));await flush();
 expect(container.textContent).toBe('true:B');
});

test('a read still running at unmount is dropped, and a new mount loads fresh data',async()=>{
 localStorage.setItem('zigoals:store-a','durable');
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:store-a'})));await flush();
 const first=reads.get('zigoals:store-a')!;
 await act(async()=>root.unmount());
 root=createRoot(container);
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:store-a'})));await flush();
 await act(async()=>first({name:'stale'}));await flush();
 expect(container.textContent).toBe('false:empty');
 await act(async()=>reads.get('zigoals:store-a')!({name:'fresh'}));await flush();
 expect(container.textContent).toBe('true:fresh');
});

test('plain local records load without a durable read',async()=>{
 localStorage.setItem('zigoals:settings:v1',JSON.stringify({name:'plain'}));
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:settings:v1'})));await flush();
 expect(container.textContent).toBe('true:plain');
});

test('a backup cannot be imported over a store whose first read has not finished',async()=>{
 localStorage.setItem('zigoals:store-a','durable');
 const held:{store?:ReturnType<typeof usePrivateStore<{name:string}>>}={};
 function Holder(){const store=usePrivateStore('zigoals:store-a',schema,empty);useEffect(()=>{held.store=store;});return null;}
 await act(async()=>root.render(createElement(Holder)));await flush();
 await expect(held.store!.importData(JSON.stringify({name:'backup'}))).rejects.toThrow('still loading');
 expect(local.restoreDurableStore).not.toHaveBeenCalled();
});

// Session AK G4 (journey 1 on the phone): a change saved while the page is being left (a check-in that already shows,
// saved from pagehide) is written at once; the lock's grant would come in a task the leaving page never runs.
test('while the page is being left, a plain record\'s update is written at once; after pageshow it waits for the lock again',async()=>{
 const key='zigoals:settings:v1';
 localStorage.setItem(key,JSON.stringify({name:'before'}));
 const request=vi.fn(()=>new Promise(()=>undefined)),browser=navigator;
 vi.stubGlobal('navigator',{...browser,locks:{request}});
 const held:{store?:ReturnType<typeof usePrivateStore<{name:string}>>}={};
 function Holder(){const store=usePrivateStore(key,schema,empty);useEffect(()=>{held.store=store;});return null;}
 await act(async()=>root.render(createElement(Holder)));await flush();
 expect(held.store!.loaded).toBe(true);
 // In use: the update waits for the cross-tab lock.
 void held.store!.update(()=>({name:'in use'}));
 expect(JSON.parse(localStorage.getItem(key)!).name).toBe('before');
 expect(request).toHaveBeenCalledTimes(1);
 // Being left: written in the same task, before anything is awaited.
 window.dispatchEvent(new PageTransitionEvent('pagehide'));
 const saving=held.store!.update(()=>({name:'on the way out'}));
 expect(JSON.parse(localStorage.getItem(key)!).name).toBe('on the way out');
 await act(async()=>{await saving;});
 expect(request).toHaveBeenCalledTimes(1);
 // Back from the back/forward cache: the lock again.
 window.dispatchEvent(new PageTransitionEvent('pageshow'));
 void held.store!.update(()=>({name:'back'}));
 expect(JSON.parse(localStorage.getItem(key)!).name).toBe('on the way out');
 expect(request).toHaveBeenCalledTimes(2);
 vi.stubGlobal('navigator',browser);
});
