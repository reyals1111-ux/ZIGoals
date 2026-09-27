import {test,expect} from '@playwright/test';
import {emptyPlatform,privateGoalSchema} from '../lib/positions';

test('adjacent Goal option panels remain inside their cards and accept ordinary pointer pinning',async({page},info)=>{
 if(info.project.name==='mobile')await page.setViewportSize({width:320,height:900});
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Fictional offline fixture'}}));
 const goals=['Value','Quantity','Project'].map((kind,i)=>privateGoalSchema.parse({id:String(970+i),name:`Packaged ${kind} continuity`,type:kind.toUpperCase(),status:'active',asset:kind==='Value'?'USD':'BTC',denom:kind==='Value'?'USD':'manual:BTC',decimals:kind==='Value'?2:18,target:'100000',notes:'Fictional pointer regression',createdAt:'2026-09-27T00:00:00Z',milestones:kind==='Project'?[{id:'review',title:'Fictional review',done:false}]:[]}));
 await page.goto('/app/goals');await page.evaluate(data=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(data)),{...emptyPlatform(),goals});await page.reload();await expect(page.locator('.goal-card')).toHaveCount(3);
 const original=await page.evaluate(()=>localStorage.getItem('zigoals:platform:v1'));
 for(const goal of goals){
  const card=page.locator('.goal-card').filter({has:page.getByRole('heading',{name:goal.name,exact:true})});await card.getByRole('button',{name:`Options for ${goal.name}`,exact:true}).click();
  const action=card.getByRole('button',{name:`Add ${goal.name} progress to Today`,exact:true});await expect(action).toBeVisible();
  const geometry=await card.evaluate(card=>{const panel=card.querySelector('.card-options-panel')!,r=card.getBoundingClientRect(),p=panel.getBoundingClientRect();return {card:{left:r.left,right:r.right},panel:{left:p.left,right:p.right}};});
  await info.attach('goal-option-geometry-'+goal.id,{body:JSON.stringify(geometry),contentType:'application/json'});
  expect(geometry.panel.left).toBeGreaterThanOrEqual(geometry.card.left);expect(geometry.panel.right).toBeLessThanOrEqual(geometry.card.right);
  await action.click();await expect(card.getByText(`${goal.name} progress added to Today.`,{exact:true})).toBeVisible();
 }
 expect(await page.evaluate(()=>localStorage.getItem('zigoals:platform:v1'))).toBe(original);
 await page.getByRole('link',{name:'Today',exact:true}).first().click();for(const goal of goals)await expect(page.getByRole('article',{name:goal.name,exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
