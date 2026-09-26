'use client';
import {useState} from 'react';
import {type ForwardReview} from '../lib/vault/forward-recovery';
export function ForwardRecoveryControls({busy,review,prepare,confirm,cancel}:{busy:boolean;review:ForwardReview|null;prepare:()=>Promise<void>;confirm:()=>Promise<void>;cancel:()=>void}){
 const [saved,setSaved]=useState(false),[downloaded,setDownloaded]=useState(false),[phrase,setPhrase]=useState('');
 function download(){if(!review||!saved)return;const url=URL.createObjectURL(new Blob([review.file],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='zigoals-forward-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setDownloaded(true);}
 return <details><summary>Repair a blocked sync queue</summary><p>Review current local and cloud records before retiring an older queued operation. The original queue is preserved in a local recovery archive and in your encrypted download. A replacement sync uses current validation; it never replays the obsolete operation. Conflicting financial evidence still requires resolution.</p>
 {!review&&<button disabled={busy} onClick={()=>{setSaved(false);setDownloaded(false);setPhrase('');void prepare();}}>Prepare forward recovery review</button>}
 {review&&<div className="notice"><p>Reviewed sections: {review.domains.join(', ')}. Save the recovery file containing the original journal and separate local, cloud and proposed records.</p><label>Forward recovery secret<input readOnly value={review.recovery} autoComplete="off" spellCheck={false}/></label><label><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved the forward recovery secret separately.</label><button disabled={!saved||busy} onClick={download}>Download forward recovery copy</button><label>Recovery confirmation<input value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="RECOVER QUEUE" autoComplete="off"/></label><button disabled={busy||!downloaded||phrase!=='RECOVER QUEUE'} onClick={()=>void confirm()}>Confirm forward recovery</button><button disabled={busy} onClick={cancel}>Cancel recovery review</button></div>}
 </details>;
}
