// Session Z-Cloud stretch: human-style journeys on the production build, at a computer, a tablet and a phone size.
// Fictional records (the Showcase or an empty device); every /api request answered by a 503 fixture; nothing leaves
// 127.0.0.1. Each journey reports what a person would notice: page errors, sideways scroll, a step that did not happen.
import {chromium} from '/home/user/ZIGoals/node_modules/.pnpm/node_modules/playwright/index.mjs';
const BASE = process.argv[2] ?? 'http://127.0.0.1:3101', OUT = process.argv[3];
const SIZES = [['computer', 1440, 900, false], ['tablet', 820, 1180, true], ['phone', 390, 844, true]];
const results = [];
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium'});
async function journey(name, size, run) {
  const [label, width, height, touch] = size;
  const ctx = await b.newContext({viewport: {width, height}, hasTouch: touch, isMobile: label === 'phone', locale: 'en-GB', timezoneId: 'Europe/Brussels'});
  const page = await ctx.newPage(), errors = [], outside = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1' && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) outside.push(u.origin); });
  await page.route('**/api/**', r => r.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const notes = [];
  const wide = async where => { const w = await page.evaluate(() => document.documentElement.scrollWidth); if (w > width) notes.push(`sideways scroll on ${where}: ${w}px`); };
  let ok = true;
  try { await run(page, {notes, wide, label}); } catch (e) { ok = false; notes.push(`stopped: ${String(e.message).split('\n')[0].slice(0, 160)}`); }
  if (OUT) await page.screenshot({path: `${OUT}/${name}-${label}.png`}).catch(() => {});
  results.push({journey: name, size: `${label} ${width}×${height}`, ok: ok && !errors.length && !outside.length && !notes.some(n => n.startsWith('sideways')), errors, outside: [...new Set(outside)], notes});
  await ctx.close();
}
const showcase = async page => { await page.goto(`${BASE}/app/settings`); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app'); };
const openZigi = async page => { await page.getByRole('button', {name: /^Open ZIGi/}).click(); await page.locator('dialog.ai-chat[open]').waitFor(); return page.locator('dialog.ai-chat[open]'); };

for (const size of SIZES) {
  // 1. A new person: Today, Quick add a glass of water, Health shows it, Help answers what changed.
  await journey('new-person-water', size, async (page, {notes, wide, label}) => {
    await page.goto(`${BASE}/app`); await page.locator('main').waitFor(); await wide('Today');
    await page.locator(label === 'phone' ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
    const dialog = page.getByRole('dialog', {name: 'What would you like to add?'}), line = dialog.getByRole('form', {name: 'Type a line'});
    await line.getByRole('textbox', {name: 'Type a line'}).fill('drank 2 glasses of water'); await page.keyboard.press('Enter');
    await line.getByText('Will save: Water · 2 glasses (500 mL) · today').waitFor();
    await line.getByRole('button', {name: 'Save', exact: true}).click(); await line.getByRole('status').getByText('Saved: Water · 500 mL · today').waitFor();
    await dialog.getByRole('button', {name: 'Close Quick add', exact: true}).click();
    await page.goto(`${BASE}/app/health`); await page.locator('main').waitFor(); await wide('Health');
    if (!/500 mL recorded/.test(await page.getByRole('region', {name: 'Water journal'}).innerText())) notes.push('Health does not show the 500 mL just added');
    await page.goto(`${BASE}/app/help#help-z-panel`); await page.locator('main').waitFor(); await wide('Help');
  });
  // 2. ZIGi without an AI: open, ask an example question, the answer comes from this device, close.
  await journey('zigi-without-ai', size, async (page, {notes, wide}) => {
    await showcase(page); await page.goto(`${BASE}/app/habits`);
    const panel = await openZigi(page); await wide('ZIGi panel');
    await panel.locator('.ai-composer textarea').fill('How many minutes did I meditate this month?');
    await panel.locator('.ai-composer button[type=submit]').click();
    await panel.locator('.ai-turn-local').last().waitFor({timeout: 10_000});
    if (!/minutes/i.test(await panel.locator('.ai-turn-local').last().innerText())) notes.push('the on-device answer does not give minutes');
    await panel.getByRole('button', {name: 'Close ZIGi'}).click();
  });
  // 3. A habit tidy-up: archive Stretch-like habit in the Showcase, then see "Delete for good" is offered only once archived.
  await journey('habit-archive', size, async (page, {notes, wide}) => {
    await showcase(page); await page.goto(`${BASE}/app/habits`); await page.locator('main').waitFor(); await wide('Habits');
    const card = page.locator('article.habit-card').first(), title = await card.getByRole('heading', {level: 2}).innerText();
    await card.getByRole('button', {name: 'Archive habit', exact: true}).click();
    if (await card.getByRole('button', {name: 'Delete for good…'}).count()) notes.push(`"Delete for good…" offered before ${title}'s archive is in effect`);
    if (!(await card.innerText()).includes('appears here once the archive starts')) notes.push('the card does not say when "Delete for good…" appears');
  });
  // 4. Wealth: "What you have", filters, an asset's page and back.
  await journey('wealth-what-you-have', size, async (page, {notes, wide}) => {
    await showcase(page); await page.goto(`${BASE}/app/wealth`);
    const have = page.getByRole('region', {name: 'What you have'}); await have.waitFor(); await wide('Wealth');
    await have.getByRole('group', {name: 'Show'}).getByRole('button', {name: /^Debts/}).click();
    const debts = await have.getByRole('listitem').count(); if (debts < 1) notes.push('no debts listed under Debts');
    await have.getByRole('group', {name: 'Show'}).getByRole('button', {name: /^Assets/}).click();
    await have.getByRole('link').filter({hasText: 'USD Coin'}).first().click();
    await page.getByRole('button', {name: 'Edit asset', exact: true}).waitFor(); await wide('an asset');
  });
  // 5. Settings: Voice and the ZIGi section, no French anywhere, back to Help.
  await journey('settings-voice', size, async (page, {notes, wide}) => {
    await page.goto(`${BASE}/app/settings#zigi-voice`); await page.locator('main').waitFor(); await wide('Settings');
    const text = await page.locator('main').innerText();
    if (/Français|French/.test(text)) notes.push('French offered in Settings');
    if (!/ZIGi · Your Personal AI Companion/.test(text)) notes.push('ZIGi section name missing');
    await page.getByRole('link', {name: /^Help: install on iPhone/}).click(); await page.waitForURL('**/app/help');
  });
}
await b.close();
console.log(JSON.stringify(results, null, 1));
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length} journeys, ${results.length - bad.length} clean, ${bad.length} with a note`);
