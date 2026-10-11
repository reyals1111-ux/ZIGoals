// @vitest-environment jsdom
import {afterEach,expect,test,vi} from 'vitest';
import {announceHealthAsk,onHealthAsk} from './health-ask';

// Session Z-Cloud Part 5 (Y38, ADR-019 C36): a Health restore's ask reaches the account's other tabs, and nothing stays.
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});

test('another tab hears the ask on the BroadcastChannel; nothing is written to storage',async()=>{
 const heard:string[]=[],stop=onHealthAsk(account=>heard.push(account));
 const writes=vi.spyOn(Storage.prototype,'setItem');
 try{announceHealthAsk(A.toUpperCase());await settle();}finally{stop();}
 expect(heard).toEqual([A]);expect(writes).not.toHaveBeenCalled();expect(localStorage.length).toBe(0);
 writes.mockRestore();
});
test('without BroadcastChannel, a storage event carries it, and the key is gone at once',async()=>{
 vi.stubGlobal('BroadcastChannel',undefined);
 const heard:string[]=[],stop=onHealthAsk(account=>heard.push(account));
 try{
  announceHealthAsk(A);expect(localStorage.getItem('zigoals:health-ask-signal')).toBeNull();
  // The event other tabs receive (a tab never receives its own storage events).
  window.dispatchEvent(new StorageEvent('storage',{key:'zigoals:health-ask-signal',newValue:JSON.stringify({account:A,at:Date.now()})}));
  window.dispatchEvent(new StorageEvent('storage',{key:'zigoals:health-ask-signal',newValue:'{"account":"not an id","at":1}'}));
  window.dispatchEvent(new StorageEvent('storage',{key:'zigoals:other',newValue:JSON.stringify({account:A,at:1})}));
 }finally{stop();}
 expect(heard).toEqual([A]);
});
test('after unsubscribing, nothing is heard',async()=>{
 const heard:string[]=[];onHealthAsk(account=>heard.push(account))();
 announceHealthAsk(A);await settle();expect(heard).toEqual([]);
});
