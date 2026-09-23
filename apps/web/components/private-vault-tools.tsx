'use client';
import {StorageHealth} from './storage-health';
import {useState} from 'react';
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
type Domain='finance'|'habits'|'health'|'settings';
export function PrivateVaultTools(){
 const finance=usePlatform(),habits=useHabits(),health=useHealth(),settings=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
 const stores={finance,habits,health,settings};const [domain,setDomain]=useState<Domain>('health'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [generated,setGenerated]=useState<{file:string;recovery:string}|null>(null),[saved,setSaved]=useState(false),[file,setFile]=useState(''),[secret,setSecret]=useState(''),[preview,setPreview]=useState<Partial<Record<Domain,string>>|null>(null),[confirm,setConfirm]=useState(false);
 const [healthConsent,setHealthConsent]=useState(false);
 async function run(work:()=>Promise<void>){if(busy)return;setBusy(true);setError('');setMessage('');try{await work();}catch(e){setError(e instanceof Error?e.message:'Operation failed. Existing records were preserved.');}finally{setBusy(false);}}
 async function upgrade(){
  if(isShowcase())throw Error('Return to your data before changing private storage.');const storage=getAppStorage();
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
  const data:Partial<Record<Domain,string>>={};for(const key of ['finance','habits','settings',...(healthConsent?['health']:[])] as Domain[])data[key]=await stores[key].exportData();
  setGenerated(await encryptBackup(data));setSaved(false);
 }
 function download(){if(!generated||!saved)return;const url=URL.createObjectURL(new Blob([generated.file],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='zigoals-encrypted-backup-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setGenerated(null);setSaved(false);setMessage('Encrypted backup downloaded. Keep its recovery secret separately.');}
 async function review(){const parsed=await decryptBackup(file,secret);for(const [key,value] of Object.entries(parsed)){const schema={finance:platformSchema,habits:habitDataSchema,health:healthSchema,settings:dashboardSettingsSchema}[key as Domain];schema.parse(JSON.parse(value));}setPreview(parsed);setDomain(Object.keys(parsed)[0] as Domain);setSecret('');setConfirm(false);}
 const key={finance:PLATFORM_KEY,habits:HABITS_KEY,health:HEALTH_STORAGE_KEY,settings:DASHBOARD_SETTINGS_KEY}[domain];
 let durable=false;try{durable=isDurableMarker(getAppStorage().getItem(key));}catch{}
 return <section className="panel" id="private-vault"><p className="eyebrow">PRIVATE RECOVERY</p><h2>Keep a protected copy.</h2>
  <p>Encrypted downloads use a separate recovery secret generated on this device. Email access cannot recover a lost secret. Your active local records remain readable to this browser profile.</p>
  <label className="checkbox"><input type="checkbox" checked={healthConsent} onChange={e=>setHealthConsent(e.target.checked)}/>Include my Health records in this encrypted download.</label>
  <button className="secondary" disabled={busy} onClick={()=>void run(makeBackup)}>Prepare encrypted backup</button>
  {generated&&<div className="notice"><p>Save this secret privately, separately from the downloaded file. Do not paste it into support or include it in screenshots.</p><label>Recovery secret<input readOnly value={generated.recovery} autoComplete="off" spellCheck={false}/></label><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved the recovery secret.</label><button className="primary" disabled={!saved} onClick={download}>Download encrypted backup</button><button className="secondary" onClick={()=>setGenerated(null)}>Cancel and forget secret</button></div>}
  <details><summary>Restore an encrypted backup</summary><p>Preview first. Restore one selected module at a time; other modules stay unchanged. A pre-restore copy is retained in this browser. Restore replaces that module; it does not merge financial records.</p>
   <label>Encrypted backup file<input type="file" accept="application/json,.json" onChange={e=>void run(async()=>{setPreview(null);const selected=e.target.files?.[0];if(!selected)return;if(selected.size>48_000_000)throw Error('Backup exceeds 48 MB.');setFile(await selected.text());})}/></label>
   <label>Backup recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><button className="secondary" disabled={busy||!file||!secret} onClick={()=>void run(review)}>Unlock and preview</button>
   {preview&&<><p>Validated modules: {Object.keys(preview).join(', ')}. No changes applied.</p><label>Module to restore<select value={domain} onChange={e=>{setDomain(e.target.value as Domain);setConfirm(false);}}>{Object.keys(preview).map(d=><option key={d} value={d}>{d}</option>)}</select></label><label className="checkbox"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Replace the selected module with this validated backup.</label><button className="primary" disabled={busy||!confirm||!preview[domain]} onClick={()=>void run(async()=>{await stores[domain].importData(preview[domain]!);setPreview(null);setFile('');setConfirm(false);setMessage('Selected module restored; prior local bytes retained.');})}>Restore selected module</button><button className="secondary" onClick={()=>{setPreview(null);setFile('');setSecret('');}}>Cancel</button></>}
  </details>
  <StorageHealth/><details><summary>Transactional local storage</summary><p>Move this module to IndexedDB after downloading a backup. Related records and pending operations save together. Older app versions will refuse this module rather than overwrite it. Browser persistence is not a backup; hosted sync remains separate.</p><label>Module<select value={domain} onChange={e=>setDomain(e.target.value as Domain)}><option value="finance">Goals and Wealth</option><option value="habits">Habits</option><option value="health">Health</option><option value="settings">Today preferences</option></select></label><p>{durable?'Using transactional local storage.':'Using legacy local storage.'}</p><button className="secondary" disabled={busy||durable} onClick={()=>void run(upgrade)}>Upgrade selected module storage</button></details>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
