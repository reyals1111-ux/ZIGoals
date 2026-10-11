import {unlockVault,type VaultManifest} from './crypto';
/**
 * Session Z-Cloud Part 5 (A6, ADR-019 C35; `[TIER 3] (auth/sync)`): the recovery secret asked again for the five actions
 * that end data or access (Delete cloud data, Delete account, Delete a section, Sign out all other devices, Rotate the
 * key), on every device, a remembered one included. The typed secret must open the live manifest here first, so a wrong
 * one never reaches the network; then its proof goes with the request, and private sync checks it against the verifier
 * the vault registered (workers/private-sync/step-up.mjs). A vault without a verifier, or a sync Worker from before,
 * ignores the proof.
 */
export type StepUp={proof:string;next?:string};
const bytes=(s:string)=>new TextEncoder().encode(s),hex=(b:ArrayBuffer)=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/**
 * The proof: an HMAC-SHA-256 keyed by an HKDF of the recovery secret's own 32 bytes (a separate derivation from the
 * wrapping key; a remembered device holds the vault's root, never the secret, so it cannot make one) over the account,
 * the vault and the epoch, as 64 hex characters. Loaded only when one of the five actions runs (or the secret is entered).
 */
export async function stepUpProof(recovery:string,account:string,vault:string,epoch:number):Promise<string>{
 if(!/^[A-Za-z0-9_-]{43}$/.test(recovery))throw Error('Use the complete vault recovery secret. Email codes cannot unlock data.');
 if(!UUID.test(account)||!UUID.test(vault)||!Number.isSafeInteger(epoch)||epoch<1)throw Error('Invalid vault.');
 const raw=Uint8Array.from(atob(recovery.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 try{
  if(raw.length!==32)throw Error('Invalid recovery secret.');
  const base=await crypto.subtle.importKey('raw',raw,'HKDF',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes('zigoals-step-up'),info:bytes('zigoals:step-up:v1')},base,{name:'HMAC',hash:'SHA-256',length:256},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,bytes(JSON.stringify(['zigoals-step-up',1,account.toLowerCase(),vault,epoch]))));
 }finally{raw.fill(0);}
}
/** The SHA-256 of a proof's 32 bytes, as hex: what private sync keeps (workers/private-sync/step-up.mjs `verifierOf`). */
export async function stepUpVerifier(proof:string):Promise<string>{
 if(!/^[a-f0-9]{64}$/.test(proof))throw Error('Invalid step-up proof.');
 return hex(await crypto.subtle.digest('SHA-256',Uint8Array.from({length:32},(_,i)=>parseInt(proof.slice(i*2,i*2+2),16))));
}
export const STEP_UP_WRONG='That recovery secret does not open this vault. Nothing was changed.';
export const STEP_UP_REFUSED='The recovery secret was not confirmed for this vault, so nothing was deleted, rotated or signed out. Enter it again.';
/** The proof for this account's live manifest, after the secret opened it here; STEP_UP_WRONG otherwise. */
export async function stepUpFor(secret:string,account:string,manifest:VaultManifest):Promise<StepUp>{
 const value=secret.trim();
 try{await unlockVault(manifest,value);}catch{throw Error(STEP_UP_WRONG);}
 return {proof:await stepUpProof(value,account,manifest.vault,manifest.epoch)};
}
/** The new secret's verifier, sent when a rotation begins so the rotated vault is covered from its first moment. */
export async function nextVerifier(secret:string,account:string,manifest:VaultManifest):Promise<string>{
 return stepUpVerifier(await stepUpProof(secret,account,manifest.vault,manifest.epoch));
}
/** Whether an answer is private sync refusing a missing or wrong proof. */
export async function refusedStepUp(response:Response):Promise<boolean>{
 if(response.status!==403)return false;
 try{const data:unknown=await response.clone().json();return !!data&&typeof data==='object'&&(data as {error?:unknown}).error==='STEP_UP_REQUIRED';}catch{return false;}
}
/**
 * Registers this secret's verifier for the live epoch: when a vault is created and whenever the secret is entered. The
 * first verifier for an epoch is kept; best effort, never in the way of opening the vault (an older Worker answers 404).
 */
export async function registerStepUp(account:string,secret:string,manifest:VaultManifest):Promise<boolean>{
 try{
  const verifier=await stepUpVerifier(await stepUpProof(secret.trim(),account,manifest.vault,manifest.epoch));
  const response=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json','x-zigoals-account':account},cache:'no-store',signal:AbortSignal.timeout(15000),body:JSON.stringify({action:'step-up',operation:{action:'register',epoch:manifest.epoch,verifier}})});
  await response.body?.cancel().catch(()=>{});return response.ok;
 }catch{return false;}
}
