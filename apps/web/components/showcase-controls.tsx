"use client";
/* Full reload is intentional: dispose all normal/scoped store hooks when changing data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import {useState,useSyncExternalStore} from 'react';
import {isShowcase,showcaseDay,loadShowcase,resetShowcase,exitShowcase} from '../lib/showcase';
import {useGoals} from './goal-provider';
import {ConfirmInline} from './ui/confirm-inline';
/** Session AH Part 3 (DS4): the words of the reset confirmation, shared by Settings and the Showcase chip. */
export const RESET_SHOWCASE_CONFIRM={title:'Reset the Showcase?',body:'Fresh examples replace this tab\'s Showcase, including anything you added to it. Your own records are not touched, and you can undo right after.',confirm:'Reset Showcase',cancel:'Keep this Showcase'};
const subscribe=()=>()=>{};
export function useShowcase(){return useSyncExternalStore(subscribe,isShowcase,()=>false);}
export function ShowcaseControls(){
 const s=useGoals(),active=useShowcase(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[asking,setAsking]=useState(false);
 function run(reset=false){setBusy(true);(reset?resetShowcase():loadShowcase()).then(()=>window.location.assign('/app'),()=>{setError('Showcase could not be loaded. Your existing data has been preserved. Check available browser storage.');setBusy(false);});}
 return <section className="showcase-controls panel" id="showcase"><div><p className="eyebrow">DEMO / SHOWCASE DATA</p><h2>Take a tour of your tomorrow.</h2><p>Explore a fictional portfolio, six Goals, 30 days of Habits and a filled Health diary. Market prices are real references, loaded when the Showcase opens and kept the same on every page in this tab; example quantities and histories are fictional.</p><p className="fine">Showcase uses separate storage in this tab. Your usual private data and wallet records stay separate. Reset restores the examples for today.</p></div><div className="showcase-control-actions">{active?<><span className="badge">SHOWCASE DATA</span><button className="secondary" disabled={busy} aria-expanded={asking} onClick={()=>setAsking(true)}>Reset Showcase Demo</button><button className="secondary" onClick={()=>{exitShowcase();window.location.reload();}}>Return to my data</button></>:<button className="primary" disabled={!s.loaded||s.mode!=='local'||busy} onClick={()=>run()}>Load Showcase Demo</button>}{asking&&<ConfirmInline title={RESET_SHOWCASE_CONFIRM.title} confirmLabel={RESET_SHOWCASE_CONFIRM.confirm} cancelLabel={RESET_SHOWCASE_CONFIRM.cancel} busy={busy} onConfirm={()=>run(true)} onCancel={()=>setAsking(false)}><p>{RESET_SHOWCASE_CONFIRM.body}</p></ConfirmInline>}{s.mode!=='local'&&<p>Switch to Local demo above to open Showcase.</p>}{error&&<p role="alert">{error}</p>}</div></section>;
}
