import {expect,test,type Page} from '@playwright/test';

// QA-01 (Session F, docs/qa/QA_SWEEP_2026-09-30.md): with an English UI, Chrome drops a typed decimal comma from an
// <input type="number">, so "72,5" kg was saved as 725 kg and "1,5" mL of water as 15 mL, each with a success message.
// Health amounts are now text fields with a decimal keypad, read by parseHealthNumber: "72,5" is either read as 72.5
// (once the parser accepts an unambiguous decimal comma) or refused with the form's message. It is never 725.
test.use({locale:'en-US'});

const VIEWS=['Diary','Foods & recipes','Meals & planning','Weight','Measurements','Activity','Targets','Journal settings'];
const health=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:health:v1')??'null') as {weights?:{grams:number}[];daily?:{water:{amountMilli:number}[]}}|null);
const view=async(page:Page,name:string)=>{await page.getByRole('button',{name,exact:true}).click();};
/** Waits for the outcome of a save (the form's refusal or its success line) and says whether it was saved. */
async function saved(page:Page,success:RegExp){
 const ok=page.getByRole('status').filter({hasText:success});
 await expect(page.getByRole('alert').or(ok).first()).toBeVisible();
 return ok.isVisible();
}

test('with an en-US browser, "72,5" kg is never saved as 725 kg and "1,5" mL of water never as 15 mL',async({page})=>{
 await page.goto('/app/health');
 await expect(page.locator('main h1').first()).toBeVisible();

 await view(page,'Weight');
 const weight=page.getByRole('form',{name:'Weight entry'}),kg=weight.getByLabel('Weight (kg)');
 await kg.pressSequentially('72,5');
 // The comma reaches the app: nothing in the browser drops it on the way.
 await expect(kg).toHaveValue('72,5');
 await weight.getByRole('button',{name:'Save weight'}).click();
 const grams=async()=>(await health(page))?.weights?.map(w=>w.grams)??[];
 if(await saved(page,/Weight saved/))await expect.poll(grams).toEqual([72_500]);
 else expect(await grams()).toEqual([]);
 expect(await grams()).not.toContain(725_000);
 await expect(page.getByText('725 kg')).toHaveCount(0);

 await view(page,'Diary');
 const water=page.getByRole('form',{name:'Water entry'}),amount=water.getByLabel('Water amount',{exact:true});
 await amount.pressSequentially('1,5');
 await expect(amount).toHaveValue('1,5');
 await water.getByRole('button',{name:'Log water'}).click();
 const millilitres=async()=>(await health(page))?.daily?.water.map(w=>w.amountMilli)??[];
 if(await saved(page,/Water recorded/))await expect.poll(millilitres).toEqual([1_500]);
 else expect(await millilitres()).toEqual([]);
 expect(await millilitres()).not.toContain(15_000);
 await expect(page.getByRole('region',{name:'Water journal'})).not.toContainText('15 mL');
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
