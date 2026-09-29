'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal,flushSync} from 'react-dom';
import {AppIcon} from '../app-icon';
import {entranceAllowed} from '../use-entrance';
/** "See how it works": the brand intro in a dialog. Nothing downloads, poster included, until it first opens. It plays on open unless reduced motion or Motion Off is set, then shows the poster and play control. Closing pauses and rewinds. */
export function IntroVideo(){
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null),[host,setHost]=useState<HTMLElement|null>(null),[requested,setRequested]=useState(false);
 useEffect(()=>setHost(document.body),[]);
 const open=()=>{flushSync(()=>setRequested(true));dialog.current?.showModal();if(entranceAllowed())void video.current?.play().catch(()=>{});};
 const closed=()=>{const v=video.current;if(v){v.pause();if(v.readyState>0)v.currentTime=0;}trigger.current?.focus();};
 return <><button ref={trigger} type="button" className="secondary" onClick={open}><span className="play-medallion"><AppIcon name="play" luminous/></span> See how it works</button>{host&&createPortal(<dialog ref={dialog} className="intro-video-dialog" aria-labelledby="intro-video-title" aria-describedby="intro-video-note" onClose={closed} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div className="intro-video-card"><div className="intro-video-head"><div><h2 id="intro-video-title">ZIGoals intro</h2><p id="intro-video-note">Full walkthrough video coming soon. Music only, no narration.</p></div><button type="button" className="quiet" aria-label="Close intro video" onClick={()=>dialog.current?.close()}>×</button></div><video ref={video} src={requested?"/media/zigoals-intro.mp4":undefined} poster={requested?"/media/zigoals-intro-poster.jpg":undefined} width={784} height={1168} controls playsInline preload="none" aria-label="ZIGoals intro video (music only, no narration)"/></div></dialog>,host)}</>;
}
