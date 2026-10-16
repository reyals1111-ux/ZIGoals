// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';

/**
 * Session AD item 12 (ADR-026; FINDINGS Q-SYNC-05, FIX_PLAN A7; owner amendment 4): the revocation check runs only while
 * the page is visible and this browser holds a remembered record — at start, when shown or focused, every 15 minutes while
 * visible — sends only the existing status GET, and removes the record only on SESSION_REVOKED or ACCOUNT_DELETED.
 */
type Answer=()=>Response|Promise<Response>;
let answer:Answer,calls:{url:string;init?:RequestInit}[],visibility:DocumentVisibilityState;
const status=(body:unknown,code=200)=>()=>Response.json(body,{status:code});
const REVOKED=status({signedIn:false,error:'SESSION_REVOKED'},401),DELETED=status({signedIn:false,error:'ACCOUNT_DELETED'},401);
const MIN=60_000;

beforeEach(()=>{
 vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T09:00:00Z'));
 calls=[];answer=status({signedIn:true,accountId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});visibility='visible';
 vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{calls.push({url:String(input),init});return answer();}));
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>visibility});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

async function start(options:{record?:boolean;paused?:()=>boolean;known?:boolean}={}){
 const {startRevocationCheck}=await import('./revocation-check');
 const state={record:options.record??true},denied=vi.fn(async()=>{state.record=false;}),hasRecord=vi.fn(async()=>state.record);
 const check=startRevocationCheck({hasRecord,denied,paused:options.paused??(()=>false),...(options.known===undefined?{}:{known:options.known})});
 return {check,denied,hasRecord,state};
}
/** Lets the timers and the promises they start settle (fake timers: each advance runs what is due). */
const advance=async(ms:number)=>{await vi.advanceTimersByTimeAsync(ms);};
const show=async(next:DocumentVisibilityState)=>{visibility=next;document.dispatchEvent(new Event('visibilitychange'));await advance(1);};
const statusCalls=()=>calls.filter(c=>c.url==='/api/private-account?action=status').length;

test('runs at start, every 15 minutes while visible, and when shown again; only the status GET, no body, no refresh',async()=>{
 const {check,denied}=await start();
 expect(calls).toHaveLength(0);
 await advance(2000);expect(statusCalls()).toBe(1);
 await advance(14*MIN);expect(statusCalls()).toBe(1);
 await advance(MIN);expect(statusCalls()).toBe(2);
 await advance(15*MIN);expect(statusCalls()).toBe(3);
 // Hidden: the timer stops, whatever time passes.
 await show('hidden');expect(vi.getTimerCount()).toBe(0);await advance(3*60*MIN);expect(statusCalls()).toBe(3);
 // Shown again: one check at once, then the 15-minute rhythm again.
 await show('visible');expect(statusCalls()).toBe(4);
 await advance(15*MIN);expect(statusCalls()).toBe(5);
 for(const {url,init} of calls){expect(url).toBe('/api/private-account?action=status');expect(init?.method).toBeUndefined();expect(init?.body).toBeUndefined();}
 expect(denied).not.toHaveBeenCalled();check.stop();
});

test('never while hidden: a page hidden from the start makes no request until it is shown',async()=>{
 visibility='hidden';const {check}=await start();
 await advance(60*MIN);expect(calls).toHaveLength(0);
 await show('visible');expect(statusCalls()).toBe(1);check.stop();
});

test('focus checks too, but never within 30 s of the last status request',async()=>{
 const {check}=await start();
 await advance(2000);expect(statusCalls()).toBe(1);
 window.dispatchEvent(new Event('focus'));await advance(1);expect(statusCalls()).toBe(1);
 await advance(30_000);window.dispatchEvent(new Event('focus'));await advance(1);expect(statusCalls()).toBe(2);
 check.stop();
});

for(const [code,answerOf] of [['SESSION_REVOKED',REVOKED],['ACCOUNT_DELETED',DELETED]] as const)test(`${code}: the record is removed at once, and no further check runs`,async()=>{
 answer=answerOf;const {check,denied,hasRecord}=await start();
 await advance(2000);expect(denied).toHaveBeenCalledTimes(1);expect(denied).toHaveBeenCalledWith(code);
 await advance(60*MIN);await show('hidden');await show('visible');await advance(60*MIN);
 expect(statusCalls()).toBe(1);expect(denied).toHaveBeenCalledTimes(1);expect(hasRecord).toHaveBeenCalled();
 check.stop();
});

for(const [label,answerOf] of [
 ['offline',()=>{throw new TypeError('Failed to fetch');}],
 ['a 503',status({error:'ACCOUNT_STATUS_UNAVAILABLE'},503)],
 ['a 500 with no body',()=>new Response(null,{status:500})],
 ['a routine sign-in requirement',status({signedIn:false,error:'SIGN_IN_REQUIRED'},401)],
 ['an unknown 401 body',status({signedIn:false,error:'SOMETHING_ELSE'},401)],
 ['a 401 that is not JSON',()=>new Response('nope',{status:401})],
 ['signed in',status({signedIn:true,accountId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'})],
] as [string,Answer][])test(`${label}: the record is kept and checked again later; no refresh is spent`,async()=>{
 answer=answerOf;const {check,denied}=await start();
 await advance(2000);await advance(15*MIN);
 expect(statusCalls()).toBe(2);expect(denied).not.toHaveBeenCalled();
 expect(calls.every(c=>c.init?.method===undefined&&c.init?.body===undefined)).toBe(true);
 check.stop();
});

test('no record: no request at all, at start, on focus, when shown, or later',async()=>{
 const {check,hasRecord}=await start({record:false});
 await advance(2000);window.dispatchEvent(new Event('focus'));await advance(31_000);await show('hidden');await show('visible');await advance(60*MIN);
 expect(calls).toHaveLength(0);expect(hasRecord).toHaveBeenCalled();check.stop();
});

test('a record that appears later (refresh) starts the 15-minute check; one that goes stops it',async()=>{
 const {check,state}=await start({record:false});
 await advance(2000);expect(calls).toHaveLength(0);
 state.record=true;await check.refresh();await advance(15*MIN);expect(statusCalls()).toBe(1);
 state.record=false;await check.refresh();await advance(60*MIN);expect(statusCalls()).toBe(1);
 check.stop();
});

test('coalesced with the reopen: none while it runs, and none within 30 s of its status request',async()=>{
 let reopening=true;const {check}=await start({paused:()=>reopening});
 await advance(2000);expect(calls).toHaveLength(0);
 // The reopen's own status request (accountStatus) counts as this tab's last check.
 reopening=false;const {accountStatus}=await import('./device-unlock');await accountStatus(AbortSignal.timeout(1000));expect(statusCalls()).toBe(1);
 await show('hidden');await show('visible');expect(statusCalls()).toBe(1);
 await advance(30_000);await show('hidden');await show('visible');expect(statusCalls()).toBe(2);
 check.stop();
});

test('known at start: the start check reads no IndexedDB; stop ends everything',async()=>{
 const {check,hasRecord}=await start({known:true});
 await advance(2000);expect(statusCalls()).toBe(1);expect(hasRecord).not.toHaveBeenCalled();
 check.stop();await advance(60*MIN);await show('hidden');await show('visible');window.dispatchEvent(new Event('focus'));await advance(60*MIN);
 expect(statusCalls()).toBe(1);
});
