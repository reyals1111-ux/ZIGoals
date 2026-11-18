// Session AT (TIER 3 (verifier), ADR-043 D13, behaviour-preserving): the hosted verifier's stage 14, appended after every
// existing stage (no stage is renumbered). Browser-local and read-only towards every server: nothing is sent anywhere,
// no wallet, no model. The fresh ephemeral profile is changed only as a person's would be on screen (a box ticked and
// unticked, the Showcase loaded into this tab, two questions typed into NOVA).
//
// It checks what Sessions AO, AP, AR and AS shipped where a live check is possible:
//   1. Settings → Your app: "My day ends at" and "A day counts as done at" (AO, AP).
//   2. Settings → Send feedback: ticking "Add details about this device" shows the details, theme and screen among them,
//      in a box the person can edit; unticking hides them (AP). Nothing is sent: the button is a mailto link.
//   3. On the Showcase (Settings → Load Showcase Demo, this tab only): Habits' Perfect days (AO), the Tasks priority matrix
//      with its four boxes (AP, AR), Health → Activity's "Your orbits" (AP), the Bento layout switch on Goals (AP), and
//      NOVA's answers, on this device, to the owner's two questions of 17 Nov (AS): "how many habits did I miss this week"
//      says how many were missed and makes the ranked-misses widget; "wgat days did i forget to meditate this month" names
//      the days for Meditate this month, never the minutes, and makes the month calendar. The live day decides the figures,
//      so the stage checks each answer's shape and its widget, not the numbers.
// As the NOVA stage: `absent` (a part not found, or a step that could not be done) becomes one review reason, never PASS;
// `problems` (a part that is there but wrong) fails the stage. No import.meta and no top-level await (a browser spec loads it).
import assert from 'node:assert/strict';
import {openSettingsGroups} from './settings-open.mjs';

export const AT_QUESTIONS = Object.freeze({
  missed: 'how many habits did I miss this week',
  meditate: 'wgat days did i forget to meditate this month',
});
/** The answer's first words, as the exact layer writes them (lib/ai/local-answers/exact/habits.ts), whatever the day. */
export const AT_ANSWERS = Object.freeze({
  missed: /^(You missed (no habit|\d+ of \d+ habits) this week|\d+ of \d+ habits were not done on some day this week|Every habit was done on every due day this week)/,
  meditate: /^Meditate: .*this month/,
});
/** The widget each answer asks for (lib/nova/widgets/catalog.ts, Session AS). */
export const AT_WIDGETS = Object.freeze({missed: 'habit-misses', meditate: 'habit-missed-days'});
export const AT_SETTINGS_LABELS = Object.freeze(['My day ends at', 'A day counts as done at']);
export const AT_MATRIX_BOXES = Object.freeze(['do', 'plan', 'quick', 'later']);
const LOAD_MS = 20_000, APPEAR_MS = 6_000, ANSWER_MS = 15_000;

/** An answer's problem sentence, or null when it has the right shape. */
export function answerProblem(kind, text) {
  const plain = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!plain) return `NOVA's answer to "${AT_QUESTIONS[kind]}" is empty`;
  if (!AT_ANSWERS[kind].test(plain)) return `NOVA's answer to "${AT_QUESTIONS[kind]}" does not start as the exact layer writes it: "${plain.slice(0, 160)}"`;
  if (kind === 'meditate' && /\bminutes?\b/i.test(plain)) return `NOVA's answer to "${AT_QUESTIONS.meditate}" gives minutes instead of the days`;
  return null;
}
/** Feedback details' problem sentence, or null: the theme and the screen are among the lines the person can edit. */
export function detailsProblem(text) {
  const plain = String(text ?? '');
  const missing = ['Theme:', 'Screen:'].filter(line => !plain.includes(line));
  return missing.length ? `Send feedback's device details lack ${missing.join(' and ')}` : null;
}

const firstLine = error => String(error?.message ?? error).split('\n')[0].slice(0, 200);
const appears = (locator, ms = APPEAR_MS) => locator.first().waitFor({state: 'visible', timeout: ms}).then(() => true, () => false);
async function open(page, url) {
  await page.goto(url);
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: LOAD_MS});
}

async function at(page, {base, report}) {
  const out = report.at = {absent: [], problems: []};
  const part = async (label, run) => { try { await run(); } catch (error) { out.absent.push(`${label}: ${firstLine(error)}`); } };
  // The page first (every browser stage opens its own page first).
  await open(page, base + '/app/settings');
  await page.setViewportSize({width: 1280, height: 900});
  await openSettingsGroups(page);

  await part('1. Settings → Your app', async () => {
    for (const label of AT_SETTINGS_LABELS) if (!(await appears(page.getByText(label, {exact: true})))) out.absent.push(`Settings: "${label}" (not in this build)`);
  });
  await part('2. Send feedback', async () => {
    const box = page.getByRole('checkbox', {name: 'Add details about this device to the email'}).first();
    if (!(await appears(box))) { out.absent.push('Settings: Send feedback\'s "Add details about this device" (not in this build)'); return; }
    await box.check();
    const details = page.getByLabel('Device details: edit or delete anything before you send').first();
    if (!(await appears(details))) { out.problems.push('Send feedback: the device details did not show after ticking the box'); return; }
    const problem = detailsProblem(await details.inputValue());
    if (problem) out.problems.push(problem);
    await box.uncheck();
    if (await appears(details, 1_000)) out.problems.push('Send feedback: the device details stayed after unticking the box');
  });

  // The Showcase, in this tab only.
  let showcase = false;
  await part('3. the Showcase', async () => {
    const load = page.getByRole('button', {name: 'Load Showcase Demo', exact: true});
    if (!(await appears(load))) { out.absent.push('Settings: "Load Showcase Demo" (not found), so the Showcase checks were skipped'); return; }
    await load.click();
    await page.waitForURL('**/app', {timeout: LOAD_MS});
    showcase = true;
  });
  if (showcase) {
    await part('3a. Perfect days', async () => {
      await open(page, base + '/app/habits?view=perfect-days');
      if (!(await appears(page.locator('.habit-perfect'), LOAD_MS))) out.absent.push('Habits: Perfect days (?view=perfect-days) (not in this build)');
    });
    await part('3b. the priority matrix', async () => {
      await open(page, base + '/app/tasks?view=matrix');
      const boxes = page.locator('.tasks-matrix-box[data-quadrant]');
      if (!(await appears(boxes, LOAD_MS))) { out.absent.push('Tasks: the priority matrix (?view=matrix) (not in this build)'); return; }
      const shown = await boxes.evaluateAll(list => list.map(b => b.getAttribute('data-quadrant')));
      if (JSON.stringify(shown) !== JSON.stringify(AT_MATRIX_BOXES)) out.problems.push(`Tasks: the matrix's boxes are ${shown.join(', ')}, not ${AT_MATRIX_BOXES.join(', ')}`);
    });
    await part('3c. Your orbits', async () => {
      await open(page, base + '/app/health');
      const tab = page.getByRole('tab', {name: 'Activity', exact: true}).first();
      if (!(await appears(tab, LOAD_MS))) { out.absent.push('Health: the Activity tab (not found)'); return; }
      await tab.click();
      if (!(await appears(page.getByRole('region', {name: 'Your orbits'}), LOAD_MS))) out.absent.push('Health → Activity: "Your orbits" (not in this build)');
    });
    await part('3d. the Bento switch', async () => {
      await open(page, base + '/app/goals');
      const unlock = page.getByRole('button', {name: /^Unlock layout/}).first();
      if (!(await appears(unlock))) { out.absent.push('Goals: "Unlock layout" (not found)'); return; }
      await unlock.click();
      if (!(await appears(page.locator('.bento-switch [data-bento-choice="bento"]')))) out.absent.push('Goals: the List · Bento switch (not in this build)');
      const lock = page.getByRole('button', {name: /^Lock layout/}).first();
      if (await appears(lock, 1_000)) await lock.click();
    });
    await part('3e. NOVA\'s exact answers', async () => {
      await open(page, base + '/app/nova');
      const frame = page.locator('.nova-frame');
      if (!(await appears(frame, LOAD_MS))) { out.absent.push('NOVA: its frame (not found)'); return; }
      await frame.first().waitFor({state: 'attached', timeout: LOAD_MS});
      await page.waitForFunction(() => document.querySelector('.nova-frame')?.getAttribute('data-opening') === 'done', undefined, {timeout: LOAD_MS}).catch(() => undefined);
      const field = page.locator('.nova-command input').first();
      if (!(await appears(field))) { out.absent.push('NOVA: its command field (not found)'); return; }
      for (const kind of /** @type {const} */ (['missed', 'meditate'])) {
        await field.fill(AT_QUESTIONS[kind]); await field.press('Enter');
        const answer = page.locator('.ns-answer').first();
        await page.waitForFunction(re => { const t = document.querySelector('.ns-answer')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''; return new RegExp(re.source).test(t); }, {source: AT_ANSWERS[kind].source}, {timeout: ANSWER_MS}).catch(() => undefined);
        const problem = answerProblem(kind, await answer.textContent().catch(() => ''));
        if (problem) out.problems.push(problem);
        if (!(await appears(page.locator(`.nova-stage-area .nova-widget[data-widget="${AT_WIDGETS[kind]}"]`), ANSWER_MS))) out.problems.push(`NOVA: "${AT_QUESTIONS[kind]}" made no ${AT_WIDGETS[kind]} widget`);
      }
    });
  }
  if (out.absent.length && Array.isArray(report.review)) report.review.push(`stage 14 (AT): ${out.absent.length} part(s) could not be checked: ${out.absent.join('; ')}`.slice(0, 900));
  assert.deepEqual(out.problems, [], 'AT stage');
}

export const AT_STAGE = {number: 14, key: 'at', name: 'AT: day end and day goal settings, Send feedback details, Perfect days, the priority matrix, the orbits, Bento, and NOVA\'s exact answers', browser: true, liveOnly: false, reportsItself: false, run: at};
