'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal,flushSync} from 'react-dom';
import {AppIcon} from '../app-icon';
const FILM='/brand/how-it-works/how-it-works';
/** The 1080p file only where it shows: a wide window on a high-density screen. Everywhere else, the 1.5 MB 720p file. */
const source=()=>`${FILM}-${typeof window!=='undefined'&&window.innerWidth>=1200&&window.devicePixelRatio>=1.5?'1080p':'720p'}.mp4`;
/**
 * "See how it works": the ZIGoals brand film (Session I, Part 8) in a dialog. Nothing downloads, poster included,
 * until it first opens. It never plays by itself: the viewer starts it with the controls, so it works the same with
 * reduced motion and Motion Off. Closing pauses and rewinds.
 */
export function IntroVideo(){
 const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null),[host,setHost]=useState<HTMLElement|null>(null),[src,setSrc]=useState<string|null>(null);
 useEffect(()=>setHost(document.body),[]);
 const open=()=>{flushSync(()=>setSrc(current=>current??source()));dialog.current?.showModal();};
 const closed=()=>{const v=video.current;if(v){v.pause();if(v.readyState>0)v.currentTime=0;}trigger.current?.focus();};
 return <><button ref={trigger} type="button" className="secondary" onClick={open}><span className="play-medallion"><AppIcon name="play" luminous/></span> See how it works</button>{host&&createPortal(<dialog ref={dialog} className="intro-video-dialog" aria-labelledby="intro-video-title" aria-describedby="intro-video-note" onClose={closed} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}><div className="intro-video-card"><div className="intro-video-head"><div><h2 id="intro-video-title">ZIGoals brand film</h2><p id="intro-video-note">A 16-second film: the Z folds into a swan, lotus, butterfly, heart and bull, then becomes the ZIGoals logo — Goals, Habits &amp; Health = Wealth. Music and on-screen words, no speech.</p></div><button type="button" className="quiet" aria-label="Close brand film" onClick={()=>dialog.current?.close()}>×</button></div><video ref={video} src={src??undefined} poster={src?`${FILM}-poster.webp`:undefined} width={1280} height={720} controls playsInline preload={src?'metadata':'none'} aria-label="ZIGoals brand film (music and on-screen words, no speech)"/></div></dialog>,host)}</>;
}
