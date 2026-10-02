// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {AccountDeletion} from '../components/account-deletion';

/**
 * Session M, Part B3 (owner decision M2): deleting cloud records needs no download. The typed confirmation alone enables
 * "Confirm cloud deletion"; "Download a copy first" stays one optional step away with today's controls. The wording says
 * plainly that after deletion ZIGoals cannot open this account's cloud records again, on any device.
 */
let root:Root,element:HTMLDivElement;
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const button=(name:string)=>[...element.querySelectorAll('button')].find(b=>b.textContent===name);
async function type(input:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
const confirmation=()=>[...element.querySelectorAll('label')].find(label=>label.textContent?.startsWith('Deletion confirmation'))!.querySelector('input')!;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);element=document.createElement('div');document.body.append(element);root=createRoot(element);});
afterEach(async()=>{await act(async()=>root.unmount());element.remove();vi.unstubAllGlobals();});

test('the typed confirmation alone enables deletion; no download is needed',async()=>{
 const erase=vi.fn(async()=>({deleted:true}));
 await act(async()=>root.render(createElement(AccountDeletion,{account:A,opened:true,busy:false,erase})));
 const confirm=button('Confirm cloud deletion')!;expect(confirm.disabled).toBe(true);
 await type(confirmation(),'DELETE');expect(confirm.disabled).toBe(true);
 await type(confirmation(),'DELETE CLOUD DATA');expect(confirm.disabled).toBe(false);
 await act(async()=>confirm.click());expect(erase).toHaveBeenCalledWith(false);
 expect(element.querySelector('[role=status]')!.textContent).toBe('Cloud vault deleted and stale access blocked. Provider identity and local copies are retained.');
});
test('deleting the identity too needs its own phrase, still without a download',async()=>{
 const erase=vi.fn(async()=>({deleted:true,providerDeleted:true}));
 await act(async()=>root.render(createElement(AccountDeletion,{account:A,opened:true,busy:false,erase})));
 const identity=[...element.querySelectorAll('label')].find(label=>label.textContent==='Also delete my email provider identity.')!.querySelector('input')!;
 await act(async()=>identity.click());
 await type(confirmation(),'DELETE CLOUD DATA');expect(button('Confirm cloud deletion')!.disabled).toBe(true);
 await type(confirmation(),'DELETE ACCOUNT');expect(button('Confirm cloud deletion')!.disabled).toBe(false);
 await act(async()=>button('Confirm cloud deletion')!.click());expect(erase).toHaveBeenCalledWith(true);
});
test('a copy first stays available as an option, and the wording says what deletion means',async()=>{
 await act(async()=>root.render(createElement(AccountDeletion,{account:A,opened:true,busy:false,erase:async()=>null})));
 expect([...element.querySelectorAll('h3')].map(h=>h.textContent)).toContain('Download a copy first (optional)');
 expect(button('Prepare backup before deletion')).toBeDefined();
 expect(element.textContent).toContain('Deletion does not need a download. After deletion ZIGoals cannot open this account’s cloud records again, on any device, and signing in later cannot bring them back.');
 // Retention and the separate local copies are still said as before.
 expect(element.textContent).toContain('Infrastructure backups follow their retention policy.');
 expect(element.textContent).toContain('Local account data stays on this browser, locked after deletion.');
});
