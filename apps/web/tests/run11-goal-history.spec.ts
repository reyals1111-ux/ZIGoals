import {test,expect} from '@playwright/test';
import {emptyPlatform,privateGoalSchema} from '../lib/positions';
test('all retained Goal events are reachable, filterable and readable at 320px',async({page})=>{
 const goal=privateGoalSchema.parse({id:'811',name:'Fictional long history',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',notes:'',createdAt:'2025-01-01T00:00:00Z',milestones:[]});
 const data={...emptyPlatform(),goals:[goal],contributions:Array.from({length:35},(_,i)=>({id:'retained-'+i,goalId:goal.id,goalScope:'private',direction:'IN',quantity:String(100+i),asset:'USD',decimals:2,occurredAt:new Date(Date.UTC(2026,0,1+i)).toISOString(),provenance:'MANUAL_ATTRIBUTION',note:'Fictional receipt '+i}))};
 await page.addInitScript(data=>{if(!sessionStorage.getItem('run11-history')){localStorage.setItem('zigoals:platform:v1',JSON.stringify(data));sessionStorage.setItem('run11-history','1');}},data);
 await page.goto('/app/goals/tracked/811');const panel=page.getByRole('region',{name:'Goal timeline',exact:true});await panel.getByLabel('Event type',{exact:true}).selectOption('contribution');await expect(panel.getByRole('status')).toHaveText('Page 1 of 3 · 35 retained events');
 await panel.getByRole('button',{name:'Older events',exact:true}).click();await panel.getByRole('button',{name:'Older events',exact:true}).click();await expect(panel.getByRole('status')).toHaveText('Page 3 of 3 · 35 retained events');await panel.getByText('Record details',{exact:true}).last().click();await expect(panel).toContainText('Fictional receipt 0');await expect(panel).toContainText('contribution:retained-0');
 await panel.getByLabel('From date (UTC)',{exact:true}).fill('2026-01-01');await panel.getByLabel('Through date (UTC)',{exact:true}).fill('2026-01-02');await expect(panel.getByRole('status')).toHaveText('Page 1 of 1 · 2 retained events');
 await page.setViewportSize({width:320,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel.getByLabel('Event type',{exact:true}).focus();await expect(panel.getByLabel('Event type',{exact:true})).toBeFocused();
 await page.reload();await panel.getByLabel('Event type',{exact:true}).selectOption('contribution');await expect(panel.getByRole('status')).toHaveText('Page 1 of 3 · 35 retained events');
});
