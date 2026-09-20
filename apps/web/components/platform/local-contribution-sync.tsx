'use client';
import {useEffect,useRef,useState} from 'react';
import {useGoals} from '../goal-provider';
import {usePlatform} from './use-platform';
import {PLATFORM_KEY} from '../../lib/positions';
import {parseLocalLedger} from '../../lib/local-ledger';
import {syncConfirmedLocalContributions} from '../../lib/local-contributions';
/** Confirmed ledger receipts are replayable. A failed secondary write never loses a receipt,
 * and a later mount can reconcile it exactly once without repeating the financial action. */
export function LocalContributionSync(){
 const legacy=useGoals(),store=usePlatform(),attempted=useRef(''),[warning,setWarning]=useState('');
 const activityKey=JSON.stringify(legacy.activity);
 const {loaded,error,update}=store;
 useEffect(()=>{
  if(!legacy.loaded||legacy.mode!=='local'||!loaded||error||attempted.current===activityKey)return;
  const initial=!attempted.current;attempted.current=activityKey;
  try{if(initial&&JSON.parse(localStorage.getItem(PLATFORM_KEY)??'null')?.schemaVersion===1)return;}catch{return;}
  const raw=localStorage.getItem('zigoals:local-ledger:v1');if(!raw)return;
  void (async()=>{try{const ledger=parseLocalLedger(raw);await update(s=>syncConfirmedLocalContributions(s,ledger));setWarning('');}catch{setWarning('Confirmed simulation receipts are safe. Contribution history could not be synchronized; reload after checking private storage.');}})();
 },[legacy.loaded,legacy.mode,loaded,error,update,activityKey]);
 return warning?<p className="notice" role="status">{warning}</p>:null;
}
