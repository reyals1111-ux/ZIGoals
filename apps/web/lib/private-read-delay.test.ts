// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement,useEffect} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import * as z from 'zod';

// Durable reads are held open so each test decides whether, and when, they settle.
const vault=vi.hoisted(()=>({reads:[] as {key:string;resolve:(value:{name:string})=>void}[],retryOpen:()=>{},updateDurableStore:()=>{},restoreDurableStore:()=>{}}));
vi.mock('./vault/local',()=>({
 isDurableMarker:(raw:string|null)=>raw==='durable',
 readDurableStore:(_storage:Storage,key:string)=>new Promise(resolve=>vault.reads.push({key,resolve})),
 updateDurableStore:vi.fn(),restoreDurableStore:vi.fn(),exportDurableStore:vi.fn(),
 localDatabase:{retryOpen:vi.fn()},
}));
const local=await import('./vault/local');
const {usePrivateStore}=await import('../components/use-private-store');
const {PRIVATE_READ_SLOW_MS,retryPrivateReads,usePrivateReadDelay}=await import('../components/private-read-delay');
const schema=z.object({name:z.string()}),empty=()=>({name:'empty'});
const held:{store?:ReturnType<typeof usePrivateStore<{name:string}>>}={};
function Probe({storeKey}:{storeKey:string}){const store=usePrivateStore(storeKey,schema,empty);useEffect(()=>{held.store=store;});const slow=usePrivateReadDelay();return createElement('output',null,`${store.loaded}:${store.data.name}:${slow?'slow':'-'}`);}
let root:Root,container:HTMLDivElement;
const settle=()=>act(async()=>{await vi.advanceTimersByTimeAsync(0);});
beforeEach(()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date']});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();vault.reads.length=0;vi.mocked(local.localDatabase.retryOpen).mockClear();vi.mocked(local.updateDurableStore).mockClear();vi.mocked(local.restoreDurableStore).mockClear();container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.useRealTimers();});

test('a first read that never settles is reported after the delay, and nothing can be written meanwhile',async()=>{
 localStorage.setItem('zigoals:settings:v1','durable');
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:settings:v1'})));await settle();
 expect(vault.reads).toHaveLength(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(PRIVATE_READ_SLOW_MS-1);});
 expect(container.textContent).toBe('false:empty:-');
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
 // Still no data: an unresolved store is never shown as empty, and it is never marked loaded.
 expect(container.textContent).toBe('false:empty:slow');
 await expect(held.store!.update(()=>({name:'overwrite'}))).rejects.toThrow('still loading');
 await expect(held.store!.importData(JSON.stringify({name:'overwrite'}))).rejects.toThrow('still loading');
 expect(local.updateDurableStore).not.toHaveBeenCalled();expect(local.restoreDurableStore).not.toHaveBeenCalled();
 expect(localStorage.getItem('zigoals:settings:v1')).toBe('durable');
 // It resolves late: the real data renders and the delay notice clears without a reload.
 await act(async()=>vault.reads[0]!.resolve({name:'real'}));await settle();
 expect(container.textContent).toBe('true:real:-');
});

test('Retry reopens storage and reads again; the first read keeps its original start time',async()=>{
 localStorage.setItem('zigoals:health:v1','durable');
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:health:v1'})));await settle();
 await act(async()=>{await vi.advanceTimersByTimeAsync(PRIVATE_READ_SLOW_MS);});
 expect(container.textContent).toBe('false:empty:slow');
 await act(async()=>retryPrivateReads());await settle();
 expect(local.localDatabase.retryOpen).toHaveBeenCalledTimes(1);expect(vault.reads).toHaveLength(2);
 // Retrying does not restart the clock, so the notice stays up while the new read is pending.
 expect(container.textContent).toBe('false:empty:slow');
 // The superseded read settles after the retry: it is ignored.
 await act(async()=>vault.reads[0]!.resolve({name:'stale'}));await settle();
 expect(container.textContent).toBe('false:empty:slow');
 await act(async()=>vault.reads[1]!.resolve({name:'fresh'}));await settle();
 expect(container.textContent).toBe('true:fresh:-');
 // A loaded store ignores later Retry requests.
 await act(async()=>retryPrivateReads());await settle();expect(vault.reads).toHaveLength(2);
});

test('a read that settles before the delay never shows the notice, and unmounting clears a pending one',async()=>{
 localStorage.setItem('zigoals:habits:v1','durable');
 await act(async()=>root.render(createElement(Probe,{storeKey:'zigoals:habits:v1'})));await settle();
 await act(async()=>{await vi.advanceTimersByTimeAsync(PRIVATE_READ_SLOW_MS-1000);});
 await act(async()=>vault.reads[0]!.resolve({name:'quick'}));await settle();
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
 expect(container.textContent).toBe('true:quick:-');
 await act(async()=>root.unmount());root=createRoot(container);
 localStorage.setItem('zigoals:platform:v1','durable');
 function Other(){const slow=usePrivateReadDelay();return createElement('output',null,slow?'slow':'-');}
 await act(async()=>root.render(createElement('div',null,createElement(Probe,{storeKey:'zigoals:platform:v1'}),createElement(Other))));await settle();
 await act(async()=>{await vi.advanceTimersByTimeAsync(PRIVATE_READ_SLOW_MS);});
 expect(container.textContent).toBe('false:empty:slowslow');
 await act(async()=>root.render(createElement('div',null,createElement(Other))));await settle();
 expect(container.textContent).toBe('-');
});
