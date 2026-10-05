'use client';
import {useState} from 'react';
import type {Platform,Position} from '../../lib/positions';
import {saveAsset} from '../../lib/asset-management';
import {AssetPicker,type AssetDraft} from './asset-picker';
import {pickerCategory,takePrefill} from '../../lib/ai/actions/prefill';
/** ZIGi's money hand-off (ADR-012): values stashed in this tab are read once and shown as defaults; nothing is saved until the person saves. */
function handedOver():AssetDraft|undefined{const p=takePrefill();return p?{...p,category:pickerCategory(p.category)}:undefined;}
export function ManualSourceCards({update,onSaved}:{update:(fn:(s:Platform)=>Platform)=>Promise<void>;onSaved:(p:Position)=>void}){const [error,setError]=useState(''),[busy,setBusy]=useState(false),[draft]=useState(handedOver);return <section className="manual-source-selector">{draft&&<p className="fine ai-prefill-note" role="status">Pre-filled from your chat with ZIGi. Check every value before saving; nothing is saved until you do.</p>}<fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><AssetPicker submitLabel="Save asset" initialDraft={draft} onDraft={p=>{setBusy(true);setError('');void update(s=>saveAsset(s,p)).then(()=>onSaved(p)).catch(e=>setError(e instanceof Error?e.message:'Asset could not be saved.')).finally(()=>setBusy(false));}}/></fieldset>{error&&<p role="alert">{error}</p>}</section>;}
