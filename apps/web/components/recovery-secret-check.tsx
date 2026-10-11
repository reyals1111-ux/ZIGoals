'use client';
import {useId} from 'react';
/**
 * Session Z-Cloud Part 5 (A6, ADR-019 C35): the recovery secret, asked again before an action that ends data or access
 * (lib/vault/step-up.ts). It is checked against the vault on this device before anything is sent, and never stored.
 */
export const RECOVERY_CHECK_LABEL='Your recovery secret, to confirm it’s you';
/** A recovery secret's form: 43 base64url characters (the action button waits for it). */
export const looksLikeSecret=(secret:string)=>/^[A-Za-z0-9_-]{43}$/.test(secret.trim());
export function RecoverySecretCheck({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const id=useId();
 return <div className="field step-up-field"><label htmlFor={id}>{RECOVERY_CHECK_LABEL}</label><input id={id} type="password" autoComplete="off" spellCheck={false} value={value} disabled={disabled} aria-describedby={id+'-note'} onChange={e=>onChange(e.target.value)}/><p className="fine" id={id+'-note'}>Deleting cloud records, rotating the key and signing other devices out ask for it on every device, a remembered one too.</p></div>;
}
