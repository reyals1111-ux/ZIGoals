import {expect,test} from '@playwright/test';
import {openFold} from './phone-nav';

type Sample={kind:string;start:string;mid?:string;end?:string};

test('visible hero and Goal ring move once per visit and settle on real values',async({page},info)=>{
 await page.addInitScript(()=>{
  const samples:Sample[]=[];
  Object.assign(window,{run10MotionSamples:samples});
  document.addEventListener('animationstart',event=>{
   const target=event.target;if(!(target instanceof Element))return;
   const kind=target.classList.contains('slogan-entrance')?'hero':target.classList.contains('glass-ring-arc')&&target.closest('.flow-ring')?'ring':'';
   if(!kind)return;
   const value=()=>kind==='hero'?`${getComputedStyle(target).opacity}|${getComputedStyle(target).transform}`:getComputedStyle(target).getPropertyValue('stroke-dashoffset').trim();
   const sample:Sample={kind,start:value()};samples.push(sample);
   // Session U Part 4: the middle is read by seeking this very animation to half its duration and back, at once. A
   // 200 ms timer could fire after the end on a loaded runner (run 36865907188), when the "mid" equalled the end.
   const animation=target.getAnimations().find(a=>a instanceof CSSAnimation&&a.animationName===(event as AnimationEvent).animationName);
   // Session AH Part 2: the start is read the same way (the animation sought to its first frame and back): on a loaded
   // runner the animationstart event can be handled after the animation has ended, when the live value already
   // equalled the end (run 40218118627).
   if(animation){const timing=animation.effect!.getComputedTiming(),held=animation.currentTime;animation.currentTime=Number(timing.delay??0);sample.start=value();animation.currentTime=Number(timing.delay??0)+Number(timing.duration)/2;sample.mid=value();animation.currentTime=held;}
   target.addEventListener('animationend',()=>{sample.end=value();},{once:true});
  },true);
 });
 await page.goto('/app/settings');
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();
 await page.waitForURL('**/app');
 const hero=page.locator('.slogan-entrance');
 await hero.scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples?.some(s=>s.kind==='hero'))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples?.find(s=>s.kind==='hero')?.end)).toBeTruthy();
 const first=await page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples.find(s=>s.kind==='hero')!);
 expect(first.start).not.toBe(first.end);
 expect(first.mid).not.toBe(first.end);
 await hero.screenshot({path:info.outputPath('hero-settled.png'),animations:'disabled'});
 await page.goto('/app/goals');
 const ring=page.locator('.goal-card .flow-ring').first();
 await ring.scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples?.find(s=>s.kind==='ring')?.end)).toBeTruthy();
 const sample=await page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples.find(s=>s.kind==='ring')!);
 expect(sample.start).not.toBe(sample.end);
 expect(sample.mid).not.toBe(sample.end);
 await expect(ring).toHaveAttribute('aria-valuenow','45');
 await ring.screenshot({path:info.outputPath('ring-settled.png'),animations:'disabled'});
 await page.goto('/app');
 await hero.scrollIntoViewIfNeeded();
 await expect(hero).toHaveAttribute('data-entrance','once');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples.filter(s=>s.kind==='hero').length)).toBe(1);
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 await page.waitForTimeout(750);
 expect(await page.evaluate(()=>(window as unknown as {run10MotionSamples:Sample[]}).run10MotionSamples.filter(s=>s.kind==='hero').length)).toBe(1);
});

test('reduced motion and Off keep final content visible without entrance',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/app');
 await expect(page.locator('.slogan-entrance')).not.toHaveAttribute('data-entrance','once');
 await page.goto('/app/settings');
 const appearance=page.getByRole('region',{name:'Appearance'});
 await appearance.locator('select').selectOption('off');
 await appearance.getByRole('button',{name:'Preview motion again'}).click();
 await expect(appearance.locator('.motion-preview-sample')).toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/app');
 await expect(page.locator('.slogan-entrance')).not.toHaveAttribute('data-entrance','once');
 await expect(page.locator('.slogan-entrance')).toBeVisible();
});

test('Wealth and Health bars grow only when visible with real saved values',async({page})=>{
 await page.addInitScript(()=>{
  const samples:Sample[]=[];Object.assign(window,{run10BarSamples:samples});
  document.addEventListener('animationstart',event=>{
   const target=event.target;if(!(target instanceof Element))return;
   const kind=event.animationName==='glass-fill-x'&&target.closest('.portfolio-composition')?'wealth':event.animationName==='nutrition-bars-rise'?'health':'';
   if(!kind||samples.some(sample=>sample.kind===kind))return;
   const sample:Sample={kind,start:getComputedStyle(target).transform};samples.push(sample);
   // Session AK CI fix (run 41336014813): the start and the middle are read by seeking this very animation to its first
   // frame and to half its duration and back, as the test above does (Session U Part 4, AH Part 2); the 200 ms timer it
   // used fired after the bar's end on a loaded runner, when the "mid" equalled the end.
   const animation=target.getAnimations().find(a=>a instanceof CSSAnimation&&a.animationName===(event as AnimationEvent).animationName);
   if(animation){const timing=animation.effect!.getComputedTiming(),held=animation.currentTime;animation.currentTime=Number(timing.delay??0);sample.start=getComputedStyle(target).transform;animation.currentTime=Number(timing.delay??0)+Number(timing.duration)/2;sample.mid=getComputedStyle(target).transform;animation.currentTime=held;}
   target.addEventListener('animationend',()=>{sample.end=getComputedStyle(target).transform;},{once:true});
  },true);
 });
 await page.goto('/app/settings');
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();
 await page.waitForURL('**/app');
 await page.goto('/app/wealth');
 await openFold(page,'The shape of your wealth'); // Session AK RB (R2-8, deliberate): a folded row on a phone; nothing elsewhere
 // Session AK RB (R2-8, deliberate): the opened row already shows the section's top (its rings), so "if needed" scrolled
 // nothing and the bars stayed below the screen; the first bar itself is brought into view, as a reader scrolls to it.
 await page.locator('.portfolio-composition').scrollIntoViewIfNeeded();
 await page.locator('.portfolio-composition .glass-track').first().scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples?.find(s=>s.kind==='wealth')?.end)).toBeTruthy();
 const wealth=await page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples.find(s=>s.kind==='wealth')!);
 // Session AK RB (R2-8, deliberate): the nutrition rhythm lives in Health's Insights view; its anchor opens that view.
 await page.goto('/app/health#nutrition-history');
 await page.locator('#nutrition-history').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples?.find(s=>s.kind==='health')?.end)).toBeTruthy();
 const health=await page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples.find(s=>s.kind==='health')!);
 // (The half-way value must exist: it is read from the animation itself, as the timer always produced one.)
 for(const sample of [wealth,health]){expect(sample.mid,`${sample.kind} has a half-way value`).toBeDefined();expect(sample.start).not.toBe(sample.end);expect(sample.mid).not.toBe(sample.end);}
});
