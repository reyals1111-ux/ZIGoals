import {expect,test} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY,presetSettings,saveWidget} from '../lib/dashboard-settings';

// Session AK RB (RELEASE_REVIEW_2 R2-9, deliberate): the overview ("Your selected widgets") no longer repeats the widgets
// that are cards on Today (each showed twice). The same checks now read the cards themselves: six reachable, each linking
// to its record, then five once one is hidden and four once one is removed, after a reload too; the overview stays with
// Customize Today and lists nothing twice.
test('six selected widgets remain individually reachable and update when hidden or removed',async({page})=>{
 let settings=presetSettings('balanced');
 settings=saveWidget(settings,{id:'extra-water',kind:'health',metric:'water',title:'My water',size:'compact',hidden:false,revision:1});
 settings=saveWidget(settings,{id:'extra-ecosystem',kind:'ecosystem',metric:'directory',title:'Explore safely',size:'compact',hidden:false,revision:1});
 await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('fixture-summary-seeded')){localStorage.setItem(key,value);sessionStorage.setItem('fixture-summary-seeded','true');}},{key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify(settings)});
 await page.goto('/app');
 const summary=page.getByRole('region',{name:'Your selected widgets'});
 const cards=page.getByRole('region',{name:'Your Today widgets'}).locator('article.dashboard-widget:not([data-hidden])');
 await expect(cards).toHaveCount(6);
 await expect(summary.locator('.dashboard-summary-item')).toHaveCount(0);
 await expect(summary.getByRole('button',{name:'Customize Today',exact:true})).toBeVisible();
 await expect(page.locator('article.dashboard-widget[aria-label="My water"] a.text-link')).toHaveAttribute('href','/app/health');
 await expect(page.locator('article.dashboard-widget[aria-label="Explore safely"] a.text-link')).toHaveAttribute('href','/app/ecosystem');
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 await page.getByRole('article',{name:'My water'}).getByRole('button',{name:'Options for My water'}).click();
 // Session AO (DV-040g, deliberate): items are menuitems now
 await page.getByRole('article',{name:'My water'}).getByRole('menuitem',{name:'Hide widget'}).click();
 await expect(cards).toHaveCount(5);
 await page.getByRole('article',{name:'Explore safely'}).getByRole('button',{name:'Options for Explore safely'}).click();
 // Session AO (DV-040g, deliberate): items are menuitems now
 await page.getByRole('article',{name:'Explore safely'}).getByRole('menuitem',{name:'Remove widget'}).click();
 await expect(cards).toHaveCount(4);
 await page.reload();
 await expect(cards).toHaveCount(4);
 await expect(page.getByRole('article',{name:'My water'})).toHaveCount(0);
});
