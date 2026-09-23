'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {ACCOUNT_CHANGE,activateAccount,clearAccountSession,getAccountGeneration,getAccountScope,isAccountLocked,lockAccount} from '../lib/account-session';
import {isShowcase} from '../lib/showcase-storage';
type Props={onAuthenticated?:(accountId:string)=>void|Promise<void>;onSignout?:()=>void|Promise<void>};
const identity=z.object({signedIn:z.literal(true),accountId:z.uuid()});
export function AccountAccess({onAuthenticated,onSignout}:Props){
 const [deviceLabel,setDeviceLabel]=useState('This browser'),[email,setEmail]=useState(''),[code,setCode]=useState(''),[sentTo,setSentTo]=useState(''),[cooldown,setCooldown]=useState(0),[busy,setBusy]=useState(true),[status,setStatus]=useState<'checking'|'signed-out'|'signed-in'|'unavailable'>('checking'),[message,setMessage]=useState('Checking account availability…'),[locked,setLocked]=useState(true),[showcase,setShowcase]=useState(false);
 const pending=useRef<AbortController|null>(null),callbacks=useRef({onAuthenticated,onSignout});
 useEffect(()=>{callbacks.current={onAuthenticated,onSignout};},[onAuthenticated,onSignout]);
 useEffect(()=>{if(cooldown<=0)return;const timer=setTimeout(()=>setCooldown(value=>Math.max(0,value-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
 const refreshSelection=useCallback(()=>{try{setLocked(isAccountLocked());setShowcase(isShowcase());}catch{setLocked(true);}},[]);
 async function response(res:Response){const text=await res.text();if(text.length>32768)throw Error('Account response was not confirmed.');const data=JSON.parse(text);if(res.status===503){setStatus('unavailable');throw Error('Email access and encrypted sync are not configured on this installation. Your separate local records remain available.');}if(!res.ok)throw Error(res.status===429?'Please wait before requesting another code.':res.status===401?'Your session expired. Sign in again to continue.':'Account access was not confirmed. Check the code and try again.');return data;}
 const checkSession=useCallback(async()=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setBusy(true);
  try{
   if(isShowcase()){setShowcase(true);setStatus('signed-out');setMessage('Exit Showcase before signing in. Fictional data stays separate.');return;}
   const generation=getAccountGeneration(),res=await fetch('/api/private-account?action=status',{cache:'no-store',signal:controller.signal}),text=await res.text();
   if(controller.signal.aborted||generation!==getAccountGeneration())return;
   if(res.status===503){if(getAccountScope())lockAccount();setStatus('unavailable');setMessage('Email access and encrypted sync are not configured on this installation. Your separate local records remain available.');return;}
   if(text.length>32768)throw Error('Account response was not confirmed.');const data=JSON.parse(text);
   if(res.status===401||data.signedIn===false){if(getAccountScope())lockAccount();setStatus('signed-out');setMessage('Sign in with an email code. Your separate local records are not copied into an account.');return;}
   if(!res.ok)throw Error('Account status could not be confirmed.');
   const verified=identity.parse(data);if(getAccountScope()!==verified.accountId)activateAccount(verified.accountId);setStatus('signed-in');setMessage('Account verified. Unlock your encrypted vault below to access account records.');
   await callbacks.current.onAuthenticated?.(verified.accountId);refreshSelection();
  }catch{if(!controller.signal.aborted){try{if(getAccountScope())lockAccount();}catch{}setStatus('signed-out');setMessage('Account status could not be confirmed. Account records remain locked. Retry when connected.');}}
  finally{if(pending.current===controller)setBusy(false);}
 },[refreshSelection]);
 useEffect(()=>{refreshSelection();void checkSession();window.addEventListener(ACCOUNT_CHANGE,refreshSelection);return()=>{pending.current?.abort();window.removeEventListener(ACCOUNT_CHANGE,refreshSelection);};},[checkSession,refreshSelection]);
 async function submit(action:'send'|'verify'){
  if(busy||showcase||status==='unavailable'||(action==='send'&&cooldown>0))return;
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setBusy(true);
  try{
   const address=email.trim();if(!z.email().safeParse(address).success)throw Error('Enter a valid email address.');if(action==='verify'&&(sentTo!==address||!/^\d{6,10}$/.test(code)))throw Error('Enter the code sent to this email address.');
   const generation=getAccountGeneration();const res=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',signal:controller.signal,body:JSON.stringify(action==='send'?{action,email:address}:{action,email:address,code,label:deviceLabel.trim()||'This browser'})});
   if(res.status===429)setCooldown(60);const data=await response(res);if(controller.signal.aborted||generation!==getAccountGeneration())return;
   if(action==='send'){setSentTo(address);setCooldown(60);setMessage('If this address can receive a code, check your inbox. You can request another in 60 seconds.');return;}
   const verified=identity.parse(data);activateAccount(verified.accountId);setCode('');setStatus('signed-in');setMessage('Account verified. Unlock your encrypted vault below to access account records.');await callbacks.current.onAuthenticated?.(verified.accountId);refreshSelection();
  }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Account access was not confirmed.');}
  finally{if(pending.current===controller)setBusy(false);}
 }
 async function signout(){
  pending.current?.abort();setBusy(true);setCode('');setSentTo('');
  try{clearAccountSession();}catch{setMessage('Account selection could not be cleared. Close this tab to keep it locked.');}
  try{await callbacks.current.onSignout?.();}catch{/* Session access is already locked; key cleanup must not prevent server logout. */}
  setStatus('signed-out');
  try{const res=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json'},cache:'no-store',body:'{"action":"signout"}'});const data=await response(res);setMessage(data.remoteRevocationConfirmed?'Signed out. Local records remain separate.':'Signed out on this browser. Server session revocation could not be confirmed.');}
  catch{setMessage('Signed out locally; server sign-out could not be confirmed. Retry sign-out when connected.');}
  finally{setBusy(false);refreshSelection();}
 }
 return <section className="panel" aria-label="Email account access"><p className="eyebrow">PRIVATE ACCOUNT</p><h2>Your account, separate from this browser’s local records.</h2><p>Email establishes account access. Your recovery secret unlocks encrypted records separately. Signing in never copies local or Showcase data.</p><p role="status">{message}</p>{status==='signed-in'&&<p>{locked?'Account records locked.':'Account records unlocked on this tab.'}</p>}
 {status!=='signed-in'&&<form onSubmit={event=>{event.preventDefault();void submit(sentTo===email.trim()?'verify':'send');}}><label className="field">Device name<input maxLength={80} value={deviceLabel} onChange={e=>setDeviceLabel(e.target.value)} disabled={busy||showcase||status==='unavailable'}/></label><label className="field">Email address<input name="email" type="email" autoComplete="email" maxLength={254} value={email} disabled={busy||showcase||status==='unavailable'} onChange={e=>{setEmail(e.target.value);setCode('');}}/></label><button type="button" className="secondary" disabled={busy||showcase||status==='unavailable'||cooldown>0} onClick={()=>void submit('send')}>Send email code{cooldown>0?` (${cooldown}s)`:''}</button>{sentTo===email.trim()&&sentTo&&<><label className="field">Email code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} value={code} disabled={busy} onChange={e=>setCode(e.target.value)}/></label><button className="primary" type="submit" disabled={busy||!/^[0-9]{6,10}$/.test(code)}>Verify email code</button></>}</form>}
 <div className="actions"><button type="button" className="secondary" disabled={busy||showcase} onClick={()=>void checkSession()}>Check account status</button><button type="button" className="secondary" disabled={busy||showcase} onClick={()=>void signout()}>Sign out</button></div><p className="fine">No wallet connection is used for email access. Account data remains on this device after sign-out, locked from the app until that account is verified and its vault unlocked. Local copies in this browser are not encrypted; use a trusted browser profile.</p></section>;
}
