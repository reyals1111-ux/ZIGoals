import {expect,test,type Page} from '@playwright/test';

// Session E, Part 5: the first-run welcome. Fresh browsers here are brand-new users on purpose.
const KEY='zigoals:onboarding:v1';
test.use({storageState:{cookies:[],origins:[]}});
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});
const card=(page:Page)=>page.getByRole('region',{name:'Set up your first goal and habit in about a minute.'});
const zigoalsKeys=(page:Page)=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('zigoals')).sort());
async function today(page:Page){await page.goto('/app');await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy','true');}

test('a brand-new device sees the welcome on Today; Not now writes only the seen flag and it stays away',async({page})=>{
 await today(page);
 const welcome=card(page);await expect(welcome).toBeVisible();
 for(const name of ['Explore the demo','Not now'])await expect(welcome.getByRole('button',{name,exact:true})).toBeVisible();
 await expect(welcome.getByRole('link',{name:'Start setup',exact:true})).toHaveAttribute('href','/app/welcome');
 await expect(welcome).toContainText('No wallet or account needed.');
 const before=await zigoalsKeys(page);
 await welcome.getByRole('button',{name:'Not now',exact:true}).click();await expect(welcome).toHaveCount(0);
 expect(await zigoalsKeys(page)).toEqual([...new Set([...before,KEY])].sort());
 expect(await page.evaluate(k=>localStorage.getItem(k),KEY)).toBe('{"version":1,"seen":true}');
 await today(page);await expect(page.locator('.dashboard-welcome')).toBeVisible();await expect(card(page)).toHaveCount(0);
});

test('never for someone with records or a chosen Today, and never in Showcase',async({page})=>{
 // A saved Today choice counts as an existing user.
 await today(page);await page.getByRole('button',{name:'Keep Balanced and continue',exact:true}).click();
 await expect(page.locator('.dashboard-welcome')).toHaveCount(0);await today(page);await expect(card(page)).toHaveCount(0);
 // Any private record counts too, even with Today untouched.
 await page.evaluate(()=>localStorage.clear());
 await page.goto('/app/habits');await page.getByRole('button',{name:'Create a habit'}).first().click();
 await page.getByLabel('Habit title',{exact:true}).fill('Stretch');await page.getByRole('button',{name:'Create habit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Stretch'})).toBeVisible();
 await today(page);await expect(page.locator('.dashboard-welcome')).toBeVisible();await expect(card(page)).toHaveCount(0);
 // Showcase: never.
 await page.evaluate(()=>localStorage.clear());
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 await expect(page.locator('main h1')).toBeVisible();await expect(card(page)).toHaveCount(0);
 await page.goto('/app/welcome');await expect(page.getByText('You’re exploring Showcase data.')).toBeVisible();
});

test('the flow: a preset, a real goal and habit from templates, the honest data step, then Today',async({page})=>{
 await today(page);await card(page).getByRole('link',{name:'Start setup',exact:true}).click();await page.waitForURL('**/app/welcome');
 const flow=page.locator('main');
 await expect(flow.getByRole('heading',{level:1,name:'Welcome to ZIGoals.'})).toBeVisible();await expect(flow).toContainText('Step 1 of 5');
 for(const name of ['Skip setup','Explore the demo'])await expect(flow.getByRole('button',{name,exact:true})).toBeVisible();
 await flow.getByRole('button',{name:'Let’s begin',exact:true}).click();
 const h1=flow.getByRole('heading',{level:1,name:'What matters to you?'});await expect(h1).toBeFocused();
 await flow.getByRole('radio',{name:/^Habits \+ Health/}).check();await flow.getByRole('button',{name:'Continue',exact:true}).click();
 // Goal: nothing is pre-filled; the name and target are the person's own.
 await expect(flow.getByRole('heading',{level:1,name:'Your first goal.'})).toBeFocused();
 await expect(flow.getByRole('button',{name:'Create goal',exact:true})).toBeDisabled();
 await flow.getByRole('radio',{name:'A trip'}).check();
 await expect(flow.getByLabel('Goal name')).toHaveValue('');await expect(flow.getByLabel('Target amount')).toHaveValue('');
 await flow.getByRole('button',{name:'Create goal',exact:true}).click();await expect(flow.getByRole('alert')).toHaveText('Give your Goal a name.');
 await flow.getByLabel('Goal name').fill('Lisbon in spring');await flow.getByLabel('Target amount').fill('1200');
 await flow.getByRole('radio',{name:'EUR'}).check();await flow.getByRole('button',{name:'Create goal',exact:true}).click();
 await expect(flow.getByRole('status').filter({hasText:'Lisbon in spring'})).toContainText('is saved in your Goals');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(flow.getByRole('heading',{level:1,name:'Your first habit.'})).toBeFocused();
 await flow.getByRole('radio',{name:/^Walk/}).check();await flow.getByRole('button',{name:'Add habit',exact:true}).click();
 await expect(flow.getByRole('status').filter({hasText:'Walk'})).toContainText('is on your Habits page');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(flow.getByRole('heading',{level:1,name:'Your data, your control.'})).toBeFocused();
 for(const text of ['Browser storage is not a backup.','Encrypted account sync is off until you set it up in Settings','Your sign-in email is not a recovery key'])await expect(flow).toContainText(text);
 await expect(flow).not.toContainText(/sync is (on|active)|guarantee|recommend/i);
 await flow.getByRole('button',{name:'Go to Today',exact:true}).click();await page.waitForURL(/\/app$/);
 await expect(page.locator('.today-page')).toHaveAttribute('data-interests','habits-health');
 await expect(card(page)).toHaveCount(0);await expect(page.locator('.dashboard-welcome')).toHaveCount(0);
 expect(await page.evaluate(k=>localStorage.getItem(k),KEY)).toBe('{"version":1,"seen":true}');
 await page.goto('/app/goals');await expect(page.getByRole('link',{name:'Lisbon in spring'}).first()).toBeVisible();
 await page.goto('/app/habits');await expect(page.getByRole('heading',{name:'Walk'}).first()).toBeVisible();
});

test('Skip setup writes only the seen flag',async({page})=>{
 await page.goto('/app/welcome');await expect(page.locator('main h1')).toHaveText('Welcome to ZIGoals.');
 const before=await zigoalsKeys(page);
 await page.getByRole('button',{name:'Skip setup',exact:true}).click();await page.waitForURL(/\/app$/);await expect(page.locator('main h1')).toBeVisible();
 expect(await zigoalsKeys(page)).toEqual([...new Set([...before,KEY])].sort());
 await expect(card(page)).toHaveCount(0);
});

test('reduced motion and Motion Off: steps change without animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/app/welcome');
 await page.getByRole('button',{name:'Let’s begin',exact:true}).click();
 expect(await page.locator('.onboarding-step').evaluate(e=>e.getAnimations().length)).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 await page.goto('/app/welcome');await expect(page.locator('html')).toHaveAttribute('data-app-motion','off');
 await page.getByRole('button',{name:'Let’s begin',exact:true}).click();
 expect(await page.locator('.onboarding-step').evaluate(e=>e.getAnimations().length)).toBe(0);
});

test('phones only: Settings offers “Show the welcome again”',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/app/settings');
 const row=page.getByRole('link',{name:'Show the welcome again',exact:true});await expect(row).toBeVisible();await expect(row).toHaveAttribute('href','/app/welcome');
 const box=(await row.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);
 await page.setViewportSize({width:1280,height:800});await page.reload();await expect(page.locator('main h1')).toBeVisible();
 await expect(page.getByRole('link',{name:'Show the welcome again'})).toHaveCount(0);
});
