'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {MOTION_PREFERENCE_KEY} from './use-entrance';
import './motion.css';
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener('zigoals-motion',callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener('zigoals-motion',callback);};}
function snapshot(){try{return localStorage.getItem(MOTION_PREFERENCE_KEY)==='off'?'off':'system';}catch{return 'system';}}
export function MotionPreference(){
 const preference=useSyncExternalStore(subscribe,snapshot,()=> 'system'),[error,setError]=useState('');
 useEffect(()=>{document.documentElement.dataset.appMotion=preference;},[preference]);
 return <div className="motion-preference"><label className="field">Entrance animation<select value={preference} onChange={e=>{try{localStorage.setItem(MOTION_PREFERENCE_KEY,e.target.value);window.dispatchEvent(new Event('zigoals-motion'));setError('');}catch{setError('This browser could not save the preference. Your device reduced-motion setting still applies.');}}}><option value="system">Follow device preference</option><option value="off">Off</option></select></label><p>Brief entrances play once per route in this tab, then rest. Reduced motion on your device always takes priority.</p>{error&&<p role="alert">{error}</p>}</div>;
}
