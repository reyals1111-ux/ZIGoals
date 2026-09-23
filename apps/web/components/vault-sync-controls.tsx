'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {z} from 'zod';
import {AccountDevices} from './account-devices';
import {AccountAccess} from './account-access';
import {ACCOUNT_CHANGE,getAccountGeneration,getAccountScope,isAccountLocked,lockAccount,unlockAccount} from '../lib/account-session';
import {getAppStorage,isShowcase} from '../lib/showcase-storage';
import {withStorageLock} from '../lib/storage';
import {createVault,unlockVault,manifestSchema,type VaultManifest} from '../lib/vault/crypto';
import {synchronize,SyncJournal,type Domain} from '../lib/vault/cloud-sync';
import {accountTransport} from '../lib/vault/account-transport';
import {localDatabase} from '../lib/vault/local';
import {captureData,applyData,validateData,modules} from '../lib/vault/account-data';
type Session={account:string;generation:number;key:CryptoKey;manifest:VaultManifest;health:boolean};
type Generated=Awaited<ReturnType<typeof createVault>>&{operation:string};
type Controls={authenticated:(id:string)=>Promise<void>;forget:()=>void;prepare:()=>Promise<void>;enroll:()=>Promise<void>;unlock:(secret:string)=>Promise<void>;sync:()=>Promise<void>;setHealth:(value:boolean)=>void;health:boolean;account:string|null;manifest:VaultManifest|null|undefined;generated:Generated|null;cancel:()=>void;busy:boolean;opened:boolean;message:string;error:string;last:string};
const Context=createContext<Controls|null>(null);
export function VaultSyncProvider({children}:{children:ReactNode}){
 const [account,setAccount]=useState<string|null>(null),[manifest,setManifest]=useState<VaultManifest|null>(),[generated,setGenerated]=useState<Generated|null>(null),[health,setHealthState]=useState(false),[busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[message,setMessage]=useState('Account sync is locked.'),[error,setError]=useState(''),[last,setLast]=useState('');
 const session=useRef<Session|null>(null),running=useRef(false),auto=useRef(false),idle=useRef(0),syncRef=useRef<()=>Promise<void>>(async()=>{});
 function forget(){session.current=null;auto.current=false;setOpened(false);setGenerated(null);setManifest(undefined);setAccount(null);setHealthState(false);setMessage('Account sync is locked.');setLast('');setError('');}
 function selectionFence(id:string,generation:number){if(isShowcase()||getAccountScope()!==id||getAccountGeneration()!==generation)throw Error('Account selection changed. No result was applied.');}
 async function guarded(work:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setError('');try{await work();}catch(e){auto.current=false;setError(e instanceof Error?e.message:'Sync was not confirmed. Local records were preserved.');setMessage('Needs attention. Automatic sync paused.');}finally{running.current=false;setBusy(false);}}
 async function authenticated(id:string){
  if(session.current?.account===id&&!isAccountLocked())return;
  await guarded(async()=>{const generation=getAccountGeneration(),fence=()=>selectionFence(id,generation);fence();const page=z.object({manifest:manifestSchema.nullable()}).parse(await accountTransport(id,fence).read(null));fence();setAccount(id);setManifest(page.manifest);setMessage(page.manifest?'Enter the recovery secret saved when this vault was created.':'Create a separate encrypted account vault. Local Demo records are not imported.');});
 }
 function open(id:string,key:CryptoKey,m:VaultManifest){unlockAccount();const generation=getAccountGeneration();session.current={account:id,generation,key,manifest:m,health};auto.current=true;idle.current=Date.now();setOpened(true);setAccount(id);setManifest(m);setGenerated(null);setMessage('Vault unlocked. Preparing account sync…');}
 async function prepare(){await guarded(async()=>{if(!account||manifest!==null)throw Error('Verify an account without an existing vault first.');const generation=getAccountGeneration(),result=await createVault();selectionFence(account,generation);setGenerated({...result,operation:crypto.randomUUID()});});}
 async function enroll(){await guarded(async()=>{if(!account||!generated||manifest!==null)throw Error('Prepare and save the recovery secret first.');const generation=getAccountGeneration(),fence=()=>selectionFence(account,generation);await accountTransport(account,fence).write({protocol:1,vault:generated.manifest.vault,operation:generated.operation,base:0,changes:[],manifest:generated.manifest});fence();open(account,generated.key,generated.manifest);});if(session.current)await sync();}
 async function unlock(secret:string){await guarded(async()=>{if(!account||!manifest)throw Error('Verify your account first.');const generation=getAccountGeneration(),key=await unlockVault(manifest,secret);selectionFence(account,generation);open(account,key,manifest);});if(session.current)await sync();}
 async function sync(){await guarded(async()=>{
  const selected=session.current;if(!selected)throw Error('Unlock your vault before syncing.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Sync result was not applied.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();setMessage('Syncing encrypted account records…');const storage=getAppStorage(),domains:Domain[]=['finance','habits','settings',...(selected.health?['health' as const]:[])];
   const capturedPending=(await localDatabase.pending(`account:${selected.account}`)).filter(p=>domains.some(d=>modules[d].key===p.domain));
   const local=await captureData(storage,domains);fence();const result=await synchronize(accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,local,validateData,fence,domains);
   fence();await applyData(storage,local,result.data,fence);await result.commit();fence();for(const pending of capturedPending){fence();await localDatabase.acknowledge(`account:${selected.account}`,pending.operation);}setLast(new Date().toLocaleTimeString());setMessage('Account records synced and acknowledged.');auto.current=true;
  });
 });}
 function setHealth(value:boolean){setHealthState(value);if(session.current)session.current.health=value;}
 useEffect(()=>{syncRef.current=sync;});
 useEffect(()=>{
  let debounce:ReturnType<typeof setTimeout>|undefined;
  const change=()=>{if(isAccountLocked()||(session.current&&getAccountScope()!==session.current.account)){session.current=null;auto.current=false;setOpened(false);setGenerated(null);setManifest(undefined);setAccount(null);setHealthState(false);setError('');setLast('');setMessage('Account sync is locked.');}};
  const schedule=()=>{clearTimeout(debounce);if(document.hidden||running.current||!auto.current||!session.current)return;debounce=setTimeout(()=>{if(!document.hidden)void syncRef.current();},1000);};
  const activity=()=>{idle.current=Date.now();};
  const interval=setInterval(()=>{if(session.current&&Date.now()-idle.current>15*60_000){lockAccount();return;}schedule();},30000);
  window.addEventListener(ACCOUNT_CHANGE,change);window.addEventListener('zigoals:private-change',schedule);window.addEventListener('focus',schedule);window.addEventListener('online',schedule);document.addEventListener('visibilitychange',schedule);window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
  return()=>{session.current=null;clearTimeout(debounce);clearInterval(interval);window.removeEventListener(ACCOUNT_CHANGE,change);window.removeEventListener('zigoals:private-change',schedule);window.removeEventListener('focus',schedule);window.removeEventListener('online',schedule);document.removeEventListener('visibilitychange',schedule);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
 },[]);
 return <Context.Provider value={{authenticated,forget,prepare,enroll,unlock,sync,setHealth,health,account,manifest,generated,cancel:()=>setGenerated(null),busy,opened,message,error,last}}>{children}</Context.Provider>;
}
export function VaultSyncControls(){
 const c=useContext(Context),[secret,setSecret]=useState(''),[saved,setSaved]=useState(false);useEffect(()=>{const clear=()=>{setSecret('');setSaved(false);};window.addEventListener(ACCOUNT_CHANGE,clear);return()=>window.removeEventListener(ACCOUNT_CHANGE,clear);},[]);if(!c)throw Error('Vault provider unavailable.');
 return <div id="encrypted-sync"><AccountAccess onAuthenticated={c.authenticated} onSignout={c.forget}/><section className="panel" aria-label="Encrypted account sync"><p className="eyebrow">ENCRYPTED ACCOUNT SYNC</p><h2>Keep your account records together.</h2><p>Goals, Wealth, Habits and Today preferences sync after you unlock this vault. Email codes cannot decrypt it. Keep the recovery secret separately; losing it can make cloud records unrecoverable.</p><p>Account records have a separate local copy in this browser. That copy is not encrypted at rest. Locking hides it in the app; anyone with access to this browser profile may still read it. The vault locks after 15 minutes without interaction.</p>
 <label className="checkbox"><input type="checkbox" checked={c.health} disabled={c.busy} onChange={e=>c.setHealth(e.target.checked)}/>Sync my Health records with this account. Turning this off stops Health transfers on this tab; it does not delete existing encrypted cloud copies.</label>
 {c.account&&c.manifest===null&&!c.generated&&<button className="primary" disabled={c.busy} onClick={()=>{setSaved(false);void c.prepare();}}>Create encrypted account vault</button>}
 {c.generated&&<div className="notice"><label>New vault recovery secret<input value={c.generated.recovery} readOnly autoComplete="off" spellCheck={false}/></label><p>Save this privately now. It is shown only while preparing this vault.</p><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved this vault recovery secret separately.</label><button className="primary" disabled={!saved||c.busy} onClick={()=>void c.enroll()}>Confirm and create vault</button><button className="secondary" disabled={c.busy} onClick={c.cancel}>Cancel</button></div>}
 {c.manifest&&!c.opened&&<form onSubmit={e=>{e.preventDefault();const value=secret;setSecret('');void c.unlock(value);}}><label>Vault recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><button className="primary" disabled={c.busy||!secret}>Unlock account vault</button></form>}
 {c.opened&&<div className="actions"><button className="primary" disabled={c.busy} onClick={()=>void c.sync()}>Sync now</button><button className="secondary" onClick={()=>{setSecret('');lockAccount();}}>Lock account vault</button></div>}
 <p role="status">{c.message}{c.last&&` Last acknowledgement: ${c.last}.`}</p>{c.error&&<p role="alert">{c.error}</p>}<p className="fine">Conflicting financial changes pause sync for review. Encrypted backups remain a separate recovery copy. Account deletion and key rotation are not available in this preview. Session access can be revoked below.</p></section>{c.account&&<AccountDevices account={c.account}/>}</div>;
}
/** Public status only; keys, recovery material and private records never leave the provider. */
export function useVaultStatus(){const c=useContext(Context);return {opened:c?.opened??false,busy:c?.busy??false,message:c?.message??'',error:c?.error??'',last:c?.last??'',account:c?.account??null};}
