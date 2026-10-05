/** A tab-local selector is not authentication. Only a verified server identity may activate it. */
export const ACCOUNT_SELECTOR='zigoals:account:selector:v1';
export const ACCOUNT_CHANGE='zigoals:account-change';
export type AccountLockReason='access-changed'|'manual';
export type AccountLockDetail={reason:AccountLockReason;account:string|null;generation:number};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Session={raw:string|null;scope:string|null;locked:boolean;generation:number};
const sessions=new WeakMap<object,Session>();
const channels=new WeakMap<object,BroadcastChannel>();
function channel():BroadcastChannel|null{
 if(typeof window==='undefined'||typeof window.BroadcastChannel!=='function')return null;
 let value=channels.get(window);
 // Session U Part 5 (B2): Lock in one tab sends {type:'lock',reason:'manual'} and then the plain 'lock' that tabs of
 // earlier builds understand; a tab of this build marks the lock as manual, so a remembered device does not reopen it.
 if(!value){try{value=new window.BroadcastChannel('zigoals:account-lock:v1');value.onmessage=event=>{const data=event.data as unknown;if(data==='lock'){try{lockAccount();}catch{/* Corrupt selectors already fail closed. */}}else if(data&&typeof data==='object'&&(data as {type?:unknown}).type==='lock'&&(data as {reason?:unknown}).reason==='manual'){try{lockAccount('manual');}catch{/* Corrupt selectors already fail closed. */}}};channels.set(window,value);}catch{return null;}}
 return value;
}
function lockOtherTabs(){try{channel()?.postMessage('lock');}catch{/* Server account fences still reject a stale account request. */}}
/**
 * Session U Part 5 (B2, FINDINGS Q-SYNC-02): Lock locks this tab at once, as before, and then every other tab of this
 * browser: a manual lock first (so a remembered device does not reopen them), then the plain 'lock' for older tabs.
 */
export function lockEveryTab():void{
 lockAccount('manual');
 try{const all=channel();all?.postMessage({type:'lock',reason:'manual'});all?.postMessage('lock');}catch{/* Server account fences still reject a stale account request. */}
}
function session():Session{
 if(typeof window==='undefined')return {raw:null,scope:null,locked:true,generation:0};
 channel();
 let current=sessions.get(window),raw:string|null;
 try{raw=window.sessionStorage.getItem(ACCOUNT_SELECTOR);}catch{
  if(current?.scope||current?.raw)throw Error('Account selection is unavailable. Private records remain locked.');
  return current??{raw:null,scope:null,locked:true,generation:0};
 }
 if(!current||raw!==current.raw){
  let scope:string|null=null;
  if(raw!==null){const parsed=JSON.parse(raw);if(parsed?.version!==1||typeof parsed.accountId!=='string'||!uuid.test(parsed.accountId))throw Error('Account selection is damaged. Sign out before continuing.');scope=parsed.accountId.toLowerCase();}
  current={raw,scope,locked:true,generation:(current?.generation??0)+1};sessions.set(window,current);
 }
 return current;
}
function announce(detail?:AccountLockDetail){window.dispatchEvent(detail?new CustomEvent(ACCOUNT_CHANGE,{detail}):new Event(ACCOUNT_CHANGE));}
export function getAccountScope():string|null{return session().scope;}
export function getAccountGeneration():number{return session().generation;}
export function isAccountLocked():boolean{return session().locked;}
export function activateAccount(id:string):void{
 if(!uuid.test(id))throw Error('Invalid verified account identity.');
 const raw=JSON.stringify({version:1,accountId:id.toLowerCase()}),prior=sessions.get(window);
 window.sessionStorage.setItem(ACCOUNT_SELECTOR,raw);
 sessions.set(window,{raw,scope:id.toLowerCase(),locked:true,generation:(prior?.generation??0)+1});announce();lockOtherTabs();
}
/**
 * A locked tab takes the server-verified account without locking other tabs (remember this device, ADR-008). Other tabs
 * already use this account, or are locked: a sign-in as another account locks them, and the server fences any stale
 * request. A tab that has an account open never changes it here.
 */
export function adoptAccount(id:string):void{
 if(!uuid.test(id))throw Error('Invalid verified account identity.');
 const current=session(),scope=id.toLowerCase();if(current.scope===scope)return;
 if(!current.locked)throw Error('Lock this tab before selecting another account.');
 const raw=JSON.stringify({version:1,accountId:scope});window.sessionStorage.setItem(ACCOUNT_SELECTOR,raw);
 sessions.set(window,{raw,scope,locked:true,generation:current.generation+1});announce();
}
export function lockAccount(reason?:AccountLockReason):void{const current=session();current.locked=true;current.generation++;announce(reason?{reason,account:current.scope,generation:current.generation}:undefined);}
/** Call only after server identity matches selection and the account vault key is unlocked. */
export function unlockAccount():void{const current=session();if(!current.scope)throw Error('Select a verified account before unlocking.');current.locked=false;current.generation++;announce();}
export function clearAccountSession():void{
 const prior=sessions.get(window);
 if(prior){prior.locked=true;prior.generation++;}
 try{window.sessionStorage.removeItem(ACCOUNT_SELECTOR);sessions.set(window,{raw:null,scope:null,locked:true,generation:(prior?.generation??0)+1});}
 finally{announce();lockOtherTabs();}
}
