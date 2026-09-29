'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {entranceAllowed} from './use-entrance';

export const LOGO_INTRO_KEY='zigoals:logo-intro:v1';
const READY_MS=1500,CROSSFADE_MS=500,RATE=1.5;
// Where the Z sits in each image, in its own pixels: the clip's first frame (400×382) and the static logo (422×480).
const CLIP={w:400,h:382,z:{x:75,y:59,w:252,h:284}},LOGO={w:422,h:480,z:{x:11,y:16,w:399,h:448}};

/** Size and place the clip so its Z covers the static logo's Z exactly; everything else overflows harmlessly (no layout role). */
function placement(logo:HTMLImageElement):CSSProperties{
 const sx=logo.offsetWidth/LOGO.w,sy=logo.offsetHeight/LOGO.h;
 const k=(LOGO.z.w*sx/CLIP.z.w+LOGO.z.h*sy/CLIP.z.h)/2;
 return {left:logo.offsetLeft+LOGO.z.x*sx-CLIP.z.x*k,top:logo.offsetTop+LOGO.z.y*sy-CLIP.z.y*k,width:CLIP.w*k,height:CLIP.h*k};
}
/**
 * First load per browser session, desktop sidebar only: the folding Z plays once over the static logo,
 * screen-blended so its black never shows, then crossfades into the static logo. The static logo stays in
 * the DOM throughout and is shown at once under reduced motion, Motion Off, on later loads, or when the
 * clip cannot play promptly (blocked autoplay, an error, not ready within 1.5s).
 */
export function LogoIntro(){
 const [style,setStyle]=useState<CSSProperties|null>(null),video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{
  if(!window.matchMedia?.('(min-width: 901px)').matches||!entranceAllowed())return;
  try{if(sessionStorage.getItem(LOGO_INTRO_KEY))return;sessionStorage.setItem(LOGO_INTRO_KEY,'played');}catch{return;}
  const logo=document.querySelector<HTMLImageElement>('.app-sidebar .brand>.brand-logo');
  if(!logo||!logo.offsetWidth)return;
  setStyle(placement(logo));
 },[]);
 useEffect(()=>{
  const clip=video.current,logo=document.querySelector<HTMLImageElement>('.app-sidebar .brand>.brand-logo');
  if(!style||!clip||!logo)return;
  let finished=false;const timers:number[]=[];
  const finish=(crossfade:boolean)=>{
   if(finished)return;finished=true;timers.forEach(t=>window.clearTimeout(t));
   if(!crossfade){delete logo.dataset.intro;setStyle(null);return;}
   logo.dataset.intro='ending';clip.dataset.state='ending';
   timers.push(window.setTimeout(()=>{delete logo.dataset.intro;setStyle(null);},CROSSFADE_MS+80));
  };
  const playing=()=>{if(finished)return;window.clearTimeout(timers[0]);logo.dataset.intro='playing';clip.dataset.state='playing';};
  const ended=()=>finish(true),failed=()=>finish(false);
  clip.addEventListener('playing',playing);clip.addEventListener('ended',ended);clip.addEventListener('error',failed);
  timers.push(window.setTimeout(()=>{if(clip.dataset.state!=='playing')failed();},READY_MS));
  clip.defaultPlaybackRate=RATE;clip.playbackRate=RATE;
  clip.play()?.catch(failed);
  return()=>{clip.removeEventListener('playing',playing);clip.removeEventListener('ended',ended);clip.removeEventListener('error',failed);timers.forEach(t=>window.clearTimeout(t));delete logo.dataset.intro;};
 },[style]);
 if(!style)return null;
 return <video ref={video} className="logo-intro" style={style} src="/media/zigoals-logo-intro.mp4" muted autoPlay playsInline preload="auto" aria-hidden="true" tabIndex={-1} data-state="waiting"/>;
}
