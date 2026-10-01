'use client';
import {StorageHealth} from './storage-health';
import {useEffect,useState} from 'react';
import {ACCOUNT_CHANGE,getAccountGeneration} from '../lib/account-session';
import {usePlatform} from './platform/use-platform';
import {useHabits} from './habits/use-habits';
import {useHealth} from './health/use-health';
import {usePrivateStore} from './use-private-store';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings} from '../lib/dashboard-settings';
import {PLATFORM_KEY,platformSchema,emptyPlatform} from '../lib/positions';
import {HABITS_KEY,habitDataSchema,emptyHabitData} from '../lib/habits';
import {HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth} from '../lib/health';
import {getAppStorage,isShowcase} from '../lib/showcase-storage';
import {enableDurableStore,isDurableMarker} from '../lib/vault/local';
import {encryptBackup,decryptBackup} from '../lib/vault/backup';
import {summarizeBackupModules,type BackupModuleSummary} from '../lib/vault/backup-preview';
import {LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY,exportLocalSimulation,isOmittedLocalSimulation,restoreLocalSimulation} from '../lib/vault/local-simulation-backup';
import {storageLockKey} from '../lib/showcase-storage';
import { formatNumber } from '../lib/visual-format';
type Domain='finance'|'habits'|'health'|'settings';
type Section=Domain|'simulation';
export function PrivateVaultTools(){
 const finance=usePlatform(),habits=useHabits(),health=useHealth(),settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const stores={finance,habits,health,settings};const [domain,setDomain]=useState<Section>('health'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [generated,setGenerated]=useState<{file:string;recovery:string;warning:string|null}|null>(null),[saved,setSaved]=useState(false),[file,setFile]=useState(''),[secret,setSecret]=useState(''),[preview,setPreview]=useState<Partial<Record<Section,string>>|null>(null),[confirm,setConfirm]=useState(false);
 const [healthConsent,setHealthConsent]=useState(false),[inventory,setInventory]=useState<BackupModuleSummary[]>([]);
 // One unlock restores any number of modules (QA-21): the preview stays until Done, Cancel or an account change.
 const [restored,setRestored]=useState<Section[]>([]);
 const moduleLabel=(section:Section)=>inventory.find(item=>item.domain===section)?.label??section;
 useEffect(()=>{const clear=()=>{setGenerated(null);setSaved(false);setPreview(null);setFile('');setSecret('');setConfirm(false);setHealthConsent(false);setMessage('');setError('');setRestored([]);};window.addEventListener(ACCOUNT_CHANGE,clear);return()=>window.removeEventListener(ACCOUNT_CHANGE,clear);},[]);
 async function run(work:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setMessage('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Operation failed. Existing records were preserved.');}finally{setBusy(false);}}
 async function upgrade(){
  if(isShowcase())throw Error('Return to your data before changing private storage.');if(domain==='simulation')throw Error('Select a module to upgrade.');const storage=getAppStorage();
  if(domain==='finance')await enableDurableStore(storage,PLATFORM_KEY,platformSchema,emptyPlatform);
  if(domain==='habits')await enableDurableStore(storage,HABITS_KEY,habitDataSchema,emptyHabitData);
  if(domain==='health')await enableDurableStore(storage,HEALTH_STORAGE_KEY,healthSchema,createEmptyHealth);
  if(domain==='settings')await enableDurableStore(storage,DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
  window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:{finance:PLATFORM_KEY,habits:HABITS_KEY,health:HEALTH_STORAGE_KEY,settings:DASHBOARD_SETTINGS_KEY}[domain]}));
  setMessage('Transactional storage is active for this module. Original bytes are preserved privately. This is local storage, not cloud sync.');
 }
 async function makeBackup(){
  if(isShowcase())throw Error('Return to your own data before backing up.');
  if(Object.values(stores).some(s=>!s.loaded||s.error))throw Error('Resolve unreadable data before creating a backup.');
  const selected=getAppStorage(),generation=getAccountGeneration();const fence=()=>{if(generation!==getAccountGeneration()||selected!==getAppStorage())throw Error('Account changed. Backup preparation was cancelled.');};
  const data:Partial<Record<Domain,string>>={};for(const key of ['finance','habits','settings',...(healthConsent?['health']:[])] as Domain[]){fence();data[key]=await stores[key].exportData();fence();}
  // Legacy Local simulation Goals ride along as an optional section when this browser holds any.
  // Damaged legacy records are left out with a visible warning; they never block the other modules.
  const simulation=exportLocalSimulation(selected);fence();const sections:Partial<Record<Section,string>>={...data,...(simulation?{simulation:simulation.section}:{})};
  const encrypted=await encryptBackup(sections);fence();setGenerated({...encrypted,warning:simulation?.warning??null});setSaved(false);
 }
 function download(){if(!generated||!saved)return;const url=URL.createObjectURL(new Blob([generated.file],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zigoals-encrypted-backup-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setGenerated(null);setSaved(false);setMessage(`Encrypted backup downloaded. Keep its recovery secret separately.${generated.warning?` ${generated.warning}`:''}`);}
 async function review(){const generation=getAccountGeneration();const parsed=await decryptBackup(file,secret);if(generation!==getAccountGeneration())throw Error('Account changed. Backup preview was cancelled.');const summary=summarizeBackupModules(parsed);setInventory(summary);setPreview(parsed);setRestored([]);setDomain(restorable(parsed)[0]!);setSecret('');setConfirm(false);}
 // Until a module's first read finishes, its storage kind is unknown and it must not be migrated.
 const reading=domain!=='simulation'&&!stores[domain].loaded;
 let durable=false;try{if(domain!=='simulation')durable=stores[domain].loaded&&isDurableMarker(getAppStorage().getItem({finance:PLATFORM_KEY,habits:HABITS_KEY,health:HEALTH_STORAGE_KEY,settings:DASHBOARD_SETTINGS_KEY}[domain]));}catch{}
 function restorable(sections:Partial<Record<Section,string>>){return (Object.keys(sections) as Section[]).filter(d=>d!=='simulation'||!isOmittedLocalSimulation(sections.simulation!));}
 async function restoreSelected(raw:string){
  if(domain!=='simulation'){await stores[domain].importData(raw);return;}
  const storage=getAppStorage();try{await restoreLocalSimulation(storage,raw);}catch{throw Error('Backup could not be imported. Check its module, version and size. Existing private data was preserved.');}
  for(const key of [LOCAL_LEDGER_KEY,LOCAL_PLANS_KEY])window.dispatchEvent(new StorageEvent('storage',{key:storageLockKey(storage,key)}));
 }
 return <section className="panel" id="private-vault"><p className="eyebrow">PRIVATE RECOVERY</p><h2>Keep a protected copy.</h2>
  <p>Encrypted downloads use a separate recovery secret generated on this device. Email access cannot recover a lost secret. Your active local records remain readable to this browser profile.</p>
  <label className="checkbox"><input type="checkbox" checked={healthConsent} onChange={e=>setHealthConsent(e.target.checked)}/>Include my Health records in this encrypted download.</label>
  <button className="secondary" disabled={busy} onClick={()=>void run(makeBackup)}>Prepare encrypted backup</button>
  {generated&&<div className="notice">{generated.warning&&<p role="alert" className="alert">{generated.warning}</p>}<p>Save this secret privately, separately from the downloaded file. Do not paste it into support or include it in screenshots.</p><label>Recovery secret<input readOnly value={generated.recovery} autoComplete="off" spellCheck={false}/></label><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved the recovery secret.</label><button className="primary" disabled={!saved} onClick={download}>Download encrypted backup</button><button className="secondary" onClick={()=>setGenerated(null)}>Cancel and forget secret</button></div>}
  <details><summary>Restore an encrypted backup</summary><p>Preview first. Restore one selected module at a time; other modules stay unchanged. A pre-restore copy is retained in this browser. Restore replaces that module; it does not merge financial records.</p>
   <label>Encrypted backup file<input type="file" accept="application/json,.json" onChange={e=>void run(async()=>{setPreview(null);setRestored([]);const selected=e.target.files?.[0];if(!selected)return;if(selected.size>48_000_000)throw Error('Backup exceeds 48 MB.');setFile(await selected.text());})}/></label>
   <label>Backup recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><button className="secondary" disabled={busy||!file||!secret} onClick={()=>void run(review)}>Unlock and preview</button>
   {preview&&<><div className="backup-preview" aria-label="Protected backup inventory"><p>Encrypted backup · Format version {preview.simulation?2:1} · Authenticated and validated.</p><ul>{inventory.map(item=><li key={item.domain}><strong>{item.label}</strong>{restored.includes(item.domain)&&<span className="pill">Restored</span>} · data version {item.version}{item.version!==item.restoredVersion?` → restore as data version ${item.restoredVersion}`:null}<p>{item.counts.map(count=>`${count.label}: ${formatNumber(count.count)}`).join(' · ')||'Saved preferences'}</p><p>{item.from?`Stored date range: ${item.from} to ${item.through}.`:'No dated records.'}</p>{item.warning&&<p className="alert">{item.warning}</p>}</li>)}</ul><p className="fine">Date ranges include stored event, creation and update dates; timestamps use UTC. Timer receipts count accepted recordings; one timer may have multiple receipts.</p></div><p>Validated modules: {(Object.keys(preview) as Section[]).map(moduleLabel).join(', ')}. {restored.length?`Restored so far: ${restored.map(moduleLabel).join(', ')}. Choose another module, or Done.`:'No changes applied.'}</p><label>Module to restore<select value={domain} onChange={e=>{setDomain(e.target.value as Section);setConfirm(false);}}>{restorable(preview).map(d=><option key={d} value={d}>{moduleLabel(d)}{restored.includes(d)?' · restored':''}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Replace the selected module with this validated backup.</label><button className="primary" disabled={busy||!confirm||!preview[domain]} onClick={()=>void run(async()=>{await restoreSelected(preview[domain]!);const done=[...restored.filter(d=>d!==domain),domain];setRestored(done);const next=restorable(preview).find(d=>!done.includes(d));if(next)setDomain(next);setConfirm(false);setMessage('Selected module restored; prior local bytes retained.');})}>Restore selected module</button><button className="secondary" onClick={()=>{setPreview(null);setFile('');setSecret('');setRestored([]);}}>{restored.length?'Done':'Cancel'}</button></>}
  </details>
  <StorageHealth/><details><summary>Transactional local storage</summary><p>Move this module to IndexedDB after downloading a backup. Related records and pending operations save together. Older app versions will refuse this module rather than overwrite it. Browser persistence is not a backup; hosted sync remains separate.</p><label>Module<select value={domain} onChange={e=>setDomain(e.target.value as Domain)}><option value="finance">Goals and Wealth</option><option value="habits">Habits</option><option value="health">Health</option><option value="settings">Today preferences</option></select></label><p>{reading?'Reading this module…':durable?'Using transactional local storage.':'Using legacy local storage.'}</p><button className="secondary" disabled={busy||durable||reading} onClick={()=>void run(upgrade)}>Upgrade selected module storage</button></details>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
