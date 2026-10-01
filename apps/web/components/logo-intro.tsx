'use client';
import {useEffect} from 'react';
import {MOTION_PREFERENCE_KEY} from './use-entrance';
import {CROSSFADE_MS,LOGO_INTRO_KEY,READY_MS,SETTLE_AT_S,decideLogoIntro,foldPlacement,type AutoplayPolicy,type FoldSource,type IntroEnvironment} from './logo-intro-decision';

export {LOGO_INTRO_KEY};
type Host='sidebar'|'phone';
const LOGO:Record<Host,string>={sidebar:'.app-sidebar .brand>.brand-logo',phone:'.phone-home>.brand-logo'};
/** One clip per page load: the first visible host claims it (the sidebar Z on desktop and tablets, the top bar Z on phones). */
let claimed=false;

function environment(logo:HTMLElement|null):IntroEnvironment{
 const nav=navigator as Navigator&{connection?:{saveData?:boolean};getAutoplayPolicy?:(type:'mediaelement')=>string};
 let session:IntroEnvironment['session'],motionOff:boolean,autoplay:AutoplayPolicy='unknown';
 try{session=sessionStorage.getItem(LOGO_INTRO_KEY)?'played':'unplayed';}catch{session='unavailable';}
 try{motionOff=localStorage.getItem(MOTION_PREFERENCE_KEY)==='off';}catch{motionOff=true;}
 try{const policy=nav.getAutoplayPolicy?.('mediaelement');if(policy==='allowed'||policy==='allowed-muted'||policy==='disallowed')autoplay=policy;}catch{/* not exposed */}
 let probe:HTMLVideoElement|undefined;
 return {
  hostVisible:!!logo&&logo.offsetWidth>0&&logo.getClientRects().length>0,
  reducedMotion:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  motionOff,session,saveData:nav.connection?.saveData===true,autoplay,
  canPlay:type=>(probe??=document.createElement('video')).canPlayType(type)!=='',
 };
}

/**
 * Plays the fold once over the static Z and hands back to it. The clip is a sibling layer that never takes pointer events
 * or focus, and nothing in the layout moves: the static Z keeps its box and only fades while the clip is on screen.
 */
function playFold(host:Host,logo:HTMLImageElement,sources:FoldSource[]){
 const link=logo.parentElement!,video=document.createElement('video');
 let frame:HTMLSpanElement|null=null;
 video.className=host==='phone'?'logo-intro logo-intro-phone':'logo-intro';
 video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='none';video.tabIndex=-1;video.disablePictureInPicture=true;
 for(const attribute of ['muted','playsinline','disablepictureinpicture','disableremoteplayback'])video.setAttribute(attribute,'');
 video.setAttribute('aria-hidden','true');video.dataset.state='waiting';
 for(const {src,type} of sources){const source=document.createElement('source');source.src=src;source.type=type;video.append(source);}
 const logoRect=logo.getBoundingClientRect();
 if(host==='phone'){
  // The top bar is its own stacking context, so the clip sits on the page (fixed over the Z) where its screen blend sees the background.
  const {box,origin,startScale}=foldPlacement({left:logoRect.left,top:logoRect.top,width:logoRect.width,height:logoRect.height},0,document.documentElement.clientWidth);
  Object.assign(video.style,{left:`${box.left}px`,top:`${box.top}px`,width:`${box.width}px`,height:`${box.height}px`});
  video.style.setProperty('--intro-origin',`${origin.x}px ${origin.y}px`);video.style.setProperty('--intro-start',String(startScale));
  document.body.append(video);
 }else{
  // Inside the brand link (the sidebar's own layer), clipped to the sidebar's width so the wide figures never add a scrollbar.
  const sidebar=link.closest<HTMLElement>('.app-sidebar')??link,linkRect=link.getBoundingClientRect(),sideRect=sidebar.getBoundingClientRect();
  const originX=linkRect.left+link.clientLeft,originY=linkRect.top+link.clientTop;
  const clipLeft=sideRect.left+sidebar.clientLeft-originX,clipRight=clipLeft+sidebar.clientWidth;
  const {box,origin,startScale}=foldPlacement({left:logoRect.left-originX,top:logoRect.top-originY,width:logoRect.width,height:logoRect.height},clipLeft,clipRight);
  frame=document.createElement('span');frame.className='logo-intro-frame';frame.setAttribute('aria-hidden','true');
  Object.assign(frame.style,{left:`${clipLeft}px`,top:`${box.top}px`,width:`${clipRight-clipLeft}px`,height:`${box.height}px`});
  Object.assign(video.style,{left:`${box.left-clipLeft}px`,top:'0px',width:`${box.width}px`,height:`${box.height}px`});
  video.style.setProperty('--intro-origin',`${origin.x}px ${origin.y}px`);video.style.setProperty('--intro-start',String(startScale));
  frame.append(video);link.append(frame);
 }
 const layer=frame??video,width=window.innerWidth,timers:number[]=[];
 let finished=false;
 const listeners:[EventTarget,string,EventListener][]=[];
 const on=(target:EventTarget,type:string,handler:EventListener)=>{target.addEventListener(type,handler);listeners.push([target,type,handler]);};
 const finish=(handOver:boolean)=>{
  if(finished)return;finished=true;
  timers.forEach(t=>window.clearTimeout(t));listeners.forEach(([target,type,handler])=>target.removeEventListener(type,handler));
  if(handOver&&logo.isConnected){
   video.dataset.settle='';logo.dataset.intro='ending';video.dataset.state='ending';
   window.setTimeout(()=>{delete logo.dataset.intro;layer.remove();},CROSSFADE_MS+80);
   return;
  }
  // Static Z at once: stop the clip, drop its sources so any download in flight is abandoned, and take it out.
  delete logo.dataset.intro;
  video.pause();video.querySelectorAll('source').forEach(source=>source.remove());video.removeAttribute('src');
  try{video.load();}catch{/* already detached */}
  layer.remove();
 };
 const fail=()=>finish(false);
 on(video,'playing',()=>{if(finished)return;window.clearTimeout(timers[0]);logo.dataset.intro='playing';video.dataset.state='playing';});
 // The bull has folded back into the Z: ease to the exact size so the last frame sits on the static Z.
 on(video,'timeupdate',()=>{if(!logo.isConnected||!layer.isConnected)fail();else if(video.currentTime>=SETTLE_AT_S)video.dataset.settle='';});
 on(video,'ended',()=>finish(true));
 on(video,'error',fail);
 on(video.lastElementChild!,'error',fail);
 // A resize could move or rescale the static Z (e.g. across the sidebar breakpoint); the Motion setting can change mid-clip.
 on(window,'resize',()=>{if(window.innerWidth!==width)fail();});
 on(window,'zigoals-motion',fail);
 on(window,'pagehide',fail);
 timers.push(window.setTimeout(()=>{if(video.dataset.state!=='playing')fail();},READY_MS));
 video.play()?.catch(fail);
}

/**
 * Logo fold intro (Session I; extends the PR #29 intro). On the first app load of a browser session, the owner's fold
 * (Z → swan → lotus → butterfly → heart → bull → Z) plays once over the static Z, screen-blended so its near-black frame
 * vanishes on the dark UI, then crossfades into the static Z in 240 ms. Reduced motion, Motion Off, data saver, a
 * disallowed autoplay policy or no playable format: no video element is created and nothing is requested. Blocked
 * autoplay, an error or no frame within 1.5 s: the clip is removed at once and the static Z stays.
 */
export function LogoIntro({host}:{host:Host}){
 useEffect(()=>{
  // No cleanup: the clip ends itself (and notices if its logo goes away), so a remount never restarts or cuts it.
  if(claimed)return;
  const logo=document.querySelector<HTMLImageElement>(LOGO[host]);
  const decision=decideLogoIntro(environment(logo));
  if(!decision.play||!logo)return;
  try{sessionStorage.setItem(LOGO_INTRO_KEY,'played');}catch{return;}
  claimed=true;
  playFold(host,logo,decision.sources);
 },[host]);
 return null;
}
