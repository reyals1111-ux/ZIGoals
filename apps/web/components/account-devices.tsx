'use client';
import {useEffect,useState} from 'react';
import {z} from 'zod';
import {getAccountScope,getAccountGeneration,lockAccount} from '../lib/account-session';
const sessionsSchema=z.object({sessions:z.array(z.object({id:z.uuid(),label:z.string().min(1).max(80),createdAt:z.iso.datetime(),current:z.boolean()}).strict()).max(5000)}).strict();
type Session=z.infer<typeof sessionsSchema>['sessions'][number];
export function AccountDevices({account}:{account:string}){
 const [sessions,setSessions]=useState<Session[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState<string|null>(null);
 useEffect(()=>{setSessions([]);setConfirm(null);setMessage('Select Refresh sessions to inspect this account’s access.');},[account]);
 async function run(operation?:{action:'revoke';id:string}|{action:'revoke-others'}){
  if(busy)return;setBusy(true);setMessage('');const generation=getAccountGeneration(),fence=()=>{if(account!==getAccountScope()||generation!==getAccountGeneration())throw Error('Account changed. Session result discarded.');};
  try{fence();const res=await fetch('/api/private-account'+(operation?'':'?action=sessions'),{method:operation?'POST':'GET',headers:{'X-Zigoals-Account':account,...(operation?{'Content-Type':'application/json'}:{})},...(operation?{body:JSON.stringify({action:'session',operation})}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});const text=await res.text();fence();if(text.length>1_000_000)throw Error('Session response exceeds capacity.');if(!res.ok){if(res.status===401)lockAccount();throw Error('Session access was not confirmed. Sign in again if it expired.');}const data=JSON.parse(text);
   if(operation){const answer=z.object({revoked:z.number().int().nonnegative(),currentRevoked:z.boolean()}).parse(data);setConfirm(null);setSessions([]);setMessage(`${answer.revoked} session(s) revoked. Refresh to inspect remaining access.`);if(answer.currentRevoked)lockAccount();}
   else{setSessions(sessionsSchema.parse(data).sessions);setMessage('Only active sessions are listed. Already downloaded data cannot be erased remotely.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Session management unavailable.');}finally{setBusy(false);}
 }
 return <section className="panel" aria-label="Account sessions"><h2>Devices and sessions</h2><p>Revoking a session blocks its future vault reads and writes, including requests using a still-valid email provider token. It cannot erase a downloaded copy or revoke knowledge of a recovery secret. Domain-key rotation is not available in this preview.</p><button className="secondary" disabled={busy} onClick={()=>void run()}>Refresh sessions</button>{sessions.length>0&&<button className="secondary" disabled={busy} onClick={()=>setConfirm('others')}>Revoke other sessions</button>}
 <ul>{sessions.slice(0,50).map(s=><li key={s.id}><strong>{s.label}{s.current?' · this session':''}</strong><p>Signed in {new Date(s.createdAt).toLocaleString()}</p><button className="secondary" disabled={busy} onClick={()=>setConfirm(s.id)}>Revoke {s.current?'this session':s.label}</button></li>)}</ul>{sessions.length>50&&<p>Showing50 of{sessions.length} sessions. Revoke other sessions applies to all other active sessions.</p>}
 {confirm&&<div className="notice"><p>Keep a private backup of unsynced work on the affected device. Its local copy remains there. Confirm revocation of {confirm==='others'?'all other sessions':'the selected session'}?</p><button className="primary" disabled={busy} onClick={()=>void run(confirm==='others'?{action:'revoke-others'}:{action:'revoke',id:confirm})}>Confirm session revocation</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(null)}>Cancel revocation</button></div>}<p role="status">{message}</p></section>;
}
