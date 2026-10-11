'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {entranceAllowed} from './use-entrance';

type Art={w:number;h:number;star:readonly [number,number];rim:readonly [number,number,number]};
/** Flare centre and the planet-rim circle [cx, cy, r], measured in source pixels from each artwork file. */
export const HERO_ART:Record<string,Art>={
 'hero.webp':{w:1774,h:887,star:[1552.4,397.2],rim:[468.7,1829.4,1792.9]},
 'hero-mobile.webp':{w:960,h:480,star:[830.4,206.9],rim:[252.2,994.5,975]},
};
const fraction=(value:string)=>value.trim().endsWith('%')?parseFloat(value)/100:Number.NaN;

/** Maps artwork pixels into the ::before box through its cover scale and position; clip copies that box, mask and opacity so the star shows only where the artwork does. */
export function heroArtFrame(hero:HTMLElement){
 const style=getComputedStyle(hero,'::before'),file=/\/([\w-]+\.webp)/.exec(style.backgroundImage)?.[1],art=file?HERO_ART[file]:undefined;
 const left=parseFloat(style.left),top=parseFloat(style.top),width=parseFloat(style.width),height=parseFloat(style.height),px=fraction(style.backgroundPositionX),py=fraction(style.backgroundPositionY);
 if(!art||style.backgroundSize!=='cover'||![left,top,width,height,px,py].every(Number.isFinite))return null;
 const scale=Math.max(width/art.w,height/art.h),x0=(width-art.w*scale)*px,y0=(height-art.h*scale)*py;
 const clip={left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`,opacity:style.opacity,maskImage:style.maskImage,maskComposite:style.maskComposite,maskSize:style.maskSize,maskPosition:style.maskPosition,maskRepeat:style.maskRepeat};
 return {art,scale,clip,map:(x:number,y:number)=>[x0+x*scale,y0+y*scale] as const};
}

/** Once per visit, the star rises along the planet's rim into the artwork's flare and blooms into it. The layer then leaves the page, so the settled hero is the untouched artwork. */
export function HeroStar(){
 const root=useRef<HTMLDivElement>(null),[live,setLive]=useState(true);
 useLayoutEffect(()=>{
  const el=root.current,hero=el?.parentElement,frame=hero&&entranceAllowed()?heroArtFrame(hero):null;
  const core=el?.querySelector<HTMLElement>('.hero-star-core'),veil=el?.querySelector<HTMLElement>('.hero-star-veil');
  if(!el||!frame||!core||!veil||typeof core.animate!=='function'){setLive(false);return;}
  Object.assign(el.style,frame.clip);
  const {art,scale,map}=frame,[cx,cy]=map(art.rim[0],art.rim[1]),radius=art.rim[2]*scale,[sx,sy]=map(art.star[0],art.star[1]);
  const end=Math.atan2(sy-cy,sx-cx),start=end+14*Math.PI/180,size=150*scale,shade=420*scale;
  core.style.width=core.style.height=`${size}px`;
  Object.assign(veil.style,{width:`${shade}px`,height:`${shade}px`,left:`${sx-shade/2}px`,top:`${sy-shade/2}px`});
  const at=(angle:number,grow:number)=>`translate(${cx+radius*Math.cos(angle)-size/2}px,${cy+radius*Math.sin(angle)-size/2}px) scale(${grow})`;
  const steps=24,rise=core.animate(Array.from({length:steps+1},(_,i)=>({transform:at(start+(end-start)*i/steps,.55+.45*i/steps),opacity:Math.min(1,i/4)})),{duration:1150,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  const bloom=core.animate([{transform:at(end,1),opacity:1},{transform:at(end,2.3),opacity:0}],{duration:650,delay:1080,easing:'ease-out',fill:'forwards'});
  const lift=veil.animate([{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.55},{opacity:0}],{duration:1800,easing:'ease-in-out',fill:'forwards'});
  let active=true;
  Promise.all([rise.finished,bloom.finished,lift.finished]).then(()=>{if(active)setLive(false);},()=>{});
  return ()=>{active=false;for(const a of [rise,bloom,lift])a.cancel();};
 },[]);
 if(!live)return null;
 return <div ref={root} className="hero-star" aria-hidden="true"><span className="hero-star-veil"/><span className="hero-star-core"/></div>;
}
