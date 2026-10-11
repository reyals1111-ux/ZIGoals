import {expect,test} from 'vitest';
import {NON_PERSONAL_KEYS,ONBOARDING_KEY,markOnboardingSeen,noExistingData,onboardingSeen} from './onboarding';
import {SYNC_OFFER_KEY} from './sync-offer/offer';

function memory(entries:Record<string,string>={}){
 const map=new Map(Object.entries(entries));
 return {get length(){return map.size;},key:(i:number)=>[...map.keys()][i]??null,getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);},clear:()=>map.clear(),map};
}
const throwing={get length():number{throw Error('blocked');},key:()=>{throw Error('blocked');},getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};

test('the flag key follows the versioned zigoals naming',()=>{expect(ONBOARDING_KEY).toBe('zigoals:onboarding:v1');});

test('only a missing flag means not seen; anything stored, readable or not, counts as seen',()=>{
 expect(onboardingSeen(memory())).toBe(false);
 expect(onboardingSeen(memory({[ONBOARDING_KEY]:'{"version":1,"seen":true}'}))).toBe(true);
 for(const raw of ['','{','null','{"version":2}','"seen"','[]'])expect(onboardingSeen(memory({[ONBOARDING_KEY]:raw})),raw).toBe(true);
});

test('blocked or missing storage fails closed: the welcome is treated as seen and the device as not new',()=>{
 expect(onboardingSeen(throwing)).toBe(true);expect(onboardingSeen(null)).toBe(true);
 expect(noExistingData(throwing)).toBe(false);expect(noExistingData(null)).toBe(false);
 expect(markOnboardingSeen(throwing)).toBe(false);expect(markOnboardingSeen(null)).toBe(false);
});

test('marking writes exactly the versioned flag and nothing else',()=>{
 const s=memory();expect(markOnboardingSeen(s)).toBe(true);
 expect([...s.map.entries()]).toEqual([[ONBOARDING_KEY,'{"version":1,"seen":true}']]);
 expect(onboardingSeen(s)).toBe(true);
});

test('a device is new only when every ZIGoals key it holds is non-personal',()=>{
 expect(noExistingData(memory())).toBe(true);
 expect(noExistingData(memory(Object.fromEntries(NON_PERSONAL_KEYS.map(k=>[k,'x']))))).toBe(true);
 expect(noExistingData(memory({'other-site':'x'}))).toBe(true);
 for(const key of ['zigoals:platform:v1','zigoals:habits:v1','zigoals:health:v1','zigoals:local-ledger:v1','zigoals:metadata:v1:zigchain-local:owner','zigoals:account:v1:abc:zigoals:platform:v1','zigoals:unknown-future-key'])
  expect(noExistingData(memory({[key]:'{}'})),key).toBe(false);
});
// Session X Part 10 (Session L follow-up): the sync offer's "Not now" flag names no record, so alone it leaves a device new.
test('the sync offer\'s "Not now" alone does not count as existing data',()=>{
 expect(NON_PERSONAL_KEYS).toContain(SYNC_OFFER_KEY);
 const only={length:1,key:(i:number)=>i===0?SYNC_OFFER_KEY:null};
 expect(noExistingData(only)).toBe(true);
});
