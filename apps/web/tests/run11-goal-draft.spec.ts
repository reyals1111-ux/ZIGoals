import {test,expect} from '@playwright/test';
import {typeGoalName} from './goal-name';
// Session AL final pass (N-DV-02, D-205, BN-155, BUG-076, deliberate): the creator no longer stops navigation with the
// browser's native confirm() or "Leave site?"; this tab keeps the draft and brings it back ("Draft restored · Discard").
// The replacement pins the same promise, that typed input is never lost, at each step: leaving by a link, Back and a
// reload each keep both fields, and no dialog is ever shown; Discard is the explicit way to drop it.
test('Goal draft survives navigation, Back and reload without a dialog, and only Discard drops it',async({page})=>{
 await page.goto('/app/goals');await page.goto('/app/goals/new');await typeGoalName(page, 'Retain this private draft');await page.getByLabel('Target amount').fill('25');
 let dialogs=0;page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss();});
 const destination=await page.getByRole('link',{name:'Today',exact:true}).first().getAttribute('href');
 await page.getByRole('link',{name:'Today',exact:true}).first().click();await expect(page).toHaveURL(new RegExp(destination+'$'));
 await page.evaluate(()=>history.back());await expect(page).toHaveURL(/\/app\/goals\/new$/);await expect(page.getByLabel('Goal name')).toHaveValue('Retain this private draft');await expect(page.getByLabel('Target amount')).toHaveValue('25');await expect(page.locator('.wizard-draft-back')).toHaveText('Draft restored · Discard');
 await page.evaluate(()=>location.reload());await expect(page.getByLabel('Goal name')).toHaveValue('Retain this private draft');await expect(page.getByLabel('Target amount')).toHaveValue('25');
 expect(dialogs).toBe(0);
 await page.getByRole('button',{name:'Discard',exact:true}).click();await expect(page.getByLabel('Goal name')).toHaveValue('');await expect(page.getByLabel('Target amount')).toHaveValue('');
 await page.evaluate(()=>location.reload());await expect(page.getByLabel('Goal name')).toBeVisible();await expect(page.getByLabel('Goal name')).toHaveValue('');expect(dialogs).toBe(0);
});
test('saved Goal detail edits retain input on canceled navigation and discard only the selected form',async({page})=>{
 await page.goto('/app/goals/new');await typeGoalName(page, 'Saved Goal');await page.getByLabel('Target amount').fill('25');await page.getByRole('button',{name:'Create goal',exact:true}).click();await expect(page).toHaveURL(/tracked/);await page.locator('#edit-goal > summary').click();await page.getByLabel('Edit Goal name').fill('Unsaved edit');page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Today',exact:true}).first().click();await expect(page.getByLabel('Edit Goal name')).toHaveValue('Unsaved edit');await page.getByRole('button',{name:'Cancel Goal edits'}).click();await expect(page.getByLabel('Edit Goal name')).toHaveValue('Saved Goal');await page.getByLabel('Edit Goal name').fill('Saved edit');await page.getByRole('button',{name:'Save Goal details'}).click();await expect(page.getByRole('heading',{name:'Saved edit',exact:true})).toBeVisible();let asked=false;page.on('dialog',async d=>{asked=true;await d.dismiss();});await page.getByRole('link',{name:'Today',exact:true}).first().click();expect(asked).toBe(false);
});
