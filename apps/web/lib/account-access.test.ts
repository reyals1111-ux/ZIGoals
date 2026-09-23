// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,test,vi} from 'vitest';
import {AccountAccess} from '../components/account-access';
import {clearAccountSession,getAccountScope,isAccountLocked,activateAccount,unlockAccount} from './account-session';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:Root|undefined;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;document.body.replaceChildren();clearAccountSession();localStorage.clear();sessionStorage.clear();vi.unstubAllGlobals();vi.useRealTimers();});
async function mount(props:Parameters<typeof AccountAccess>[0]={}){const element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root!.render(createElement(AccountAccess,props)));return element;}
function button(element:Element,text:string){return [...element.querySelectorAll('button')].find(e=>e.textContent?.includes(text))!;}
async function input(element:Element,name:string,value:string){const field=element.querySelector(`input[name="${name}"]`)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});}
async function click(element:HTMLElement){await act(async()=>element.click());}
test('missing hosted setup is honest and never selects or copies private data',async()=>{
 localStorage.setItem('private','keep');vi.stubGlobal('fetch',async()=>Response.json({error:'HOSTED_CONFIGURATION_REQUIRED'},{status:503}));const view=await mount();expect(view.textContent).toContain('not configured');expect(getAccountScope()).toBeNull();expect(localStorage.getItem('private')).toBe('keep');expect(button(view,'Send email code').disabled).toBe(true);
});
test('OTP cooldown and verification select only the returned account, still locked',async()=>{
 vi.useFakeTimers();const id='10000000-0000-4000-8000-000000000001';
 vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{if(!init?.body)return Response.json({signedIn:false});const action=JSON.parse(String(init.body));return Response.json(action.action==='send'?{message:'sent'}:{signedIn:true,accountId:id});});
 let selected='';const view=await mount({onAuthenticated:account=>{selected=account;}});await input(view,'email','fixture@example.com');await click(button(view,'Send email code'));expect(button(view,'Send email code').disabled).toBe(true);await input(view,'code','123456');await click(button(view,'Verify email code'));expect(selected).toBe(id);expect(getAccountScope()).toBe(id);expect(isAccountLocked()).toBe(true);expect(view.textContent).toContain('Account verified');
});
test('signout clears selection and key callback even when the network fails',async()=>{
 const id='10000000-0000-4000-8000-000000000001';activateAccount(id);unlockAccount();vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{if(init?.body)throw Error('offline');return Response.json({signedIn:true,accountId:id});});let cleared=false;const view=await mount({onSignout:()=>{cleared=true;}});await click(button(view,'Sign out'));expect(getAccountScope()).toBeNull();expect(cleared).toBe(true);expect(view.textContent).toContain('server sign-out could not be confirmed');
});
test('loss of hosted configuration locks an already-selected account',async()=>{
 activateAccount('10000000-0000-4000-8000-000000000001');unlockAccount();vi.stubGlobal('fetch',async()=>Response.json({error:'HOSTED_CONFIGURATION_REQUIRED'},{status:503}));await mount();expect(isAccountLocked()).toBe(true);
});
test('late OTP result cannot select a prior account after a scope transition',async()=>{
 let finish:(r:Response)=>void=()=>{};const alice='10000000-0000-4000-8000-000000000001',bob='20000000-0000-4000-8000-000000000002';let notified=false;
 vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{if(!init?.body)return Response.json({signedIn:false});if(JSON.parse(String(init.body)).action==='send')return Response.json({message:'sent'});return new Promise<Response>(resolve=>{finish=resolve;});});
 const view=await mount({onAuthenticated:()=>{notified=true;}});await input(view,'email','fixture@example.com');await click(button(view,'Send email code'));await input(view,'code','123456');await click(button(view,'Verify email code'));await act(async()=>activateAccount(bob));await act(async()=>finish(Response.json({signedIn:true,accountId:alice})));expect(getAccountScope()).toBe(bob);expect(notified).toBe(false);
});
