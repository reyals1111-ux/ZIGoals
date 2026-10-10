/**
 * Session Z-Cloud Part 5 (Y38, ADR-019 C36; `[TIER 3] (auth/sync)`): a Health restore's "ask first" reaches every tab of
 * the account in this browser. When one tab restores Health and asks before Health sync starts (B4), it announces it
 * here; another tab of the same account whose Health consent was on turns Health sync off and asks too, so no tab
 * uploads Health on an earlier tick. Nothing is stored: a BroadcastChannel message, and where a browser has none, a
 * storage event from a key that is written and removed at once (never left behind, so builds #32–#35 never see it).
 */
const CHANNEL='zigoals-health-ask',KEY='zigoals:health-ask-signal';
/** What the other tab says (components/vault-sync-controls.tsx sets it as its message). */
export const HEALTH_ASKED_ELSEWHERE='Health was restored in another tab of this account, so Health sync is off in this tab too until you tick “Sync my Health records with this account” again.';
type Signal={account:string;at:number};
const valid=(value:unknown):value is Signal=>!!value&&typeof value==='object'&&typeof (value as Signal).account==='string'&&/^[0-9a-f-]{36}$/.test((value as Signal).account)&&Number.isFinite((value as Signal).at);

export function announceHealthAsk(account:string){
 const signal:Signal={account:account.toLowerCase(),at:Date.now()};
 if(typeof BroadcastChannel==='function'){try{const channel=new BroadcastChannel(CHANNEL);channel.postMessage(signal);channel.close();return;}catch{/* The storage event below. */}}
 try{localStorage.setItem(KEY,JSON.stringify(signal));localStorage.removeItem(KEY);}catch{/* No other tab can be told; each still asks on its own restore. */}
}
/** Calls `ask(account)` when another tab of this browser announces a Health ask. Returns the unsubscribe. */
export function onHealthAsk(ask:(account:string)=>void):()=>void{
 let channel:BroadcastChannel|null=null;
 if(typeof BroadcastChannel==='function'){try{channel=new BroadcastChannel(CHANNEL);channel.onmessage=event=>{if(valid(event.data))ask(event.data.account);};}catch{channel=null;}}
 const storage=(event:StorageEvent)=>{if(event.key!==KEY||!event.newValue)return;try{const value:unknown=JSON.parse(event.newValue);if(valid(value))ask(value.account);}catch{/* Not ours. */}};
 window.addEventListener('storage',storage);
 return()=>{channel?.close();window.removeEventListener('storage',storage);};
}
