import {expect,test} from '@playwright/test';

type Sample={kind:string;start:string;mid?:string;end?:string};

test('visible hero and Goal ring move once per visit and settle on real values',async({page},info)=>{
 await page.addInitScript(()=>{
  const samples:Sample[]=[];
  Object.assign(window,{run10MotionSamples:samples});
  document.addEventListener('animationstart',event=>{
   const target=event.target;if(!(target instanceof Element))return;
   const kind=target.classList.contains('slogan-entrance')?'hero':target.classList.contains('flow-ring-fill')?'ring':'';
   if(!kind)return;
   const value=()=>kind==='hero'?`${getComputedStyle(target).opacity}|${getComputedStyle(target).transform}`:getComputedStyle(target).getPropertyValue('--ring-reveal').trim();
   const sample:Sample={kind,start:value()};samples.push(sample);
   setTimeout(()=>{sample.mid=value();},200);
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
   const kind=event.animationName==='composition-bar-grow'?'wealth':event.animationName==='nutrition-bars-rise'?'health':'';
   if(!kind||samples.some(sample=>sample.kind===kind))return;
   const sample:Sample={kind,start:getComputedStyle(target).transform};samples.push(sample);
   setTimeout(()=>{sample.mid=getComputedStyle(target).transform;},200);
   target.addEventListener('animationend',()=>{sample.end=getComputedStyle(target).transform;},{once:true});
  },true);
 });
 await page.goto('/app/settings');
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();
 await page.waitForURL('**/app');
 await page.goto('/app/wealth');
 await page.locator('.portfolio-composition').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples?.find(s=>s.kind==='wealth')?.end)).toBeTruthy();
 const wealth=await page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples.find(s=>s.kind==='wealth')!);
 await page.goto('/app/health');
 await page.locator('#nutrition-history').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples?.find(s=>s.kind==='health')?.end)).toBeTruthy();
 const health=await page.evaluate(()=>(window as unknown as {run10BarSamples:Sample[]}).run10BarSamples.find(s=>s.kind==='health')!);
 for(const sample of [wealth,health]){expect(sample.start).not.toBe(sample.end);expect(sample.mid).not.toBe(sample.end);}
});
