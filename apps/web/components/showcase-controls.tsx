"use client";
/* Full reload is intentional: dispose all normal/scoped store hooks when changing data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import {useState,useSyncExternalStore} from 'react';
import {isShowcase,showcaseDay,loadShowcase,resetShowcase,exitShowcase} from '../lib/showcase';
import {useGoals} from './goal-provider';
const subscribe=()=>()=>{};
export function useShowcase(){return useSyncExternalStore(subscribe,isShowcase,()=>false);}
export function ShowcaseBanner(){const active=useShowcase();return active?<aside className="showcase-banner" aria-label="Showcase data"><div><strong>SHOWCASE DATA</strong><span>Fictional portfolio & history · real market references are labelled separately · {showcaseDay()}</span></div><button className="quiet" onClick={()=>{exitShowcase();window.location.assign('/app/settings#showcase');}}>Exit Showcase</button></aside>:null;}
export function ShowcaseControls(){
 const s=useGoals(),active=useShowcase(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 function run(reset=false){setBusy(true);try{if(reset)resetShowcase();else loadShowcase();window.location.assign('/app');}catch{setError('Showcase could not be loaded. Your existing data has been preserved. Check available browser storage.');setBusy(false);}}
 return <section className="showcase-controls panel" id="showcase"><div><p className="eyebrow">DEMO / SHOWCASE DATA</p><h2>Take a tour of your tomorrow.</h2><p>Explore a fictional portfolio, six Goals, 30 days of Habits and a filled Health diary. Public market prices are real references; example quantities and histories are fictional.</p><p className="fine">Showcase uses separate storage in this tab. Your usual private data and wallet records stay separate. Reset restores the examples for today.</p></div><div className="showcase-control-actions">{active?<><span className="badge">SHOWCASE DATA</span><button className="primary" disabled={busy} onClick={()=>run(true)}>Reset Showcase Demo</button><button className="secondary" onClick={()=>{exitShowcase();window.location.reload();}}>Return to my data</button></>:<button className="primary" disabled={!s.loaded||s.mode!=='local'||busy} onClick={()=>run()}>Load Showcase Demo</button>}{s.mode!=='local'&&<p>Switch to Local demo above to open Showcase.</p>}{error&&<p role="alert">{error}</p>}</div></section>;
}
