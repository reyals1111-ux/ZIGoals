'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {z} from 'zod';
import {AccountDeletion} from './account-deletion';
import {VaultRotationControls} from './vault-rotation-controls';
import {rotateVault} from '../lib/vault/rotation';
import {rotationTransport} from '../lib/vault/rotation-transport';
import {LocalAccountAttach} from './local-account-attach';
import {planLocalAttach,assertAttachSourceUnchanged,type AttachPlan} from '../lib/vault/local-attach';
import {encryptBackup} from '../lib/vault/backup';
import {encryptPendingRecovery} from '../lib/vault/pending-recovery';
import {AccountDevices} from './account-devices';
import {AccountAccess} from './account-access';
import {ACCOUNT_CHANGE,getAccountGeneration,getAccountScope,isAccountLocked,lockAccount,unlockAccount} from '../lib/account-session';
import {getAppStorage,isShowcase} from '../lib/showcase-storage';
import {withStorageLock} from '../lib/storage';
import {createVault,unlockVault,manifestSchema,type VaultManifest} from '../lib/vault/crypto';
import {synchronize,cloudSnapshot,SyncJournal,type Domain} from '../lib/vault/cloud-sync';
import {accountTransport} from '../lib/vault/account-transport';
import {localDatabase} from '../lib/vault/local';
import {captureData,applyData,validateData,modules} from '../lib/vault/account-data';
type Session={account:string;generation:number;key:CryptoKey;manifest:VaultManifest;health:boolean};
type Generated=Awaited<ReturnType<typeof createVault>>&{operation:string};
type AttachPreview={plan:AttachPlan;file:string;recovery:string;generation:number};
type RotationKeys=Awaited<ReturnType<typeof createVault>>;
type Controls={eraseAccount:(identity:boolean)=>Promise<{deleted:boolean;providerDeleted?:boolean;providerPending?:boolean}|null>;rotationKeys:RotationKeys|null;stagedRotation:VaultManifest|null;prepareRotation:()=>Promise<void>;resumeRotation:(secret:string)=>Promise<void>;finishRotation:()=>Promise<void>;abortRotation:()=>Promise<void>;cancelRotation:()=>void;attachPreview:AttachPreview|null;prepareAttach:(domains:Domain[])=>Promise<void>;confirmAttach:()=>Promise<void>;cancelAttach:()=>void;authenticated:(id:string)=>Promise<void>;forget:()=>void;prepare:()=>Promise<void>;enroll:()=>Promise<void>;unlock:(secret:string)=>Promise<void>;sync:()=>Promise<void>;preparePendingRecovery:()=>Promise<void>;pendingRecovery:{file:string;recovery:string}|null;clearPendingRecovery:()=>void;setHealth:(value:boolean)=>void;health:boolean;account:string|null;manifest:VaultManifest|null|undefined;generated:Generated|null;cancel:()=>void;busy:boolean;opened:boolean;message:string;error:string;last:string};
const Context=createContext<Controls|null>(null);
export function VaultSyncProvider({children}:{children:ReactNode}){
 const [account,setAccount]=useState<string|null>(null),[manifest,setManifest]=useState<VaultManifest|null>(),[generated,setGenerated]=useState<Generated|null>(null),[health,setHealthState]=useState(false),[busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[message,setMessage]=useState('Account sync is locked.'),[error,setError]=useState(''),[last,setLast]=useState('');
 const [attachPreview,setAttachPreview]=useState<AttachPreview|null>(null);
 const [pendingRecovery,setPendingRecovery]=useState<{file:string;recovery:string}|null>(null);
 const [rotationKeys,setRotationKeys]=useState<RotationKeys|null>(null),[stagedRotation,setStagedRotation]=useState<VaultManifest|null>(null);
 const session=useRef<Session|null>(null),running=useRef(false),auto=useRef(false),idle=useRef(0),syncRef=useRef<()=>Promise<void>>(async()=>{});
 function forget(){setRotationKeys(null);setStagedRotation(null);setAttachPreview(null);setPendingRecovery(null);session.current=null;auto.current=false;setOpened(false);setGenerated(null);setManifest(undefined);setAccount(null);setHealthState(false);setMessage('Account sync is locked.');setLast('');setError('');}
 function selectionFence(id:string,generation:number){if(isShowcase()||getAccountScope()!==id||getAccountGeneration()!==generation)throw Error('Account selection changed. No result was applied.');}
 async function guarded(work:()=>Promise<void>,pauseOnError=true){if(running.current)return;running.current=true;setBusy(true);setError('');try{await work();}catch(e){if(pauseOnError)auto.current=false;setError(e instanceof Error?e.message:'Sync was not confirmed. Local records were preserved.');setMessage(pauseOnError?'Needs attention. Automatic sync paused.':'Recovery copy was not prepared. The sync queue was unchanged.');}finally{running.current=false;setBusy(false);}}
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
   fence();await applyData(storage,local,result.data,fence);await result.commit();fence();for(const pending of capturedPending){fence();await localDatabase.acknowledge(`account:${selected.account}`,pending.operation);}fence();setLast(new Date().toLocaleTimeString());setMessage('Account records synced and acknowledged.');auto.current=true;
  });
 });}
 async function eraseAccount(identity:boolean){let result:{deleted:boolean;providerDeleted?:boolean;providerPending?:boolean}|null=null;await guarded(async()=>{const {selected,fence}=rotationSession();auto.current=false;await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{fence();const response=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json','x-zigoals-account':selected.account},cache:'no-store',signal:AbortSignal.timeout(20000),body:JSON.stringify({action:'delete',operation:identity?{action:'delete-account',confirm:'DELETE ACCOUNT'}:{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}})});fence();if(!response.ok)throw Error('Deletion was not confirmed. Keep your backup; retry after checking account status.');const text=await response.text();if(text.length>4096)throw Error('Deletion acknowledgement unavailable.');result=z.object({deleted:z.literal(true),providerDeleted:z.boolean().optional(),providerPending:z.boolean().optional()}).parse(JSON.parse(text));lockAccount();});});return result;}
 function rotationSession(){const selected=session.current;if(!selected)throw Error('Unlock the vault before rotation.');const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Account changed. Rotation paused.');};return {selected,fence};}
 async function prepareRotation(){await guarded(async()=>{const {selected,fence}=rotationSession();auto.current=false;const status=z.object({rotation:z.object({manifest:manifestSchema}).nullable()}).parse(await rotationTransport(selected.account,fence).request());fence();if(status.rotation){setStagedRotation(status.rotation.manifest);return;}const next=await createVault(selected.manifest.vault,selected.manifest.epoch+1);fence();setRotationKeys(next);});}
 async function resumeRotation(secret:string){await guarded(async()=>{const {fence}=rotationSession();if(!stagedRotation)throw Error('Read staged rotation first.');const key=await unlockVault(stagedRotation,secret);fence();setRotationKeys({key,manifest:stagedRotation,recovery:secret});});}
 async function finishRotation(){await guarded(async()=>{const {selected,fence}=rotationSession(),next=rotationKeys;if(!next)throw Error('Prepare and save the new secret first.');auto.current=false;
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();const journal=new SyncJournal(selected.account),state=await journal.read(),local=await captureData(getAppStorage(),['finance','habits','settings',...(selected.health?['health' as const]:[])]);fence();
   if(Object.entries(local).some(([domain,raw])=>raw!==state.base[domain as Domain]))throw Error('Sync local changes before rotating. Your saved rotation secret remains available.');
   await rotateVault(accountTransport(selected.account,fence),rotationTransport(selected.account,fence),journal,selected.key,selected.manifest,next.key,next.manifest,fence);fence();
   session.current={...selected,key:next.key,manifest:next.manifest};setManifest(next.manifest);setRotationKeys(null);setStagedRotation(null);setMessage('Vault key rotated and activated. Other devices need the new recovery secret.');auto.current=true;
  });
 });}
 async function abortRotation(){await guarded(async()=>{const {selected,fence}=rotationSession();const transport=rotationTransport(selected.account,fence),status=z.object({rotation:z.object({operation:z.uuid()}).nullable()}).parse(await transport.request());if(status.rotation)await transport.request({action:'abort',operation:status.rotation.operation});fence();setStagedRotation(null);setRotationKeys(null);auto.current=true;setMessage('Staged rotation discarded. Active vault data was kept.');});}
 function cancelRotation(){setRotationKeys(null);setStagedRotation(null);auto.current=true;}
 async function preparePendingRecovery(){await guarded(async()=>{
  const selected=session.current;if(!selected)throw Error('Unlock your account vault before exporting pending work.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Account changed or locked. Recovery export was cancelled.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{fence();const state=await new SyncJournal(selected.account).read();fence();const result=await encryptPendingRecovery(selected.account,state);fence();setPendingRecovery(result);});
  setMessage('Encrypted pending-work recovery copy prepared. The original queue remains unchanged and blocked until reviewed.');
 },false);}
 async function prepareAttach(domains:Domain[]){await guarded(async()=>{
  auto.current=false;setAttachPreview(null);const selected=session.current;if(!selected)throw Error('Unlock the account vault first.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Copy review cancelled.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();if(domains.includes('health')&&!selected.health)throw Error('Enable Health sync permission first.');
   const journal=await new SyncJournal(selected.account).read();if(journal.pending)throw Error('Resolve pending account sync before copying local records.');
   const remote=await cloudSnapshot(accountTransport(selected.account,fence),selected.key,selected.manifest,journal.revision,domains,journal.headRevision,journal.headDigest);
   const source=await captureData(window.localStorage,domains),accountData=await captureData(getAppStorage(),domains);fence();
   const plan=planLocalAttach(source,accountData,remote.data,domains,selected.health),backup=await encryptBackup(plan.data);fence();
   setAttachPreview({plan,...backup,generation:selected.generation});setMessage('Review your local copy and save its encrypted backup. Automatic sync is paused during review.');
  });
 });}
 async function confirmAttach(){let copied=false;await guarded(async()=>{
  const selected=session.current,preview=attachPreview;if(!selected||!preview||selected.generation!==preview.generation)throw Error('Prepare a new local copy for this account.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Copy cancelled.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();const domains=preview.plan.domains;if(domains.includes('health')&&!selected.health)throw Error('Health sync permission changed. Prepare a new copy.');
   const journal=await new SyncJournal(selected.account).read();if(journal.pending)throw Error('Resolve pending account sync first.');
   const source=await captureData(window.localStorage,domains);assertAttachSourceUnchanged(preview.plan,source);
   const before=await captureData(getAppStorage(),domains),remote=await cloudSnapshot(accountTransport(selected.account,fence),selected.key,selected.manifest,journal.revision,domains,journal.headRevision,journal.headDigest);
   const plan=planLocalAttach(source,before,remote.data,domains,selected.health);fence();
   try{await applyData(getAppStorage(),before,plan.data,fence);}catch{setAttachPreview(null);throw Error('Copy interrupted. Original local records and the encrypted backup are unchanged. No partial set of copied account sections was committed. Review the account before retrying.');}
   fence();setAttachPreview(null);copied=true;setMessage('Selected records copied to this account on this browser. Original local records were kept. Preparing encrypted sync…');
  });
 });if(copied)await sync();}
 function cancelAttach(){setAttachPreview(null);auto.current=!!session.current;setMessage('Local copy review closed. Original local records were not changed.');}
 function setHealth(value:boolean){setAttachPreview(null);setHealthState(value);if(session.current)session.current.health=value;}
 useEffect(()=>{syncRef.current=sync;});
 useEffect(()=>{
  let debounce:ReturnType<typeof setTimeout>|undefined;
  const change=()=>{if(isAccountLocked()||(session.current&&getAccountScope()!==session.current.account)){session.current=null;auto.current=false;setRotationKeys(null);setStagedRotation(null);setAttachPreview(null);setPendingRecovery(null);setOpened(false);setGenerated(null);setManifest(undefined);setAccount(null);setHealthState(false);setError('');setLast('');setMessage('Account sync is locked.');}};
  const schedule=()=>{clearTimeout(debounce);if(document.hidden||running.current||!auto.current||!session.current)return;debounce=setTimeout(()=>{if(!document.hidden)void syncRef.current();},1000);};
  const activity=()=>{idle.current=Date.now();};
  const interval=setInterval(()=>{if(session.current&&Date.now()-idle.current>15*60_000){lockAccount();return;}schedule();},30000);
  window.addEventListener(ACCOUNT_CHANGE,change);window.addEventListener('zigoals:private-change',schedule);window.addEventListener('focus',schedule);window.addEventListener('online',schedule);document.addEventListener('visibilitychange',schedule);window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
  return()=>{session.current=null;clearTimeout(debounce);clearInterval(interval);window.removeEventListener(ACCOUNT_CHANGE,change);window.removeEventListener('zigoals:private-change',schedule);window.removeEventListener('focus',schedule);window.removeEventListener('online',schedule);document.removeEventListener('visibilitychange',schedule);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
 },[]);
 return <Context.Provider value={{eraseAccount,rotationKeys,stagedRotation,prepareRotation,resumeRotation,finishRotation,abortRotation,cancelRotation,attachPreview,prepareAttach,confirmAttach,cancelAttach,authenticated,forget,prepare,enroll,unlock,sync,preparePendingRecovery,pendingRecovery,clearPendingRecovery:()=>setPendingRecovery(null),setHealth,health,account,manifest,generated,cancel:()=>setGenerated(null),busy,opened,message,error,last}}>{children}</Context.Provider>;
}
export function VaultSyncControls(){
 const c=useContext(Context),[secret,setSecret]=useState(''),[saved,setSaved]=useState(false),[pendingSaved,setPendingSaved]=useState(false);useEffect(()=>{const clear=()=>{setSecret('');setSaved(false);setPendingSaved(false);};window.addEventListener(ACCOUNT_CHANGE,clear);return()=>window.removeEventListener(ACCOUNT_CHANGE,clear);},[]);if(!c)throw Error('Vault provider unavailable.');
 const controls=c;
 function downloadPending(){if(!controls.pendingRecovery||!pendingSaved||!controls.opened||isAccountLocked()||getAccountScope()!==controls.account)return;const url=URL.createObjectURL(new Blob([controls.pendingRecovery.file],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zigoals-encrypted-pending-recovery-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);controls.clearPendingRecovery();setPendingSaved(false);}
 return <div id="encrypted-sync"><AccountAccess onAuthenticated={c.authenticated} onSignout={c.forget}/><section className="panel" aria-label="Encrypted account sync"><p className="eyebrow">ENCRYPTED ACCOUNT SYNC</p><h2>Keep your account records together.</h2><p>Goals, Wealth, Habits and Today preferences sync after you unlock this vault. Email codes cannot decrypt it. Keep the recovery secret separately; losing it can make cloud records unrecoverable.</p><p>Account records have a separate local copy in this browser. That copy is not encrypted at rest. Locking hides it in the app; anyone with access to this browser profile may still read it. The vault locks after 15 minutes without interaction.</p>
 <label className="checkbox"><input type="checkbox" checked={c.health} disabled={c.busy} onChange={e=>c.setHealth(e.target.checked)}/>Sync my Health records with this account. Turning this off stops Health transfers on this tab; it does not delete existing encrypted cloud copies.</label>
 {c.account&&c.manifest===null&&!c.generated&&<button className="primary" disabled={c.busy} onClick={()=>{setSaved(false);void c.prepare();}}>Create encrypted account vault</button>}
 {c.generated&&<div className="notice"><label>New vault recovery secret<input value={c.generated.recovery} readOnly autoComplete="off" spellCheck={false}/></label><p>Save this privately now. It is shown only while preparing this vault.</p><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved this vault recovery secret separately.</label><button className="primary" disabled={!saved||c.busy} onClick={()=>void c.enroll()}>Confirm and create vault</button><button className="secondary" disabled={c.busy} onClick={c.cancel}>Cancel</button></div>}
 {c.manifest&&!c.opened&&<form onSubmit={e=>{e.preventDefault();const value=secret;setSecret('');void c.unlock(value);}}><label>Vault recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><button className="primary" disabled={c.busy||!secret}>Unlock account vault</button></form>}
 {c.opened&&<div className="actions"><button className="primary" disabled={c.busy} onClick={()=>void c.sync()}>Sync now</button><button className="secondary" onClick={()=>{setSecret('');lockAccount();}}>Lock account vault</button></div>}
 {c.opened&&<VaultRotationControls busy={c.busy} prepared={c.rotationKeys} staged={c.stagedRotation} prepare={c.prepareRotation} resume={c.resumeRotation} finish={c.finishRotation} abort={c.abortRotation} cancel={c.cancelRotation}/>}
 {c.opened&&<details><summary>Pending-work recovery</summary><p>If an older or incompatible queued operation blocks sync, prepare a separate encrypted copy before forward recovery. This does not clear, send, or repair the queue. The copy contains the account sync journal, including any selected Health data previously queued.</p><button className="secondary" disabled={c.busy} onClick={()=>{setPendingSaved(false);void c.preparePendingRecovery();}}>Prepare encrypted pending-work copy</button>{c.pendingRecovery&&<div className="notice"><label>Separate recovery secret<input readOnly value={c.pendingRecovery.recovery} autoComplete="off" spellCheck={false}/></label><p>Save this secret separately. It is required to inspect this recovery copy and cannot be replaced by an email code.</p><label className="checkbox"><input type="checkbox" checked={pendingSaved} onChange={e=>setPendingSaved(e.target.checked)}/>I saved this recovery secret separately.</label><button className="primary" disabled={!pendingSaved} onClick={downloadPending}>Download encrypted pending-work copy</button><button className="secondary" onClick={()=>{c.clearPendingRecovery();setPendingSaved(false);}}>Cancel</button></div>}</details>}
 <p role="status">{c.message}{c.last&&` Last acknowledgement: ${c.last}.`}</p>{c.error&&<p role="alert">{c.error}</p>}<p className="fine">Conflicting financial changes pause sync for review. Encrypted backups remain a separate recovery copy. Cloud deletion retains separate local copies and user-held exports. Session access can be revoked below.</p></section><AccountDeletion account={c.account} opened={c.opened} busy={c.busy} erase={c.eraseAccount}/>{c.opened&&<LocalAccountAttach busy={c.busy} health={c.health} preview={c.attachPreview} prepare={c.prepareAttach} confirm={c.confirmAttach} cancel={c.cancelAttach}/>}{c.account&&<AccountDevices account={c.account}/>}</div>;
}
/** Public status only; keys, recovery material and private records never leave the provider. */
export function useVaultStatus(){const c=useContext(Context);return {opened:c?.opened??false,busy:c?.busy??false,message:c?.message??'',error:c?.error??'',last:c?.last??'',account:c?.account??null};}
