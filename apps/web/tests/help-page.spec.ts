import {LOGO_INTRO_KEY} from '../components/logo-intro-decision';
import {expect, test} from '@playwright/test';

// Help (Session L): structure, wording that follows the owner principle, keyboard, motion, phones, and no requests or
// writes on view.
const SECTIONS: [id: string, title: string][] = [
  ['getting-started', 'Three small first steps'], ['data-and-sync', 'Where your data lives'], ['recovery-secret', 'The one thing to keep safe'],
  ['install', 'Install ZIGoals on your iPhone'], ['backups', 'An extra safety net, never a chore'], ['your-ai', 'Your own AI, page by page'], ['questions', 'Good to know about the Alpha'],
  // Session W Part 24 (deliberate): the release's own topic, before the earlier "What's new".
  ['whole-life', 'Sleep, mind, music, chess, links and more'],
  // Session AA-Local (deliberate): the release's own topic, before the earlier ones.
  // Session AF Gate C (design critique; deliberate, as strict): "Best in class" left the title, the exact new title is checked.
  ['aa', 'Deeper Habits and Health, and ZIGi knows every bit of it'],
  // Session AB-Cloud (ADR-023, deliberate): this release's topic, after AA-Local's.
  ['ab', 'Everything travels with you, and nothing is lost'],
  // Session AB-Design (ADR-024, deliberate; the second merger): this release's topic, after AB-Cloud's.
  ['abd', 'Goals, Habits & Health = Wealth, in one calm look'],
  // Session AC (ADR-025, deliberate): this release's topic, after AB-Design's.
  ['ac', 'Each thing once, and a calmer page'],
  // Session AD (ADR-026, deliberate): this release's topic, after AC's.
  ['ad', 'The final look, and three ways to see it'],
  // Session AE (ADR-027, deliberate): this release's topic, after AD's.
  ['ae', 'One scene from top to end, and three finished looks'],
  // Session AF (ADR-028, deliberate): this release's topic, after AE's.
  ['af', 'Earn, stake in your own wallet, and your day as one path'], ['whats-new-alpha', 'New in this Alpha, in your own words'],
  // Session X Part 11 (deliberate): Known limitations, before Send feedback.
  ['known-limitations', 'What the Alpha can’t do yet'], ['feedback', 'Tell us what you think'],
];
// Session AF Gate C (design critique; deliberate, as strict): the five release names that read like codenames are topic
// names now ("New: one 4-in-1 look", "New: polish", "New: the final look", "New: stunning, finished", "New: wealth,
// unlocked"); every label is still checked exactly, in order, with its link.
const TOPICS = ['Getting started', 'Your data and sync', 'Your recovery secret', 'Install on iPhone', 'Optional backups', 'ZIGi · Your Personal AI Companion', 'Questions', 'New: your whole life', 'New: habits, health and the game layer', 'New: sync, restore and Point & tell', 'New: one look for every page', 'New: calmer pages', 'New: Light, Nebula and Dark', 'New: Today’s scene, the sidebar and wallets', 'New: Earn, staking and the Checklist', 'What\'s new', 'Known limitations', 'Send feedback'];

// Session AD (ADR-026, deliberate): sixteen topics (was fifteen), AD's after AC's.
// Session AE (ADR-027, deliberate): seventeen topics, AE's after AD's.
// Session AF (ADR-028, deliberate): eighteen topics, AF's after AE's.
test('Help has one title and eighteen topics, listed before them, each linking to its section', async ({page}) => {
  await page.goto('/app/help');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Help.');
  const nav = page.getByRole('navigation', {name: 'Help topics'}), topics = nav.getByRole('link');
  // Session AF Gate C (design critique; deliberate, stronger): on a phone the first six topics show with "All topics"
  // under them (the eighteen chips had filled about one and a half screens before the first answer); one tap shows the
  // rest and moves focus to the first of them. Computers and tablets show all eighteen and no such button. The checks
  // below then run on the full list everywhere, as before.
  const all = nav.getByRole('button', {name: 'All topics', exact: true});
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await expect(topics).toHaveText(TOPICS.slice(0, 6));
    await expect(all).toBeVisible();
    const firstSection = page.getByRole('region', {name: 'Three small first steps', exact: true});
    expect((await firstSection.boundingBox())!.y - (await nav.boundingBox())!.y).toBeLessThan(320);
    await all.click();
    await expect(all).toHaveCount(0);
    await expect(topics.nth(6)).toBeFocused();
  } else await expect(all).toBeHidden();
  await expect(topics).toHaveText(TOPICS);
  for (const [index, [id, title]] of SECTIONS.entries()) {
    await expect(page.getByRole('region', {name: title, exact: true})).toBeVisible();
    await expect(topics.nth(index)).toHaveAttribute('href', `#${id}`);
  }
  // The topic list stays above the first section at every size.
  const firstSection = page.getByRole('region', {name: 'Three small first steps', exact: true});
  expect((await nav.boundingBox())!.y).toBeLessThan((await firstSection.boundingBox())!.y);
  await topics.nth(6).click();
  await expect(page).toHaveURL(/#questions$/);
});

test("What's new (Session P): eleven linkable questions; a hash opens its answer and writes nothing", async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'New in this Alpha, in your own words', exact: true});
  const questions = ['Can a habit tick itself off from my Health journal?', 'What is a health goal, and where does its progress come from?', 'I’m away for a week. Will my streak break?', 'What is the weekly review?', 'How does the fasting timer work, and is it right for me?', 'What are the “Something you might notice” cards?', 'Can I import a CSV from another app?', 'Can I get all my data out?', 'What can I type into Quick add?', 'Can a reminder reach me when ZIGoals is closed?', 'What is the Guide, and what does it read?'];
  for (const question of questions) await expect(section.getByText(question, {exact: true})).toBeVisible();
  await expect(section.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  await page.goto('/app/help#help-imports');
  const imports = page.locator('#help-imports');
  await expect(imports).toHaveAttribute('open', '');
  await expect(imports).toContainText('The file is read on this device and never uploaded');
  await expect(section.locator('details[open]')).toHaveCount(1);
  await page.evaluate(() => { window.location.hash = '#help-fasting'; });
  await expect(page.locator('#help-fasting')).toHaveAttribute('open', '');
  await expect(page.locator('#help-fasting')).toContainText('talk to a doctor first');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

test('the wording follows the owner principle: sync once, backups optional, login is not recovery', async ({page}) => {
  await page.goto('/app/help');
  const data = page.getByRole('region', {name: 'Where your data lives'});
  await expect(data).toContainText('turn on encrypted sync once');
  await expect(data).toContainText('No backups or transfers by hand.');
  await expect(data).toContainText('It cannot unlock your data: only your recovery secret can.');
  await expect(data).toContainText('Browser storage is not encrypted');
  await expect(page.getByRole('region', {name: 'The one thing to keep safe'})).toContainText('Keep it in a password manager');
  await expect(page.getByRole('region', {name: 'An extra safety net, never a chore'})).toContainText('You don’t need backups to stay up to date');
  const questions = page.getByRole('region', {name: 'Good to know about the Alpha'});
  for (const question of ['Is any of this real money?', 'Are my Goals on the blockchain?', 'Where do prices come from?', 'Can I look up a food by its barcode?'])
    await expect(questions.getByText(question, {exact: true})).toBeVisible();
  // True whether or not the providers are switched on: what is sent, and what still works without them.
  await questions.getByText('Where do prices come from?', {exact: true}).click();
  await expect(questions.getByText('ZIGoals asks only about the public assets you choose, never your amounts, Goals or wallet.')).toBeVisible();
  await questions.getByText('Can I look up a food by its barcode?', {exact: true}).click();
  await expect(questions.getByText('Only the barcode number is sent, through ZIGoals to Open Food Facts; the camera picture stays on your device.')).toBeVisible();
});

test('questions open and close from the keyboard', async ({page}) => {
  await page.goto('/app/help');
  const answer = page.getByText('Automatic prices come from CoinGecko and are labelled with their source.', {exact: false});
  await expect(answer).toBeHidden();
  // Focus must have landed before Enter is pressed: CI once saw the key go nowhere (PR #70, 2026-10-04, phone project).
  const question = page.getByText('Where do prices come from?', {exact: true});
  // Session U Part 4: CI twice saw "inactive" for 5 s (runs 37217545365 desktop, 37245262048 phone); never locally (60 of
  // 60 runs, also under CPU load). toBeFocused needs the element to be the active one AND document.hasFocus() (Playwright
  // 1.63, _activelyFocused): a page without window focus reads "inactive" and its keys can go nowhere, which is what CI
  // first saw. So the page is brought to the front before focusing. If it happens again, the report names the element
  // that held the focus and whether the document had it.
  await page.bringToFront();
  // The shell keeps the workspace hidden until the account and preferences load, and a hidden element drops focus()
  // silently (STATUS "Known CI intermittents", measured on c46c079 and again in CI on e390ae6): wait for the reveal.
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await question.focus(); await expect(question).toBeFocused().catch(async error => {
    const holder = await page.evaluate(() => { const a = document.activeElement; return `${a ? `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${typeof a.className === 'string' && a.className ? '.' + a.className.trim().split(/\s+/).join('.') : ''}` : 'none'} hasFocus=${document.hasFocus()} visibility=${document.visibilityState}`; });
    test.info().annotations.push({type: 'focus-holder', description: holder}); console.log('focus-holder', holder); throw error;
  });
  await page.keyboard.press('Enter');await expect(answer).toBeVisible();
  await page.keyboard.press('Enter');await expect(answer).toBeHidden();
});

test('feedback opens an email to the Alpha address with a short template, and security has its own address', async ({page}) => {
  await page.goto('/app/help');
  const href = (await page.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true}).getAttribute('href'))!;
  expect(href).toMatch(/^mailto:contact@zigoals\.app\?subject=ZIGoals%20Alpha%20feedback&body=/);
  const body = decodeURIComponent(href.split('&body=')[1] ?? '');
  for (const line of ['What happened:', 'What you expected:', 'Device and browser:', 'App version: ', 'leave out codes, your recovery secret']) expect(body).toContain(line);
  // Session AD (deliberate; ADR-026): the footer's "Private security contact" moved here by name, so the link is named for it. As strict: the same private address.
  await expect(page.getByRole('link', {name: 'Private security contact: hello@zigoals.app', exact: true})).toHaveAttribute('href', 'mailto:hello@zigoals.app');
});

test('viewing Help asks no server and writes nothing', async ({page}) => {
  // Session W Part 24: 61 answers are opened one by one (19 new); on the phone project, with tracing, that takes about a
  // minute, so the test has two. Every check below is unchanged.
  test.setTimeout(120_000);
  // Reduced motion keeps the shell's once-per-session logo intro (and its sessionStorage flag) out of the comparison,
  // and so does its session flag, set up front (Session P, as in install-guide.spec.ts: a media emulation the browser
  // applies late once let the intro write that flag under reduced motion in CI).
  // The baseline is a static same-origin file, so no other page's requests can land in the list.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.addInitScript(key => { try { sessionStorage.setItem(key, 'played'); } catch { /* storage denied */ } }, LOGO_INTRO_KEY);
  await page.goto('/robots.txt');
  const snapshot = () => page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}}));
  const before = await snapshot(), requests: string[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/')) requests.push(url.pathname); });
  await page.goto('/app/help');await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-logo-intro', /^(reduced-motion|played|hidden)$/);
  for (const summary of await page.locator('.help-question > summary').all()) await summary.click();
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  expect(await snapshot()).toEqual(before);
});

test('the title sweeps once, and stays still under reduced motion', async ({page}) => {
  await page.goto('/app/help');
  await expect(page.locator('#help-title .nebula-flow')).toHaveAttribute('data-entrance', 'once');
  await page.emulateMedia({reducedMotion: 'reduce'});await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator('#help-title .nebula-flow')).not.toHaveAttribute('data-entrance', 'once');
});

for (const width of [320, 390]) test(`Help fits a ${width} px phone, with links, buttons and questions at least 44 px tall`, async ({page}) => {
  await page.setViewportSize({width, height: 844});
  await page.goto('/app/help');await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  // Session AF Gate C (design critique; deliberate, stronger): a link inside a sentence is part of the sentence — inline
  // text with words beside it, the WCAG 2.5.8 inline exception that the layout audit and the touch-target specs already
  // apply — so it is not held to 44 px here either; every other link, button and question still is. In its place each
  // in-sentence link is checked to be just that: inline, starting on the same line as an opening "(" before it (the "("
  // had been stranded at a line's end), and no line of it taller than its sentence's own line height.
  const {small, inline, stranded, tall} = await page.locator('.help-page').evaluate(root => {
    const out = {small: [] as string[], inline: 0, stranded: [] as string[], tall: [] as string[]};
    for (const el of root.querySelectorAll<HTMLElement>('a, button, summary')) {
      const box = el.getBoundingClientRect(), name = el.textContent?.trim() ?? '';
      if (!(box.width > 0)) continue;
      const parent = el.parentElement!, words = [...parent.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim());
      if (el.tagName === 'A' && words && getComputedStyle(el).display === 'inline') {
        out.inline++;
        const line = parseFloat(getComputedStyle(parent).lineHeight), first = el.getClientRects()[0]!;
        if ([...el.getClientRects()].some(r => r.height > line + 1)) out.tall.push(name);
        const before = el.previousSibling;
        if (before?.nodeType === 3 && before.textContent!.endsWith('(')) {
          const range = document.createRange(); range.setStart(before, before.textContent!.length - 1); range.setEnd(before, before.textContent!.length);
          if (Math.abs(range.getBoundingClientRect().top - first.top) > 4) out.stranded.push(name);
        }
        continue;
      }
      if (box.height < 44) out.small.push(name);
    }
    return out;
  });
  expect(small).toEqual([]);
  // Gate C test audit (equal strength restored): the exemption covers exactly the in-sentence links Help has today, so a
  // standalone link placed after a label cannot slip out of the 44 px rule unnoticed (a new in-sentence link moves this).
  // Session AI (MO4, 12f444dd): the data answer's "Privacy" and "Terms" links are two new in-sentence links (37 → 39).
  expect(inline).toBe(39);
  expect(stranded).toEqual([]);
  expect(tall).toEqual([]);
});

test('at phone width the top bar names Help and steps back to Settings', async ({page}) => {
  // Any window narrower than 768 px gets the phone layout, so both projects run this.
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/help');await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('.phone-title')).toHaveText('Help');
  const back = page.getByRole('link', {name: 'Back to Settings', exact: true});
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

// Session W Part 24: every new feature has a linkable answer under "New: your whole life"; a hash opens it.
test('New: your whole life: twenty linkable questions; a hash opens its answer and writes nothing', async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'Sleep, mind, music, chess, links and more', exact: true});
  const ids = ['w-pages', 'w-welcome', 'w-sleep', 'w-meditation', 'w-sounds', 'w-import', 'w-devices', 'w-quick', 'w-habits', 'w-goals', 'w-wealth', 'w-wrapup', 'w-chess', 'w-portfolio', 'w-links', 'w-music', 'w-signout', 'z-step-up', 'w-newer-section', 'w-web-limits'];
  await expect(section.locator('details.help-question')).toHaveCount(ids.length);
  for (const id of ids) await expect(section.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(section.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  await page.goto('/app/help#help-w-sleep');
  const sleep = page.locator('#help-w-sleep');
  await expect(sleep).toHaveAttribute('open', '');
  await expect(sleep).toContainText('Sleep debt is, for each logged night of the last 7 days, your goal minus the time you slept');
  await expect(sleep).toContainText('This is not medical advice');
  await page.goto('/app/help#help-w-music');
  // Session AF Gate C (design critique; deliberate, as strict): plain words for Spotify's limit, the same fact (five accounts).
  await expect(page.locator('#help-w-music')).toContainText('for now only up to five invited accounts can connect');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session Y (ADR-018 Y40): this release's four answers sit under "Good to know about the Alpha", each linkable from What's new.
test('Session Y: four linkable answers; a hash opens each and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'Good to know about the Alpha', exact: true});
  const answers: [string, string][] = [
    ['y-vacation', 'it removes those planned skips from today on'],
    ['y-minus', 'never goes below zero'],
    ['y-unit', 'while nothing recorded counts in that unit yet'],
    ['y-sync', 'Health sync stays off in this tab until you tick'],
  ];
  for (const [id] of answers) await expect(section.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(section.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, text] of answers) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`), id).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`), id).toContainText(text);
  }
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session Z-Cloud (ADR-019): this release's answers, each linkable from What's new; the voice answer no longer says
// read-aloud is off by default, and nothing is written on view.
test('Session Z-Cloud: the new answers open from a hash, the voice answer follows Part 3, and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  const questions = page.getByRole('region', {name: 'Good to know about the Alpha', exact: true}), ai = page.getByRole('region', {name: 'Your own AI, page by page', exact: true});
  const answers: [string, string][] = [
    ['z-delete-habit', 'Its name, notes and every check-in go, on every device you sync'],
    ['z-status', 'Status & wallet'], // Session AB-Design: the answer follows the notice and the sheet
    ['z-alpha', 'Practice money (no real value) · Public Alpha:'],
    ['z-about', 'Everything this Alpha says about itself, in one place'], // Session AC: the footer's facts, in Help
    ['z-have', 'All, Accounts, Debts, Assets, each asset class and Needs attention'], // Session AC: one holdings list
    ['z-units', 'your records stay in kilograms and millilitres'],
    ['z-more', 'Today is one centred column when nothing sits beside it'],
  ];
  for (const [id] of answers) await expect(questions.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(ai.locator('#help-z-panel > summary')).toHaveText('What changed in ZIGi’s panel?');
  await expect(page.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, text] of [...answers, ['z-panel', 'Nothing in the panel wraps onto a second line'], ['your-ai-voice', 'in English or Dutch, wherever your browser offers speech recognition, with or without an AI connected']] as [string, string][]) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`), id).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`), id).toContainText(text);
  }
  await expect(page.locator('#help-your-ai-voice')).not.toContainText('off by default');
  await expect(page.locator('#help-your-ai-voice')).toContainText('never between 22:00 and 08:00');
  await expect(page.locator('#help-your-ai-voice')).not.toContainText(/French|Fran[cç]ais/);
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session AA-Cloud (ADR-021): this release's answers, each linkable from What's new; the goal extras say they travel in
// encrypted sync (Session AB-Cloud Part 2, ADR-023 C12), the Home Screen answer says what Safari on iPhone does not offer, and nothing is written on view.
test('Session AA-Cloud: the new answers open from a hash, say what stays on this device, and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  const questions = page.getByRole('region', {name: 'Good to know about the Alpha', exact: true});
  const answers: [string, string][] = [
    ['aa-order', 'If you arranged a page yourself, your own order is kept'],
    ['aa-goals', 'travel in your encrypted sync'],
    ['aa-forecast', 'It needs at least 3 recorded steps over 14 days or more'],
    ['aa-calculator', 'Every result is an estimate: returns are not guaranteed.'],
    ['aa-search', 'Your last 8 searches are kept on this device'],
    ['aa-review', 'a pairing is not a cause'],
    ['aa-data', 'Looking changes nothing.'],
    ['aa-home-screen', 'Safari on iPhone and iPad offers neither the shortcuts nor the share sheet entry for web apps'],
    ['aa-more', 'kept on this device'],
  ];
  for (const [id] of answers) await expect(questions.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(page.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, text] of answers) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`), id).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`), id).toContainText(text);
  }
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session AC (ADR-025): this release's answers open from their hash; the facts moved from the footer are named in Help.
test('Session AC: the polish answers open from a hash, and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  // As above: every answer is listed and closed once the page has loaded (the workspace shows after its stores are read).
  for (const id of ['ac-habits', 'ac-sky', 'ac-footer', 'ac-today', 'ac-wealth', 'ac-water', 'ac-vision', 'ac-more']) await expect(page.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(page.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, words] of [['ac-habits', 'last 28 days'], ['ac-sky', 'the same with reduced motion or Motion Off'], ['ac-footer', 'Every page now ends with the footer banner'] /* Session AD (ADR-026, deliberate): the link columns went; same check */, ['ac-today', 'Show card'], ['ac-wealth', 'All, Accounts, Debts, Assets'], ['ac-water', 'each with Undo'], ['ac-vision', 'kept on this device only'], ['ac-more', 'Reminders · ZIGoals Alpha']] as const) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`)).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`)).toContainText(words);
  }
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session AD (ADR-026): this release's answers open from their hash, each saying what the code does; nothing is written.
test('Session AD: the final-look answers open from a hash, and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  // As above: every answer is listed and closed once the page has loaded (the workspace shows after its stores are read).
  const ids = ['ad-themes', 'ad-banner', 'ad-hero', 'ad-dates', 'ad-sync-status', 'ad-restore', 'ad-zigi'];
  await expect(page.getByRole('region', {name: 'The final look, and three ways to see it', exact: true}).locator('details.help-question')).toHaveCount(ids.length);
  for (const id of ids) await expect(page.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(page.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, words] of [['ad-themes', 'is never synced'], ['ad-banner', 'Goals · Habits · Health'], ['ad-hero', 'When you fold the hero, none of it shows'], ['ad-dates', '“17 Oct 2026” or “Oct 17, 2026”'], ['ad-sync-status', 'every 15 minutes while the page stays open and visible'], ['ad-restore', 'Stop restoring'], ['ad-zigi', '25 states']] as const) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`), id).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`), id).toContainText(words);
  }
  // The banner's answer points to where the footer's links live now.
  await expect(page.locator('#help-ad-banner').getByRole('link', {name: 'Send feedback', exact: true})).toHaveAttribute('href', '#feedback');
  await expect(page.locator('#help-ad-banner').getByRole('link', {name: 'Settings', exact: true})).toHaveAttribute('href', '/app/settings');
  await expect(page.locator('#help-ad-zigi').getByRole('link', {name: 'Meet ZIGi', exact: true})).toHaveAttribute('href', '/app/zigi');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session AE (ADR-027): this release's answers open from their hash, each saying what the code does; Light and Dark are
// finished, so neither this section nor AD's themes answer calls them previews; the wallet answers keep the Alpha's
// safety facts (read-only, nothing signed or sent, on this device only); nothing is written.
test('Session AE: the stunning-finished answers open from a hash, and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  // As above: every answer is listed and closed once the page has loaded (the workspace shows after its stores are read).
  const ids = ['ae-scene', 'ae-finale', 'ae-themes', 'ae-sidebar', 'ae-header-art', 'ae-wallets', 'ae-wallet-card', 'ae-habits', 'ae-music'];
  const section = page.getByRole('region', {name: 'One scene from top to end, and three finished looks', exact: true});
  await expect(section.locator('details.help-question')).toHaveCount(ids.length);
  for (const id of ids) await expect(page.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(page.locator('details[open]')).toHaveCount(0);
  await expect(section).not.toContainText(/preview/i);
  await expect(page.locator('#help-ad-themes')).not.toContainText(/preview/i);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, words] of [['ae-scene', 'painted straight onto the starfield'], ['ae-finale', 'It plays once per visit and then rests; with reduced motion or Motion Off it is simply there, still'], ['ae-themes', 'its button now shows a small ZG mark'], ['ae-sidebar', 'a near-black sky with dimmer stars in Dark'], ['ae-header-art', 'Goals a lotus opening in a target'], ['ae-wallets', 'Nothing is signed or sent, and a linked address never becomes the app’s wallet'], ['ae-wallet-card', 'testnet ZIG have no market value'], ['ae-habits', 'Routines, together with Your stacks, is its own block'], ['ae-music', 'It is ZIGi’s twin now']] as const) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`), id).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`), id).toContainText(words);
  }
  // The wallet answer keeps the device-only, read-only facts.
  await expect(page.locator('#help-ae-wallets')).toContainText('read-only');
  await expect(page.locator('#help-ae-wallets')).toContainText('Linked addresses stay on this device: they are in Export everything, never synced and never restored from a backup');
  // The themes answer points to Settings → Appearance and to AD's answer, which now describes the finished looks.
  await page.goto('/app/help#help-ae-themes');
  await expect(page.locator('#help-ae-themes').getByRole('link', {name: 'Settings → Appearance', exact: true})).toHaveAttribute('href', '/app/settings#appearance');
  await page.locator('#help-ae-themes').getByRole('link', {name: 'What are Light, Nebula and Dark?', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ad-themes$/);
  await expect(page.locator('#help-ad-themes')).toHaveAttribute('open', '');
  // Session AF (ADR-028 H13, the Light redo; deliberate, as strict): the answer describes the redone Light.
  await expect(page.locator('#help-ad-themes')).toContainText('Nebula by day: a white page with a light colour mist and dark words');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

// Session AF (ADR-028): this release's answers open from their hash, each saying what the code does; the staking answer
// keeps the safety facts (your own wallet, a review screen first, ZIGoals never sees keys); the Earn answer says nothing is
// ranked or signed; the Checklist answers say what a tick writes and that the path stays on this device; nothing is written.
test('Session AF: the wealth-unlocked answers open from a hash, and nothing is written', async ({page}) => {
  await page.goto('/app/help');
  const ids = ['af-earn', 'af-staking', 'af-governance', 'af-practice-badges', 'af-start-here', 'af-academy', 'af-earn-dock', 'af-validator-alerts', 'af-wallets', 'af-add-money', 'af-goal-vaults', 'af-brief', 'af-zigi-checklist', 'af-plans', 'af-page-awareness', 'ai-what-sent', 'af-earn-coach', 'af-zigi-memory', 'af-universe', 'af-timeline', 'af-stories', 'af-checklist', 'af-checklist-star', 'af-checklist-tick', 'af-checklist-streak', 'ag-orbit', 'ag-polish', 'ag2-quick-add', 'ag2-planets', 'ag2-progress', 'ag2-celebration', 'af-checklist-timers', 'af-checklist-launcher'];
  const section = page.getByRole('region', {name: 'Earn, stake in your own wallet, and your day as one path', exact: true});
  await expect(section.locator('details.help-question')).toHaveCount(ids.length);
  for (const id of ids) await expect(page.locator(`#help-${id} > summary`), id).toBeVisible();
  await expect(page.locator('details[open]')).toHaveCount(0);
  await expect(section).not.toContainText(/partner/i);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  for (const [id, words] of [
    ['af-earn', 'ZIGoals never ranks them by rate, never holds your money and never signs for you'],
    ['af-staking', 'you sign it in Keplr. ZIGoals never sees your keys and sends nothing on its own'],
    ['af-governance', 'A vote is public and tied to your address forever, and the review screen says so before you sign'],
    ['af-practice-badges', 'ZIGoals never does this on the real network'],
    ['af-start-here', "Practice never ticks a real step"],
    ['af-academy', "a lesson you pass earns XP once"],
    ['af-earn-dock', "Phones have no extra floating button"],
    ['af-validator-alerts', "ZIGoals sends no notifications"],
    ['af-wallets', "Keplr stays the wallet that signs"],
    ['af-add-money', "ZIGoals never sees either and never holds the money"],
    ['af-goal-vaults', "Nothing moves and nothing is signed"],
    ['af-brief', "made on this device without an AI"],
    ['af-zigi-checklist', "nothing changes until you add it"],
    ['af-plans', "Forget removes a plan, not what you added"],
    ['af-page-awareness', "never a number"],
    ['af-earn-coach', "ZIGi never signs, sends or broadcasts anything"],
    ['af-zigi-memory', "Notes stay on this device"],
    ['af-universe', "Nothing is ever taken away"],
    ['af-timeline', "Times you move stay on this device"],
    ['af-stories', "never an amount, a price or a return"],
    ['af-checklist', 'It starts fresh at local midnight'],
    ['af-checklist-star', 'Edit path'],
    ['af-checklist-tick', 'Undo puts that record back exactly'],
    ['af-checklist-streak', 'Rest days (not scheduled, paused or skipped) are left out, never failed'],
    // Session AG (ADR-029): the redesign's answer; the Checklist adds no XP any more, and says so.
    ['ag-orbit', 'the Checklist no longer adds XP'],
    // (Session AG Polish, moved with its release: its answer joins this section and opens from its hash the same way.)
    ['ag-polish', 'once a day on this device'],
    // (Session AG Polish 2, ADR-031: its four answers join this section and open from their hashes the same way.)
    ['ag2-quick-add', 'once it has changed, Undo only takes it off your orbit and the habit stays on Habits'],
    ['ag2-planets', 'each next planet lights once everything in the orbit before it is done'],
    ['ag2-progress', 'A segment lights the moment you tick its item, even out of order'],
    ['ag2-celebration', 'you see its last frame at once'],
    ['af-checklist-timers', 'the whole night lands on Health'],
    ['af-checklist-launcher', 'Your path stays on this device: it is not synced yet'],
  ] as const) {
    await page.goto(`/app/help#help-${id}`);
    await expect(page.locator(`#help-${id}`), id).toHaveAttribute('open', '');
    await expect(page.locator(`#help-${id}`), id).toContainText(words);
  }
  // Known limitations point to the answers.
  const limits = page.getByRole('region', {name: 'What the Alpha can’t do yet', exact: true});
  await expect(limits.getByRole('link', {name: 'What is the Checklist?', exact: true})).toHaveAttribute('href', '#help-af-checklist');
  await expect(limits.getByRole('link', {name: 'What is the Earn page?', exact: true})).toHaveAttribute('href', '#help-af-earn');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});
