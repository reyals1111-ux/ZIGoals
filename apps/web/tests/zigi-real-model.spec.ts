import {expect, test} from '@playwright/test';
import {CORPUS, IMPORTANT, type ModelCase} from '../lib/ai/evals/corpus';
import {askAndWait, cardsOf, HOST, lastReply, MODEL, openChat, PAGE_PATHS, panel, REAL, record, scoreUi, seedReal, slug, type UiRun} from './real-model';

/**
 * Session X-Local Part 6c, UI-driven cases through the real panel against a real local model (owner addition 2:
 * ≥150 cases per RTX 5090 model, ≥60 on the Mac model). Each case opens its page, asks in the composer, waits for the
 * reply, reads the cards as shown and the stored reply as the device kept it, and scores the same checks as the Node
 * harness except facts and hints (those are the harness's). Every run is appended to ZIGI_OUT/ui-<model>.json.
 *
 *   ZIGI_REAL_MODEL=1 ZIGI_MODEL=gemma4:12b ZIGI_HOST="RTX 5090" ZIGI_MODEL_BASE=http://127.0.0.1:11435 ZIGI_UI_CASES=150 \
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3102 pnpm exec playwright test tests/zigi-real-model.spec.ts --project=desktop --workers=1
 */
test.skip(!REAL || !MODEL, 'Only with ZIGI_REAL_MODEL=1 and ZIGI_MODEL set, on the owner\'s machines.');
test.describe.configure({mode: 'serial', timeout: 15 * 60_000});
const WANT = Number(process.env.ZIGI_UI_CASES ?? '150'), OFFSET = Number(process.env.ZIGI_UI_OFFSET ?? '0');
/** The important cases first, then the rest of the corpus in order; multi-turn cases are the conversation spec's. */
const single = (c: ModelCase) => !c.turns?.length && !c.sentinels && c.kind !== 'local-first';
const ordered = [...IMPORTANT.filter(single), ...CORPUS.filter(c => single(c) && !c.important)];
const chosen = ordered.slice(OFFSET, OFFSET + WANT);
const file = `ui-${slug(MODEL)}.json`;

for (const c of chosen) {
  test(`${c.id} [${c.area}/${c.kind}/${c.lang}]`, async ({page}, info) => {
    await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
    await seedReal(page, {health: c.health !== 'closed'});
    await page.goto(PAGE_PATHS[c.area]);
    await openChat(page);
    if (c.mode === 'log') await panel(page).getByRole('button', {name: 'Log mode'}).click();
    if (c.mode === 'plan') await panel(page).getByRole('button', {name: 'Plan mode'}).click().catch(() => undefined);
    const run: UiRun = {id: c.id, model: MODEL, host: HOST, project: info.project.name, page: c.area, ask: c.ask, reply: '', cards: [], tools: [], ms: 0, score: null, error: null, at: new Date().toISOString()};
    try {
      const {ms} = await askAndWait(page, c.ask, {log: c.mode === 'log'});
      run.ms = ms;
      const stored = await lastReply(page);
      run.reply = stored.text; run.tools = stored.tools; run.cards = await cardsOf(page);
      run.score = scoreUi(c.expect, stored.text, stored.tools);
      // The interface never shows a raw block or a marker, whatever the model sent.
      const shown = await panel(page).locator('.ai-turn-assistant').last().innerText();
      expect(shown).not.toContain('zigoals-action'); expect(shown).not.toContain('⟦zigi:'); expect(shown).not.toContain('[[zigi:');
    } catch (error) { run.error = error instanceof Error ? error.message.slice(0, 500) : String(error); }
    record(info, file, run);
    if (run.error) throw new Error(run.error);
    // The score is recorded, never asserted: a model's miss is a finding for the test document, not a red build.
    test.info().annotations.push({type: 'score', description: run.score ? run.score.checks.map(ch => `${ch.pass ? '✓' : '✗'} ${ch.name}`).join(' · ') : 'none'});
  });
}
