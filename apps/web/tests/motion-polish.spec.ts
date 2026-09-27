import {expect,test,type Page} from '@playwright/test';

type Sample={name:string;start:string;mid?:string;end?:string};
type MotionWindow={motionSamples:Sample[];motionStarts:Record<string,number>};

/** Samples the first element each named animation touches: at start, shortly after, and on its own end. */
async function watch(page:Page,properties:Record<string,string>){
 await page.addInitScript(properties=>{
  const samples:Sample[]=[],starts:Record<string,number>={};Object.assign(window,{motionSamples:samples,motionStarts:starts});
  document.addEventListener('animationstart',event=>{
   const property=properties[event.animationName],target=event.target;
   starts[event.animationName]=(starts[event.animationName]??0)+1;
   if(!property||!(target instanceof Element)||samples.some(s=>s.name===event.animationName))return;
   const read=()=>getComputedStyle(target).getPropertyValue(property).trim();
   const sample:Sample={name:event.animationName,start:read()};samples.push(sample);
   setTimeout(()=>{sample.mid=read();},120);
   target.addEventListener('animationend',end=>{if(end.target===target&&(end as AnimationEvent).animationName===sample.name)sample.end=read();});
  },true);
 },properties);
}
const sample=(page:Page,name:string)=>page.evaluate(name=>(window as unknown as MotionWindow).motionSamples.find(s=>s.name===name),name);
const starts=(page:Page,name:string)=>page.evaluate(name=>(window as unknown as MotionWindow).motionStarts[name]??0,name);
async function settled(page:Page,name:string){
 await expect.poll(async()=>(await sample(page,name))?.end,{message:`${name} settles`}).toBeTruthy();
 const result=(await sample(page,name))!;expect(result.start,name).not.toBe(result.end);expect(result.mid,name).not.toBe(result.end);return result;
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

test('charts draw their marks once and settle on the exact rendered values',async({page},info)=>{
 await watch(page,{'motion-sweep':'--ring-reveal','motion-mark-in':'opacity','motion-cell-in':'opacity','motion-rise':'transform'});
 await showcase(page);
 await page.goto('/app/wealth');
 const donut=page.locator('.composition-donut').first();await donut.scrollIntoViewIfNeeded();
 const sweep=await settled(page,'motion-sweep');expect(parseFloat(sweep.start)).toBeLessThan(parseFloat(sweep.mid!));expect(sweep.end).toBe('100%');
 await donut.screenshot({path:info.outputPath('donut-settled.png')});
 const history=page.locator('.wealth-history .evidence-chart').first();await history.scrollIntoViewIfNeeded();
 const marks=await settled(page,'motion-mark-in');expect(Number(marks.start)).toBeLessThan(Number(marks.mid));expect(marks.end).toBe('1');
 await expect(history.locator('.evidence-line').first()).toHaveCSS('stroke-dasharray','none');
 await history.screenshot({path:info.outputPath('history-settled.png')});
 await page.getByRole('button',{name:'+ Quick add',exact:true}).click();await page.keyboard.press('Escape');await page.waitForTimeout(750);
 expect(await starts(page,'motion-sweep')).toBe(await page.locator('.composition-donut').count());
 await page.goto('/app/habits');
 const month=page.locator('.habit-consistency-month');await month.scrollIntoViewIfNeeded();
 const cells=await settled(page,'motion-cell-in');expect(Number(cells.start)).toBeLessThan(Number(cells.mid));expect(cells.end).toBe('1');
 const week=page.locator('.habit-week-momentum');await week.scrollIntoViewIfNeeded();
 const bars=await settled(page,'motion-rise');expect(bars.end).toBe('matrix(1, 0, 0, 1, 0, 0)');
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
 await expect(page.locator('.portfolio-composition')).not.toHaveAttribute('data-entrance','once');
 await expect(donut).toHaveCSS('animation-name','none');
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
