'use client';
import {useState} from 'react';
import type {VaultManifest} from '../lib/vault/crypto';
type Props={busy:boolean;prepared:{recovery:string}|null;staged:VaultManifest|null;prepare:()=>Promise<void>;resume:(secret:string)=>Promise<void>;finish:()=>Promise<void>;abort:()=>Promise<void>;cancel:()=>void};
export function VaultRotationControls(c:Props){
 const [saved,setSaved]=useState(false),[secret,setSecret]=useState(''),[discard,setDiscard]=useState(false);
 return <details><summary>Rotate vault encryption</summary><p>This creates a new random vault key and encrypts every retained cloud record again. Save the new recovery secret before activation. Other devices must lock and unlock with the new secret. Old exported backups still need their original backup secrets.</p>
 {!c.prepared&&!c.staged&&<button className="secondary" disabled={c.busy} onClick={()=>{setSaved(false);void c.prepare();}}>Prepare key rotation</button>}
 {c.staged&&!c.prepared&&<div className="notice"><p>An interrupted rotation is staged. Active records still use the old key. Resume with the new secret you saved, or explicitly discard the staged copy.</p><label>Staged rotation recovery secret<input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><button disabled={c.busy||!secret} onClick={()=>{const value=secret;setSecret('');setSaved(true);void c.resume(value);}}>Resume staged rotation</button><label><input type="checkbox" checked={discard} onChange={e=>setDiscard(e.target.checked)}/>Discard only the staged rotation; keep the active vault.</label><button disabled={c.busy||!discard} onClick={()=>void c.abort()}>Discard staged rotation</button></div>}
 {c.prepared&&<div className="notice"><label>New rotation recovery secret<input readOnly value={c.prepared.recovery} autoComplete="off" spellCheck={false}/></label><label className="checkbox"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>I saved the new rotation recovery secret separately.</label><button className="primary" disabled={c.busy||!saved} onClick={()=>void c.finish()}>Activate new vault key</button><button className="secondary" disabled={c.busy} onClick={()=>{setSaved(false);c.cancel();}}>Close rotation review</button></div>}
 </details>;
}
