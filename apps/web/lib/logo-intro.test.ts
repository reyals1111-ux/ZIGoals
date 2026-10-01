import {existsSync} from 'node:fs';
import {expect,test,vi} from 'vitest';
import {FOLD,FOLD_SOURCES,LOGO_INTRO_KEY,LOGO_Z,decideLogoIntro,foldPlacement,type IntroEnvironment} from '../components/logo-intro-decision';

const ok:IntroEnvironment={hostVisible:true,reducedMotion:false,motionOff:false,session:'unplayed',saveData:false,autoplay:'unknown',canPlay:()=>true};
const env=(patch:Partial<IntroEnvironment>)=>({...ok,...patch});

test('the session flag keeps its existing key, and both fold sources ship in public/brand (WebM first, then MP4)',()=>{
 expect(LOGO_INTRO_KEY).toBe('zigoals:logo-intro:v1');
 expect(FOLD_SOURCES.map(s=>s.src)).toEqual(['/brand/logo-fold/logo-fold.webm','/brand/logo-fold/logo-fold.mp4']);
 expect(FOLD_SOURCES.map(s=>s.type.split(';')[0])).toEqual(['video/webm','video/mp4']);
 for(const {src} of FOLD_SOURCES)expect(existsSync(new URL(`../public${src}`,import.meta.url)),src).toBe(true);
});

test('a first visible load with motion allowed offers both sources, WebM first, when either can play',()=>{
 expect(decideLogoIntro(ok)).toEqual({play:true,sources:[...FOLD_SOURCES]});
 // The sandbox Chromium has VP9 but no H.264, and some browsers only H.264: the browser takes the first it can play.
 expect(decideLogoIntro(env({canPlay:type=>type.startsWith('video/webm')}))).toEqual({play:true,sources:[...FOLD_SOURCES]});
 expect(decideLogoIntro(env({canPlay:type=>type.startsWith('video/mp4')}))).toEqual({play:true,sources:[...FOLD_SOURCES]});
 for(const autoplay of ['allowed','allowed-muted','unknown'] as const)expect(decideLogoIntro(env({autoplay})).play,autoplay).toBe(true);
});

test('reduced motion, Motion Off, a played session, blocked storage, data saver, blocked autoplay or no format: no clip, and no media probe',()=>{
 const cases:[Partial<IntroEnvironment>,string][]=[
  [{hostVisible:false},'hidden'],[{reducedMotion:true},'reduced-motion'],[{motionOff:true},'motion-off'],
  [{session:'played'},'played'],[{session:'unavailable'},'no-session'],[{saveData:true},'save-data'],[{autoplay:'disallowed'},'autoplay-blocked'],
 ];
 for(const [patch,reason] of cases){
  const canPlay=vi.fn(()=>true);
  expect(decideLogoIntro(env({...patch,canPlay})),reason).toEqual({play:false,reason});
  // Not even a detached <video> is created to ask about formats once a cheaper rule has said no.
  expect(canPlay,reason).not.toHaveBeenCalled();
 }
 expect(decideLogoIntro(env({canPlay:()=>false}))).toEqual({play:false,reason:'unplayable'});
 // Reduced motion wins over everything else, including a session that never played.
 expect(decideLogoIntro(env({reducedMotion:true,motionOff:true,session:'unplayed'}))).toEqual({play:false,reason:'reduced-motion'});
});

test('the final frame lands exactly on the static Z, at every logo size',()=>{
 for(const logo of [{left:37.5,top:28,width:141,height:160},{left:0,top:0,width:40,height:45},{left:7,top:9,width:30,height:34}]){
  const {box,origin}=foldPlacement(logo,-1e4,1e4),k=box.width/FOLD.w;
  // The frame keeps its own aspect ratio.
  expect(box.height/box.width).toBeCloseTo(FOLD.h/FOLD.w,9);
  // The final frame's Z, mapped into page coordinates, covers the static logo's Z within 0.3 px on every edge (the two Z shapes differ in aspect by under 1%).
  const z={left:box.left+FOLD.z.x*k,top:box.top+FOLD.z.y*k,right:box.left+(FOLD.z.x+FOLD.z.w)*k,bottom:box.top+(FOLD.z.y+FOLD.z.h)*k};
  const s={left:logo.left+LOGO_Z.x*logo.width,top:logo.top+LOGO_Z.y*logo.height,right:logo.left+(LOGO_Z.x+LOGO_Z.w)*logo.width,bottom:logo.top+(LOGO_Z.y+LOGO_Z.h)*logo.height};
  for(const edge of ['left','top','right','bottom'] as const)expect(Math.abs(z[edge]-s[edge]),`${logo.width}px ${edge}`).toBeLessThan(.3);
  // The clip scales around that Z's centre, so easing to scale 1 never moves the Z itself.
  expect(box.left+origin.x).toBeCloseTo((z.left+z.right)/2,6);expect(box.top+origin.y).toBeCloseTo((z.top+z.bottom)/2,6);
 }
});

test('the widest folded figure starts inside the sidebar with a 4 px margin, then the clip eases to its exact size',()=>{
 for(const sidebar of [216,190]){
  const logo={left:(sidebar-141)/2,top:28,width:141,height:160},{box,origin,startScale}=foldPlacement(logo,0,sidebar),k=box.width/FOLD.w;
  const centre=box.left+origin.x,left=centre-(centre-(box.left+FOLD.figure.left*k))*startScale,right=centre+(box.left+FOLD.figure.right*k-centre)*startScale;
  expect(startScale,`${sidebar}px`).toBeLessThan(1);
  expect(left,`${sidebar}px left`).toBeGreaterThanOrEqual(4-1e-9);expect(right,`${sidebar}px right`).toBeLessThanOrEqual(sidebar-4+1e-9);
 }
 // Where there is room (tablet header, phone top bar), the clip plays at its exact size from the start.
 expect(foldPlacement({left:0,top:0,width:40,height:45},-1e4,1e4).startScale).toBe(1);
});
