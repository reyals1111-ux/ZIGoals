'use client';
import {revokeOtherDevicesPush} from '../lib/push/device';
import {useEffect,useState} from 'react';
import {z} from 'zod';
import {getAccountScope,getAccountGeneration,lockAccount} from '../lib/account-session';
import { formatDateTime } from '../lib/visual-format';
import './account-devices.css';
const sessionsSchema=z.object({sessions:z.array(z.object({id:z.uuid(),label:z.string().min(1).max(80),createdAt:z.iso.datetime(),current:z.boolean()}).strict()).max(5000)}).strict();
type Session=z.infer<typeof sessionsSchema>['sessions'][number];
export function AccountDevices({account,onCurrentRevoked}:{account:string;onCurrentRevoked?:()=>void}){
 const [sessions,setSessions]=useState<Session[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState<string|null>(null);
 useEffect(()=>{setSessions([]);setConfirm(null);setMessage('Select Refresh sessions to inspect this account’s access.');},[account]);
 async function run(operation?:{action:'revoke';id:string}|{action:'revoke-others'}){
  if(busy)return;setBusy(true);setMessage('');const generation=getAccountGeneration(),fence=()=>{if(account!==getAccountScope()||generation!==getAccountGeneration())throw Error('Account changed. Session result discarded.');};
  try{fence();const res=await fetch('/api/private-account'+(operation?'':'?action=sessions'),{method:operation?'POST':'GET',headers:{'X-Zigoals-Account':account,...(operation?{'Content-Type':'application/json'}:{})},...(operation?{body:JSON.stringify({action:'session',operation})}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});const text=await res.text();fence();if(text.length>1_000_000)throw Error('Session response exceeds capacity.');if(!res.ok){if(res.status===401)lockAccount();throw Error('Session access was not confirmed. Sign in again if it expired.');}const data=JSON.parse(text);
   if(operation){const answer=z.object({revoked:z.number().int().nonnegative(),currentRevoked:z.boolean(),providerSignedOut:z.boolean().optional()}).parse(data);setConfirm(null);setSessions([]);
    // Session U Part 5 (FIX_PLAN A3): the relay also signs the other sessions out at the email provider; an older relay says nothing about it.
    const provider=answer.providerSignedOut===true?' They were also signed out at the email provider.':answer.providerSignedOut===false?' Signing them out at the email provider was not confirmed; they can no longer read or write your vault.':'';
    setMessage(operation.action==='revoke-others'?`Signed out ${answer.revoked} other ${answer.revoked===1?'session':'sessions'}.${provider} This device stays signed in.`:`${answer.revoked} session(s) revoked.${provider} Refresh to inspect remaining access.`);if(answer.currentRevoked){onCurrentRevoked?.();lockAccount();}else if(operation.action==='revoke-others')void revokeOtherDevicesPush(account);}
   else{setSessions(sessionsSchema.parse(data).sessions);setMessage('Only active sessions are listed. Already downloaded data cannot be erased remotely.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Session management unavailable.');}finally{setBusy(false);}
 }
 // Session W Part 18 (W3): "Sign out all other devices" is its own explained action with a confirmation, needing no list
 // first (the same revoke-others request, which also signs them out at the email provider); per-session Revoke is unchanged.
 return <section className="panel account-sessions" aria-label="Account sessions"><h2>Devices and sessions</h2>
 <div className="sign-out-others" role="group" aria-labelledby="sign-out-others-title"><h3 id="sign-out-others-title">Sign out all other devices</h3>
  <p>Signs out every other phone, computer and browser signed in to this account, at once: they can no longer read or write your vault, and they are signed out at the email provider too. This device stays signed in. What they already downloaded stays on them; after losing a device, also rotate the vault key.</p>
  {confirm==='others'?<div className="notice" role="alertdialog" aria-labelledby="sign-out-others-confirm"><p id="sign-out-others-confirm">Sign out all other devices now? Unsynced work on them stays only on them: keep a private backup there first if you need it.</p><button className="primary" disabled={busy} onClick={()=>void run({action:'revoke-others'})}>Sign out all other devices</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Keep them signed in</button></div>
   :<button className="secondary" disabled={busy} onClick={()=>setConfirm('others')}>Sign out all other devices…</button>}</div>
 <h3>Sessions</h3><p>Revoking a session blocks its future vault reads and writes at once, including requests using a still-valid email provider token; it is signed out at the email provider the next time it reaches ZIGoals. It cannot erase a downloaded copy or revoke knowledge of a recovery secret.</p><button className="secondary" disabled={busy} onClick={()=>void run()}>Refresh sessions</button>
 <ul>{sessions.slice(0,50).map(s=><li key={s.id}><strong>{s.label}{s.current?' · this session':''}</strong><p>Signed in {formatDateTime(s.createdAt)}</p><button className="secondary" disabled={busy} onClick={()=>setConfirm(s.id)}>Revoke {s.current?'this session':s.label}</button></li>)}</ul>{sessions.length>50&&<p>Showing 50 of {sessions.length} sessions. Sign out all other devices applies to all other active sessions.</p>}
 {confirm&&confirm!=='others'&&<div className="notice"><p>Keep a private backup of unsynced work on the affected device. Its local copy remains there. Confirm revocation of the selected session?</p><button className="primary" disabled={busy} onClick={()=>void run({action:'revoke',id:confirm})}>Confirm session revocation</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancel revocation</button></div>}<p role="status">{message}</p></section>;
}
