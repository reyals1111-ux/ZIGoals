'use client';
import {useState} from 'react';
export function StorageHealth(){
 const [status,setStatus]=useState('Storage capacity has not been checked.'),[busy,setBusy]=useState(false);
 async function inspect(requestPersistence=false){setBusy(true);try{
  if(!navigator.storage?.estimate){setStatus('This browser cannot report storage capacity. Keep a separate backup.');return;}
  const granted=requestPersistence&&navigator.storage.persist?await navigator.storage.persist():await navigator.storage.persisted?.();
  const {usage,quota}=await navigator.storage.estimate();
  const size=(n:number)=>new Intl.NumberFormat(undefined,{maximumFractionDigits:1}).format(n/1048576)+' MB';
  setStatus(`${usage===undefined?'Usage unavailable':size(usage)+' used'}${quota===undefined?'':` of approximately ${size(quota)}`}. ${granted?'Browser persistence granted.':'Browser persistence is not granted.'}${usage!==undefined&&quota&&usage/quota>.8?' Storage is nearly full. Export a backup before adding more records.':''} Clearing site data can still erase local records.`);
 }catch{setStatus('Storage status could not be read. Check browser permissions and keep a separate backup.');}finally{setBusy(false);}}
 return <details><summary>Browser storage health</summary><p aria-live="polite">{status}</p><p>Estimates cover this site, including public caches. Persistence does not provide cloud sync or replace a backup.</p><button className="secondary" disabled={busy} onClick={()=>void inspect()}>Check storage</button><button className="secondary" disabled={busy} onClick={()=>void inspect(true)}>Request browser persistence</button></details>;
}
