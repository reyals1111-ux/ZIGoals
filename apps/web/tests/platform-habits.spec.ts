import {test,expect} from '@playwright/test';
import {createHabit,emptyHabitData} from '../lib/habits';
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

function simpleGoal(habitId?:string){return privateGoalSchema.parse({id:'88',name:'Recovery Goal',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:'100000000000000000000',notes:'',createdAt:'2026-09-17T00:00:00Z',milestones:[],plan:{amount:'10000000000000000000',asset:'ZIG',decimals:18,cadence:'monthly',nextDate:'2026-09-17',active:true,habitId}});}
test('a stale cross-store reference never offers reconciliation or mutates an unrelated Habit',async({page})=>{
 const otherId='11111111-1111-4111-8111-111111111111';
 const habits=createHabit(emptyHabitData(),{title:'Independent habit',category:'Personal',description:'Keep me',notes:'Historical context',schedule:{kind:'daily'},target:1,goalLink:{chainId:'private',owner:'local',goalId:'999'}},new Date('2026-09-16T12:00:00Z'),otherId);
 await page.goto('/app/goals/tracked');await page.evaluate(({goal,habits})=>{localStorage.setItem('zigoals:platform:v1',JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[goal],allocations:[],snapshots:[]}));localStorage.setItem('zigoals:habits:v1',JSON.stringify(habits));},{goal:simpleGoal(otherId),habits});
 await page.goto('/app/goals/tracked/88');
 await expect(page.getByText('Saved contribution habit belongs to another Goal.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Apply plan to contribution habit',exact:true})).not.toBeVisible();
 await page.getByRole('button',{name:'Create linked contribution habit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Contribute 10 ZIG monthly',exact:true})).toBeVisible();
 const result=await page.evaluate(()=>({habits:JSON.parse(localStorage.getItem('zigoals:habits:v1')!),platform:JSON.parse(localStorage.getItem('zigoals:platform:v1')!)}));
 expect(result.habits.habits.find((h:{id:string})=>h.id===otherId)).toEqual(habits.habits[0]);expect(result.platform.goals[0].plan.habitId).not.toBe(otherId);expect(result.habits.habits).toHaveLength(2);
});
test('a failed second-store creation reserves one ID and retries without duplicate habits',async({page})=>{
 await page.goto('/app/goals/tracked');await page.evaluate(goal=>localStorage.setItem('zigoals:platform:v1',JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[goal],allocations:[],snapshots:[]})),simpleGoal());
 await page.goto('/app/goals/tracked/88');
 await page.evaluate(()=>{const write=Storage.prototype.setItem;let fail=true;Storage.prototype.setItem=function(key,value){if(key==='zigoals:habits:v1'&&fail){fail=false;throw new DOMException('Test quota failure','QuotaExceededError');}return write.call(this,key,value);};});
 await page.getByRole('button',{name:'Create linked contribution habit',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Could not save private data'})).toBeVisible();
 const reserved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).goals[0].plan.habitId);expect(reserved).toBeTruthy();
 await page.getByRole('button',{name:'Create linked contribution habit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Contribute 10 ZIG monthly',exact:true})).toBeVisible();
 const result=await page.evaluate(()=>({habits:JSON.parse(localStorage.getItem('zigoals:habits:v1')!),platform:JSON.parse(localStorage.getItem('zigoals:platform:v1')!)}));
 expect(result.habits.habits).toHaveLength(1);expect(result.habits.habits[0].id).toBe(reserved);expect(result.platform.goals[0].plan.habitId).toBe(reserved);
});

test('a fractional-cent ZIG price assumption saves exactly without changing observed progress',async({page})=>{
 await page.goto('/app/goals/tracked');await page.evaluate(goal=>localStorage.setItem('zigoals:platform:v1',JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[goal],allocations:[],snapshots:[]})),simpleGoal());
 await page.goto('/app/goals/tracked/88');
 await page.getByLabel('Planned amount',{exact:true}).fill('100');await page.getByLabel('Contribution asset',{exact:true}).fill('USD');
 await page.getByLabel('Price per Goal unit in contribution currency (if different)',{exact:true}).fill('0.012345');
 await page.getByRole('button',{name:'Save contribution plan',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Private Goal saved'})).toBeVisible();
 const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).goals[0].plan);
 expect(plan).toMatchObject({amount:'10000',asset:'USD',decimals:2,price:{value:'12345000000000000',decimals:18,currency:'USD'}});
 await expect(page.getByTestId('tracked-progress')).toContainText('0.00%');
 await page.reload();await expect(page.getByLabel('Price per Goal unit in contribution currency (if different)',{exact:true})).toHaveValue('0.012345');
});
