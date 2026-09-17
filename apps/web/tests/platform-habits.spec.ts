import {test,expect} from '@playwright/test';
import {emptyPlatform,positionSchema,privateGoalSchema} from '../lib/positions';
test('a linked contribution Habit records behavior but never adds financial progress',async({page})=>{
 const position=positionSchema.parse({id:'example',providerId:'Example manual reserve',sourceType:'MANUAL',network:'manual',account:'local',asset:'ZIG',denom:'azig',decimals:18,quantity:'80000000000000000000',verification:'MANUAL',liquidity:'LIQUID',observedAt:'2026-09-17T00:00:00Z',provenance:'Fictional fixture'});
 const goal=privateGoalSchema.parse({id:'77',name:'Example linked Goal',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:'200000000000000000000',notes:'',createdAt:'2026-09-17T00:00:00Z',milestones:[],plan:{amount:'10000000000000000000',asset:'ZIG',decimals:18,cadence:'monthly',nextDate:'2026-09-17',active:true}});
 await page.addInitScript(s=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(s)),{...emptyPlatform(),positions:[position],goals:[goal],allocations:[{goalId:'77',positionId:'example',quantity:position.quantity}]});
 await page.goto('/app/goals/tracked/77');await expect(page.getByTestId('tracked-progress')).toContainText('40.00%');
 await page.getByRole('button',{name:'Create linked contribution habit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Contribute 10 ZIG monthly',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Complete Contribute 10 ZIG monthly',exact:true}).click();
 await expect(page.getByTestId('tracked-progress')).toContainText('40.00%');
 await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:habits:v1')!).habits[0].entries.length)).toBe(1);
 // Turn the completed fixture into a prior-day history before reconciling today's plan.
 await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('zigoals:habits:v1')!);const old=new Date();old.setDate(old.getDate()-1);const date=[old.getFullYear(),String(old.getMonth()+1).padStart(2,'0'),String(old.getDate()).padStart(2,'0')].join('-');const habit=data.habits[0];habit.startDate=date;habit.createdAt=old.toISOString();habit.rules[0].from=date;habit.entries[0].date=date;localStorage.setItem('zigoals:habits:v1',JSON.stringify(data));window.dispatchEvent(new CustomEvent('zigoals:private-change',{detail:'zigoals:habits:v1'}));});
 await page.getByLabel('Planned amount',{exact:true}).fill('20');await page.getByRole('combobox',{name:'Cadence',exact:true}).selectOption('weekly');
 await page.getByRole('button',{name:'Save contribution plan',exact:true}).click();
 await expect(page.getByText('Contribution habit differs from this plan.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Apply plan to contribution habit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Contribute 20 ZIG weekly',exact:true})).toBeVisible();
 await expect(page.getByText('Contribution habit differs from this plan.',{exact:false})).not.toBeVisible();
 const habitStore=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:habits:v1')!));
 expect(habitStore.habits[0].entries).toHaveLength(1);expect(habitStore.habits[0].entries[0].count).toBe(1);
 expect(habitStore.habits[0].rules).toHaveLength(2);expect(habitStore.habits[0].rules[0].schedule).toEqual({kind:'frequency',times:1,period:'month'});expect(habitStore.habits[0].entries[0].date).toBe(habitStore.habits[0].rules[0].from);
 expect(habitStore.habits[0].rules.at(-1).schedule).toEqual({kind:'frequency',times:1,period:'week'});
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));expect(s.positions[0].quantity).toBe(position.quantity);expect(s.allocations[0].quantity).toBe(position.quantity);expect(s.goals[0].plan.habitId).toBeTruthy();
});
