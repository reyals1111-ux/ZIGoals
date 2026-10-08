import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test, type Page} from '@playwright/test';
import {askAndWait, cardsOf, EVENING, HOST, lastReply, MODEL, offlineAppApi, openChat, panel, REAL, record, seedReal, shownReply, slug, type UiRun} from './real-model';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {parseReply} from '../lib/ai/actions/parse';

/**
 * Session X-Local Part 6, owner addition 11: a meal photo through the real panel to a real local model that reads
 * images. The photos live outside the repository (ZIGI_PHOTOS points at the folder: one plate drawn by a script for
 * this run, three real photos that are public domain or CC0, their sources in the test document). Scored on what the
 * model recognised against what is in the photo, on items it invented, and on nutrients: an estimate may only sit on
 * an item that is on the plate, and what the model could not see stays unknown in its own words. Fictional data only.
 */
const PHOTOS_DIR = process.env.ZIGI_PHOTOS ?? '';
test.skip(!REAL || !MODEL || !PHOTOS_DIR, 'Only with ZIGI_REAL_MODEL=1, ZIGI_MODEL and ZIGI_PHOTOS set, on the owner\'s machines.');
test.describe.configure({timeout: 20 * 60_000});
const launcher = (page: Page) => page.locator('.ai-launcher-button');
type Item = {name: string; match: RegExp};
type PhotoCase = {file: string; source: string; meal: string; present: Item[]; absent: Item[]};
/** What a person sees in each photo (read by eye before the run), and what is plainly not there. */
const PHOTOS: PhotoCase[] = [
  {file: 'generated-breakfast-plate.jpg', source: 'drawn by a script for this run (fictional plate)', meal: 'breakfast',
    present: [{name: 'toast', match: /toast|bread|cracker|biscuit/i}, {name: 'fried egg', match: /egg/i}, {name: 'cherry tomatoes', match: /tomato/i}, {name: 'green leaves', match: /basil|leaf|leaves|herb|spinach|greens|lettuce|salad/i}, {name: 'coffee', match: /coffee|espresso|cup of|drink|beverage/i}],
    absent: [{name: 'pancakes', match: /pancake/i}, {name: 'meat', match: /sausage|bacon|ham|meat/i}, {name: 'rice', match: /\brice\b/i}, {name: 'fruit', match: /banana|apple|berr/i}]},
  {file: 'real-1-1600.jpg', source: 'Wikimedia Commons, Food-plate-morning-breakfast (CC0)', meal: 'breakfast',
    present: [{name: 'pancakes', match: /pancake|pikelet|crumpet|blini|flapjack|hotcake|drop scone/i}, {name: 'syrup', match: /syrup|honey|maple|sauce|caramel/i}],
    absent: [{name: 'egg', match: /\begg/i}, {name: 'meat', match: /bacon|sausage|ham|meat/i}, {name: 'toast', match: /toast|bread/i}, {name: 'fruit', match: /fruit|berr|banana/i}]},
  {file: 'real-2-1600.jpg', source: 'Wikimedia Commons, Full English breakfast - London, UK (CC0)', meal: 'breakfast',
    present: [{name: 'fried eggs', match: /egg/i}, {name: 'bacon', match: /bacon/i}, {name: 'sausage', match: /sausage/i}, {name: 'black pudding', match: /black pudding|blood sausage|pudding/i}, {name: 'hash brown', match: /hash ?brown|potato|r[öo]sti/i}, {name: 'baked beans', match: /bean/i}, {name: 'grilled tomato', match: /tomato/i}, {name: 'toast', match: /toast|bread/i}],
    absent: [{name: 'pancakes', match: /pancake/i}, {name: 'rice', match: /\brice\b/i}, {name: 'cereal', match: /cereal|oat|muesli|granola/i}, {name: 'fish', match: /fish|salmon|tuna/i}]},
  {file: 'real-3-1600.jpg', source: 'NCI Visuals Online, Good Food In Dishes (public domain)', meal: 'lunch',
    present: [{name: 'bread', match: /bread|toast|loaf/i}, {name: 'broccoli', match: /broccoli/i}, {name: 'pear', match: /\bpear/i}, {name: 'corn on the cob', match: /\bcorn|maize/i}, {name: 'bean salad', match: /bean|pepper/i}, {name: 'carrot sticks', match: /carrot/i}, {name: 'strawberries', match: /strawberr/i}, {name: 'brown rice', match: /\brice\b/i}, {name: 'cereal flakes', match: /cereal|flake|bran|muesli|granola|puffed|grains?\b/i}],
    absent: [{name: 'egg', match: /\begg/i}, {name: 'meat or fish', match: /bacon|sausage|chicken|beef|pork|meat|fish|salmon|tuna/i}, {name: 'pancakes', match: /pancake/i}, {name: 'coffee', match: /coffee/i}]},
];
type Food = {name: string; estimate?: {kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number; serving_g?: number; serving_ml?: number}};
/** The model's own hedge: an estimate named as one, or what it could not see or judge, in its words (read off the live replies). */
/** One card for the whole plate ("Full English breakfast", "fry-up") is a legitimate entry; it is on the plate by definition. */
const COMBINED = /breakfast|brunch|lunch|dinner|supper|plate|meal|fry.?up|platter|spread|mixed/i;
// Round 9 (ADR-017 S75): "I don't know how much oil was used, so I've kept servings and some nutrients out" hedges too.
const HEDGE = /estimat|guess|roughly|about|approximately|around|could not|couldn.t|cannot|can.t (?:see|tell|judge)|not sure|unsure|unclear|not (?:certain|clear)|hard to (?:tell|see|judge)|unknown|(?:don.t|do not|didn.t|did not) know|leav(?:e|ing) (?:it |that |them |any |every )?(?:value |amount )?out|(?:left|kept) (?:it |that |them |any |some |servings |values |amounts |and )*(?:\S+ ){0,3}?out\b/i;
const file = `photos-${slug(MODEL)}.json`;
for (const p of PHOTOS) {
  test(`${p.file} (${p.source})`, async ({page}, info) => {
    const path = join(PHOTOS_DIR, p.file);
    test.skip(!existsSync(path), `${path} is not there.`);
    await offlineAppApi(page);
    await page.clock.install({time: EVENING}); // the Showcase's own day, so lookups have records
    await seedReal(page);
    // The person's word that this model reads photos (the metadata path exists too; the word keeps the run independent of /api/show).
    await page.evaluate(([key, model]) => { const raw = localStorage.getItem(key); const options = raw ? JSON.parse(raw) as Record<string, unknown> : {version: 1}; options.visionDeclared = {[`local:${model}`]: true}; localStorage.setItem(key, JSON.stringify(options)); }, [AI_OPTIONS_KEY, MODEL] as const);
    await page.goto('/app/health');
    await openChat(page);
    await panel(page).locator('input[type="file"]').setInputFiles(path);
    const chip = panel(page).getByRole('group', {name: 'Meal photo attached'});
    await expect(chip).toBeVisible({timeout: 20_000});
    const ask = `What is on this plate? Log it as ${p.meal}.`;
    const run: UiRun & {photo: string; recognised: string[]; missed: string[]; invented: string[]; foods: Food[]; hedged: boolean} = {id: `photo:${p.file}`, model: MODEL, host: HOST, project: info.project.name, page: '/app/health', ask, reply: '', cards: [], tools: [], ms: 0, score: null, error: null, at: new Date().toISOString(), photo: p.file, recognised: [], missed: [], invented: [], foods: [], hedged: false};
    try {
      const {ms} = await askAndWait(page, ask); run.ms = ms;
      const stored = await lastReply(page); run.reply = stored.text; run.tools = stored.tools; run.cards = await cardsOf(page);
      const parsed = parseReply(stored.text);
      const foods: Food[] = parsed.proposals.flatMap(a => a.kind === 'log-food' ? [{name: a.name, estimate: a.estimate}] : []);
      run.foods = foods;
      const words = `${parsed.text}\n${foods.map(f => f.name).join('\n')}`;
      run.recognised = p.present.filter(i => i.match.test(words)).map(i => i.name);
      run.missed = p.present.filter(i => !i.match.test(words)).map(i => i.name);
      run.invented = p.absent.filter(i => foods.some(f => i.match.test(f.name))).map(i => i.name);
      const unseen = foods.filter(f => !p.present.some(i => i.match.test(f.name)) && !COMBINED.test(f.name));
      const nutrientsOnUnseen = unseen.filter(f => f.estimate && ['kcal', 'protein_g', 'carbs_g', 'fat_g'].some(k => (f.estimate as Record<string, unknown>)[k] !== undefined));
      run.hedged = HEDGE.test(parsed.text);
      const shown = await shownReply(page);
      const checks: {name: string; pass: boolean; detail?: string}[] = [
        {name: 'replied', pass: run.reply.trim().length > 0},
        {name: 'nothing raw shown', pass: !/zigoals-action|⟦zigi:|\[\[zigi:/.test(shown)},
        {name: 'the photo went with the message, not kept', pass: await panel(page).locator('.ai-turn-attachment').count() === 1},
        {name: 'recognised at least half of the plate', pass: run.recognised.length * 2 >= p.present.length, detail: `${run.recognised.length}/${p.present.length}: ${run.recognised.join(', ')}; missed ${run.missed.join(', ') || 'none'}`},
        {name: 'no card for something that is not there', pass: run.invented.length === 0, detail: run.invented.join(', ') || 'none'},
        {name: 'no nutrients on an item not on the plate', pass: nutrientsOnUnseen.length === 0, detail: nutrientsOnUnseen.map(f => f.name).join(', ') || 'none'},
        {name: 'estimates named as estimates, or what it could not see said', pass: run.hedged || foods.every(f => !f.estimate)},
      ];
      if (foods.length && run.cards.some(c => c.kind === 'log-food')) {
        const first = panel(page).locator('.ai-turn-assistant').last().locator('.ai-card[data-kind="log-food"]').first();
        checks.push({name: 'the card says it is estimated from a photo', pass: (await first.locator('.ai-card-badge').first().textContent()) === 'Estimated by your AI from a photo'});
        await first.getByRole('button', {name: 'Add', exact: true}).click();
        await expect(first).toHaveClass(/ai-card-added/);
        const state = await launcher(page).getAttribute('data-state');
        checks.push({name: 'success after the add', pass: state === 'success' || state === 'celebrate' || state === 'proud', detail: state ?? 'none'});
      } else checks.push({name: 'a log-food card for the plate', pass: false, detail: run.cards.map(c => c.kind).join(', ') || 'no card'});
      run.score = {pass: checks.every(c => c.pass), checks, cards: run.cards.length, rejected: parsed.rejected.length, hint: null, refused: false, numbers: 0};
    } catch (error) { run.error = error instanceof Error ? error.message.slice(0, 300) : String(error); }
    record(info, file, run);
    info.annotations.push({type: 'photo', description: `${p.file}: recognised ${run.recognised.join(', ') || 'nothing'}; invented ${run.invented.join(', ') || 'nothing'}; ${run.foods.length} food card(s)`});
    if (run.error) throw new Error(run.error);
  });
}
