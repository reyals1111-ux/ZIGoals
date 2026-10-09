'use client';
// The Settings panel for encrypted account sync (Session X Part 5b, [TIER 3] (sync)): moved here unchanged from
// vault-sync-controls.tsx, so the panel and its sub-panels (sign-in, conflicts, recovery, sections, rotation, deletion,
// local records, devices) load with Settings instead of with every page. The provider, its state and every vault action
// stay in vault-sync-controls.tsx; this file only renders what the provider exposes.
import {useEffect,useId,useRef,useState} from 'react';
import {ConflictReviewControls} from './conflict-review-controls';
import {ForwardRecoveryControls} from './forward-recovery-controls';
import {DomainCloudControls} from './domain-cloud-controls';
import {AccountDeletion} from './account-deletion';
import {VaultRotationControls} from './vault-rotation-controls';
import {LocalAccountAttach} from './local-account-attach';
import {AccountDevices} from './account-devices';
import {AccountAccess} from './account-access';
import {SyncOffer} from './account-sync-offer/sync-offer';
import {PortfolioSyncChoice} from './portfolio-sync-choice';
import {ACCOUNT_CHANGE,getAccountScope,isAccountLocked} from '../lib/account-session';
import {currentInstallContext} from '../lib/install/platform';
import {SYNC_WRITES} from '../lib/vault/sync-writes';
import {HEALTH_HELD_REFUSAL,HEALTH_RESTORE_ASK,HEALTH_UNVERIFIED_REFUSAL,REMEMBER_LABEL,REMEMBER_NOTE,useVaultControls} from './vault-sync-controls';
export function VaultSyncControls(){
 // "Remember on this device" is ticked by default only in the installed app (Home Screen or installed desktop app), unticked in a browser tab (M1 b).
 const [remember,setRemember]=useState<boolean|null>(null),[installed,setInstalled]=useState(false);
 const c=useVaultControls(),[secret,setSecret]=useState(''),[saved,setSaved]=useState(false),[pendingSaved,setPendingSaved]=useState(false),[verifying,setVerifying]=useState(false);useEffect(()=>{const clear=()=>{setSecret('');setSaved(false);setPendingSaved(false);setRemember(null);};window.addEventListener(ACCOUNT_CHANGE,clear);return()=>window.removeEventListener(ACCOUNT_CHANGE,clear);},[]);
 const registerAccess=c?.registerAccess;
 useEffect(()=>{setInstalled(currentInstallContext()==='installed');},[]);
 useEffect(()=>registerAccess?.(),[registerAccess]);
 const id=useId(),consentRef=useRef<HTMLInputElement>(null),signingIn=useRef(false),account=c?.account;
 useEffect(()=>{if(verifying)signingIn.current=true;},[verifying]);
 // When sign-in enables Health consent, the email form that had focus is gone: continue at the consent choice instead of <body>. Never moves focus the user placed elsewhere.
 useEffect(()=>{if(!account||!signingIn.current)return;signingIn.current=false;const frame=requestAnimationFrame(()=>{const active=document.activeElement;if(!active||active===document.body||(active as HTMLButtonElement|HTMLInputElement).disabled)consentRef.current?.focus();});return()=>cancelAnimationFrame(frame);},[account]);
 // Session Y Part 5 (B4): after a Health restore the choice is the person's; the box takes the focus with the reason beside it.
 const healthAsk=c?.healthAsk;
 useEffect(()=>{if(!healthAsk)return;const frame=requestAnimationFrame(()=>consentRef.current?.focus());return()=>cancelAnimationFrame(frame);},[healthAsk]);
 if(!c)throw Error('Vault provider unavailable.');
 const controls=c,finishing=!c.account&&(verifying||c.busy),healthRefused=c.error===HEALTH_HELD_REFUSAL||c.error===HEALTH_UNVERIFIED_REFUSAL,remembering=remember??installed;
 const rememberChoice=(name:string)=><><label className="checkbox" htmlFor={id+name}><input id={id+name} type="checkbox" checked={remembering} aria-describedby={id+name+'-note'} onChange={e=>setRemember(e.target.checked)}/>{REMEMBER_LABEL}</label><p className="fine" id={id+name+'-note'}>{REMEMBER_NOTE}</p></>;
 function downloadPending(){if(!controls.pendingRecovery||!pendingSaved||!controls.opened||isAccountLocked()||getAccountScope()!==controls.account)return;const url=URL.createObjectURL(new Blob([controls.pendingRecovery.file],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zigoals-encrypted-pending-recovery-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);controls.clearPendingRecovery();setPendingSaved(false);}
 return <div id="encrypted-sync"><AccountAccess key={c.accessEpoch} onAuthenticated={c.authenticated} onSignout={c.forget} onVerifying={setVerifying}/><SyncOffer account={c.account} manifest={c.manifest} opened={c.opened} preparing={!!c.generated} busy={c.busy} health={c.health} onHealth={c.setHealth} onCreate={()=>{setSaved(false);void c.prepare();}}/><section className="panel" aria-label="Encrypted account sync"><p className="eyebrow">ENCRYPTED ACCOUNT SYNC</p><h2>Keep your account records together.</h2><p>Goals, Wealth, Habits and Today preferences sync after you unlock this vault. Email codes cannot decrypt it. Keep the recovery secret separately; losing it can make cloud records unrecoverable.</p><p>{`Account records have a separate local copy in this browser. That copy is not encrypted at rest. Locking hides it in the app; anyone with access to this browser profile may still read it. ${c.opened&&c.remembered?'On this remembered device the vault stays open until you lock it, and locking also forgets this device.':'The vault locks after 15 minutes without interaction.'}`}</p>
 {/* Sign-in resets Health consent for the newly selected account, so it is offered only once that account is ready. */}
 <label className="checkbox" htmlFor={id+'health'}><input ref={consentRef} id={id+'health'} type="checkbox" checked={c.health} disabled={!c.account} aria-describedby={[!c.account&&(finishing?id+'finishing':id+'signin'),healthRefused&&id+'error',c.healthAsk&&id+'health-ask'].filter(Boolean).join(' ')||undefined} onChange={e=>c.setHealth(e.target.checked)}/>Sync my Health records with this account. Turning this off stops Health transfers on this tab; it does not delete existing encrypted cloud copies.</label>
 {!c.account&&(finishing?<p className="fine" id={id+'finishing'}>Finishing sign-in…</p>:<span className="sr-only" id={id+'signin'}>Available after you sign in.</span>)}
 {c.healthAsk&&<p className="notice" id={id+'health-ask'}>{HEALTH_RESTORE_ASK}</p>}
 {SYNC_WRITES&&c.account&&<PortfolioSyncChoice key={c.account} opened={c.opened} busy={c.busy} status={c.portfolio} onSync={c.syncPortfolioNow} onDelete={c.deletePortfolioCloud}/>}
 {c.account&&c.manifest===null&&!c.generated&&<button className="primary" disabled={c.busy} onClick={()=>{setSaved(false);void c.prepare();}}>Create encrypted account vault</button>}
 {c.generated&&<div className="notice"><label>New vault recovery secret<input value={c.generated.recovery} readOnly autoComplete="off" spellCheck={false}/></label><p>Save this privately now. It is shown only while preparing this vault.</p><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved this vault recovery secret separately.</label>{rememberChoice('remember-new')}<button className="primary" disabled={!saved||c.busy} onClick={()=>void c.enroll(remembering)}>Confirm and create vault</button><button className="secondary" disabled={c.busy} onClick={c.cancel}>Cancel</button></div>}
 {c.manifest&&!c.opened&&<form onSubmit={e=>{e.preventDefault();const value=secret;setSecret('');void c.unlock(value,remembering);}}><label>Vault recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label>{rememberChoice('remember')}<button className="primary" disabled={c.busy||!secret}>Unlock account vault</button></form>}
 {c.opened&&<div className="actions"><button className="primary" disabled={c.busy} onClick={()=>void c.sync()}>Sync now</button><button className="secondary" onClick={()=>{setSecret('');c.lockNow();}}>Lock account vault</button></div>}
 {c.remembered&&<div className="notice"><p>{c.opened?'This device is remembered: ZIGoals opens your account records here without the recovery secret. Locking locks every tab of this browser and forgets this device.':'This device is remembered: ZIGoals can open your account records here without the recovery secret.'}</p><button className="secondary" disabled={c.busy} onClick={()=>void c.forgetDevice()}>Forget this device</button></div>}
 {c.deviceNote&&<p className="fine" aria-live="polite">{c.deviceNote}</p>}
 {c.opened&&<ConflictReviewControls busy={c.busy} review={c.conflictReview} prepare={c.prepareConflict} confirm={c.confirmConflict} cancel={c.cancelConflict}/>}
 {c.opened&&<ForwardRecoveryControls busy={c.busy} review={c.forwardReview} prepare={c.prepareForward} confirm={c.confirmForward} cancel={c.cancelForward}/>}
 {c.opened&&<DomainCloudControls busy={c.busy} review={c.domainReview} prepare={c.prepareDomain} confirm={c.confirmDomain} cancel={c.cancelDomain}/>}
 {c.opened&&<VaultRotationControls busy={c.busy} prepared={c.rotationKeys} staged={c.stagedRotation} prepare={c.prepareRotation} resume={c.resumeRotation} finish={c.finishRotation} abort={c.abortRotation} cancel={c.cancelRotation}/>}
 {c.opened&&<details><summary>Pending-work recovery</summary><p>If an older or incompatible queued operation blocks sync, prepare a separate encrypted copy before forward recovery. This does not clear, send, or repair the queue. The copy contains the account sync journal, including any selected Health data previously queued.</p><button className="secondary" disabled={c.busy} onClick={()=>{setPendingSaved(false);void c.preparePendingRecovery();}}>Prepare encrypted pending-work copy</button>{c.pendingRecovery&&<div className="notice"><label>Separate recovery secret<input readOnly value={c.pendingRecovery.recovery} autoComplete="off" spellCheck={false}/></label><p>Save this secret separately. It is required to inspect this recovery copy and cannot be replaced by an email code.</p><label className="checkbox"><input type="checkbox" checked={pendingSaved} onChange={e=>setPendingSaved(e.target.checked)}/>I saved this recovery secret separately.</label><button className="primary" disabled={!pendingSaved} onClick={downloadPending}>Download encrypted pending-work copy</button><button className="secondary" onClick={()=>{c.clearPendingRecovery();setPendingSaved(false);}}>Cancel</button></div>}</details>}
 <p role="status">{c.message}{c.last&&` Last acknowledgement: ${c.last}.`}</p>{c.error&&<p role="alert" id={id+'error'}>{c.error}</p>}<p className="fine">Conflicting financial changes pause sync for review. Encrypted backups remain a separate recovery copy. Cloud deletion retains separate local copies and user-held exports. Session access can be revoked below.</p></section><AccountDeletion account={c.account} opened={c.opened} busy={c.busy} erase={c.eraseAccount}/>{c.opened&&<LocalAccountAttach busy={c.busy} health={c.health} preview={c.attachPreview} prepare={c.prepareAttach} confirm={c.confirmAttach} cancel={c.cancelAttach}/>}{c.account&&<AccountDevices account={c.account} onCurrentRevoked={()=>void c.forgetDevice()}/>}</div>;
}
