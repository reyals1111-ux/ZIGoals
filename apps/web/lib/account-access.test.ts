// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,test,vi} from 'vitest';
import {AccountAccess,CODE_SENT} from '../components/account-access';
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
// Session P (PR 1, 1.4): the relay's invite-only answer is shown in its own words; any other refusal keeps this panel's wording.
test('an invite-only refusal shows the relay’s words, keeps the address and starts no cooldown; other refusals keep the panel’s wording',async()=>{
 const INVITE_ONLY='ZIGoals is invite-only right now. Ask the person who invited you, or request an invite at contact@zigoals.app.';
 let answer=()=>Response.json({error:'INVITE_ONLY',message:INVITE_ONLY},{status:403});const sends:string[]=[];
 vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{if(!init?.body)return Response.json({signedIn:false});const action=JSON.parse(String(init.body));expect(action.action).toBe('send');sends.push(action.email);return answer();});
 const view=await mount();await input(view,'email','friend@example.com');await click(button(view,'Send email code'));
 expect(view.textContent).toContain(INVITE_ONLY);expect(view.querySelector('input[name="code"]')).toBeNull();expect(button(view,'Send email code').disabled).toBe(false);expect(button(view,'Send email code').textContent).toBe('Send email code');
 expect((view.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('friend@example.com');expect(getAccountScope()).toBeNull();
 answer=()=>Response.json({error:'ORIGIN_DENIED',message:'Fixture words that must never be shown.'},{status:403});
 await click(button(view,'Send email code'));
 expect(view.textContent).toContain('Account access was not confirmed. Check the code and try again.');expect(view.textContent).not.toContain('Fixture words');
 answer=()=>Response.json({error:'EMAIL_UNAVAILABLE',message:'Signing in by email isn’t available right now. Try again later.'},{status:403});
 await click(button(view,'Send email code'));
 expect(view.textContent).toContain('Signing in by email isn’t available right now. Try again later.');expect(sends).toEqual(['friend@example.com','friend@example.com','friend@example.com']);
});
// Session U Part 5 (FIX_PLAN A2): the relay answers every admitted code request the same way, so the panel does too.
test('a code request reads the same for every address: one message, the code field and the cooldown',async()=>{
 vi.useFakeTimers();
 vi.stubGlobal('fetch',async(_url:string,init?:RequestInit)=>{if(!init?.body)return Response.json({signedIn:false});return Response.json({message:'If this address has an invite, a code is on its way. Check your inbox and spam folder, and wait at least 60 seconds before requesting another.'});});
 const view=await mount(),seen:string[]=[];
 for(const address of ['invited@example.com','stranger@example.com']){
  await input(view,'email',address);await click(button(view,'Send email code'));
  expect(view.textContent).toContain(CODE_SENT);expect(view.querySelector('input[name="code"]')).not.toBeNull();expect(button(view,'Send email code').disabled).toBe(true);
  seen.push(view.querySelector('[role="status"]')!.textContent!);
  for(let second=0;second<61;second++)await act(async()=>{vi.advanceTimersByTime(1000);});
  expect(button(view,'Send email code').disabled).toBe(false);
 }
 expect(seen[0]).toBe(CODE_SENT);expect(seen[1]).toBe(seen[0]);expect(getAccountScope()).toBeNull();
});
// Session Y Part 5, FIX_PLAN A7 (Q-SYNC-05): the status answer names a revoked session or a deleted account once; the
// panel locks, hands the code to the vault (which forgets this browser's remembered unlock record) and spends no refresh.
test('A7: a revoked session or a deleted account is passed on once, with no refresh; a plain sign-in requirement is not',async()=>{
 const id='10000000-0000-4000-8000-000000000001';
 for(const code of ['SESSION_REVOKED','ACCOUNT_DELETED'] as const){
  activateAccount(id);unlockAccount();const calls:string[]=[],denied:string[]=[];
  vi.stubGlobal('fetch',async(url:string,init?:RequestInit)=>{calls.push(init?.body?String(init.body):url);return Response.json({signedIn:false,error:code},{status:401});});
  const view=await mount({onDenied:c=>{denied.push(c);}});
  expect(denied).toEqual([code]);expect(calls).toEqual(['/api/private-account?action=status']);expect(isAccountLocked()).toBe(true);
  expect(view.textContent).toContain(code==='ACCOUNT_DELETED'?'This account was deleted.':'This browser was signed out on another device.');
  await act(async()=>root?.unmount());root=undefined;document.body.replaceChildren();clearAccountSession();
 }
 activateAccount(id);unlockAccount();const denied:string[]=[],calls:string[]=[];
 vi.stubGlobal('fetch',async(url:string,init?:RequestInit)=>{calls.push(init?.body?String(init.body):url);return Response.json({signedIn:false,error:'SIGN_IN_REQUIRED'},{status:401});});
 await mount({onDenied:c=>{denied.push(c);}});
 expect(denied).toEqual([]);expect(calls).toEqual(['/api/private-account?action=status','{"action":"refresh"}']);
});
