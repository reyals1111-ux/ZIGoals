'use client';
import {forgetPushOnThisDevice} from '../lib/push/device';
import {forgetAiAccount} from '../lib/ai/account';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import * as z from 'zod';
import type {ConflictReview,Choices} from '../lib/vault/conflict-review';
import type {ForwardReview} from '../lib/vault/forward-recovery';
import type {DomainReview} from '../lib/vault/domain-lifecycle';
import type {AttachPlan} from '../lib/vault/local-attach';
import {ACCOUNT_CHANGE,adoptAccount,getAccountGeneration,getAccountScope,isAccountLocked,lockAccount,lockEveryTab,unlockAccount,type AccountLockDetail} from '../lib/account-session';
import {getAppStorage,isShowcase} from '../lib/showcase-storage';
import {withStorageLock} from '../lib/storage';
import {createVault,unlockVault,unlockVaultForDevice,createDeviceKey,openDeviceRoot,manifestDigest,manifestSchema,deviceCommitment,deviceCommitmentMatches,sealDigest,type VaultManifest,type SealedRoot} from '../lib/vault/crypto';
import {readDevices,rememberDeviceRecord,forgetDevices,forgetCount,dropDevice,stillRemembered,rememberHealth,bindingOf,replaceDevice,confirmDevice,accountStatus,type AccountDenial,currentSession,type DeviceBinding,type DeviceRecordV1,type DeviceRecordV2} from '../lib/vault/device-unlock';
import {StaleDeviceError,takeAccessDenial,deniesDevice} from '../lib/vault/stale-device';
import {storageMessageOr} from '../lib/storage-error-copy';
import {synchronize,cloudSnapshot,SyncJournal,RevisionConflict,OlderVaultError,OlderCloudError,type Domain,type SyncState} from '../lib/vault/cloud-sync';
import {accountTransport} from '../lib/vault/account-transport';
import {localDatabase} from '../lib/vault/local';
import {captureData,applyData,validateData,modules,isSyncedChangeEvent,LocalRecordsChangedDuringSync} from '../lib/vault/account-data';
import { formatTime } from '../lib/visual-format';
import type {PortfolioStatus} from './portfolio-sync-choice';
import {SYNC_WRITES} from '../lib/vault/sync-writes';
import {choosePortfolioSync,deletePortfolioCopy,portfolioSyncChosen,portfolioTransport,syncPortfolio} from '../lib/vault/portfolio-sync';
type Session={account:string;generation:number;key:CryptoKey;manifest:VaultManifest;health:boolean;device:DeviceBinding|null};
type Sealed={key:CryptoKey;sealed:SealedRoot;deviceKey:CryptoKey;forgets:number|null};
type Generated=Awaited<ReturnType<typeof createVault>>&{operation:string};
type AttachPreview={plan:AttachPlan;generation:number};
type RotationKeys=Awaited<ReturnType<typeof createVault>>;
type Controls={conflictReview:ConflictReview|null;prepareConflict:()=>Promise<void>;confirmConflict:(choices:Choices)=>Promise<void>;cancelConflict:()=>void;forwardReview:ForwardReview|null;prepareForward:()=>Promise<void>;confirmForward:()=>Promise<void>;cancelForward:()=>void;domainReview:DomainReview|null;prepareDomain:(kind:DomainReview['kind'],domain:Domain)=>Promise<void>;confirmDomain:()=>Promise<void>;cancelDomain:()=>void;eraseAccount:(identity:boolean)=>Promise<{deleted:boolean;providerDeleted?:boolean;providerPending?:boolean}|null>;rotationKeys:RotationKeys|null;stagedRotation:VaultManifest|null;prepareRotation:()=>Promise<void>;resumeRotation:(secret:string)=>Promise<void>;finishRotation:()=>Promise<void>;abortRotation:()=>Promise<void>;cancelRotation:()=>void;attachPreview:AttachPreview|null;prepareAttach:(domains:Domain[])=>Promise<void>;confirmAttach:()=>Promise<void>;cancelAttach:()=>void;authenticated:(id:string)=>Promise<void>;forget:()=>void;prepare:()=>Promise<void>;enroll:(remember?:boolean)=>Promise<void>;unlock:(secret:string,remember?:boolean)=>Promise<void>;remembered:boolean;deviceNote:string;forgetDevice:()=>Promise<void>;lockNow:()=>void;registerAccess:()=>()=>void;accessEpoch:number;sync:()=>Promise<void>;preparePendingRecovery:()=>Promise<void>;pendingRecovery:{file:string;recovery:string}|null;clearPendingRecovery:()=>void;setHealth:(value:boolean)=>void;health:boolean;healthAsk:boolean;vaultGone:'missing'|'older'|null;startOver:()=>Promise<void>;accessDenied:(code:AccountDenial['denied'])=>Promise<void>;account:string|null;manifest:VaultManifest|null|undefined;generated:Generated|null;cancel:()=>void;busy:boolean;opened:boolean;message:string;error:string;last:string;portfolio:PortfolioStatus|null;syncPortfolioNow:(choice?:'keep-device'|'keep-cloud')=>Promise<void>;deletePortfolioCloud:()=>Promise<void>};
const Context=createContext<Controls|null>(null);
/** The provider's controls, for the Settings panel (components/vault-sync-panel.tsx, Session X Part 5b). */
export function useVaultControls(){return useContext(Context);}
/** Refusals of the Health consent checkbox; the checkbox is described by the error while one is shown. */
export const HEALTH_HELD_REFUSAL='Health is kept locally after cloud deletion. Use Review restoring local section before enabling transfers.',HEALTH_UNVERIFIED_REFUSAL='Health permission could not be verified. Transfers remain off.';
/** Remember this device (ADR-008, owner decision M1): the choice, and what it means, always shown together. */
export const REMEMBER_LABEL='Remember on this device — don’t use on shared computers',REMEMBER_NOTE='ZIGoals then opens your account records here without the recovery secret, also after a restart; anyone who can use this browser on this device can open them too. Forget this device in Settings at any time; locking also forgets it.';
/** Session Y Part 5 (B4): what a Health restore says instead of turning Health sync on. */
export const HEALTH_RESTORE_ASK='Your Health section on this device is approved for a new cloud copy. Health sync stays off until you tick “Sync my Health records with this account” below; until then your Health records stay on this device.';
/** Session Y Part 5 (B6, B3): what the person reads when the cloud's vault is gone or older than this device's record. */
export const VAULT_MISSING='Your account had encrypted sync on this device, but the cloud has no vault for it now. Nothing was changed on this device. This can happen when the sync service was restored from an earlier copy, so try again later. If the vault stays missing, you can start a new one below.',VAULT_OLDER='The vault in the cloud is older than the one this device last synced with, so nothing was applied. Your records on this device were not changed. This can happen when the sync service was restored from an earlier copy, or a new vault was made on another device after that, so try again later. If it stays like this, you can re-link this device below.';
/** True when this device's sync journal shows an earlier vault for the account. */
// Held sections alone are not an earlier vault: a start-over carries them into the fresh journal (below).
const hadVault=(state:SyncState)=>state.revision>0||state.headRevision>0||!!state.headDigest||state.epoch!==undefined||Object.keys(state.base).length>0||!!state.pending;
const freshJournal=():SyncState=>({version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null});
/** Session Y Part 5 (A7): what a remembered device says when the server ended it. */
export const DENIED_REVOKED='This device is no longer remembered because its session was signed out on another device. Your records on this device were not changed; unlocking again needs the recovery secret.',DENIED_DELETED='This device is no longer remembered because the account was deleted. Your records on this device were not changed.';
const NOT_FORGOTTEN='This device could not be forgotten. Close other ZIGoals tabs and try again, or clear this site’s data in your browser settings.';
export function VaultSyncProvider({children}:{children:ReactNode}){
 const [account,setAccount]=useState<string|null>(null),[manifest,setManifest]=useState<VaultManifest|null>(),[generated,setGenerated]=useState<Generated|null>(null),[health,setHealthState]=useState(false),[healthAsk,setHealthAsk]=useState(false),[vaultGone,setVaultGone]=useState<'missing'|'older'|null>(null),[busy,setBusy]=useState(false),[opened,setOpened]=useState(false),[message,setMessage]=useState('Account sync is locked.'),[error,setError]=useState(''),[last,setLast]=useState('');
 const [conflictReview,setConflictReview]=useState<ConflictReview|null>(null);
 const [forwardReview,setForwardReview]=useState<ForwardReview|null>(null);
 const [domainReview,setDomainReview]=useState<DomainReview|null>(null);
 const [attachPreview,setAttachPreview]=useState<AttachPreview|null>(null);
 const [pendingRecovery,setPendingRecovery]=useState<{file:string;recovery:string}|null>(null);
 const [rotationKeys,setRotationKeys]=useState<RotationKeys|null>(null),[stagedRotation,setStagedRotation]=useState<VaultManifest|null>(null);
 const [portfolio,setPortfolio]=useState<PortfolioStatus|null>(null);
 const session=useRef<Session|null>(null),running=useRef<symbol|null>(null),auto=useRef(false),idle=useRef(0),syncRef=useRef<()=>Promise<void>>(async()=>{});
 // Remember this device (ADR-008). Lock now blocks reopening in this tab until the next unlock with the secret; one reopen
 // runs at a time, a failed one waits 30 s before a focus tries again; `access` counts the AccountAccess panels shown (Settings),
 // which check identity on load themselves; `verified` is the account that panel last verified.
 const [remembered,setRemembered]=useState(false),[deviceNote,setDeviceNote]=useState(''),[accessEpoch,setAccessEpoch]=useState(0);
 const manualLock=useRef(false),reopening=useRef(false),retryAt=useRef(0),access=useRef(0),verified=useRef<string|null>(null),reopenRef=useRef<(reason:'load'|'focus'|'expiry')=>Promise<void>>(async()=>{});
 // A local edit during a running sync is not in that sync's snapshot: remember it and schedule one follow-up sync when the sync finishes.
 const syncing=useRef(false),followUp=useRef(false),scheduleRef=useRef<()=>void>(()=>{});
 // The automatic sync that is running now (if any), and whether a person's action is waiting for it to end.
 const automaticRun=useRef<Promise<void>|null>(null),waiting=useRef(false);
 function forget(){setHealthAsk(false);setVaultGone(null);running.current=null;followUp.current=false;setBusy(false);setPortfolio(null);setConflictReview(null);setForwardReview(null);setDomainReview(null);setRotationKeys(null);setStagedRotation(null);setAttachPreview(null);setPendingRecovery(null);session.current=null;auto.current=false;setOpened(false);setGenerated(null);setManifest(undefined);setAccount(null);setHealthState(false);setMessage('Account sync is locked.');setLast('');setError('');
  // Sign-out forgets every remembered device on this browser; its server session is revoked too, so nothing it held can open again.
  verified.current=null;setRemembered(false);setDeviceNote('');void forgetDevices().catch(()=>setDeviceNote(NOT_FORGOTTEN));}
 function selectionFence(id:string,generation:number){if(isShowcase()||getAccountScope()!==id||getAccountGeneration()!==generation)throw Error('Account selection changed. No result was applied.');}
 // Account changes invalidate operation ownership; an obsolete request cannot block or update its successor.
 // One operation at a time. An automatic sync never starts while another operation runs. A person's action that
 // arrives while an automatic sync runs (the sync starts a moment before the panel shows itself busy, so the button
 // still looked enabled) waits for that sync and then runs once, instead of vanishing. Two of the person's own actions
 // still never overlap: a second one while the first runs is ignored, as before.
 async function guarded(work:()=>Promise<void>,pauseOnError=true,automatic=false){
  if(running.current){const pending=automaticRun.current;if(automatic||!pending||waiting.current)return;waiting.current=true;const selected=session.current;try{await pending;}finally{waiting.current=false;}if(running.current||session.current!==selected)return;}
  const operation=Symbol('vault operation');running.current=operation;setBusy(true);setError('');
  let ended=()=>{};const run=automatic?new Promise<void>(resolve=>{ended=resolve;}):null;if(run)automaticRun.current=run;
  try{await work();}catch(e){if(running.current!==operation)return;if(e instanceof StaleDeviceError)dropStale();if(e instanceof OlderVaultError||e instanceof OlderCloudError)setVaultGone('older');if(pauseOnError)auto.current=false;setError(e instanceof Error?e.message:'Sync was not confirmed. Local records were preserved.');setMessage(pauseOnError?'Needs attention. Automatic sync paused.':'Recovery copy was not prepared. The sync queue was unchanged.');}finally{if(running.current===operation){running.current=null;setBusy(false);}if(run){if(automaticRun.current===run)automaticRun.current=null;ended();}}
 }
 // Settings' AccountAccess calls this once it verified the account; a remembered device then opens without the secret.
 // A quiet call (a reopen on this device) keeps a failed manifest read to itself instead of pausing sync.
 async function authenticated(id:string,quiet=false){
  if(!quiet)verified.current=id;
  if(session.current?.account===id&&!isAccountLocked())return;
  let reopened=false;
  await guarded(async()=>{const generation=getAccountGeneration(),fence=()=>selectionFence(id,generation);fence();let page;try{page=z.object({manifest:manifestSchema.nullable()}).parse(await accountTransport(id,fence).read(null));}catch(error){if(quiet)return;throw error;}fence();
   // A remembered device is tried first, so the secret box never shows while it opens.
   if(await openRemembered(id,page.manifest,fence)){reopened=true;return;}
   // Session Y Part 5, FIX_PLAN B6 (Q-SYNC-08): no vault in the cloud while this device's sync journal shows one (or cannot be
   // read) is never taken for a fresh start; the person decides, through startOver, after reading why.
   if(page.manifest===null&&await new SyncJournal(id).read().then(hadVault,()=>true)){fence();setAccount(id);setManifest(undefined);setVaultGone('missing');setMessage(VAULT_MISSING);return;}
   setVaultGone(null);setAccount(id);setManifest(page.manifest);setMessage(page.manifest?'Enter the recovery secret saved when this vault was created.':'Create a separate encrypted account vault. Local Demo records are not imported.');},true,quiet);
  if(reopened&&session.current)await sync(quiet);
 }
 /**
  * Opens the vault with what this device remembered, only for the same verified account, the same server session (a new
  * sign-in needs the secret once) and the live manifest (a key rotation or a new vault needs it too). Anything stale is
  * deleted; a check that cannot be made now (offline) keeps the record. False: the recovery secret is needed.
  */
 async function openRemembered(id:string,m:VaultManifest|null,fence:()=>void):Promise<boolean>{
  if(manualLock.current||isShowcase())return false;
  let records;try{records=await readDevices();}catch{return false;}fence();
  if(records.some(record=>record.account!==id)){await forgetDevices().catch(()=>{});fence();setRemembered(false);return false;}
  const record=records[0];if(!record)return false;
  let binding=bindingOf(record);const drop=async()=>{await dropDevice(binding).catch(()=>{});setRemembered(false);};
  if(!m||record.vault!==m.vault||record.epoch!==m.epoch||record.manifest!==await manifestDigest(m)){await drop();fence();return false;}
  setRemembered(true);
  const current=await currentSession(id,AbortSignal.timeout(15000)).catch(()=>null);fence();
  if(current===null)return false;
  if(current!==record.session){await drop();fence();return false;}
  let key:CryptoKey;
  // Version 2 holds the root itself: it opens only when it still derives the record's commitment. Version 1 is unsealed
  // as before and then migrated (B1); if the migration fails it stays version 1 and this open goes ahead.
  if(record.version===2){if(!await deviceCommitmentMatches(record.root,id,record.manifest,record.commitment)){await drop();fence();return false;}key=record.root;}
  else{try{key=await openDeviceRoot(record.key,record.sealed,id,m);}catch{await drop();fence();return false;}fence();binding=await migrateDevice(record,key);}
  fence();
  // The remembered Health choice (M1 e) passes the same check as ticking the box: not while Health is held after deletion.
  const consent=record.health&&!await healthHeld(id);fence();
  if(!await stillRemembered(binding).catch(()=>false)){fence();setRemembered(false);return false;}fence();
  open(id,key,m,consent,binding);setDeviceNote('');
  if(record.health&&!consent)void rememberHealth(binding,false).catch(()=>{});
  return true;
 }
 /**
  * Session U Part 5 (B1): replaces a version 1 record by its version 2 form after a successful open. The version 2 record
  * is written by compare-and-swap, read back and checked (its stored root must derive its commitment) before it counts;
  * any failure puts the version 1 record back, so this device never loses its remember to the migration. The new record
  * keeps the seal's digest, so another tab that opened with the version 1 record still recognises it.
  */
 async function migrateDevice(record:DeviceRecordV1,key:CryptoKey):Promise<DeviceBinding>{
  try{
   const next:DeviceRecordV2={version:2,id:crypto.randomUUID(),account:record.account,vault:record.vault,epoch:record.epoch,manifest:record.manifest,session:record.session,health:record.health,createdAt:record.createdAt,commitment:await deviceCommitment(key,record.account,record.manifest),migratedFrom:await sealDigest(record.sealed),root:key};
   if(!await replaceDevice(bindingOf(record) as DeviceRecordV1,next))return bindingOf(record);
   if(await confirmDevice(next).catch(()=>false))return bindingOf(next);
   await replaceDevice(next,record).catch(()=>false);
  }catch{/* The version 1 record stays as it was. */}
  return bindingOf(record);
 }
 async function healthHeld(id:string){try{return !!(await new SyncJournal(id).read()).heldDomains?.includes('health');}catch{return true;}}
 function open(id:string,key:CryptoKey,m:VaultManifest,consent:boolean,device:DeviceBinding|null=null){unlockAccount();const generation=getAccountGeneration();session.current={account:id,generation,key,manifest:m,health:consent,device};auto.current=true;idle.current=Date.now();manualLock.current=false;setOpened(true);setAccount(id);setManifest(m);setHealthState(consent);setGenerated(null);setRemembered(!!device);setMessage('Vault unlocked. Preparing account sync…');}
 /** One decryption with the recovery secret that also seals the root for this device (before it is wiped). */
 async function sealForDevice(m:VaultManifest,secret:string,id:string):Promise<Sealed>{const forgets=await forgetCount().catch(()=>null),deviceKey=await createDeviceKey(),{key,sealed}=await unlockVaultForDevice(m,secret,id,deviceKey);return {key,sealed,deviceKey,forgets};}
 /** Remembers this device for the vault just opened. The vault is open either way: a failure only means the secret is asked for next time. */
 async function keepDevice(id:string,m:VaultManifest,device:Sealed){
  const selected=session.current;if(!selected||selected.account!==id)return;
  const fence=()=>{if(session.current!==selected||isAccountLocked()||getAccountScope()!==id)throw Error('Vault locked. This device was not remembered.');};
  try{
   if(device.forgets===null)throw Error('Device storage did not answer.');
   const current=await currentSession(id,AbortSignal.timeout(15000));fence();if(!current)throw Error('The account session could not be confirmed.');
   const meta={account:id.toLowerCase(),vault:m.vault,epoch:m.epoch,manifest:await manifestDigest(m),session:current,health:selected.health,createdAt:new Date().toISOString()};
   // Session U Part 5 (B1): version 2, the root key itself, where this browser can store and read back that key object;
   // otherwise version 1 as before (owner decision: such a browser keeps version 1).
   const v2:DeviceRecordV2={version:2,id:crypto.randomUUID(),...meta,commitment:await deviceCommitment(device.key,meta.account,meta.manifest),root:device.key},v1:DeviceRecordV1={version:1,...meta,sealed:device.sealed,key:device.deviceKey};
   // A sign-out, Lock now or Forget that ran meanwhile wins: nothing is stored, or what was stored is taken back.
   const record=await rememberDeviceRecord(v2,v1,device.forgets);if(!record)return;
   const binding=bindingOf(record);
   try{fence();}catch(error){await dropDevice(binding).catch(()=>{});throw error;}
   selected.device=binding;setRemembered(true);setDeviceNote('');
  }catch(error){if(session.current===selected)setDeviceNote(`This device was not remembered, so unlocking again will need the recovery secret. ${storageMessageOr(error,'Try again at your next unlock.')}`);}
 }
 async function prepare(){await guarded(async()=>{if(!account||manifest!==null)throw Error('Verify an account without an existing vault first.');const generation=getAccountGeneration(),result=await createVault();selectionFence(account,generation);setGenerated({...result,operation:crypto.randomUUID()});});}
 async function enroll(remember=false){await guarded(async()=>{if(!account||!generated||manifest!==null)throw Error('Prepare and save the recovery secret first.');const generation=getAccountGeneration(),fence=()=>selectionFence(account,generation),consent=health,device=remember?await sealForDevice(generated.manifest,generated.recovery,account):null;fence();await accountTransport(account,fence).write({protocol:1,vault:generated.manifest.vault,operation:generated.operation,base:0,changes:[],manifest:generated.manifest});fence();open(account,generated.key,generated.manifest,consent);if(device)await keepDevice(account,generated.manifest,device);});if(session.current)await sync();}
 async function unlock(secret:string,remember=false){await guarded(async()=>{if(!account||!manifest)throw Error('Verify your account first.');const generation=getAccountGeneration(),consent=health;if(!remember){const key=await unlockVault(manifest,secret);selectionFence(account,generation);open(account,key,manifest,consent);return;}const device=await sealForDevice(manifest,secret,account);selectionFence(account,generation);open(account,device.key,manifest,consent);await keepDevice(account,manifest,device);});if(session.current)await sync();}
 async function runPortfolio(selected:Session,fence:()=>void,choice?:'keep-device'|'keep-cloud'){
  const storage=getAppStorage(),attempt=()=>syncPortfolio({transport:portfolioTransport(selected.account,fence),key:selected.key,manifest:selected.manifest,storage,fence,choice});
  try{let outcome;try{outcome=await attempt();}catch(error){if(!(error instanceof RevisionConflict))throw error;fence();outcome=await attempt();}
   fence();if(outcome.state==='deleted')choosePortfolioSync(storage,false);setPortfolio(outcome);}
  catch(error){fence();setPortfolio({state:'error',message:error instanceof Error?error.message:'Portfolio sync was not confirmed. Your Portfolio on this device was preserved.'});}
 }
 function portfolioSession(){const selected=session.current;if(!selected)throw Error('Unlock your vault before syncing.');const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Sync result was not applied.');};return {selected,fence};}
 async function syncPortfolioNow(choice?:'keep-device'|'keep-cloud'){await guarded(async()=>{const {selected,fence}=portfolioSession();await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{fence();await runPortfolio(selected,fence,choice);});});}
 async function deletePortfolioCloud(){await guarded(async()=>{const {selected,fence}=portfolioSession();await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{fence();const storage=getAppStorage();
  try{await deletePortfolioCopy({transport:portfolioTransport(selected.account,fence),manifest:selected.manifest,storage,fence});fence();choosePortfolioSync(storage,false);setPortfolio({state:'removed'});}
  catch(error){fence();setPortfolio({state:'error',message:error instanceof Error?error.message:'The Portfolio copy was not deleted.'});}});});}
 async function sync(automatic=false){await guarded(async()=>{
  const selected=session.current;if(!selected)throw Error('Unlock your vault before syncing.');const healthPermission=selected.health;
  syncing.current=true;followUp.current=false;try{
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Sync result was not applied.');if(selected.health!==healthPermission)throw Error('Health permission changed. Sync paused; local records were preserved.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();setMessage('Syncing encrypted account records…');const storage=getAppStorage(),domains:Domain[]=['finance','habits','settings',...(selected.health?['health' as const]:[])];
   const capturedPending=(await localDatabase.pending(`account:${selected.account}`)).filter(p=>domains.some(d=>modules[d].key===p.domain));
   const local=await captureData(storage,domains);fence();const result=await synchronize(accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,local,validateData,fence,domains);
   fence();try{await applyData(storage,local,result.data,fence);}catch(error){
    // A local edit landed during this sync. The upload is recorded, nothing was overwritten: not a
    // conflict, so automatic sync stays on and one follow-up uploads the newer edit.
    if(!(error instanceof LocalRecordsChangedDuringSync))throw error;fence();followUp.current=true;auto.current=true;setMessage('Newer local edits found. Syncing them next…');return;}
   await result.commit();fence();for(const pending of capturedPending){fence();await localDatabase.acknowledge(`account:${selected.account}`,pending.operation);}fence();setLast(formatTime(new Date()));setMessage('Account records synced and acknowledged.');auto.current=true;
   // Session U Part 9 (ADR-013): the opt-in Portfolio copy, after the four sections and under the same lock. Its own
   // outcome is shown beside its choice; a Portfolio failure never undoes or pauses the account sync above.
   if(SYNC_WRITES&&portfolioSyncChosen(storage))await runPortfolio(selected,fence);
  });
  }finally{syncing.current=false;}
 },true,automatic);if(followUp.current){followUp.current=false;scheduleRef.current();}}
 // Session X Part 5b ([TIER 3] (sync)): the actions below run only when a person asks for them (conflict review, forward
 // recovery, a section's restore or deletion, key rotation, a pending-work copy, copying local records), so each loads its
 // code first, inside the same one-at-a-time guard (the panel shows busy; a failed load is that action's error), and then
 // runs exactly as before; automatic sync, unlock and a remembered device's reopen stay as they were.
 async function prepareConflict(){await guarded(async()=>{const {prepareConflictReview}=await import('../lib/vault/conflict-review');const {selected,fence:accountFence}=rotationSession(),consent=selected.health,fence=()=>{accountFence();if(selected.health!==consent)throw Error('Health consent changed. Review paused.');};auto.current=false;await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{const domains:Domain[]=['finance','habits','settings',...(selected.health?['health' as const]:[])],local=await captureData(getAppStorage(),domains);fence();const review=await prepareConflictReview(selected.account,local,accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,fence,domains);fence();setConflictReview(review);});});}
 async function confirmConflict(choices:Choices){let resolved=false;await guarded(async()=>{const {confirmConflictReview}=await import('../lib/vault/conflict-review');const {selected,fence:accountFence}=rotationSession(),consent=selected.health,fence=()=>{accountFence();if(selected.health!==consent)throw Error('Health consent changed. Resolution paused.');},review=conflictReview;if(!review||review.account!==selected.account)throw Error('Prepare a review for this account.');await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{const local=await captureData(getAppStorage(),review.domains);fence();await confirmConflictReview(review,choices,local,accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,data=>applyData(getAppStorage(),local,data,fence),fence);fence();setConflictReview(null);setMessage('Resolution validated. Original journal archived; preparing sync…');resolved=true;});});if(resolved)await sync();}
 function cancelConflict(){setConflictReview(null);auto.current=false;setMessage('Conflict review closed. Both versions remain preserved.');}
 async function prepareForward(){await guarded(async()=>{const {prepareForwardRecovery}=await import('../lib/vault/forward-recovery');const {selected,fence:accountFence}=rotationSession(),consent=selected.health,fence=()=>{accountFence();if(selected.health!==consent)throw Error('Health consent changed. Recovery paused.');};auto.current=false;await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{const domains:Domain[]=['finance','habits','settings',...(selected.health?['health' as const]:[])],local=await captureData(getAppStorage(),domains);fence();const review=await prepareForwardRecovery(selected.account,local,accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,validateData,fence,domains);fence();setForwardReview(review);});});}
 async function confirmForward(){let recovered=false;await guarded(async()=>{const {confirmForwardRecovery}=await import('../lib/vault/forward-recovery');const {selected,fence:accountFence}=rotationSession(),consent=selected.health,fence=()=>{accountFence();if(selected.health!==consent)throw Error('Health consent changed. Recovery paused.');},review=forwardReview;if(!review||review.account!==selected.account)throw Error('Prepare a recovery review for this account.');if(review.domains.includes('health')&&!selected.health)throw Error('Health consent changed. Prepare a new recovery review.');await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{const local=await captureData(getAppStorage(),review.domains);fence();await confirmForwardRecovery(review,local,accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,validateData,data=>applyData(getAppStorage(),local,data,fence),fence);fence();setForwardReview(null);setMessage('Original queue archived. Preparing a fresh validated sync…');recovered=true;});});if(recovered)await sync();}
 function cancelForward(){setForwardReview(null);auto.current=false;setMessage('Recovery review closed. Original queue remains unchanged.');}
 async function prepareDomain(kind:DomainReview['kind'],domain:Domain){await guarded(async()=>{const {prepareDomainReview}=await import('../lib/vault/domain-lifecycle');const {selected,fence}=rotationSession();auto.current=false;await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{const local=await captureData(getAppStorage(),[domain]);fence();const review=await prepareDomainReview(kind,domain,local,accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,fence);fence();setDomainReview(review);});});}
 async function confirmDomain(){let restored=false,healthAsked=false;await guarded(async()=>{const {acceptDomainRestore,deleteCloudDomain}=await import('../lib/vault/domain-lifecycle');const {selected,fence}=rotationSession(),review=domainReview;if(!review)throw Error('Prepare a section review first.');await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{const local=await captureData(getAppStorage(),[review.domain]);fence();if(JSON.stringify(local)!==JSON.stringify(review.local))throw Error('Local records changed. Prepare a new section review.');if(review.kind==='restore'||review.kind==='keep'){await acceptDomainRestore(review,local,accountTransport(selected.account,fence),new SyncJournal(selected.account),selected.key,selected.manifest,fence);fence();restored=review.kind==='restore';
   // Session Y Part 5, FIX_PLAN B4 (Q-SYNC-04): a Health restore asks first. Health sync stays off until the person ticks it.
   // A device whose Health consent is already on was not asked to consent by the restore, so it syncs at once, as before.
   if(restored&&review.domain==='health'&&!selected.health){restored=false;healthAsked=true;setHealthAsk(true);}}else{await deleteCloudDomain(selected.account,review,fence);const journal=new SyncJournal(selected.account),state=await journal.read();fence();await journal.write({...state,heldDomains:[...new Set([...(state.heldDomains??[]),review.domain])]});fence();await forgetHere(selected,'Deleting a cloud section also forgets this device: unlocking again needs the recovery secret.');fence();if(review.domain==='health'){selected.health=false;setHealthState(false);}}fence();setDomainReview(null);setMessage(healthAsked?'Health section approved for a new cloud copy. Nothing was uploaded: Health sync is off until you turn it on.':restored?'Local section approved for a new cloud copy. Preparing sync…':review.kind==='keep'?'Section stays on this browser. Other sections can sync.':'Cloud section deleted. Local records were kept. Review explicitly before restoring them.');auto.current=false;});});if(restored)await sync();}
 function cancelDomain(){setDomainReview(null);auto.current=!!session.current;}
 async function eraseAccount(identity:boolean){let result:{deleted:boolean;providerDeleted?:boolean;providerPending?:boolean}|null=null;await guarded(async()=>{const {selected,fence}=rotationSession();auto.current=false;await forgetPushOnThisDevice({deleteAll:true});await forgetAiAccount(selected.account).catch(()=>undefined);fence();await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{fence();const response=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json','x-zigoals-account':selected.account},cache:'no-store',signal:AbortSignal.timeout(20000),body:JSON.stringify({action:'delete',operation:identity?{action:'delete-account',confirm:'DELETE ACCOUNT'}:{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}})});fence();if(!response.ok)throw Error('Deletion was not confirmed. Keep your backup; retry after checking account status.');const text=await response.text();fence();if(text.length>4096)throw Error('Deletion acknowledgement unavailable.');result=z.object({deleted:z.literal(true),providerDeleted:z.boolean().optional(),providerPending:z.boolean().optional()}).parse(JSON.parse(text));
   // Session Y Part 5 (B6): the person deleted the cloud's vault here, so this device's sync record is set aside at once
   // (kept in the journal's recovery archive) and the device keeps no anchor to a vault that is gone. The Worker answers
   // this account with 410 from then on, so nothing is enrolled on it again.
   if(!identity){const journal=new SyncJournal(selected.account),state=await journal.read().catch(()=>null);if(state&&hadVault(state))await journal.recover(crypto.randomUUID(),state,freshJournal(),()=>{}).catch(()=>undefined);}
   await forgetHere(selected,'');lockAccount();});});return result;}
 function rotationSession(){const selected=session.current;if(!selected)throw Error('Unlock the vault before rotation.');const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Account changed. Rotation paused.');};return {selected,fence};}
 async function prepareRotation(){await guarded(async()=>{const {rotationTransport}=await import('../lib/vault/rotation-transport');const {selected,fence}=rotationSession();auto.current=false;const status=z.object({rotation:z.object({manifest:manifestSchema}).nullable()}).parse(await rotationTransport(selected.account,fence).request());fence();if(status.rotation){setStagedRotation(status.rotation.manifest);return;}const next=await createVault(selected.manifest.vault,selected.manifest.epoch+1);fence();setRotationKeys(next);});}
 async function resumeRotation(secret:string){await guarded(async()=>{const {selected,fence}=rotationSession();if(!stagedRotation)throw Error('Read staged rotation first.');await forgetHere(selected,'');fence();const key=await unlockVault(stagedRotation,secret);fence();setRotationKeys({key,manifest:stagedRotation,recovery:secret});});}
 async function finishRotation(){await guarded(async()=>{const [{rotateVault},{rotationTransport}]=await Promise.all([import('../lib/vault/rotation'),import('../lib/vault/rotation-transport')]);const {selected,fence}=rotationSession(),next=rotationKeys;if(!next)throw Error('Prepare and save the new secret first.');auto.current=false;
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();const journal=new SyncJournal(selected.account),state=await journal.read(),local=await captureData(getAppStorage(),['finance','habits','settings',...(selected.health?['health' as const]:[])]);fence();
   if(Object.entries(local).some(([domain,raw])=>raw!==state.base[domain as Domain]))throw Error('Sync local changes before rotating. Your saved rotation secret remains available.');
   // The remembered root belongs to the old epoch: this device asks for the new recovery secret next time, like the others.
   await forgetHere(selected,'');fence();
   await rotateVault(accountTransport(selected.account,fence),rotationTransport(selected.account,fence),journal,selected.key,selected.manifest,next.key,next.manifest,fence);fence();
   session.current={...selected,key:next.key,manifest:next.manifest,device:null};setManifest(next.manifest);setRotationKeys(null);setStagedRotation(null);setMessage('Vault key rotated and activated. Other devices need the new recovery secret.');auto.current=true;
  });
 });}
 async function abortRotation(){await guarded(async()=>{const {rotationTransport}=await import('../lib/vault/rotation-transport');const {selected,fence}=rotationSession();const transport=rotationTransport(selected.account,fence),status=z.object({rotation:z.object({operation:z.uuid()}).nullable()}).parse(await transport.request());if(status.rotation)await transport.request({action:'abort',operation:status.rotation.operation});fence();setStagedRotation(null);setRotationKeys(null);auto.current=true;setMessage('Staged rotation discarded. Active vault data was kept.');});}
 function cancelRotation(){setRotationKeys(null);setStagedRotation(null);auto.current=true;}
 async function preparePendingRecovery(){await guarded(async()=>{const {encryptPendingRecovery}=await import('../lib/vault/pending-recovery');
  const selected=session.current;if(!selected)throw Error('Unlock your account vault before exporting pending work.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Account changed or locked. Recovery export was cancelled.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{fence();const state=await new SyncJournal(selected.account).read();fence();const result=await encryptPendingRecovery(selected.account,state);fence();setPendingRecovery(result);});
  setMessage('Encrypted pending-work recovery copy prepared. The original queue remains unchanged and blocked until reviewed.');
 },false);}
 async function prepareAttach(domains:Domain[]){await guarded(async()=>{const {planLocalAttach}=await import('../lib/vault/local-attach');
  auto.current=false;setAttachPreview(null);const selected=session.current;if(!selected)throw Error('Unlock the account vault first.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Copy review cancelled.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();if(domains.includes('health')&&!selected.health)throw Error('Enable Health sync permission first.');
   const journal=await new SyncJournal(selected.account).read();if(journal.pending)throw Error('Resolve pending account sync before copying local records.');
   const remote=await cloudSnapshot(accountTransport(selected.account,fence),selected.key,selected.manifest,journal.revision,domains,journal.headRevision,journal.headDigest);
   const source=await captureData(window.localStorage,domains),accountData=await captureData(getAppStorage(),domains);fence();
   // Session M (owner decision M2): the copy happens in place; the originals stay on this device, so no backup file is made.
   const plan=planLocalAttach(source,accountData,remote.data,domains,selected.health);fence();
   setAttachPreview({plan,generation:selected.generation});setMessage('Review the records to copy. Automatic sync is paused during review.');
  });
 });}
 async function confirmAttach(){let copied=false;await guarded(async()=>{const {planLocalAttach,assertAttachSourceUnchanged}=await import('../lib/vault/local-attach');
  const selected=session.current,preview=attachPreview;if(!selected||!preview||selected.generation!==preview.generation)throw Error('Prepare a new local copy for this account.');
  const fence=()=>{selectionFence(selected.account,selected.generation);if(session.current!==selected||isAccountLocked())throw Error('Vault locked. Copy cancelled.');};
  await withStorageLock(`zigoals:account-sync:${selected.account}`,async()=>{
   fence();const domains=preview.plan.domains;if(domains.includes('health')&&!selected.health)throw Error('Health sync permission changed. Prepare a new copy.');
   const journal=await new SyncJournal(selected.account).read();if(journal.pending)throw Error('Resolve pending account sync first.');
   const source=await captureData(window.localStorage,domains);assertAttachSourceUnchanged(preview.plan,source);
   const before=await captureData(getAppStorage(),domains),remote=await cloudSnapshot(accountTransport(selected.account,fence),selected.key,selected.manifest,journal.revision,domains,journal.headRevision,journal.headDigest);
   const plan=planLocalAttach(source,before,remote.data,domains,selected.health);fence();
   try{await applyData(getAppStorage(),before,plan.data,fence);}catch{fence();setAttachPreview(null);throw Error('Copy interrupted. Original local records are unchanged. No partial set of copied account sections was committed. Review the account before retrying.');}
   fence();setAttachPreview(null);copied=true;setMessage('Selected records copied to this account on this browser. Original local records were kept. Preparing encrypted sync…');
  });
 });if(copied)await sync();}
 function cancelAttach(){setAttachPreview(null);auto.current=!!session.current;setMessage('Local copy review closed. Original local records were not changed.');}
 async function setHealth(value:boolean){const answered=healthAsk;setHealthAsk(false);setConflictReview(null);setForwardReview(null);setDomainReview(null);setAttachPreview(null);if(!value){auto.current=false;setHealthState(false);if(session.current){session.current.health=false;healthRemembered(session.current,false);}return;}const selected=session.current;if(selected){try{const state=await new SyncJournal(selected.account).read();if(session.current!==selected)return;if(state.heldDomains?.includes('health')){setError(HEALTH_HELD_REFUSAL);return;}}catch{setError(HEALTH_UNVERIFIED_REFUSAL);return;}}setHealthState(true);if(selected){selected.health=true;healthRemembered(selected,true);
  // Session Y Part 5 (B4): the tick that answers a Health restore's question starts the sync the restore used to start.
  if(answered)await sync();}}
 /** A remembered device remembers the Health choice with it (M1 e). If turning it off cannot be stored, the device is forgotten instead. */
 function healthRemembered(selected:Session,value:boolean){const device=selected.device;if(!device)return;void rememberHealth(device,value).catch(async()=>{if(value)return;try{await dropDevice(device);if(selected.device===device){selected.device=null;setRemembered(false);}}catch{setDeviceNote(NOT_FORGOTTEN);}});}
 /** Forgets this device for an action taken here (section or account deletion, key rotation): every record, unconditionally. */
 async function forgetHere(selected:Session,note:string){const was=!!selected.device;selected.device=null;setRemembered(false);try{await forgetDevices();if(was&&note)setDeviceNote(note);}catch{setDeviceNote(NOT_FORGOTTEN);}}
 /** The account changed on another device (vault, section or account deleted there): this tab's own record goes, if still stored. */
 function dropStale(){const selected=session.current,device=selected?.device;if(!selected||!device)return;selected.device=null;setRemembered(false);setDeviceNote('This device is no longer remembered because the account changed on another device. Unlocking again needs the recovery secret.');void dropDevice(device).catch(()=>{});}
 /** "Lock account vault" locks this tab and forgets this device (M1 d): a lock that a reload undoes is not a lock. */
 // Session U Part 5 (B2): every tab of this browser locks too (lockEveryTab), before the device is forgotten, and even if forgetting fails.
 function lockNow(){manualLock.current=true;setRemembered(false);lockEveryTab();void forgetDevices().catch(()=>setDeviceNote(NOT_FORGOTTEN));}
 /**
  * Session Y Part 5 (B6, and B3's way out): after the notice, the person confirmed that this device starts over with the
  * cloud as it is now (its vault missing or older, as after a restore of the sync service from an earlier copy).
  * This device's sync journal for the account is set aside in the journal's own recovery archive (nothing is deleted)
  * and a fresh one starts; the records on this device are not touched. Then: a new vault (none in the cloud) or a sync
  * with the vault that is there now (an older epoch, opened with its own recovery secret).
  */
 async function startOver(){const id=account,gone=vaultGone;await guarded(async()=>{if(!id||!gone)throw Error('Nothing to start over.');const journal=new SyncJournal(id),state=await journal.read();
   // Sections the person deleted from the cloud stay held in the fresh journal: they still need their own restore review
   // before anything of them is uploaded (a start-over is not that review).
   if(hadVault(state))await journal.recover(crypto.randomUUID(),state,{...freshJournal(),...(state.heldDomains?.length?{heldDomains:[...state.heldDomains]}:{})},()=>selectionFence(id,getAccountGeneration()));setVaultGone(null);if(gone==='missing'){setManifest(null);setMessage('This device’s earlier sync record was set aside. Create a separate encrypted account vault. Local Demo records are not imported.');}else setMessage('This device’s earlier sync record was set aside. Syncing with the vault in the cloud…');});if(gone==='older'&&session.current)await sync();}
 /**
  * Session Y Part 5, FIX_PLAN A7 (Q-SYNC-05): the server said this browser's session was revoked or the account deleted.
  * Only the remembered unlock record goes (every record on this browser, as Lock does); the account's records on this
  * device are not touched, so they open and export again after the next sign-in and unlock.
  */
 async function accessDenied(code:AccountDenial['denied']){if(session.current)session.current.device=null;setRemembered(false);try{await forgetDevices();setDeviceNote(code==='ACCOUNT_DELETED'?DENIED_DELETED:DENIED_REVOKED);}catch{setDeviceNote(NOT_FORGOTTEN);}}
 /** "Forget this device" deletes the remembered material at once; this tab stays open until it is locked or reloaded (M1 f). */
 async function forgetDevice(){try{await forgetDevices();if(session.current)session.current.device=null;setRemembered(false);setDeviceNote('This device is no longer remembered. Unlocking again needs the recovery secret.');}catch{setDeviceNote(NOT_FORGOTTEN);}}
 const registerAccess=useCallback(()=>{access.current++;return()=>{access.current--;};},[]);
 const lockedNow=()=>{try{return isAccountLocked();}catch{return false;}};
 /**
  * Opens a locked tab again on a remembered device: on load, when the tab is focused or shown, and after a routine token
  * expiry. Never in Showcase or after Lock now, and no network request at all unless this browser holds a record. The
  * account is verified (refreshing an expired token) and adopted without locking other tabs. On Settings, AccountAccess
  * verifies on load itself, then calls authenticated(); its panel is re-checked if a reopen changed the account under it.
  */
 async function reopen(reason:'load'|'focus'|'expiry'){
  if(reopening.current||manualLock.current||isShowcase()||!lockedNow())return;
  if(reason==='focus'&&Date.now()<retryAt.current)return;
  if(access.current&&(reason==='load'||(reason==='focus'&&!verified.current)))return;
  reopening.current=true;const generation=getAccountGeneration(),shown=access.current;let touched=false;
  const current=()=>generation===getAccountGeneration()&&lockedNow()&&!manualLock.current&&!isShowcase();
  try{
   const records=await readDevices().catch(()=>[]);if(records.length!==1||!current())return;
   const status=await accountStatus(AbortSignal.timeout(20000)).catch(()=>null);if(!current())return;
   // Session Y Part 5, FIX_PLAN A7 (Q-SYNC-05): the session was revoked or the account deleted elsewhere. Only this browser's
   // remembered unlock record goes; the account's records on this device stay as they are, for a later unlock and export.
   if(status&&typeof status==='object'){await accessDenied(status.denied);return;}
   const id=status;
   if(!id){retryAt.current=Date.now()+30_000;return;}
   if(id!==records[0]!.account){await forgetDevices().catch(()=>{});setRemembered(false);return;}
   touched=true;if(getAccountScope()!==id)adoptAccount(id);
   await authenticated(id,true);if(lockedNow())retryAt.current=Date.now()+30_000;
  }catch{retryAt.current=Date.now()+30_000;}
  finally{reopening.current=false;if(touched&&access.current&&!shown)setAccessEpoch(epoch=>epoch+1);}
 }
 useEffect(()=>{syncRef.current=()=>sync(true);reopenRef.current=reopen;});
 useEffect(()=>{
  let debounce:ReturnType<typeof setTimeout>|undefined;
  const change=(event:Event)=>{const detail=(event as CustomEvent<AccountLockDetail|undefined>).detail,accessChanged=detail?.reason==='access-changed'&&detail.account===getAccountScope()&&detail.generation===getAccountGeneration();
   // Session U Part 5 (B2): Lock in another tab of this browser is a manual lock here too: no reopen from a remembered device,
   // and no "This device is remembered" note, since the tab that locked forgets the device.
   if(detail?.reason==='manual'){manualLock.current=true;setRemembered(false);}
   if(isAccountLocked()||(session.current&&getAccountScope()!==session.current.account)){
   // A revoked session, another account or a deleted account makes a remembered device stale; a routine token expiry does not:
   // the device then reopens at once, refreshing the token as Settings does.
   const device=session.current?.device??null,code=accessChanged?takeAccessDenial(detail!.account):null,expired=accessChanged&&!!device&&code==='SIGN_IN_REQUIRED';
   if(device&&deniesDevice(code)){setRemembered(false);void dropDevice(device).catch(()=>{});}
   setHealthAsk(false);setVaultGone(null);running.current=null;setBusy(false);session.current=null;auto.current=false;setPortfolio(null);setConflictReview(null);setForwardReview(null);setDomainReview(null);setRotationKeys(null);setStagedRotation(null);setAttachPreview(null);setPendingRecovery(null);setOpened(false);setGenerated(null);setManifest(undefined);setAccount(null);setHealthState(false);setError(accessChanged&&!expired?'Account access changed. Sign in and unlock again.':'');setLast('');setMessage('Account sync is locked.');if(expired)void reopenRef.current('expiry');}};
  const schedule=()=>{clearTimeout(debounce);if(document.hidden||running.current||!auto.current||!session.current)return;debounce=setTimeout(()=>{if(!document.hidden&&auto.current&&session.current)void syncRef.current();},1000);};
  scheduleRef.current=schedule;
  const edited=()=>{if(syncing.current&&!isSyncedChangeEvent()){followUp.current=true;return;}schedule();};
  const activity=()=>{idle.current=Date.now();};
  // After 15 minutes without interaction the vault locks, except on a remembered device whose record is still stored (M1 c).
  let idleCheck=false;
  const interval=setInterval(()=>{const selected=session.current;if(selected&&Date.now()-idle.current>15*60_000){
   if(!selected.device){lockAccount();return;}
   if(!idleCheck){idleCheck=true;void stillRemembered(selected.device).catch(()=>false).then(kept=>{idleCheck=false;if(session.current!==selected)return;if(kept&&selected.device){schedule();return;}selected.device=null;setRemembered(false);lockAccount();});}
   return;
  }schedule();},30000);
  const focused=()=>{void reopenRef.current('focus');},shown=()=>{if(!document.hidden)void reopenRef.current('focus');};
  window.addEventListener(ACCOUNT_CHANGE,change);window.addEventListener('zigoals:private-change',edited);window.addEventListener('focus',schedule);window.addEventListener('online',schedule);document.addEventListener('visibilitychange',schedule);window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
  window.addEventListener('focus',focused);document.addEventListener('visibilitychange',shown);
  if(!isShowcase())void readDevices().then(records=>{if(records.length)setRemembered(true);},()=>{});
  void reopenRef.current('load');
  return()=>{running.current=null;session.current=null;clearTimeout(debounce);clearInterval(interval);window.removeEventListener(ACCOUNT_CHANGE,change);window.removeEventListener('zigoals:private-change',edited);window.removeEventListener('focus',schedule);window.removeEventListener('online',schedule);document.removeEventListener('visibilitychange',schedule);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);window.removeEventListener('focus',focused);document.removeEventListener('visibilitychange',shown);};
 },[]);
 return <Context.Provider value={{conflictReview,prepareConflict,confirmConflict,cancelConflict,forwardReview,prepareForward,confirmForward,cancelForward,domainReview,prepareDomain,confirmDomain,cancelDomain,eraseAccount,rotationKeys,stagedRotation,prepareRotation,resumeRotation,finishRotation,abortRotation,cancelRotation,attachPreview,prepareAttach,confirmAttach,cancelAttach,authenticated,forget,prepare,enroll,unlock,remembered,deviceNote,forgetDevice,lockNow,registerAccess,accessEpoch,sync,preparePendingRecovery,pendingRecovery,clearPendingRecovery:()=>setPendingRecovery(null),setHealth,health,healthAsk,vaultGone,startOver,accessDenied,account,manifest,generated,cancel:()=>setGenerated(null),busy,opened,message,error,last,portfolio,syncPortfolioNow,deletePortfolioCloud}}>{children}</Context.Provider>;
}
/** Public status only; keys, recovery material and private records never leave the provider. */
export function useVaultStatus(){const c=useContext(Context);return {opened:c?.opened??false,busy:c?.busy??false,message:c?.message??'',error:c?.error??'',last:c?.last??'',account:c?.account??null};}
