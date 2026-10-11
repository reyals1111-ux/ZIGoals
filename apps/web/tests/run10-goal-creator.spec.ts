import {test,expect} from '@playwright/test';
test('Goal type cards keep shared details and confirm incompatible fields before clearing them',async({page},info)=>{
 await page.goto('/app/goals/new');
 await expect(page.getByRole('radio',{name:'Quantity',exact:true})).toBeChecked();
 await page.getByLabel('Goal name',{exact:true}).fill('My next chapter');await page.getByLabel('Target amount',{exact:true}).fill('250');
 await page.getByRole('radio',{name:'Project',exact:true}).check();
 const confirmation=page.getByRole('region',{name:'Confirm Goal type change'});await expect(confirmation).toContainText('target');await confirmation.getByRole('button',{name:'Keep current type'}).click();await expect(page.getByLabel('Target amount',{exact:true})).toHaveValue('250');
 await page.getByRole('radio',{name:'Project',exact:true}).check();await confirmation.getByRole('button',{name:'Change type'}).click();await expect(page.getByLabel('Goal name',{exact:true})).toHaveValue('My next chapter');await expect(page.getByLabel('Target amount',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Milestones, one per line')).toBeVisible();
 await page.getByRole('radio',{name:'Value',exact:true}).check();await expect(page.getByRole('radio',{name:/USD · US dollar/})).toBeChecked();await page.getByRole('radio',{name:/EUR · Euro/}).check();await page.getByLabel('Target amount',{exact:true}).fill('1000');await expect(page.getByRole('region',{name:'Goal preview'})).toContainText('1000 EUR');
 await page.setViewportSize({width:320,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('goal-type-cards-320.png'),fullPage:true});
});

test('short Goal flow creates all four types with an honest live preview',async({page})=>{
 for(const [type,name,target,asset] of [['Quantity','Fictional BTC reserve','1.5','BTC'],['Value','Fictional euro fund','2500','EUR'],['Reward','Fictional reward target','12','ZIG'],['Project','Fictional learning project','Read\nPractice','']] as const){
  await page.goto('/app/goals/new');
  const preview=page.getByRole('region',{name:'Goal preview'});
  await expect(preview).not.toContainText('Choose a target ZIG');
  await page.getByLabel('Goal name',{exact:true}).fill(name);
  if(type!=='Quantity')await page.getByRole('radio',{name:type,exact:true}).check();
  if(type==='Project')await page.getByLabel('Milestones, one per line').fill(target);
  else{await page.getByLabel('Target amount',{exact:true}).fill(target);if(type==='Value')await page.getByRole('radio',{name:/EUR · Euro/}).check();else await page.getByLabel('Goal asset',{exact:true}).fill(asset);}
  await expect(preview).toContainText(type==='Project'?'2 milestones':`${target} ${asset}`);
  await page.getByRole('button',{name:'Create goal',exact:true}).click();
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/\d+$/);
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 }
});
