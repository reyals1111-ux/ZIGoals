import { pose, blend, nearby, windowFor } from './origami-state.mjs?v=final-v4-7';
const root=document.documentElement, stage=document.querySelector('#origami-scroll');
const canvas=stage?.querySelector('canvas'), context=canvas?.getContext('2d',{alpha:false});
if (context && 'IntersectionObserver' in window) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), mobile=matchMedia('(max-width: 700px)');
  const params=new URLSearchParams(location.search), forcedStatic=params.get('motion')==='off'||params.get('origami')==='off';
  const chapters=[...document.querySelectorAll('[data-origami]')].map(el=>({el,name:el.dataset.origami,top:0,height:0}));
  const cache=new Map();let geometryDirty=true,pending=false,lastDraw='',generation=0;
  const staticMode=()=>forcedStatic||reduced.matches||navigator.connection?.saveData;
  const measure=()=>{chapters.forEach(c=>{const r=c.el.getBoundingClientRect();c.top=r.top+scrollY;c.height=r.height;c.window=windowFor(c.top,c.height,innerHeight)});geometryDirty=false};
  const load=name=>{
    if(cache.has(name))return cache.get(name);
    const small=mobile.matches,count=small?6:20,record={images:Array(count),cancelled:false};cache.set(name,record);
    // The settled frame arrives first, then transition frames. No blank frame during a fast anchor jump.
    const order=[count-1,...Array.from({length:count-1},(_,i)=>i)];let next=0;
    async function worker(){
      while(next<order.length&&!record.cancelled){
        const i=order[next++],img=new Image();img.decoding='async';
        img.src=`assets/origami-scroll/${name}/${small?'mobile/':''}${String(i).padStart(2,'0')}.webp`;
        try{await img.decode();if(!record.cancelled){record.images[i]=img;schedule()}}catch{/* Still-frame fallback remains available. */}
      }
    }
    for(let i=0;i<3;i++)worker();return record;
  };
  const release=keep=>{for(const [name,r] of cache){if(!keep.includes(name)){r.cancelled=true;r.images.length=0;cache.delete(name)}}};
  const still = c => { const img = c.el.querySelector('[data-origami-still]'); if (!img.hasAttribute('src')) img.src = img.dataset.origamiStill; };
  const update=()=>{
    pending=false;
    if(geometryDirty)measure();
    if(document.hidden){stage.hidden=true;release([]);lastDraw='';return}
    if(staticMode()){
      stage.hidden=true;root.classList.remove('origami-enhanced');release([]);lastDraw='';
      if(scrollY>0) chapters.filter(c=>nearby(c.top,scrollY,innerHeight)).forEach(still);
      return;
    }
    // No origami downloads while the visitor is still at the hero.
    if(scrollY<1){stage.hidden=true;root.classList.add('origami-enhanced');release([]);lastDraw='';return}
    const y=scrollY, candidates=chapters.filter(c=>y>=c.window.start&&y<c.window.end);
    const active=candidates[candidates.length-1];
    const next=chapters.find(c=>c.top>y&&nearby(c.top,y,innerHeight)&&c!==active);
    const keep=[active?.name,next?.name].filter(Boolean);release(keep);if(next)load(next.name);
    if(!active){stage.hidden=true;stage.dataset.chapter='';lastDraw='';return}
    const progress=(y-active.window.start)/(active.window.end-active.window.start);
    const priorChapter=chapters[chapters.indexOf(active)-1];
    const prior=priorChapter&&priorChapter.window.end>active.window.start ? pose((active.window.start-priorChapter.window.start)/(priorChapter.window.end-priorChapter.window.start)) : null;
    const state=pose(progress,prior),record=load(active.name);
    const {a,b,mix}=blend(state.frame,record.images.length),available=record.images.map((im,i)=>im?i:null).filter(i=>i!==null);
    if(!available.length){stage.hidden=true;still(active);root.classList.remove('origami-enhanced');return}
    const nearest=i=>record.images[i]||record.images[available.reduce((x,j)=>Math.abs(j-i)<Math.abs(x-i)?j:x,available[0])];
    const first=nearest(a),second=nearest(b),key=`${generation}:${active.name}:${a}:${b}:${mix.toFixed(4)}:${available.length}`;
    if(lastDraw!==key){
      if(canvas.width!==first.width||canvas.height!==first.height){canvas.width=first.width;canvas.height=first.height}
      context.globalAlpha=1;context.drawImage(first,0,0);if(first!==second&&mix>0){context.globalAlpha=mix;context.drawImage(second,0,0)}context.globalAlpha=1;lastDraw=key;
    }
    stage.style.opacity=(state.opacity*(mobile.matches ? .18 : .22)).toFixed(4);
    canvas.style.transform=`translate(-50%,-50%) translateY(${state.y}px) scale(${state.scale}) rotate(${state.rotate}deg)`;
    stage.hidden=false;stage.dataset.chapter=active.name;stage.dataset.progress=progress.toFixed(3);
    root.classList.add('origami-enhanced');
  };
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update)}}
  const resize=()=>{geometryDirty=true;schedule()};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',schedule);addEventListener('load',resize,{once:true});
  reduced.addEventListener('change',schedule);mobile.addEventListener('change',()=>{release([]);generation++;lastDraw='';resize()});
  new ResizeObserver(resize).observe(document.querySelector('main'));
  const observer=new IntersectionObserver(schedule,{rootMargin:'80% 0px',threshold:0});chapters.forEach(c=>observer.observe(c.el));
  schedule();
}
