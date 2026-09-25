'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ACCOUNT_CHANGE,getAccountScope,isAccountLocked} from '../lib/account-session';
import {useVaultStatus} from './vault-sync-controls';
import {useShowcase} from './showcase-controls';
/** Account identity stays inside the app; only storage/sync state is presented. */
export function useWorkspaceSelection(){
 const [state,setState]=useState({selected:false,locked:true,ready:false,error:false});
 useEffect(()=>{const update=()=>{try{setState({selected:!!getAccountScope(),locked:isAccountLocked(),ready:true,error:false});}catch{setState({selected:true,locked:true,ready:true,error:true});}};update();window.addEventListener(ACCOUNT_CHANGE,update);return()=>window.removeEventListener(ACCOUNT_CHANGE,update);},[]);
 return state;
}
export function WorkspaceStatus(){
 const vault=useVaultStatus(),selection=useWorkspaceSelection(),showcase=useShowcase();
 const [online,setOnline]=useState(true),[saved,setSaved]=useState(false);
 useEffect(()=>{const network=()=>setOnline(navigator.onLine),local=()=>setSaved(true),account=()=>setSaved(false);network();window.addEventListener('online',network);window.addEventListener('offline',network);window.addEventListener('zigoals:private-change',local);window.addEventListener(ACCOUNT_CHANGE,account);return()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);window.removeEventListener('zigoals:private-change',local);window.removeEventListener(ACCOUNT_CHANGE,account);};},[]);
 let text='Checking storage…';
 if(selection.ready){
  if(selection.error)text='Account selection needs attention · records remain locked';
  else if(showcase)text='Showcase · fictional records';
  else if(!selection.selected)text='This device only · account sync is off';
  else if(selection.locked||!vault.opened)text='Account locked · unlock in Settings';
  else if(vault.error)text='Sync needs attention · changes kept on this device';
  else if(!online)text='Offline · account sync will retry when connected';
  else if(vault.busy)text='Syncing encrypted account records…';
  else if(vault.last)text=`${saved?'Changes saved on this device · ':''}Last sync acknowledgement: ${vault.last}`;
  else text='Account unlocked · awaiting sync acknowledgement';
 }
 return <div className="workspace-status"><span role="status">{text}</span><Link href="/app/settings#encrypted-sync">Storage &amp; sync settings →</Link></div>;
}
