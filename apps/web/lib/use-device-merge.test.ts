// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,test} from 'vitest';
import {useDeviceMerge} from '../components/use-device-merge';
import {activateAccount,clearAccountSession,unlockAccount} from './account-session';
import {getAppStorage} from './showcase-storage';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root|undefined;
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;clearAccountSession();localStorage.clear();});
function Probe({ready}:{ready:boolean}){return createElement('p',null,useDeviceMerge(ready)?'settled':'waiting');}
async function mount(ready:boolean){const element=document.createElement('div');root=createRoot(element);await act(async()=>root!.render(createElement(Probe,{ready})));return element;}

test('waits until the module has loaded, then settles once this device has been merged',async()=>{
 const element=await mount(false);expect(element.textContent).toBe('waiting');
 await act(async()=>root!.render(createElement(Probe,{ready:true})));
 await act(async()=>{await Promise.resolve();});
 expect(element.textContent).toBe('settled');
});

test('a module that loaded before the account locked settles without a merge instead of throwing (Session W CI)',async()=>{
 activateAccount('10000000-0000-4000-8000-000000000001');
 // Locked: the storage a merge would use is refused.
 expect(()=>getAppStorage()).toThrow(/locked/);
 const errors:unknown[]=[];const onError=(event:ErrorEvent)=>{errors.push(event.error);event.preventDefault();};window.addEventListener('error',onError);
 try{
  const element=await mount(true);
  await act(async()=>{await Promise.resolve();});
  expect(errors).toEqual([]);
  expect(element.textContent).toBe('settled');
  // The account opens again: the next load merges as usual.
  await act(async()=>unlockAccount());
  await act(async()=>root!.render(createElement(Probe,{ready:false})));
  await act(async()=>root!.render(createElement(Probe,{ready:true})));
  await act(async()=>{await Promise.resolve();});
  expect(element.textContent).toBe('settled');
 }finally{window.removeEventListener('error',onError);}
});
