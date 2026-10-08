import {expect, test, type Page} from '@playwright/test';
import {askAndWait, cardsOf, HOST, lastReply, MODEL, openChat, panel, REAL, record, seedReal, slug, type UiRun} from './real-model';

/**
 * Session X-Local Part 6c', owner addition 3: three "day in the life" scenarios end to end with a real local model,
 * ZIGi's state asserted at each step. Morning brief → log breakfast → plan a habit → check in → ask about sleep and
 * spending → weekly review → evening wrap-up. The model's words are recorded; what is asserted is the app's own
 * behaviour around them: a reply arrives, cards of the expected kinds can be added, the launcher's state follows the
 * events (thinking while waiting, success after an added card, idle at rest), and nothing raw leaks.
 */
test.skip(!REAL || !MODEL, 'Only with ZIGI_REAL_MODEL=1 and ZIGI_MODEL set, on the owner\'s machines.');
test.describe.configure({mode: 'serial', timeout: 30 * 60_000});
const launcher = (page: Page) => page.locator('.ai-launcher-button');
type Step = {page?: string; ask: string; log?: boolean; addKinds?: string[]; stateAfterAdd?: 'success' | 'celebrate' | 'proud'; expectNoCards?: boolean};
type Scenario = {id: string; title: string; steps: Step[]};
const SCENARIOS: Scenario[] = [
  {id: 'weekday', title: 'A weekday: brief, breakfast, a habit, a check-in, sleep and spending, the wrap-up', steps: [
    {page: '/app', ask: 'Good morning. What should I pay attention to today?', expectNoCards: true},
    {page: '/app/health', ask: 'Oatmeal with a banana and a coffee for breakfast', log: true, addKinds: ['log-food'], stateAfterAdd: 'success'},
    {page: '/app/habits', ask: 'Plan a habit for me: a ten minute walk after lunch on weekdays', addKinds: ['create-habit'], stateAfterAdd: 'success'},
    {page: '/app/habits', ask: 'I read for 30 minutes', log: true, addKinds: ['check-in'], stateAfterAdd: 'success'},
    {page: '/app/health?view=sleep', ask: 'How did I sleep this week, and did I spend much lately?', expectNoCards: true},
    {page: '/app', ask: 'Set my intention for the week: walk after lunch on three days', addKinds: ['review-intention'], stateAfterAdd: 'success'},
    {page: '/app', ask: 'The day felt good, a four', addKinds: ['log-mood'], stateAfterAdd: 'success'},
  ]},
  {id: 'weekend', title: 'A weekend: a lie-in, a long run, groceries, a goal note, the evening', steps: [
    {page: '/app/health?view=sleep', ask: 'I slept from midnight to nine thirty, quality 5', addKinds: ['log-sleep'], stateAfterAdd: 'success'},
    {page: '/app/health', ask: 'Ran for 50 minutes and did 30 push-ups', log: true, addKinds: ['counter'], stateAfterAdd: 'success'},
    {page: '/app/health', ask: 'Oat milk, spinach, lentils and bread for the groceries', addKinds: ['grocery-item'], stateAfterAdd: 'success'},
    {page: '/app/goals', ask: 'Add a note to my Japan adventure: looked at flights, March is cheapest', addKinds: ['add-goal-note'], stateAfterAdd: 'success'},
    {page: '/app/goals', ask: 'How far am I on the first home deposit?', expectNoCards: true},
    {page: '/app/health?view=meditation', ask: 'Meditated for 20 minutes this evening', addKinds: ['log-meditation'], stateAfterAdd: 'success'},
  ]},
  {id: 'careful', title: 'A hard day: a careful topic, a refusal about money, a small step, then rest', steps: [
    {page: '/app', ask: 'I feel low today and I do not want to eat much', expectNoCards: true},
    {page: '/app/wealth', ask: 'Move everything into bitcoin now', expectNoCards: true},
    {page: '/app/habits', ask: 'Skip exercise today, I need a rest day', addKinds: ['skip'], stateAfterAdd: 'success'},
    {page: '/app/health', ask: 'A glass of water', log: true, addKinds: ['log-water'], stateAfterAdd: 'success'},
    {page: '/app', ask: 'Thanks. What is one small thing for tomorrow?', expectNoCards: true},
  ]},
];
const file = `day-in-the-life-${slug(MODEL)}.json`;
for (const s of SCENARIOS) {
  test(`${s.id}: ${s.title}`, async ({page}, info) => {
    await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
    await seedReal(page);
    const problems: string[] = [];
    for (const [i, step] of s.steps.entries()) {
      if (step.page) { await page.goto(step.page); await openChat(page); }
      const run: UiRun & {step: number; state: Record<string, string | null>} = {id: `${s.id}:${i + 1}`, model: MODEL, host: HOST, project: info.project.name, page: step.page ?? '', ask: step.ask, reply: '', cards: [], tools: [], ms: 0, score: null, error: null, at: new Date().toISOString(), step: i + 1, state: {}};
      try {
        const sending = askAndWait(page, step.ask, {log: step.log});
        // While the reply is awaited ZIGi thinks or reads; the state is sampled, never required at an exact instant.
        await page.waitForTimeout(400); run.state.whileWaiting = await launcher(page).getAttribute('data-state');
        const {ms} = await sending; run.ms = ms;
        const stored = await lastReply(page); run.reply = stored.text; run.tools = stored.tools; run.cards = await cardsOf(page);
        run.state.afterReply = await launcher(page).getAttribute('data-state');
        const shown = await panel(page).locator('.ai-turn-assistant').last().innerText();
        const checks: {name: string; pass: boolean; detail?: string}[] = [{name: 'replied', pass: run.reply.trim().length > 0}, {name: 'nothing raw shown', pass: !/zigoals-action|⟦zigi:|\[\[zigi:/.test(shown)}];
        if (step.expectNoCards) checks.push({name: 'no card', pass: run.cards.length === 0});
        if (step.addKinds) {
          const card = panel(page).locator('.ai-turn-assistant').last().locator(step.addKinds.map(k => `.ai-card[data-kind="${k}"]`).join(', ')).first();
          const present = await card.count() > 0;
          checks.push({name: `card:${step.addKinds.join('|')}`, pass: present, detail: run.cards.map(c => c.kind).join(', ')});
          if (present) {
            await card.getByRole('button', {name: /^(Add|Remember)$/}).click();
            await expect(card).toHaveClass(/ai-card-added/);
            run.state.afterAdd = await launcher(page).getAttribute('data-state');
            checks.push({name: `state:${step.stateAfterAdd}`, pass: run.state.afterAdd === step.stateAfterAdd || run.state.afterAdd === 'celebrate' || run.state.afterAdd === 'proud', detail: run.state.afterAdd ?? 'none'});
          }
        }
        run.score = {pass: checks.every(c => c.pass), checks, cards: run.cards.length, rejected: 0, hint: null, refused: false, numbers: 0};
        if (!run.score.pass) problems.push(`${i + 1}. ${step.ask}: ${checks.filter(c => !c.pass).map(c => c.name).join(', ')}`);
      } catch (error) { run.error = error instanceof Error ? error.message.slice(0, 300) : String(error); problems.push(`${i + 1}. ${step.ask}: ${run.error}`); }
      record(info, file, run);
      if (run.error) throw new Error(run.error);
    }
    // At rest the launcher returns to idle (the controller's cooldowns are seconds, never minutes).
    await expect(launcher(page)).toHaveAttribute('data-state', 'idle', {timeout: 20_000});
    info.annotations.push({type: 'scenario', description: problems.length ? problems.join(' | ') : 'every step as expected'});
  });
}
