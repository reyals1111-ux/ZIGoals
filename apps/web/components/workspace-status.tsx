'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {syncStatus} from '../lib/sync-status/status';
import {ACCOUNT_CHANGE,getAccountScope,isAccountLocked} from '../lib/account-session';
import {useVaultStatus} from './vault-sync-controls';
import {useShowcase} from './showcase-controls';
/** Account identity stays inside the app; only storage/sync state is presented. */
export function useWorkspaceSelection(){
 const [state,setState]=useState({selected:false,locked:true,ready:false,error:false});
 useEffect(()=>{const update=()=>{try{setState({selected:!!getAccountScope(),locked:isAccountLocked(),ready:true,error:false});}catch{setState({selected:true,locked:true,ready:true,error:true});}};update();window.addEventListener(ACCOUNT_CHANGE,update);return()=>window.removeEventListener(ACCOUNT_CHANGE,update);},[]);
 return state;
}
/** Gate C (persona round): the line's words, also read by a phone's Status sheet, which shows them in full. */
export function useWorkspaceStatusText(){return useWorkspaceSyncStatus().text;}
/**
 * Session AK F0 (8.9): the words and a calm tone (lib/sync-status/status.ts). "Waiting to sync" is a change saved on this
 * device that no sync has carried yet: set by a private change, cleared when a sync run that started after it ends
 * without an error (a change made while a run is going waits for the next one).
 */
export function useWorkspaceSyncStatus(){
 const vault=useVaultStatus(),selection=useWorkspaceSelection(),showcase=useShowcase();
 const [online,setOnline]=useState(true),[changed,setChanged]=useState(false);
 const run=useRef<{busy:boolean;changedDuring:boolean}>({busy:false,changedDuring:false});
 useEffect(()=>{const network=()=>setOnline(navigator.onLine),local=()=>{setChanged(true);if(run.current.busy)run.current.changedDuring=true;},account=()=>setChanged(false);network();window.addEventListener('online',network);window.addEventListener('offline',network);window.addEventListener('zigoals:private-change',local);window.addEventListener(ACCOUNT_CHANGE,account);return()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);window.removeEventListener('zigoals:private-change',local);window.removeEventListener(ACCOUNT_CHANGE,account);};},[]);
 useEffect(()=>{
  if(vault.busy&&!run.current.busy)run.current={busy:true,changedDuring:false};
  else if(!vault.busy&&run.current.busy){const during=run.current.changedDuring;run.current={busy:false,changedDuring:false};if(!vault.error&&vault.last)setChanged(during);}
 },[vault.busy,vault.error,vault.last]);
 return syncStatus({ready:selection.ready,selectionError:selection.error,showcase,selected:selection.selected,locked:selection.locked,opened:vault.opened,error:!!vault.error,online,busy:vault.busy,last:vault.last,changed});
}
export function WorkspaceStatus(){
 const {text,tone}=useWorkspaceSyncStatus();
 return <div className="workspace-status"><span role="status" data-sync-tone={tone}>{text}</span><Link href="/app/settings#encrypted-sync">Storage &amp; sync settings →</Link></div>;
}
