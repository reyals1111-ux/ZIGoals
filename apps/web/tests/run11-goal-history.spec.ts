import {test,expect} from '@playwright/test';
import {emptyPlatform,privateGoalSchema} from '../lib/positions';
test('all retained Goal events are reachable, filterable and readable at 320px',async({page})=>{
 const goal=privateGoalSchema.parse({id:'811',name:'Fictional long history',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',notes:'',createdAt:'2025-01-01T00:00:00Z',milestones:[]});
 const data={...emptyPlatform(),goals:[goal],contributions:Array.from({length:35},(_,i)=>({id:'retained-'+i,goalId:goal.id,goalScope:'private',direction:'IN',quantity:String(100+i),asset:'USD',decimals:2,occurredAt:new Date(Date.UTC(2026,0,1+i)).toISOString(),provenance:'MANUAL_ATTRIBUTION',note:'Fictional receipt '+i}))};
 await page.addInitScript(data=>{if(!sessionStorage.getItem('run11-history')){localStorage.setItem('zigoals:platform:v1',JSON.stringify(data));sessionStorage.setItem('run11-history','1');}},data);
 await page.goto('/app/goals/tracked/811');const panel=page.getByRole('region',{name:'Goal timeline',exact:true});await panel.getByLabel('Event type',{exact:true}).selectOption('contribution');await expect(panel.getByRole('status')).toHaveText('Page 1 of 3 · 35 retained events');
 await panel.getByRole('button',{name:'Older events',exact:true}).click();await panel.getByRole('button',{name:'Older events',exact:true}).click();await expect(panel.getByRole('status')).toHaveText('Page 3 of 3 · 35 retained events');await panel.getByText('Record details',{exact:true}).last().click();await expect(panel).toContainText('Fictional receipt 0');
 // Session AL (N-167, deliberate; 4a8543f9): a record's details say where it comes from in words and show no raw record id
 // (they showed "contribution:retained-0"). The oldest record is pinned by its own row instead: the details opened are that
 // row's, with its note, exact amount and source, and no id is printed anywhere in the timeline.
 const oldest=panel.locator('li[id="goal-event-contribution:retained-0"]');await expect(oldest.locator('details')).toHaveAttribute('open','');
 await expect(oldest.locator('dl')).toContainText('NoteFictional receipt 0');await expect(oldest.locator('dl')).toContainText('Exact amount1 USD');await expect(oldest.locator('dl')).toContainText('Where it comes fromAdded by you');await expect(panel).not.toContainText('retained-');
 // Session AL (DV-038d, deliberate): the date filters are in the person's app zone, so their labels no longer say "(UTC)"; the
 // same two days still give exactly the same two records (each sits on its own day in any zone within ±12 h).
 await panel.getByLabel('From date',{exact:true}).fill('2026-01-01');await panel.getByLabel('Through date',{exact:true}).fill('2026-01-02');await expect(panel.getByRole('status')).toHaveText('Page 1 of 1 · 2 retained events');
 await page.setViewportSize({width:320,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel.getByLabel('Event type',{exact:true}).focus();await expect(panel.getByLabel('Event type',{exact:true})).toBeFocused();
 await page.reload();await panel.getByLabel('Event type',{exact:true}).selectOption('contribution');await expect(panel.getByRole('status')).toHaveText('Page 1 of 3 · 35 retained events');
});
