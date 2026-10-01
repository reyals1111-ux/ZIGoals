import {expect,test,type Page} from '@playwright/test';

// QA-01 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): with an English UI, Chrome drops a typed decimal comma from an
// <input type="number">, so "72,5" kg was saved as 725 kg and "1,5" mL of water as 15 mL, each with a success message.
// Health amounts are now text fields with a decimal keypad, read by parseHealthNumber, which (since #51) reads an
// unambiguous decimal comma: "72,5" is saved as 72.5 kg, and an ambiguous "1,234" is refused with the form's message.
test.use({locale:'en-US'});

const VIEWS=['Diary','Foods & recipes','Meals & planning','Weight','Measurements','Activity','Targets','Journal settings'];
const health=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:health:v1')??'null') as {weights?:{grams:number}[];daily?:{water:{amountMilli:number}[]}}|null);
const grams=async(page:Page)=>(await health(page))?.weights?.map(w=>w.grams)??[];
const millilitres=async(page:Page)=>(await health(page))?.daily?.water.map(w=>w.amountMilli)??[];
const view=async(page:Page,name:string)=>{await page.getByRole('button',{name,exact:true}).click();};

test('with an en-US browser, "72,5" kg is saved as 72.5 kg and "1,5" mL of water as 1.5 mL, never 725 kg or 15 mL',async({page})=>{
 await page.goto('/app/health');
 await expect(page.locator('main h1').first()).toBeVisible();

 await view(page,'Weight');
 const weight=page.getByRole('form',{name:'Weight entry'}),kg=weight.getByLabel('Weight (kg)');
 await kg.pressSequentially('72,5');
 // The comma reaches the app: nothing in the browser drops it on the way.
 await expect(kg).toHaveValue('72,5');
 await weight.getByRole('button',{name:'Save weight'}).click();
 await expect(page.getByRole('status').filter({hasText:'Weight saved.'})).toBeVisible();
 await expect(page.getByRole('table',{name:'Weight history'})).toContainText('72.5 kg');
 await expect.poll(()=>grams(page)).toEqual([72_500]);
 await expect(page.getByText('725 kg')).toHaveCount(0);

 await view(page,'Diary');
 const water=page.getByRole('form',{name:'Water entry'}),amount=water.getByLabel('Water amount',{exact:true});
 await amount.pressSequentially('1,5');
 await expect(amount).toHaveValue('1,5');
 await water.getByRole('button',{name:'Log water'}).click();
 await expect(page.getByRole('status').filter({hasText:'Water recorded.'})).toBeVisible();
 await expect.poll(()=>millilitres(page)).toEqual([1_500]);
 await expect(page.getByRole('region',{name:'Water journal'})).not.toContainText('15 mL');
});

test('an ambiguous "1,234" is still refused with a message and nothing is saved',async({page})=>{
 await page.goto('/app/health');
 await expect(page.locator('main h1').first()).toBeVisible();
 // Water: 1.234 mL and 1,234 mL are both within the field's range, so only the ambiguity can refuse it.
 const water=page.getByRole('form',{name:'Water entry'}),amount=water.getByLabel('Water amount',{exact:true});
 await amount.pressSequentially('1,234');
 await expect(amount).toHaveValue('1,234');
 await water.getByRole('button',{name:'Log water'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Check the highlighted fields'})).toBeVisible();
 await expect(page.getByRole('status').filter({hasText:'Water recorded.'})).toHaveCount(0);
 expect(await millilitres(page)).toEqual([]);
 // The typed text stays for correction.
 await expect(amount).toHaveValue('1,234');
});

test('no Health form uses a number field: every amount is a text field with a numeric or decimal keypad',async({page})=>{
 await page.goto('/app/health');
 await expect(page.locator('main h1').first()).toBeVisible();
 for(const name of VIEWS){
  await view(page,name);
  if(name==='Foods & recipes')await page.getByRole('button',{name:'New food',exact:true}).click();
  await expect(page.locator('main input[type="number"]'),name).toHaveCount(0);
 }
 // The amounts still ask for the right keypad.
 await view(page,'Weight');
 await expect(page.getByRole('form',{name:'Weight entry'}).getByLabel('Weight (kg)')).toHaveAttribute('inputmode','decimal');
 await view(page,'Diary');
 await expect(page.getByLabel('Water amount',{exact:true})).toHaveAttribute('inputmode','decimal');
});
