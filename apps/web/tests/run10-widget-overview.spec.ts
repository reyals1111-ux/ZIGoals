import {expect,test} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY,presetSettings,saveWidget} from '../lib/dashboard-settings';

test('six selected widgets remain individually reachable and update when hidden or removed',async({page})=>{
 let settings=presetSettings('balanced');
 settings=saveWidget(settings,{id:'extra-water',kind:'health',metric:'water',title:'My water',size:'compact',hidden:false,revision:1});
 settings=saveWidget(settings,{id:'extra-ecosystem',kind:'ecosystem',metric:'directory',title:'Explore safely',size:'compact',hidden:false,revision:1});
 await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('fixture-summary-seeded')){localStorage.setItem(key,value);sessionStorage.setItem('fixture-summary-seeded','true');}},{key:DASHBOARD_SETTINGS_KEY,value:JSON.stringify(settings)});
 await page.goto('/app');
 const summary=page.getByRole('region',{name:'Your selected widgets'});
 await expect(summary.locator('.dashboard-summary-item')).toHaveCount(6);
 await expect(summary.getByRole('link',{name:/My water/})).toHaveAttribute('href','/app/health');
 await expect(summary.getByRole('link',{name:/Explore safely/})).toHaveAttribute('href','/app/ecosystem');
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();
 await page.getByRole('article',{name:'My water'}).getByRole('button',{name:'Hide',exact:true}).click();
 await expect(summary.locator('.dashboard-summary-item')).toHaveCount(5);
 await page.getByRole('article',{name:'Explore safely'}).getByRole('button',{name:'Remove',exact:true}).click();
 await expect(summary.locator('.dashboard-summary-item')).toHaveCount(4);
 await page.reload();
 await expect(summary.locator('.dashboard-summary-item')).toHaveCount(4);
 await expect(page.getByRole('article',{name:'My water'})).toHaveCount(0);
});
