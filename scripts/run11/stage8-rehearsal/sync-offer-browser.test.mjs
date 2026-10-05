// The encrypted-sync offer (Session L, Part 3) against the real private-sync Worker in Miniflare, in real Chrome with
// the production app and fixture sign-in. Device A turns sync on from the offer, through the existing vault creation;
// Goals, Habits and Today preferences reach device B, which unlocks from its own offer. Health stays on each device
// until that device's own consent (on B, the offer's Health choice). When A then consents while it holds Health entries
// of its own that never synced, sync stops for review instead of merging them silently with B's (by design, as in
// apps/web/lib/vault/cloud-sync.test.ts "initial attach conflicts rather than replacing unrelated local data").
import {test,expect} from 'vitest';
import {armSyncCompletion} from '../sync-completion.mjs';
import {ACCOUNTS,BROWSER,accountUi,anyCodeProvider,launchChrome,privateWorkers,reviewOrigin,routeAccount,sessionToken,workerRecords} from './harness.mjs';

const TURN_ON='Turn on encrypted sync (recommended)',HEALTH='Also sync my Health records (optional)';

test.runIf(BROWSER)('the offer turns sync on through the existing controls; Goals, Habits and Today sync, Health only after each device\'s own consent and never merged silently',async()=>{
 const origin=reviewOrigin(),workers=await privateWorkers({origin}),browser=await launchChrome(),provider=anyCodeProvider();
 try{
  const a=await browser.newContext(),b=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
  await routeAccount(a,{mf:workers.mf,provider});await routeAccount(b,{mf:workers.mf,provider});
  const pa=await a.newPage(),pb=await b.newPage(),ua=accountUi(pa),ub=accountUi(pb);
  const GOAL='Stage 8 offer goal',HABIT='Stage 8 offer habit',WIDGET='Stage 8 offer widget';
  const offer=(page,name)=>page.getByRole('region',{name,exact:true});
  const domains=async()=>{const {status,body}=await workerRecords(workers.mf,{origin,token:await sessionToken(a,origin),account:ACCOUNTS.a});expect(status).toBe(200);expect(body.cursor).toBeNull();return new Set(body.records.filter(r=>!r.deleted).map(r=>r.domain));};
  const water=page=>page.getByRole('region',{name:'Water journal'});

  // Device A: the offer, then the existing secret box and confirmation.
  await ua.settings();await ua.signIn('a@example.invalid');
  const first=offer(pa,'Keep your devices in sync automatically');await first.waitFor();
  expect(await first.getByRole('checkbox',{name:HEALTH,exact:true}).isChecked()).toBe(false);
  await first.getByRole('button',{name:TURN_ON,exact:true}).click();
  const recovery=await pa.getByLabel('New vault recovery secret',{exact:true}).inputValue();expect(recovery.length).toBeGreaterThan(20);
  expect(await pa.getByLabel('I saved this vault recovery secret separately.').isChecked()).toBe(false);
  await pa.getByLabel('I saved this vault recovery secret separately.').check();
  const created=await armSyncCompletion(pa);await pa.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await created();
  expect(await pa.getByRole('button',{name:TURN_ON}).count()).toBe(0);

  // Records in every section, Health without consent.
  await ua.go('Goals');await pa.locator('.page-heading').getByRole('link',{name:'+ Create a goal',exact:true}).click();await pa.getByLabel('Goal name',{exact:true}).fill(GOAL);await pa.getByRole('radio',{name:'Project',exact:true}).check();await pa.getByLabel('Milestones, one per line').fill('Start');for(let i=0;i<3;i++)await pa.getByRole('button',{name:'Continue →'}).click();await pa.getByRole('button',{name:'Create goal',exact:true}).click();await pa.getByTestId('tracked-progress').waitFor();
  await ua.go('Habits');await pa.getByRole('button',{name:'+ New habit',exact:true}).click();await pa.getByLabel('Start from template').selectOption('read');await pa.getByLabel('Habit title',{exact:true}).fill(HABIT);await pa.getByRole('button',{name:'Create habit',exact:true}).click();await pa.getByRole('article',{name:HABIT,exact:true}).waitFor();
  await ua.go('Today');await pa.getByRole('button',{name:'Customize Today',exact:true}).click();await pa.getByRole('button',{name:'Add widget',exact:true}).click();const editor=pa.getByRole('dialog',{name:'Add a widget'});await editor.getByRole('group',{name:'Choose a metric'}).getByRole('button',{name:'Water today',exact:true}).click();await editor.getByText('Title and display size').click();await editor.getByLabel('Card title (optional)').fill(WIDGET);await editor.getByRole('button',{name:'Save widget'}).click();await pa.getByRole('article',{name:WIDGET,exact:true}).waitFor();
  await ua.go('Health');await pa.getByRole('button',{name:'Add 250 mL',exact:true}).click();await water(pa).getByText('250 mL recorded',{exact:false}).waitFor();
  await ua.go('Settings');await ua.syncNow();
  let held=await domains();
  expect(['finance','habits','settings'].every(d=>held.has(d))).toBe(true);expect(held.has('health')).toBe(false);

  // Device B: its own offer moves to the recovery secret; the offer's Health choice is B's consent.
  await ub.settings();await ub.signIn('a@example.invalid');
  const second=offer(pb,'Bring this device up to date');await second.waitFor();
  await second.getByRole('checkbox',{name:HEALTH,exact:true}).check();
  await expect.poll(()=>ub.healthConsent().isChecked()).toBe(true);
  await second.getByRole('button',{name:TURN_ON,exact:true}).click();
  await expect.poll(()=>pb.evaluate(()=>document.activeElement?.getAttribute('type'))).toBe('password');
  await pb.keyboard.type(recovery);
  const unlocked=await armSyncCompletion(pb);await pb.getByRole('button',{name:'Unlock account vault',exact:true}).click();await unlocked();
  expect(await pb.getByRole('button',{name:TURN_ON}).count()).toBe(0);
  await ub.go('Goals');await pb.getByRole('heading',{name:GOAL,exact:true}).waitFor();
  await ub.go('Habits');await pb.getByRole('article',{name:HABIT,exact:true}).waitFor();
  // Session U follow-up F3: on this phone the widget card is a row named by it; open it first.
  await ub.go('Today');await pb.getByRole('button',{name:WIDGET,exact:true}).click();await pb.getByRole('article',{name:WIDGET,exact:true}).waitFor();
  await ub.go('Health');await water(pb).waitFor();expect(await water(pb).innerText()).not.toContain('250 mL recorded');

  // B's own Health entry is uploaded under B's consent; A, still without consent, does not receive it.
  await pb.getByRole('button',{name:'Add 500 mL',exact:true}).click();await water(pb).getByText('500 mL recorded',{exact:false}).waitFor();
  await ub.go('Settings');await ub.syncNow();
  held=await domains();expect(held.has('health')).toBe(true);
  await ua.syncNow();await ua.go('Health');await water(pa).getByText('250 mL recorded',{exact:false}).waitFor();
  expect(await water(pa).innerText()).not.toContain('750 mL');

  // A's own consent (the existing checkbox) while A holds its own unsynced Health entry: sync stops for review,
  // and neither copy changes.
  await ua.go('Settings');await ua.healthConsent().click();await expect.poll(()=>ua.healthConsent().isChecked()).toBe(true);
  await pa.getByRole('button',{name:'Sync now',exact:true}).click();
  await ua.syncRegion().getByRole('alert').filter({hasText:'Unlinked local and cloud records differ. Export both before choosing what to keep.'}).waitFor();
  await ua.syncRegion().getByText(/Needs attention\. Automatic sync paused\./).waitFor();
  await ua.go('Health');await water(pa).getByText('250 mL recorded',{exact:false}).waitFor();expect(await water(pa).innerText()).not.toContain('750 mL');
  await ub.go('Settings');await ub.syncNow();await ub.go('Health');await water(pb).getByText('500 mL recorded',{exact:false}).waitFor();expect(await water(pb).innerText()).not.toContain('750 mL');
  await a.close();await b.close();
 }finally{await browser.close();await workers.mf.dispose();}
},90000);
