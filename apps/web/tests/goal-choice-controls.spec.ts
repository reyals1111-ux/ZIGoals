import {expect,test,type Locator} from '@playwright/test';

/** Tap where the device is touch-first, click otherwise: both must select a tile. */
async function choose(radio:Locator,touch:boolean){if(touch)await radio.locator('xpath=ancestor::label[1]').tap();else await radio.locator('xpath=ancestor::label[1]').click();await expect(radio).toBeChecked();}

test('risk and liquidity tiles work by keyboard and touch and save the same values as before',async({page,isMobile})=>{
 await page.goto('/app/goals/new');
 await page.getByLabel('Goal name',{exact:true}).fill('Tile preferences');await page.getByLabel('Target amount',{exact:true}).fill('1200');
 await page.getByRole('button',{name:'Continue →'}).click();
 await page.getByLabel('ZIGoals funding / Local simulation',{exact:true}).check();
 const risk=page.getByRole('group',{name:'Risk preference',exact:true}),liquidity=page.getByRole('group',{name:'Liquidity preference',exact:true});
 await expect(risk.getByRole('radio')).toHaveCount(3);await expect(risk.getByRole('radio',{name:'Conservative',exact:true})).toBeChecked();
 await risk.getByRole('radio',{name:'Conservative',exact:true}).focus();
 await page.keyboard.press('ArrowRight');await expect(risk.getByRole('radio',{name:'Balanced',exact:true})).toBeChecked();
 await page.keyboard.press('ArrowRight');await expect(risk.getByRole('radio',{name:'Growth',exact:true})).toBeChecked();
 await expect(liquidity.getByRole('radio',{name:'Anytime',exact:true})).toBeChecked();
 await choose(liquidity.getByRole('radio',{name:'Within a month',exact:true}),isMobile);
 await expect(liquidity.getByRole('radio',{name:'Anytime',exact:true})).not.toBeChecked();
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'Continue →'}).click();
 await page.getByRole('button',{name:'Create goal',exact:true}).click();await page.getByRole('button',{name:'Confirm simulation'}).click();
 // The review step already shows this heading, so it cannot signal the save: wait for the created Goal's page, then for the stored plan itself.
 await expect(page).toHaveURL(/\/app\/goals\/\d+$/);await expect(page.getByRole('heading',{name:'Tile preferences',exact:true})).toBeVisible();
 const saved=()=>page.evaluate(()=>Object.keys(localStorage).map(key=>localStorage.getItem(key)??'').join('\n'));
 await expect.poll(saved).toContain('"riskPreference":"Growth"');expect(await saved()).toContain('"liquidityPreference":"Within a month"');
});

test('wealth scope and cadence tiles keep one valid value and the saved plan reopens selected',async({page,isMobile})=>{
 await page.goto('/app/goals/new');
 await page.getByLabel('Goal name',{exact:true}).fill('Tile cadence');await page.getByLabel('Target amount',{exact:true}).fill('500');
 await page.getByRole('button',{name:'Continue →'}).click();
 await page.getByLabel('Build it with future contributions',{exact:true}).check();
 const scope=page.getByRole('group',{name:'Wealth scope',exact:true});
 await expect(scope.getByRole('radio')).toHaveCount(2);
 expect(await scope.getByRole('radio').evaluateAll(radios=>radios.filter(r=>(r as HTMLInputElement).checked).length)).toBe(1);
 await choose(scope.getByRole('radio',{name:'Testnet + manual',exact:true}),isMobile);
 await choose(scope.getByRole('radio',{name:'Mainnet + manual',exact:true}),isMobile);
 await page.getByLabel('Planned amount',{exact:true}).fill('25');
 const cadence=page.getByRole('group',{name:'Cadence',exact:true});
 await expect(cadence.getByRole('radio',{name:'Monthly',exact:true})).toBeChecked();
 await cadence.getByRole('radio',{name:'Monthly',exact:true}).focus();await page.keyboard.press('ArrowRight');
 await expect(cadence.getByRole('radio',{name:'Yearly',exact:true})).toBeChecked();
 await expect(cadence.getByRole('radio',{name:'Yearly',exact:true})).toHaveAttribute('value','yearly');
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'Continue →'}).click();
 await page.getByRole('button',{name:'Create goal',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/goals\/tracked\//);
 const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).goals.find((g:{name:string})=>g.name==='Tile cadence')?.plan);
 expect(plan?.cadence).toBe('yearly');
 await page.locator('#contribution-plan > summary').click();
 const saved=page.locator('#contribution-plan').getByRole('group',{name:'Cadence',exact:true});
 await expect(saved.getByRole('radio',{name:'Yearly',exact:true})).toBeChecked();
 await expect(saved.getByRole('radio')).toHaveCount(4);
});
