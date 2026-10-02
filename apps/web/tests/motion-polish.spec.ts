import {expect,test,type Locator,type Page} from '@playwright/test';
import {openFold} from './phone-nav';

type Sample={name:string;start:string;mid?:string;end?:string;final?:string};
/** The computed property to sample, optionally only for targets inside `within` (several indicators share one animation). */
type Watched=string|{property:string;within:string};
type MotionWindow={motionSamples:Sample[];motionStarts:Record<string,number>};

/**
 * Samples the first element each named animation touches: at start, shortly after, and on its own end. `final` keeps the
 * target's own inline value (a ring arc's stroke-dashoffset), the value the animation must settle on.
 */
async function watch(page:Page,properties:Record<string,Watched>){
 await page.addInitScript(properties=>{
  const samples:Sample[]=[],starts:Record<string,number>={};Object.assign(window,{motionSamples:samples,motionStarts:starts});
  document.addEventListener('animationstart',event=>{
   const watched=properties[event.animationName],target=event.target;
   const property=typeof watched==='string'?watched:watched?.property,within=typeof watched==='object'?watched.within:null;
   if(!(target instanceof Element)||event.pseudoElement||(within&&!target.closest(within)))return;
   starts[event.animationName]=(starts[event.animationName]??0)+1;
   if(!property||samples.some(s=>s.name===event.animationName))return;
   const read=()=>getComputedStyle(target).getPropertyValue(property).trim();
   const sample:Sample={name:event.animationName,start:read(),final:(target as SVGElement).style?.getPropertyValue(property)||undefined};samples.push(sample);
   setTimeout(()=>{sample.mid=read();},120);
   target.addEventListener('animationend',end=>{if(end.target===target&&(end as AnimationEvent).animationName===sample.name)sample.end=read();});
  },true);
 },properties);
}
/** A computed transform's translation, in px. */
const translate=(transform:string)=>{const m=/matrix\(([^)]+)\)/.exec(transform),v=m?m[1]!.split(',').map(Number):[1,0,0,1,0,0];return {x:v[4]!,y:v[5]!};};
const sample=(page:Page,name:string)=>page.evaluate(name=>(window as unknown as MotionWindow).motionSamples.find(s=>s.name===name),name);
const starts=(page:Page,name:string)=>page.evaluate(name=>(window as unknown as MotionWindow).motionStarts[name]??0,name);
async function settled(page:Page,name:string){
 await expect.poll(async()=>(await sample(page,name))?.end,{message:`${name} settles`}).toBeTruthy();
 const result=(await sample(page,name)) as Sample&{end:string};expect(result.start,name).not.toBe(result.end);expect(result.mid,name).not.toBe(result.end);return result;
}
async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
/** Fictional seven-day sequences for every requested identity; quotes stay offline. */
async function fictionalMovement(page:Page){
 await page.route('**/api/market-insights',async route=>{
  const {requests}=route.request().postDataJSON() as {requests:{marketRef:{provider:string;kind:string;id:string};currency:string}[]};
  const now=new Date().toISOString(),entries=requests.map((request,i)=>{const coin=request.marketRef.kind==='coin',moving=coin||request.currency==='USD';return {...request,source:coin?'CoinGecko':'CoinGecko tokenized RWA reference',marketBasis:coin?'coin':'tokenized',logoUrl:null,change24h:moving?'2.5':null,observedAt:moving?now:null,fetchedAt:now,sparkline:moving?{range:'7d',timestamps:'unavailable',fetchedAt:now,prices:[100,104,101,109,107,112+i,118].map(value=>({value:String(value),decimals:0}))}:null};});
  await route.fulfill({json:{entries,results:Object.fromEntries(entries.map(entry=>[`${entry.marketRef.provider}:${entry.marketRef.kind}:${entry.marketRef.id}:${entry.currency}`,{insight:entry,error:null,stale:false}])),error:null}});
 });
}

test('charts draw their marks once and settle on the exact rendered values',async({page,isMobile},info)=>{
 await watch(page,{'glass-ring-draw':{property:'stroke-dashoffset',within:'.composition-donut'},'motion-mark-in':'opacity','motion-cell-in':'opacity','motion-rise':'transform'});
 await showcase(page);
 await page.goto('/app/wealth');
 const donut=page.locator('.composition-donut').first();await donut.scrollIntoViewIfNeeded();
 // Each arc draws from empty (dashoffset 100 of 100) and settles exactly on its own share.
 const sweep=await settled(page,'glass-ring-draw');expect(parseFloat(sweep.start)).toBeGreaterThan(parseFloat(sweep.mid!));expect(parseFloat(sweep.mid!)).toBeGreaterThan(parseFloat(sweep.end));expect(parseFloat(sweep.end)).toBeCloseTo(parseFloat(sweep.final!),3);
 await donut.screenshot({path:info.outputPath('donut-settled.png')});
 await openFold(page,'Your wealth over time');
 const history=page.locator('.wealth-history .evidence-chart').first();await history.scrollIntoViewIfNeeded();
 const marks=await settled(page,'motion-mark-in');expect(Number(marks.start)).toBeLessThan(Number(marks.mid));expect(marks.end).toBe('1');
 await expect(history.locator('.evidence-line').first()).toHaveCSS('stroke-dasharray','none');
 await history.screenshot({path:info.outputPath('history-settled.png')});
 // Open and close an overlay: Quick add on mobile; desktop Wealth has no Quick add, so use its Add asset dialog.
 await (isMobile?page.getByRole('button',{name:'+ Quick add',exact:true}):page.getByRole('button',{name:'+ Add asset',exact:true}).first()).click();await page.keyboard.press('Escape');await page.waitForTimeout(750);
 // Each donut fills when it is first seen (one below the fold may not have been yet); an overlay never replays one.
 const entered=await page.locator('.composition-donut[data-entrance=once] .glass-ring-arc').count();expect(entered).toBeGreaterThan(0);
 expect(await starts(page,'glass-ring-draw')).toBe(entered);
 await page.goto('/app/habits');
 const month=page.locator('.habit-consistency-month');await month.scrollIntoViewIfNeeded();
 const cells=await settled(page,'motion-cell-in');expect(Number(cells.start)).toBeLessThan(Number(cells.mid));expect(cells.end).toBe('1');
 const week=page.locator('.habit-week-momentum');await week.scrollIntoViewIfNeeded();
 const bars=await settled(page,'motion-rise');expect(bars.end).toBe('none');
 await expect(week.locator('.habit-week-bars')).toHaveAttribute('aria-label',/Last seven days: /);
 await page.locator('.habit-consistency').screenshot({path:info.outputPath('habit-history-settled.png')});
});

test('market sparklines draw once and keep their exact text alternative',async({page},info)=>{
 await watch(page,{'motion-line-draw':'stroke-dashoffset'});
 await showcase(page);await fictionalMovement(page);
 await page.goto('/app/markets');
 const line=page.locator('.market-movement-line').first();await line.scrollIntoViewIfNeeded();
 const draw=await settled(page,'motion-line-draw');expect(parseFloat(draw.start)).toBeGreaterThan(parseFloat(draw.mid!));expect(draw.end).toBe('0px');
 await expect(line).toHaveCSS('stroke-dasharray','none');
 await expect(page.locator('.market-movement svg').first()).toHaveAttribute('aria-label',/Seven-day price sequence\. 7 samples\./);
 await page.locator('.market-movement').first().screenshot({path:info.outputPath('sparkline-settled.png')});
});

test('reduced motion and the Off preference leave charts complete and still',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 await page.goto('/app/wealth');
 const donut=page.locator('.composition-donut').first();await donut.scrollIntoViewIfNeeded();
 await expect(donut).not.toHaveAttribute('data-entrance','once');
 await expect(donut.locator('.glass-ring-arc').first()).toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 await page.goto('/app/habits');
 const month=page.locator('.habit-consistency-month');await month.scrollIntoViewIfNeeded();
 await expect(month).not.toHaveAttribute('data-entrance','once');
 await expect(month.locator('.habit-month-grid>span').first()).toHaveCSS('animation-name','none');
 await expect(month.locator('.habit-month-grid>span').first()).toHaveCSS('opacity','1');
});

test('primary actions catch one sweep of light on hover, give on press and keep their focus ring',async({page},info)=>{
 test.skip(info.project.name==='mobile','Hover sweep is limited to hover-capable pointers.');
 await showcase(page);
 const action=page.locator('.today-hero .primary').first();await action.scrollIntoViewIfNeeded();
 const sheen=()=>action.evaluate(el=>{const style=getComputedStyle(el,'::after');return {position:style.backgroundPosition,opacity:style.opacity};});
 expect(await sheen()).toEqual({position:'100% 0px',opacity:'0'});
 await action.hover();
 await expect.poll(sheen).toEqual({position:'0px 0px',opacity:'1'});
 await expect.poll(()=>action.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
 await page.mouse.down();
 await expect.poll(()=>action.evaluate(el=>getComputedStyle(el).transform)).toBe('matrix(0.97, 0, 0, 0.97, 0, 0)');
 await page.mouse.move(0,0);await page.mouse.up();
 expect(await sheen()).toEqual({position:'100% 0px',opacity:'0'});
 await action.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
 await expect(action).toBeFocused();await expect(action).toHaveCSS('outline-offset','4px');
});

test('reduced motion and the Off preference keep buttons still on every route',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const action=page.locator('.today-hero .primary').first();
 expect(await action.evaluate(el=>getComputedStyle(el,'::after').content)).toBe('none');
 await expect(action).toHaveCSS('transition-duration','0s');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 await page.goto('/app/goals');
 await expect(page.locator('html')).toHaveAttribute('data-app-motion','off');
 const secondary=page.locator('.secondary').first();
 await expect(secondary).toHaveCSS('transition-duration','0s');
 await page.goto('/app');
 expect(await page.locator('.today-hero .primary').first().evaluate(el=>getComputedStyle(el,'::after').content)).toBe('none');
});

test('progress fills grow in once when seen and glide to new values while their state updates at once',async({page},info)=>{
 await watch(page,{'glass-fill-x':{property:'transform',within:'.today-pace-track'},'glass-fill-y':{property:'transform',within:'.nutrition-gauge'},'glass-ring-draw':{property:'stroke-dashoffset',within:'.health-gauge'}});
 await showcase(page);
 const share=(locator:Locator)=>locator.evaluate(el=>({value:Number(getComputedStyle(el).getPropertyValue('--glass-value')),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
 // A bar slides in from wholly before its start and settles exactly where its value says.
 const pace=page.locator('.today-pace-track').first();await pace.scrollIntoViewIfNeeded();
 const grow=await settled(page,'glass-fill-x'),paceShare=await share(pace);
 expect(translate(grow.start).x).toBeLessThan(translate(grow.mid!).x);expect(translate(grow.mid!).x).toBeLessThan(translate(grow.end).x);expect(translate(grow.end).x).toBeCloseTo((paceShare.value-1)*paceShare.width,0);
 const gaugeGlass=page.locator('.nutrition-gauge').first();await gaugeGlass.scrollIntoViewIfNeeded();
 const glass=await settled(page,'glass-fill-y'),glassShare=await share(gaugeGlass);
 expect(translate(glass.start).y).toBeGreaterThan(translate(glass.mid!).y);expect(translate(glass.mid!).y).toBeGreaterThan(translate(glass.end).y);expect(translate(glass.end).y).toBeCloseTo((1-glassShare.value)*(glassShare.height-2),0);
 await page.goto('/app/health');
 const gauge=page.locator('.health-gauge');await gauge.scrollIntoViewIfNeeded();
 const sweep=await settled(page,'glass-ring-draw');expect(parseFloat(sweep.start)).toBeGreaterThan(parseFloat(sweep.mid!));expect(parseFloat(sweep.mid!)).toBeGreaterThan(parseFloat(sweep.end));
 expect(parseFloat(sweep.end)).toBeCloseTo(parseFloat((await gauge.locator('.glass-ring-arc').getAttribute('style'))!.replace(/[^0-9.]/g,'')),3);
 await gauge.screenshot({path:info.outputPath('health-gauge-settled.png')});
 await page.goto('/app/habits');
 const overview=page.locator('.habit-overview-track');await overview.scrollIntoViewIfNeeded();
 await expect(overview).toHaveAttribute('data-entrance','once');
 await expect.poll(()=>overview.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
 // The visible fill runs from the track's start to the fill's (translated) end.
 const filled=()=>overview.evaluate(el=>el.querySelector('.glass-fill')!.getBoundingClientRect().right-el.getBoundingClientRect().left);
 const before=Number(await overview.getAttribute('aria-valuenow')),start=await filled();
 await page.locator('.habits-workspace').getByRole('button',{name:/^Complete /}).first().click();
 await expect(overview).toHaveAttribute('aria-valuenow',String(before+1));
 const gliding=await filled(),target=await overview.evaluate(el=>Number((el as HTMLElement).style.getPropertyValue('--glass-value')));
 await expect.poll(()=>overview.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
 const end=await filled();
 expect(gliding).toBeGreaterThanOrEqual(start);expect(gliding).toBeLessThan(end);
 expect(end/(await overview.evaluate(el=>el.getBoundingClientRect().width))).toBeCloseTo(target,2);
 await page.locator('.habit-overview').screenshot({path:info.outputPath('habit-overview-settled.png')});
});

test('reduced motion and the Off preference keep progress complete and still',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const pace=page.locator('.today-pace-track').first();await pace.scrollIntoViewIfNeeded();
 await expect(pace).not.toHaveAttribute('data-entrance','once');
 await expect(pace.locator('.glass-fill')).toHaveCSS('transition-duration','0s');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 await page.goto('/app/health');
 const gauge=page.locator('.health-gauge');await gauge.scrollIntoViewIfNeeded();
 await expect(gauge).not.toHaveAttribute('data-entrance','once');
 await expect(gauge.locator('.glass-ring-arc')).toHaveCSS('animation-name','none');
 await expect(gauge.locator('.glass-ring-arc')).toHaveCSS('transition-duration','0s');
});

test('the slogan cascades and carries one sweep of light from Habits & Health to Wealth, then rests',async({page},info)=>{
 await watch(page,{'slogan-line-trail':'transform','slogan-shine':'background-position'});
 await showcase(page);
 const slogan=page.locator('.slogan-entrance');await slogan.scrollIntoViewIfNeeded();
 await expect(slogan).toHaveText("Today's Goals, Habits & Health = Tomorrow's Wealth");
 const line=await settled(page,'slogan-line-trail');expect(line.end).toBe('none');
 const shine=await settled(page,'slogan-shine');expect(shine.end).toMatch(/^0(%|px) 0px, 0px 0px$/);
 await expect.poll(()=>slogan.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
 expect(await starts(page,'slogan-shine')).toBe(2);expect(await starts(page,'slogan-line-trail')).toBe(1);
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();await page.waitForTimeout(750);
 expect(await starts(page,'slogan-shine')).toBe(2);
 await page.locator('.orbit-slogan').screenshot({path:info.outputPath('slogan-settled.png')});
});

test('reduced motion and the Off preference keep the slogan exact and still',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const words=page.locator('.slogan-gradient');
 await expect(words.first()).toHaveCSS('animation-name','none');
 expect(await words.first().evaluate(el=>getComputedStyle(el).backgroundImage.split('linear-gradient').length-1)).toBe(1);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 await page.reload();
 await expect(page.locator('.slogan-entrance')).toHaveText("Today's Goals, Habits & Health = Tomorrow's Wealth");
 await expect(words.last()).toHaveCSS('animation-name','none');
 await expect(page.locator('.slogan-line').last()).toHaveCSS('animation-name','none');
});
