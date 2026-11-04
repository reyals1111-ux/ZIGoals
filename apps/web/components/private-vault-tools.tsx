'use client';
import {useEffect,useState} from 'react';
import {ACCOUNT_CHANGE,getAccountGeneration} from '../lib/account-session';
import {usePlatform} from './platform/use-platform';
import {useHabits} from './habits/use-habits';
import {useHealth} from './health/use-health';
import {usePrivateStore} from './use-private-store';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings} from '../lib/dashboard-settings';
import {getAppStorage,isShowcase} from '../lib/showcase-storage';
import {useShowcase} from './showcase-controls';
import {encryptBackup,decryptBackup,backupFormatVersion} from '../lib/vault/backup';
import {exportListSections,isListSection,restoreListSection,type ListSection} from '../lib/vault/backup-lists';
import {summarizeBackupModules,type BackupModuleSummary} from '../lib/vault/backup-preview';
import {LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY,exportLocalSimulation,isOmittedLocalSimulation,restoreLocalSimulation} from '../lib/vault/local-simulation-backup';
import {futureEntriesMessage} from './legacy-restore-clock';
import {storageLockKey} from '../lib/showcase-storage';
import { formatDate, formatNumber } from '../lib/visual-format';
import {plainErrorMessage} from '../lib/plain-error';
type Domain='finance'|'habits'|'health'|'settings';
type Section=Domain|'simulation'|ListSection;
export function PrivateVaultTools(){
 const finance=usePlatform(),habits=useHabits(),health=useHealth(),settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const showcaseOn=useShowcase();
 const stores={finance,habits,health,settings};const [domain,setDomain]=useState<Section>('health'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [generated,setGenerated]=useState<{file:string;recovery:string;warning:string|null}|null>(null),[saved,setSaved]=useState(false),[file,setFile]=useState(''),[secret,setSecret]=useState(''),[preview,setPreview]=useState<Partial<Record<Section,string>>|null>(null),[confirm,setConfirm]=useState(false);
 const [healthConsent,setHealthConsent]=useState(false),[inventory,setInventory]=useState<BackupModuleSummary[]>([]);
 // One unlock restores any number of modules (QA-21): the preview stays until Done, Cancel or an account change.
 const [restored,setRestored]=useState<Section[]>([]);
 const moduleLabel=(section:Section)=>inventory.find(item=>item.domain===section)?.label??section;
 useEffect(()=>{const clear=()=>{setGenerated(null);setSaved(false);setPreview(null);setFile('');setSecret('');setConfirm(false);setHealthConsent(false);setMessage('');setError('');setRestored([]);};window.addEventListener(ACCOUNT_CHANGE,clear);return()=>window.removeEventListener(ACCOUNT_CHANGE,clear);},[]);
 async function run(work:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setMessage('');try{await work();}catch(e){setError(plainErrorMessage(e, 'Operation failed. Existing records were preserved.'));}finally{setBusy(false);}}
 // Session AK G2 (RELEASE_REVIEW_2 R2-16): the per-module storage upgrade moved to Help & diagnostics (components/settings/storage-internals.tsx).
 async function makeBackup(){
  if(isShowcase())throw Error('Return to your own data before backing up.');
  if(Object.values(stores).some(s=>!s.loaded||s.error))throw Error('Resolve unreadable data before creating a backup.');
  const selected=getAppStorage(),generation=getAccountGeneration();const fence=()=>{if(generation!==getAccountGeneration()||selected!==getAppStorage())throw Error('Account changed. Backup preparation was cancelled.');};
  const data:Partial<Record<Domain,string>>={};for(const key of ['finance','habits','settings',...(healthConsent?['health']:[])] as Domain[]){fence();data[key]=await stores[key].exportData();fence();}
  // Legacy Local simulation Goals ride along as an optional section when this browser holds any.
  // Damaged legacy records are left out with a visible warning; they never block the other modules.
  const simulation=exportLocalSimulation(selected);fence();
  // Session AL (P-LS-36, LS-025, LS-064): Tasks and the Checklist ride along (Health quick inputs only with the Health choice).
  const lists=exportListSections(selected,{health:healthConsent});fence();
  const sections:Partial<Record<Section,string>>={...data,...(simulation?{simulation:simulation.section}:{}),...lists.sections};
  const warning=[simulation?.warning,...lists.warnings].filter(Boolean).join(' ')||null;
  const encrypted=await encryptBackup(sections);fence();setGenerated({...encrypted,warning});setSaved(false);
 }
 function download(){if(!generated||!saved)return;const url=URL.createObjectURL(new Blob([generated.file],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zigoals-encrypted-backup-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setGenerated(null);setSaved(false);setMessage(`Encrypted backup downloaded. Keep its recovery secret separately.${generated.warning?` ${generated.warning}`:''}`);}
 async function review(){const generation=getAccountGeneration();const parsed=await decryptBackup(file,secret);if(generation!==getAccountGeneration())throw Error('Account changed. Backup preview was cancelled.');const summary=summarizeBackupModules(parsed);setInventory(summary);setPreview(parsed);setRestored([]);setDomain(restorable(parsed)[0]!);setSecret('');setConfirm(false);}
 function restorable(sections:Partial<Record<Section,string>>){return (Object.keys(sections) as Section[]).filter(d=>d!=='simulation'||!isOmittedLocalSimulation(sections.simulation!));}
 async function restoreSelected(raw:string){
  if(isListSection(domain)){restoreListSection(getAppStorage(),domain,raw);return;}
  if(domain!=='simulation'){await stores[domain].importData(raw);return;}
  const storage=getAppStorage();try{await restoreLocalSimulation(storage,raw);}catch{throw Error(futureEntriesMessage(raw)??'Backup could not be imported. Check its module, version and size. Existing private data was preserved.');}
  for(const key of [LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY])window.dispatchEvent(new StorageEvent('storage',{key:storageLockKey(storage,key)}));
 }
 const inShowcase=showcaseOn;
 return <section className="panel" id="private-vault"><p className="eyebrow">PRIVATE RECOVERY</p><h2>Keep a protected copy.</h2>{/* Session AH Part 3 (DS8, L-006, M-004): in the Showcase these work only on your own data, said before a tap. */}{inShowcase&&<p className="notice">Encrypted backups and storage upgrades work on your own records, not the Showcase’s examples. Exit the Showcase to use them.</p>}
  <p>Encrypted downloads use a separate recovery secret generated on this device. Email access cannot recover a lost secret. Your active local records remain readable to this browser profile.</p>
  <label className="checkbox"><input type="checkbox" checked={healthConsent} onChange={e=>setHealthConsent(e.target.checked)}/>Include my Health records in this encrypted download.</label>
  <button className="secondary" disabled={busy||inShowcase} onClick={()=>void run(makeBackup)}>Prepare encrypted backup</button>
  {generated&&<div className="notice">{generated.warning&&<p role="alert" className="alert">{generated.warning}</p>}<p>Save this secret privately, separately from the downloaded file. Do not paste it into support or include it in screenshots.</p><label>Recovery secret<input readOnly value={generated.recovery} autoComplete="off" spellCheck={false}/></label><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved the recovery secret.</label><button className="primary" disabled={!saved} onClick={download}>Download encrypted backup</button><button className="secondary" onClick={()=>setGenerated(null)}>Cancel and forget secret</button></div>}
  <details><summary>Restore an encrypted backup</summary><p>Preview first. Restore one selected module at a time; other modules stay unchanged. A pre-restore copy is retained in this browser. Restore replaces that module; it does not merge financial records.</p>
   <label>Encrypted backup file<input type="file" accept="application/json,.json" onChange={e=>void run(async()=>{setPreview(null);setRestored([]);const selected=e.target.files?.[0];if(!selected)return;if(selected.size>48_000_000)throw Error('Backup exceeds 48 MB.');const text=await selected.text();/* Session AL (BN-021): a picked file is answered at once: refused when it is not an encrypted backup, else the next step. */let format:unknown;try{format=(JSON.parse(text) as {format?:unknown})?.format;}catch{/* not JSON */}setFile(text);if(format!=='zigoals-encrypted-backup'){throw Error('This file is not a ZIGoals protected (encrypted) backup. Files from “Export” per module are restored in their own cards below, and an “Export everything” ZIP under Settings → Your data. Existing data was not changed.');}setMessage(`Read “${selected.name}”. Type its recovery secret, then press Unlock and preview.`);})}/></label>
   <label>Backup recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><button className="secondary" disabled={busy||!file||!secret} onClick={()=>void run(review)}>Unlock and preview</button>
   {preview&&<><div className="backup-preview" aria-label="Protected backup inventory"><p>Encrypted backup · Format version {backupFormatVersion(Object.keys(preview))} · Authenticated and validated.</p><ul>{inventory.map(item=><li key={item.domain}><strong>{item.label}</strong>{restored.includes(item.domain)&&<span className="pill">Restored</span>} · data version {item.version}{item.version!==item.restoredVersion?` → restore as data version ${item.restoredVersion}`:null}<p>{item.counts.map(count=>`${count.label}: ${formatNumber(count.count)}`).join(' · ')||'Saved preferences'}</p><p>{item.from?`Stored date range: ${formatDate(item.from)} to ${formatDate(item.through ?? item.from)}.`:'No dated records.'}</p>{item.warning&&<p className="alert">{item.warning}</p>}</li>)}</ul><p className="fine">Date ranges include stored event, creation and update dates; timestamps use UTC. Timer receipts count accepted recordings; one timer may have multiple receipts.</p></div><p>Validated modules: {(Object.keys(preview) as Section[]).map(moduleLabel).join(', ')}. {restored.length?`Restored so far: ${restored.map(moduleLabel).join(', ')}. Choose another module, or Done.`:'No changes applied.'}</p><label>Module to restore<select value={domain} onChange={e=>{setDomain(e.target.value as Section);setConfirm(false);}}>{restorable(preview).map(d=><option key={d} value={d}>{moduleLabel(d)}{restored.includes(d)?' · restored':''}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Replace the selected module with this validated backup.</label><button className="primary" disabled={busy||!confirm||!preview[domain]} onClick={()=>void run(async()=>{await restoreSelected(preview[domain]!);const done=[...restored.filter(d=>d!==domain),domain];setRestored(done);const next=restorable(preview).find(d=>!done.includes(d));if(next)setDomain(next);setConfirm(false);setMessage('Selected module restored; prior local bytes retained.');})}>Restore selected module</button><button className="secondary" onClick={()=>{setPreview(null);setFile('');setSecret('');setRestored([]);}}>{restored.length?'Done':'Cancel'}</button></>}
  </details>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
