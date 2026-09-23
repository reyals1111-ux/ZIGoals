import {test,expect} from '@playwright/test';
test('Goal type cards keep shared details and confirm incompatible fields before clearing them',async({page},info)=>{
 await page.goto('/app/goals/new');
 await expect(page.getByRole('radio',{name:'Quantity',exact:true})).toBeChecked();
 await page.getByLabel('Goal name',{exact:true}).fill('My next chapter');await page.getByLabel('Target amount',{exact:true}).fill('250');
 await page.getByRole('radio',{name:'Project',exact:true}).check();
 const confirmation=page.getByRole('region',{name:'Confirm Goal type change'});await expect(confirmation).toContainText('target');await confirmation.getByRole('button',{name:'Keep current type'}).click();await expect(page.getByLabel('Target amount',{exact:true})).toHaveValue('250');
 await page.getByRole('radio',{name:'Project',exact:true}).check();await confirmation.getByRole('button',{name:'Change type'}).click();await expect(page.getByLabel('Goal name',{exact:true})).toHaveValue('My next chapter');await expect(page.getByLabel('Target amount',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Milestones, one per line')).toBeVisible();
 await page.getByRole('radio',{name:'Value',exact:true}).check();await expect(page.getByRole('combobox',{name:'Goal currency',exact:true})).toHaveValue('USD');await page.getByRole('combobox',{name:'Goal currency',exact:true}).selectOption('EUR');await page.getByLabel('Target amount',{exact:true}).fill('1000');await expect(page.getByRole('region',{name:'Goal preview'})).toContainText('1000 EUR');
 await page.setViewportSize({width:320,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('goal-type-cards-320.png'),fullPage:true});
});
