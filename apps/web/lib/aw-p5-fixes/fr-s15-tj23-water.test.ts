import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AW (p5-fixes): three wiring fixes checked in their source (the browser checks are in tests/aw-p5-fixes.spec.ts).
 * - FR-S-15 / FR-TJ-12: Health's "Log food" on a phone opens the Log a meal sheet at once (the sheet was already on
 *   Health's page, so no new script loads); on a computer it still brings the form and focuses it.
 * - FR-TJ-23 / FR-L-16: a tracked goal's ⋯ menu has "Add money to this goal", which opens Quick add's Contribution route
 *   (?contribute=1) on the goal's own page.
 * - D-CI2026's late drinks row: the Water card's own drinks are drawn with the card, not in its lazy part.
 */
const WEB = join(__dirname, '..', '..'), read = (...p: string[]) => readFileSync(join(WEB, ...p), 'utf8');
describe('FR-S-15: Log food opens the sheet on a phone', () => {
  const app = read('components', 'health', 'health-app.tsx');
  test('the hero button opens the sheet on a phone and keeps the scroll and focus on a computer', () => {
    const button = app.slice(app.lastIndexOf('<button', app.indexOf('>Log food</button>')), app.indexOf('>Log food</button>'));
    expect(button).toContain('if (phone) { revealWhenShown("health-entry-action"); setLogging(true); }');
    expect(button).toContain('else revealWhenShown("health-entry-action", [\'form[aria-label="Log a meal"] select\', "select, input, button"]);');
  });
  test('the sheet is the Diary\'s own, already in Health\'s page (no new lazy part)', () => {
    expect(app).toContain('import { PhoneFormSheet } from "../phone/phone-form-sheet";');
    expect(app).toContain('{logging && <PhoneFormSheet title="Log a meal" onClose={() => setLogging(false)}>');
  });
});
describe('FR-TJ-23: Add money to this goal, from the goal\'s ⋯', () => {
  const page = read('components', 'platform', 'tracked-detail.tsx');
  test('inside Goal actions, for an open, unlocked goal that counts money, through ?contribute=1', () => {
    const menu = page.slice(page.indexOf('<details className="goal-actions">'), page.indexOf('</details>', page.indexOf('<details className="goal-actions">')));
    expect(menu).toContain("{goal.type!=='PROJECT'&&goal.status==='active'&&!goal.locked&&<Link className=\"quiet goal-add-money\" href={`${pathname}?contribute=1#funding-wealth`}");
    expect(menu).toContain("{isOwnUnitGoal(goal)?'Add to this goal':'Add money to this goal'}");
  });
  test('the same route Quick add\'s Contribution uses opens the Fund your goal sheet', () => {
    expect(read('components', 'quick-add-sheet.tsx')).toContain('?contribute=1#funding-wealth');
    expect(read('components', 'platform', 'goal-intelligence.tsx')).toContain('<ActionIntent param="contribute" value="1" ready={canEdit} onAction={()=>{setEntry(true);');
  });
});
describe('the Water card\'s own drinks are drawn with the card', () => {
  test('daily-tools draws them before the lazy part; the lazy part no longer has the row', () => {
    const tools = read('components', 'health', 'daily-tools.tsx');
    expect(tools).toContain('import { OwnDrinkTaps } from "./r3/own-drink-taps";');
    expect(tools).toContain('<OwnDrinkTaps date={date} perform={perform} /><LoadBoundary quiet><Suspense fallback={null}><HealthR3 part="water-more"');
    expect(read('components', 'health', 'r3', 'water-more.tsx')).not.toContain('r3-own-drinks');
    const taps = read('components', 'health', 'r3', 'own-drink-taps.tsx');
    expect(taps).toContain('role="group" aria-label="Your drinks, one tap each"');
    expect(taps).not.toMatch(/\blazy\(|import\(/);
  });
});
