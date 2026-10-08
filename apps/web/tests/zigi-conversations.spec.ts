import {expect, test} from '@playwright/test';
import {askAndWait, cardsOf, HOST, lastReply, MODEL, offlineAppApi, openChat, PAGE_PATHS, panel, REAL, record, seedReal, slug, type UiRun} from './real-model';

/**
 * Session X-Local Part 6c, multi-turn conversations with a real local model (owner addition 2: ≥50 across the matrix):
 * plan → correct → accept → undo. The person asks for a plan, corrects one detail, adds the corrected card, and the
 * stored record is checked field by field (accepted means correct, addition 4), then Undo puts the store back. The
 * model's wording is free; what is scored is that a card of the right kind arrived, that the correction changed the
 * right field, and that the record and its undo are exact. Runs are appended to ZIGI_OUT/conversations-<model>.json.
 */
test.skip(!REAL || !MODEL, 'Only with ZIGI_REAL_MODEL=1 and ZIGI_MODEL set, on the owner\'s machines.');
test.describe.configure({timeout: 20 * 60_000});
type Conversation = {id: string; area: keyof typeof PAGE_PATHS; plan: string; correct: string; kind: string; key: string; store: string; find: (snap: any, before: any) => any; expectField: (record: any) => void}; // eslint-disable-line @typescript-eslint/no-explicit-any
const HABITS = 'zigoals:habits:v1', HEALTH = 'zigoals:health:v1', PLATFORM = 'zigoals:platform:v1';
const newest = (list: any[], before: any[]) => list.find((x: any) => !before.some((b: any) => b.id === x.id)); // eslint-disable-line @typescript-eslint/no-explicit-any
const CONVERSATIONS: Conversation[] = [
  {id: 'stretch-15', area: 'habits', plan: 'Plan a new habit for me: stretching for 10 minutes every morning', correct: 'Make it 15 minutes, not 10', kind: 'create-habit', key: 'target', store: HABITS, find: (s, b) => newest(s.habits, b.habits), expectField: h => { expect(h.title.toLowerCase()).toContain('stretch'); expect(h.rules.at(-1).target).toBe(15); expect(h.rules.at(-1).measurement).toEqual({kind: 'duration', unit: 'minutes'}); }},
  {id: 'read-pages', area: 'habits', plan: 'I want to read 20 pages a day as a habit', correct: 'Actually 30 pages, in the evening', kind: 'create-habit', key: 'target', store: HABITS, find: (s, b) => newest(s.habits, b.habits), expectField: h => { expect(h.rules.at(-1).target).toBe(30); expect(h.timeOfDay).toBe('evening'); }},
  {id: 'walk-weekdays', area: 'habits', plan: 'New habit: a 30 minute walk on Monday, Wednesday and Friday', correct: 'Change that to Tuesday and Thursday', kind: 'create-habit', key: 'schedule', store: HABITS, find: (s, b) => newest(s.habits, b.habits), expectField: h => { expect(h.rules.at(-1).schedule).toEqual({kind: 'weekdays', days: [2, 4]}); }},
  {id: 'water-glasses', area: 'health', plan: 'Log two glasses of water', correct: 'Sorry, it was three glasses', kind: 'log-water', key: 'glasses', store: HEALTH, find: (s, b) => newest(s.daily.water, b.daily.water), expectField: w => { expect(w.amountMilli).toBe(750_000); }},
  {id: 'weight-kg', area: 'health', plan: 'I weigh 72 kg this morning', correct: 'Correction: 72.4 kg', kind: 'log-weight', key: 'value', store: HEALTH, find: s => s.weights.find((w: any) => w.date === '2026-09-20'), expectField: w => { expect(w.grams).toBe(72_400); }}, // eslint-disable-line @typescript-eslint/no-explicit-any
  {id: 'steps-count', area: 'health', plan: 'Add 6000 steps for today', correct: 'It was 6500 steps', kind: 'log-steps', key: 'steps', store: HEALTH, find: (s, b) => newest(s.activity, b.activity), expectField: a => { expect(a.steps).toBe(6500); }},
  {id: 'laptop-goal', area: 'goals', plan: 'Draft a goal: a new laptop, 1200 euros by June 2027', correct: 'Make the target 1500 euros', kind: 'create-goal', key: 'target', store: PLATFORM, find: (s, b) => newest(s.goals, b.goals), expectField: g => { expect(g.target).toBe('150000'); expect(g.asset).toBe('EUR'); expect(g.type).toBe('VALUE'); }},
  {id: 'goal-note', area: 'goals', plan: 'Add a note to my Emergency fund goal: reviewed the budget', correct: 'Change the note to: budget reviewed on Sunday', kind: 'add-goal-note', key: 'note', store: PLATFORM, find: s => s.goals.find((g: any) => g.name === 'Emergency fund'), expectField: g => { expect(g.notes.toLowerCase()).toContain('budget reviewed on sunday'); }}, // eslint-disable-line @typescript-eslint/no-explicit-any
  {id: 'meditation-minutes', area: 'health', plan: 'I meditated for 12 minutes just now', correct: 'It was 20 minutes', kind: 'log-meditation', key: 'minutes', store: HEALTH, find: (s, b) => newest(s.meditation?.sessions ?? [], b.meditation?.sessions ?? []), expectField: m => { expect(m.seconds).toBe(1200); }},
  {id: 'mood-evening', area: 'today', plan: 'Today felt okay, a 3', correct: 'No, make it a 4, it was good', kind: 'log-mood', key: 'mood', store: HEALTH, find: s => s.moods?.days?.['2026-09-20'], expectField: m => { expect(m.mood).toBe(4); }},
  {id: 'link-club', area: 'today', plan: 'Add a link to my running club: https://www.strava.com/clubs/zig', correct: 'Call it "Sunday runners" instead', kind: 'add-link', key: 'label', store: 'zigoals:settings:v1', find: (s, b) => newest(s.links?.items ?? [], b.links?.items ?? []), expectField: l => { expect(l.label).toBe('Sunday runners'); expect(l.url).toBe('https://www.strava.com/clubs/zig'); }},
  {id: 'groceries', area: 'health', plan: 'Put oat milk and spinach on my grocery list', correct: 'Add bananas as well', kind: 'grocery-item', key: 'items', store: HEALTH, find: s => s.daily.groceryNotes, expectField: notes => { expect(notes.toLowerCase()).toContain('banana'); }},
  {id: 'milestone', area: 'goals', plan: 'Add a milestone to my Japan adventure goal: flights booked', correct: 'Name it "Flights and rail pass booked"', kind: 'add-milestone', key: 'title', store: PLATFORM, find: (s, b) => newest(s.goals.find((g: any) => g.name === 'Japan adventure').milestones, b.goals.find((g: any) => g.name === 'Japan adventure').milestones), expectField: m => { expect(m.title.toLowerCase()).toContain('rail pass'); }}, // eslint-disable-line @typescript-eslint/no-explicit-any
  {id: 'reminder-time', area: 'habits', plan: 'Remind me to meditate at 7 in the morning', correct: 'Make it 7:30', kind: 'create-reminder', key: 'time', store: 'zigoals:reminders:v1', find: s => Object.values(s.habits)[0], expectField: r => { expect(r.time).toBe('07:30'); }},
  {id: 'challenge-days', area: 'habits', plan: 'Start a 14 day challenge on my Read habit', correct: 'Let us do 21 days instead', kind: 'start-challenge', key: 'days', store: HABITS, find: s => s.habits.find((h: any) => h.title === 'Read'), expectField: h => { expect(h.endCondition).toEqual({kind: 'date', date: '2026-10-10'}); }}, // eslint-disable-line @typescript-eslint/no-explicit-any
];
const WANT = Number(process.env.ZIGI_CONVERSATIONS ?? String(CONVERSATIONS.length));
const file = `conversations-${slug(MODEL)}.json`;
const stored = (page: import('@playwright/test').Page, key: string) => page.evaluate(k => { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); }, key);

for (const c of CONVERSATIONS.slice(0, WANT)) {
  test(`${c.id}: plan → correct → accept → undo (${c.kind})`, async ({page}, info) => {
    await offlineAppApi(page);
    await page.clock.setFixedTime(new Date('2026-09-20T19:00:00.000Z')); await page.clock.install({time: '2026-09-20T19:00:00.000Z'});
    await seedReal(page);
    await page.goto(PAGE_PATHS[c.area]);
    await openChat(page);
    const run: UiRun & {steps: Record<string, unknown>} = {id: c.id, model: MODEL, host: HOST, project: info.project.name, page: c.area, ask: c.plan, reply: '', cards: [], tools: [], ms: 0, score: null, error: null, at: new Date().toISOString(), steps: {}};
    try {
      const a = await askAndWait(page, c.plan); run.steps.plan = {ms: a.ms, cards: await cardsOf(page), reply: (await lastReply(page)).text};
      const b = await askAndWait(page, c.correct); run.steps.correct = {ms: b.ms, cards: await cardsOf(page), reply: (await lastReply(page)).text};
      run.ms = a.ms + b.ms; run.reply = (await lastReply(page)).text; run.cards = await cardsOf(page);
      const card = panel(page).locator('.ai-turn-assistant').last().locator(`.ai-card[data-kind="${c.kind}"]`).first();
      const found = await card.count();
      run.steps.cardOfKind = found;
      if (!found) { run.score = {pass: false, checks: [{name: 'cards', pass: false, detail: `no ${c.kind} card after the correction`}], cards: run.cards.length, rejected: 0, hint: null, refused: false, numbers: 0}; }
      else {
        const before = await stored(page, c.store);
        await card.getByRole('button', {name: /^(Add|Remember)$/}).click();
        await expect(card).toHaveClass(/ai-card-added/);
        const after = await stored(page, c.store);
        const recordAfter = c.find(after, before);
        let exact = true, detail = '';
        try { expect(recordAfter, `${c.kind} record`).toBeTruthy(); c.expectField(recordAfter); } catch (e) { exact = false; detail = e instanceof Error ? e.message.slice(0, 300) : String(e); }
        await panel(page).getByRole('button', {name: /^Undo/}).click();
        await expect(card).toHaveClass(/ai-card-undone/);
        const undone = await stored(page, c.store);
        const restored = JSON.stringify(c.find(undone, before) ?? null) === JSON.stringify(c.find(before, before) ?? null) || c.find(undone, before) === undefined;
        run.steps.accept = {exact, detail, restored};
        run.score = {pass: exact && restored, checks: [{name: 'card-of-kind', pass: true}, {name: 'correction-applied', pass: exact, detail}, {name: 'undo-exact', pass: restored}], cards: run.cards.length, rejected: 0, hint: null, refused: false, numbers: 0};
      }
    } catch (error) { run.error = error instanceof Error ? error.message.slice(0, 500) : String(error); }
    record(info, file, run);
    if (run.error) throw new Error(run.error);
  });
}
