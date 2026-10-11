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

// Session W Part 3 (listed in ADR-015): the flow is seven steps, and nothing is saved before Finish.
const zigoalsState=(page:Page)=>page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([k])=>k.startsWith('zigoals')).sort()));
async function stepTo(page:Page,title:string){await expect(page.locator('main').getByRole('heading',{level:1,name:title})).toBeFocused();}
async function throughToData(page:Page){
 const flow=page.locator('main');
 await stepTo(page,'A quick look around.');await flow.getByRole('button',{name:'Skip the tour',exact:true}).click();
 await stepTo(page,'Keep ZIGoals on your Home Screen.');await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'Meet ZIGi.');await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'Your data, your control.');
}
test('the flow: ZIGi\'s hello, pillars, starters, the tour, install, ZIGi, the honest data step; nothing is saved until Finish saves it all',async({page})=>{
 await today(page);await card(page).getByRole('link',{name:'Start setup',exact:true}).click();await page.waitForURL('**/app/welcome');
 const flow=page.locator('main');
 await expect(flow.getByRole('heading',{level:1,name:'Welcome to ZIGoals.'})).toBeVisible();await expect(flow).toContainText('Step 1 of 7');
 await expect(flow).toContainText('Hi, I’m ZIGi.');
 for(const text of ['Private by design.','No ads, no trackers.','No crypto needed.','nothing is saved until you finish'])await expect(flow).toContainText(text);
 for(const name of ['Skip setup','Explore the demo'])await expect(flow.getByRole('button',{name,exact:true})).toBeVisible();
 const before=await zigoalsState(page);
 await flow.getByRole('button',{name:'Let’s begin',exact:true}).click();
 await stepTo(page,'What do you want to improve?');
 await flow.getByRole('checkbox',{name:/^Habits/}).check();await flow.getByRole('checkbox',{name:/^Health & food/}).check();
 await expect(flow.locator('.onboarding-shown')).toHaveText('You’ll see: Today, Habits, Health, Activity, Settings.');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'A few things to start with.');
 await expect(flow.getByRole('group',{name:'A first goal (optional)'})).toHaveCount(0);
 await flow.getByRole('checkbox',{name:/^Walk/}).check();await flow.getByRole('checkbox',{name:/^Drink water/}).check();
 await flow.getByRole('radio',{name:'8,000 steps a day',exact:true}).check();await flow.getByRole('radio',{name:'2 L of water a day',exact:true}).check();
 await expect(flow).toContainText('Common starting points, not advice.');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'A quick look around.');
 await flow.getByRole('button',{name:'Show me',exact:true}).click();
 for(const title of ['Today','Your pages','Quick add']){await expect(flow.locator('.onboarding-tour-card h2')).toHaveText(title);await flow.getByRole('button',{name:'Next',exact:true}).click();}
 await expect(flow.locator('.onboarding-tour-card h2')).toHaveText('Settings');await flow.getByRole('button',{name:'Done',exact:true}).click();
 await stepTo(page,'Keep ZIGoals on your Home Screen.');await expect(flow).toContainText('Add to Home Screen');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'Meet ZIGi.');await expect(flow).toContainText('Until you do, nothing is sent anywhere.');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'Your data, your control.');
 for(const text of ['Browser storage is not a backup.','Encrypted account sync is off until you set it up in Settings','Health records sync only if you also allow Health there.','Your sign-in email is not a recovery key'])await expect(flow).toContainText(text);
 await expect(flow).not.toContainText(/sync is (on|active)|guarantee|recommend/i);
 await expect(flow.getByRole('checkbox',{name:/^After setup, take me to encrypted sync/})).not.toBeChecked();
 const summary=flow.getByRole('region',{name:'When you finish'});
 for(const line of ['Today starts with Habits + Health.','Your pages: Today, Habits, Health, Activity, Settings.','2 habits: Walk, Drink water.','A daily step target of 8,000.','A daily water target of 2 L.'])await expect(summary).toContainText(line);
 // Nothing was written on the way here.
 expect(await zigoalsState(page)).toBe(before);
 await flow.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(/\/app$/);
 await expect(page.locator('.today-page')).toHaveAttribute('data-interests','habits-health');
 await expect(card(page)).toHaveCount(0);await expect(page.locator('.dashboard-welcome')).toHaveCount(0);
 expect(await page.evaluate(k=>localStorage.getItem(k),KEY)).toBe('{"version":1,"seen":true}');
 const settings=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:settings:v1')!));
 expect(settings.schemaVersion).toBe(3);
 expect(Object.keys(settings.pages.items).sort()).toEqual(['ecosystem','goals','markets','portfolio','staking','wealth','wealth-shortcut']);
 expect(Object.values(settings.pages.items).every((choice:unknown)=>(choice as {v:string}).v==='hidden')).toBe(true);
 const habits=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:habits:v1')!));
 expect(habits.habits.map((h:{title:string})=>h.title).sort()).toEqual(['Drink water','Walk']);
 const health=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:health:v1')!));
 expect(health.targets.steps).toBe(8000);expect(health.daily.preferences.waterTargetMl).toBe(2000);
 await page.goto('/app/habits');await expect(page.getByRole('heading',{name:'Walk'}).first()).toBeVisible();
});

test('a first goal: a kind needs a name and a target; it is saved on Finish, once',async({page})=>{
 await page.goto('/app/welcome');const flow=page.locator('main');
 await flow.getByRole('button',{name:'Let’s begin',exact:true}).click();
 await flow.getByRole('checkbox',{name:/^Goals & money/}).check();await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await stepTo(page,'A few things to start with.');
 await flow.getByRole('radio',{name:'A trip',exact:true}).check();
 await expect(flow.getByLabel('Goal name')).toHaveValue('');await expect(flow.getByLabel('Target amount')).toHaveValue('');
 await flow.getByRole('button',{name:'Continue',exact:true}).click();await expect(flow.getByRole('alert')).toHaveText('Give your Goal a name.');
 await flow.getByLabel('Goal name').fill('Lisbon in spring');await flow.getByLabel('Target amount').fill('1200');
 await flow.getByRole('radio',{name:'EUR',exact:true}).check();await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await throughToData(page);
 await expect(flow.getByRole('region',{name:'When you finish'})).toContainText('Your goal “Lisbon in spring”.');
 await flow.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(/\/app$/);
 await page.goto('/app/goals');await expect(page.getByRole('link',{name:'Lisbon in spring'}).first()).toBeVisible();
 const goals=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).goals.filter((g:{name:string})=>g.name==='Lisbon in spring'));
 expect(goals).toHaveLength(1);expect(goals[0]).toMatchObject({category:'Travel',asset:'EUR',target:'120000'});
});

test('choosing nothing anywhere: Finish writes only the seen flag and opens Today as it was',async({page})=>{
 await page.goto('/app/welcome');const flow=page.locator('main');
 const before=await zigoalsKeys(page);
 await flow.getByRole('button',{name:'Let’s begin',exact:true}).click();
 await flow.getByRole('button',{name:'Continue without choosing',exact:true}).click();
 await stepTo(page,'A few things to start with.');await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await throughToData(page);
 await expect(flow.getByRole('region',{name:'When you finish'})).toContainText('Nothing new is added; ZIGoals opens as it is.');
 await flow.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(/\/app$/);
 expect(await zigoalsKeys(page)).toEqual([...new Set([...before,KEY])].sort());
});

test('a re-run never adds a habit twice; "take me to encrypted sync" opens it after Finish',async({page})=>{
 await page.goto('/app/habits');await page.getByRole('button',{name:'Create a habit'}).first().click();
 await page.getByLabel('Habit title',{exact:true}).fill('Walk');await page.getByRole('button',{name:'Create habit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Walk'})).toBeVisible();
 await page.goto('/app/welcome');const flow=page.locator('main');
 await flow.getByRole('button',{name:'Let’s begin',exact:true}).click();
 await flow.getByRole('checkbox',{name:/^Habits/}).check();await flow.getByRole('button',{name:'Continue',exact:true}).click();
 const walk=flow.getByRole('checkbox',{name:/^Walk/});
 await expect(walk).toBeChecked();await expect(walk).toBeDisabled();await expect(flow.locator('.onboarding-choice').filter({hasText:'Walk'})).toContainText('Already in your Habits');
 await flow.getByRole('checkbox',{name:/^Read/}).check();await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await throughToData(page);
 await expect(flow.getByRole('region',{name:'When you finish'})).toContainText('A habit: Read.');
 await flow.getByRole('checkbox',{name:/^After setup, take me to encrypted sync/}).check();
 await flow.getByRole('button',{name:'Finish setup',exact:true}).click();await page.waitForURL(/\/app\/settings#encrypted-sync$/);
 const titles=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:habits:v1')!).habits.map((h:{title:string})=>h.title).sort());
 expect(titles).toEqual(['Read','Walk']);
});

test('install: the browser\'s own install offer shows a button where it exists; an installed app is told so',async({page})=>{
 await page.goto('/app/welcome');const flow=page.locator('main');
 await flow.getByRole('button',{name:'Let’s begin',exact:true}).click();
 await flow.getByRole('button',{name:'Continue without choosing',exact:true}).click();
 await flow.getByRole('button',{name:'Continue',exact:true}).click();
 await flow.getByRole('button',{name:'Skip the tour',exact:true}).click();
 await stepTo(page,'Keep ZIGoals on your Home Screen.');
 await expect(flow.getByRole('button',{name:'Install ZIGoals',exact:true})).toHaveCount(0);
 // A Chromium-style offer (MOCK): the event the browser sends when it can install the app.
 await page.evaluate(()=>{const e=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt:async()=>undefined,userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(e);});
 await flow.getByRole('button',{name:'Install ZIGoals',exact:true}).click();
 await expect(flow).toContainText('You’re already using the installed app.');
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
