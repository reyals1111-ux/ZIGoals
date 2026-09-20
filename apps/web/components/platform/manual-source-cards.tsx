'use client';
import {useState} from 'react';
import type {Platform,Position} from '../../lib/positions';
import {saveAsset} from '../../lib/asset-management';
import {AssetPicker} from './asset-picker';
export function ManualSourceCards({update,onSaved}:{update:(fn:(s:Platform)=>Platform)=>Promise<void>;onSaved:(p:Position)=>void}){const [error,setError]=useState(''),[busy,setBusy]=useState(false);return <section className="manual-source-selector"><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><AssetPicker submitLabel="Save asset" onDraft={p=>{setBusy(true);setError('');void update(s=>saveAsset(s,p)).then(()=>onSaved(p)).catch(e=>setError(e instanceof Error?e.message:'Asset could not be saved.')).finally(()=>setBusy(false));}}/></fieldset>{error&&<p role="alert">{error}</p>}</section>;}
