import {expect,test} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY,presetSettings} from '../lib/dashboard-settings';
import {openTodayWidgets} from './phone-nav';
import {openSettings} from './settings-open';

test('widget insertion, rail placement and encrypted layout recovery keep one binding',async({page})=>{
 const original=presetSettings('balanced');
 await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('fixture-placement-seeded')){localStorage.setItem(key,value);sessionStorage.setItem('fixture-placement-seeded','true');}},{key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify(original)});
 await page.goto('/app');
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 const habits=page.locator('.dashboard-layout-grid > .placed-module[data-module="habits"]');
 await habits.getByRole('button',{name:'Add widget after Daily Habits'}).click();
 const editor=page.getByRole('dialog',{name:'Add a widget'});
 await editor.getByRole('group',{name:'Choose a metric'}).getByRole('button',{name:'Water today'}).click();
 await editor.getByText('Title and display size').click();
 await editor.getByLabel('Card title (optional)').fill('My water');
 await editor.getByRole('button',{name:'Save widget'}).click();
 const card=page.getByRole('article',{name:'My water',exact:true});
 const placed=page.locator('.dashboard-layout-grid > .placed-module').filter({has:card});
 await expect(placed).toBeVisible();
 await expect.poll(()=>habits.evaluate(el=>el.nextElementSibling?.getAttribute('data-kind'))).toBe('widget');
 await card.getByRole('button',{name:'Options for My water'}).click();
 // Session AO (DV-040g, deliberate): items are menuitems now
 await card.getByRole('menuitem',{name:'Move to rail'}).click();
 await expect(page.locator('.today-rail > .placed-module').filter({has:card})).toBeVisible();
 await page.reload();
 await openTodayWidgets(page);
 await expect(page.locator('.today-rail > .placed-module').filter({has:card})).toHaveCount(1);
 await expect(page.locator('.placed-module').filter({has:card})).toHaveCount(1);
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 await card.getByRole('button',{name:'Options for My water'}).click();
 // Session AO (DV-040g, deliberate): items are menuitems now
 await card.getByRole('menuitem',{name:'Hide widget'}).click();
 await expect(card).toHaveAttribute('data-hidden','true');
 await card.getByRole('button',{name:'Options for My water'}).click();
 // Session AO (DV-040g, deliberate): items are menuitems now
 await card.getByRole('menuitem',{name:'Show widget'}).click();
 await expect(card).not.toHaveAttribute('data-hidden','true');

 await openSettings(page);
 const vault=page.locator('#private-vault');
 await vault.getByRole('button',{name:'Prepare encrypted backup'}).click();
 const recovery=await vault.getByRole('textbox',{name:'Recovery secret',exact:true}).inputValue();
 await vault.getByLabel('I saved the recovery secret.').check();
 const downloadEvent=page.waitForEvent('download');
 await vault.getByRole('button',{name:'Download encrypted backup'}).click();
 const download=await downloadEvent;
 const file=await download.path();
 expect(file).toBeTruthy();
 await page.goto('/app');
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 await card.getByRole('button',{name:'Options for My water'}).click();
 // Session AO (DV-040g, deliberate): items are menuitems now
 await card.getByRole('menuitem',{name:'Remove widget'}).click();
 await expect(card).toHaveCount(0);
 await openSettings(page);
 await vault.getByText('Restore an encrypted backup').click();
 await vault.getByLabel('Encrypted backup file').setInputFiles(file!);
 await vault.getByLabel('Backup recovery secret').fill(recovery);
 await vault.getByRole('button',{name:'Unlock and preview'}).click();
 await vault.getByLabel('Module to restore').selectOption('settings');
 await vault.getByLabel('Replace the selected module with this validated backup.').check();
 await vault.getByRole('button',{name:'Restore selected module'}).click();
 await expect(vault).toContainText('Selected module restored');
 await page.goto('/app');
 await openTodayWidgets(page);
 await expect(page.locator('.today-rail > .placed-module').filter({has:card})).toHaveCount(1);
 await expect(page.locator('.placed-module').filter({has:card})).toHaveCount(1);
 // Session AK RB (RELEASE_REVIEW_2 R2-9, deliberate): the overview no longer repeats the cards; the card itself is there once.
 await expect(page.locator('article.dashboard-widget[aria-label="My water"]')).toHaveCount(1);
});
