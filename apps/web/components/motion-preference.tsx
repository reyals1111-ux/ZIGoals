'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {MOTION_PREFERENCE_KEY} from './use-entrance';
import {MOTION_CHOICES,MOTION_LABELS,MOTION_SAVED,parseMotionChoice,type MotionChoice} from '../lib/motion/level';
import './motion.css';
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener('zigoals-motion',callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener('zigoals-motion',callback);};}
/* Session AK M4: Full ("system", the default and the value older builds read), Calm (new, additive) or Off. Unknown
   words read as Calm (lib/motion/level.ts); an unreadable store reads as Full here, as before, while the device setting
   still applies. */
function snapshot():MotionChoice{try{return parseMotionChoice(localStorage.getItem(MOTION_PREFERENCE_KEY));}catch{return 'system';}}
/** Mirrors the saved preference onto <html> on every app route, not only while Settings is open. */
export function MotionPreferenceSync(){const preference=useSyncExternalStore(subscribe,snapshot,()=> 'system');useEffect(()=>{document.documentElement.dataset.appMotion=preference;},[preference]);return null;}
export function MotionPreference(){
 const preference=useSyncExternalStore(subscribe,snapshot,()=> 'system'),[error,setError]=useState(''),[preview,setPreview]=useState(0),[saved,setSaved]=useState('');/* Session AH (SE9, N-183): the choice confirms itself */
 useEffect(()=>{document.documentElement.dataset.appMotion=preference;},[preference]);
 return <div className="motion-preference"><label className="field">Motion<select value={preference} onChange={e=>{const choice=parseMotionChoice(e.target.value);try{localStorage.setItem(MOTION_PREFERENCE_KEY,choice);window.dispatchEvent(new Event('zigoals-motion'));setError('');setSaved(MOTION_SAVED[choice]);}catch{setError('This browser could not save the preference. Your device reduced-motion setting still applies.');}}}>{MOTION_CHOICES.map(choice=><option key={choice} value={choice}>{MOTION_LABELS[choice]}</option>)}</select></label><div className="motion-preview" role="group" aria-label="Motion preview"><span key={preview} className="motion-preview-sample" aria-hidden="true"/> <span>Brief, one-time entrance</span></div><button type="button" className="secondary" onClick={()=>setPreview(value=>value+1)}>Preview motion again</button><p>Full: pages glide, numbers count up once and finished things celebrate once. Calm: short fades only, nothing moves around or loops. Off: nothing moves. Motion starts when content first enters view, and never blocks a tap. Your device reduced-motion setting always takes priority.</p>{saved&&!error&&<p role="status">{saved}</p>}{error&&<p role="alert">{error}</p>}</div>;
}
