/**
 * Session AD item 12 (ADR-026; FINDINGS Q-SYNC-05, FIX_PLAN A7; owner amendment 4): a remembered device whose session was
 * revoked, or whose account was deleted, on another device forgets its unlock record without waiting to be opened again.
 *
 * - When: only while this page is visible and this browser holds a remembered record: shortly after the app starts, when
 *   the page is shown again or focused, and every 15 minutes while it stays visible. The timer stops while the page is
 *   hidden; nothing ever runs in the background.
 * - What: the existing status request (one GET, no body; no refresh is spent) and nothing else is sent.
 * - Outcome: only a definitive SESSION_REVOKED or ACCOUNT_DELETED removes the record (the provider's accessDenied, with
 *   its notes). Offline, a 5xx, a routine sign-in requirement or anything unknown keeps it.
 * - Coalesced: one check at a time, never while the provider's own reopen is running (it makes the same request on load
 *   and focus while the tab is locked), and never within 30 s of another status request from this tab.
 * - Cheap: whether a record exists is cached and read again (IndexedDB, without creating the database) only at start,
 *   when the page is shown or focused, and when the provider says this tab's remembered state changed.
 * Loaded by the provider only once this browser holds a remembered record, so pages without one never load it.
 */
import {denialOf,lastStatusCheck,noteStatusCheck,readDevices,type AccountDenial} from './device-unlock';
import {isShowcase} from '../showcase-storage';
/**
 * Session AD weights: here, not in device-unlock.ts (loaded on every page), since only this lazy check uses it. The
 * revocation check's one request: the existing status GET, nothing else (no body, and no refresh is spent: a routine
 * sign-in requirement simply keeps the record). The denial a 401 names, or null for anything else: a confirmed account,
 * a routine sign-in requirement, a 5xx, an unknown body, a failed or aborted request. One tab at a time, like accountStatus.
 */
export async function sessionDenial(signal:AbortSignal):Promise<AccountDenial['denied']|null>{
 const check=async():Promise<AccountDenial['denied']|null>=>{
  noteStatusCheck();
  try{
   const response=await fetch('/api/private-account?action=status',{cache:'no-store',signal});
   if(response.status===401)return (await denialOf(response))?.denied??null;
   await response.body?.cancel();return null;
  }catch{return null;}
 };
 return typeof globalThis.navigator?.locks?.request==='function'?navigator.locks.request('zigoals:account-status',check):check();
}

export const CHECK_EVERY_MS=15*60_000,CHECK_GAP_MS=30_000;
export type RevocationCheckOptions={
 /** Whether this browser holds a remembered record (readDevices().length>0). */
 hasRecord:()=>Promise<boolean>;
 /** A definitive denial: the provider forgets the record and says why. */
 denied:(code:AccountDenial['denied'])=>Promise<void>|void;
 /** True while the provider's own reopen runs (or in Showcase): this check then stands down. */
 paused:()=>boolean;
 /** Whether a record is already known to exist (the provider starts this once it saw one). */
 known?:boolean;
 /** The status request; sessionDenial (the existing GET) unless a test stands in. */
 status?:(signal:AbortSignal)=>Promise<AccountDenial['denied']|null>;
};
export type RevocationCheck={stop:()=>void;refresh:()=>Promise<void>};

export function startRevocationCheck(options:RevocationCheckOptions):RevocationCheck{
 const status=options.status??sessionDenial;
 let known:boolean|null=options.known??null,timer:ReturnType<typeof setTimeout>|undefined,running=false,stopped=false,lastRun=0;
 const visible=()=>typeof document!=='undefined'&&document.visibilityState==='visible';
 const clear=()=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}};
 // The 15-minute timer runs only while the page is visible and a record is known to exist.
 const arm=()=>{clear();if(stopped||!known||!visible())return;timer=setTimeout(()=>{timer=undefined;void run(false);},CHECK_EVERY_MS);};
 async function run(reread:boolean){
  if(stopped||running)return;
  if(!visible()||options.paused()||Date.now()-Math.max(lastStatusCheck(),lastRun)<CHECK_GAP_MS){arm();return;}
  running=true;lastRun=Date.now();
  try{
   if(reread||known===null)known=await options.hasRecord().catch(()=>false);
   if(stopped||!known||!visible()||options.paused())return;
   const code=await status(AbortSignal.timeout(20_000)).catch(()=>null);
   if(stopped||!code)return;
   known=false;await options.denied(code);
  }finally{running=false;arm();}
 }
 async function refresh(){if(stopped)return;known=await options.hasRecord().catch(()=>false);arm();}
 // Deferred out of the event itself, so a reopen started by the same event is seen as running and this one stands down.
 const soon=()=>{if(!stopped)setTimeout(()=>void run(true),0);};
 const shown=()=>{if(visible())soon();else clear();};
 document.addEventListener('visibilitychange',shown);window.addEventListener('focus',soon);
 // The start check waits for an idle moment (Safari has no requestIdleCallback: a short timer stands in).
 const idle=typeof window.requestIdleCallback==='function',start=()=>void run(known===null);
 const handle=idle?window.requestIdleCallback(start,{timeout:5000}):setTimeout(start,2000);
 return {
  refresh,
  stop(){stopped=true;clear();if(idle)window.cancelIdleCallback(handle as number);else clearTimeout(handle as ReturnType<typeof setTimeout>);document.removeEventListener('visibilitychange',shown);window.removeEventListener('focus',soon);},
 };
}

/**
 * The provider's one call (components/vault-sync-controls.tsx), kept here so the code every page loads stays small: a check
 * for this browser's remembered record, standing down while the provider's own reopen runs and in the Showcase.
 */
export function watchRevocation(denied:RevocationCheckOptions['denied'],reopening:()=>boolean):RevocationCheck{
 return startRevocationCheck({known:true,hasRecord:()=>readDevices().then(records=>records.length>0),denied,paused:()=>reopening()||isShowcase()});
}
