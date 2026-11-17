import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {WIDGETS, gallery, isWidgetId, widgetAvailable, widgetSpec} from './catalog';
import {AS_HABITS} from './catalog-as';
import {AS_DAY} from './catalog-as-day';
import {AS_HEALTH} from './catalog-as-health';
import {AS_MONEY} from './catalog-as-money';
import {durationWords, glanceLines, paceWords, shareOf, waterAmount, whenWords, wholePercent, type GlanceFacts} from './words';
import {DEFAULT_WIDGETS} from '../store';

const AS = [...AS_HABITS, ...AS_HEALTH, ...AS_MONEY, ...AS_DAY];
describe('the widget gallery', () => {
  it('names every widget the brief asks for, each with its page and a way to open it', () => {
    expect(WIDGETS.map(w => w.id)).toEqual(['orbit', 'next', 'tasks', 'glance', 'water', 'focus', 'now-playing', 'money', 'goal-pace', 'sleep', 'briefs', 'notes', 'markets',
      // Session AL Part 11 (lane L8), a deliberate extension: the holographic HUD's five instruments.
      'health-hud', 'habits-hud', 'goals-hud', 'wealth-hud', 'agenda-clock',
      // Session AM (ADR-038 D1–D5), a deliberate extension: the widgets NOVA makes on request.
      'weight', 'steps', 'workouts', 'habit-week', 'goal-focus', 'net-worth', 'spending', 'budgets', 'bills', 'journal', 'time', 'weather', 'sun', 'nova-sees', 'nova-brain', 'requests',
      // Session AM-2 (step 3, "NOVA connected"), a deliberate extension: what Sessions AO and AP added to the pages, as widgets on request.
      'net-worth-history', 'ready-to-assign', 'age-of-money', 'spending-pace', 'bill-changes', 'money-tags', 'perfect-days', 'day-rules', 'tasks-later', 'countdowns', 'journal-numbers', 'templates', 'run-splits', 'mood-tags', 'symptoms',
      // Round 2, a deliberate extension: the pages that still had no widget.
      'priority-matrix', 'hour-grid', 'reviews', 'milestones', 'cash-flow', 'accounts', 'debt-plan', 'savings-challenges', 'price-alerts', 'health-trends', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle',
      // Session AS (ADR-042 Part 2), a deliberate extension: a widget for every kind of answer, group by group
      // (catalog-as*.ts). The list is theirs; what each may read is pinned just below.
      ...AS.map(w => w.id)]);
    expect(new Set(WIDGETS.map(w => w.id)).size).toBe(WIDGETS.length);
    // Session AM (D5): every widget that shows the person's records names the switch a made widget reads under.
    // Session AM (AM-S2, deliberate): two gates more (was: today|goals|habits|health|wealth). Notes and the Journal read under
    // their own NOVA permissions, so the whole map is pinned here, gate by gate: nothing but the Notes inbox reads under
    // 'notes', nothing but the Journal under 'journal', and neither is under 'today' any more.
    // Session AM-2 (step 3, deliberate): Templates joins the widgets without a gate (was: seven). It is the static library that
    // ships with the app and reads nothing of the person's; every other new widget names its switch below.
    for (const w of WIDGETS) if (!['now-playing', 'time', 'weather', 'sun', 'nova-sees', 'nova-brain', 'requests', 'templates'].includes(w.id)) expect(w.gate, w.id).toMatch(/^(today|goals|habits|health|wealth|notes|journal)$/);
    expect([widgetSpec('notes')?.gate, widgetSpec('journal')?.gate]).toEqual(['notes', 'journal']); // AM-S2: their own permissions, never Today's
    // Session AS (ADR-042 Part 2, deliberate): the lists below are the kinds before Session AS, exactly as they were. The
    // answer widgets are pinned by their group instead, as strictly: a Habits kind reads under Habits and nothing else; a
    // Health kind under Health and nothing else (Q14, Q16: mood and symptoms never outside it); a Wealth or Goals kind
    // under Wealth or Goals; a kind of the day's own records under its own switch. Only NOVA's own kinds read no record.
    const answer = new Set(AS.map(w => w.id));
    const under = (gate: string | undefined) => WIDGETS.filter(w => w.gate === gate && !answer.has(w.id)).map(w => w.id);
    for (const w of AS_HABITS) expect(w.gate, w.id).toBe('habits');
    for (const w of AS_HEALTH) expect(w.gate, w.id).toBe('health');
    for (const w of AS_MONEY) expect(['wealth', 'goals'], w.id).toContain(w.gate);
    for (const w of AS_DAY) { if (w.pillar === 'nova') expect(w.gate, w.id).toBeUndefined(); else expect(['today', 'journal', 'notes', 'habits', 'goals'], w.id).toContain(w.gate); }
    for (const w of AS) { expect(w.made, w.id).toBe(true); expect(w.params ?? [], w.id).toContain('period'); }
    expect(under('notes')).toEqual(['notes']);
    // Session AM-2 (step 3, "NOVA connected", deliberate): each list below grows by the new widgets of its gate, and by nothing
    // else. The Journal's numbers read under the Journal's own gate (AM-S2), never Today's; the three health-type records of
    // Session AP (run splits, mood tags, symptoms) read under Health and under no other gate (Q14, Q16).
    expect(under('journal')).toEqual(['journal', 'journal-numbers']);
    // Round 2 (deliberate): each list grows again by its own new widgets only. Six more read under Health and under no other gate.
    expect(under('today')).toEqual(['orbit', 'next', 'tasks', 'glance', 'focus', 'briefs', 'agenda-clock', 'day-rules', 'tasks-later', 'countdowns', 'priority-matrix', 'hour-grid', 'reviews']);
    expect(under('goals')).toEqual(['goal-pace', 'goals-hud', 'goal-focus', 'milestones']);
    expect(under('habits')).toEqual(['habits-hud', 'habit-week', 'perfect-days']);
    expect(under('health')).toEqual(['water', 'sleep', 'health-hud', 'weight', 'steps', 'workouts', 'run-splits', 'mood-tags', 'symptoms', 'health-trends', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle']);
    expect(under('wealth')).toEqual(['money', 'markets', 'wealth-hud', 'net-worth', 'spending', 'budgets', 'bills', 'net-worth-history', 'ready-to-assign', 'age-of-money', 'spending-pace', 'bill-changes', 'money-tags', 'cash-flow', 'accounts', 'debt-plan', 'savings-challenges', 'price-alerts']);
    // Price alerts show only while Markets is in use, as Market watch does.
    expect([widgetSpec('price-alerts')?.needs, widgetSpec('markets')?.needs]).toEqual(['markets', 'markets']);
    expect(under(undefined)).toEqual(['now-playing', 'time', 'weather', 'sun', 'nova-sees', 'nova-brain', 'requests', 'templates']);
    // Every widget of this step is `made`: it reads under its switch whether it was made or pinned (AM-S1).
    for (const id of ['net-worth-history', 'ready-to-assign', 'age-of-money', 'spending-pace', 'bill-changes', 'money-tags', 'perfect-days', 'day-rules', 'tasks-later', 'countdowns', 'journal-numbers', 'templates', 'run-splits', 'mood-tags', 'symptoms', 'priority-matrix', 'hour-grid', 'reviews', 'milestones', 'cash-flow', 'accounts', 'debt-plan', 'savings-challenges', 'price-alerts', 'health-trends', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle']) expect(widgetSpec(id)?.made, id).toBe(true);
    for (const w of WIDGETS) { expect(w.href.startsWith('/app/')).toBe(true); expect(w.open.length).toBeGreaterThan(3); expect(w.about.endsWith('.')).toBe(true); }
    for (const w of DEFAULT_WIDGETS) expect(isWidgetId(w.id)).toBe(true);
  });
  it('shows the market watch only once markets are chosen; notes and briefs only once they exist here', () => {
    const none = {markets: false, notes: false, briefs: false};
    expect(widgetAvailable('markets', none)).toBe(false); expect(widgetAvailable('markets', {...none, markets: true})).toBe(true);
    expect(widgetAvailable('notes', none)).toBe(false); expect(widgetAvailable('briefs', none)).toBe(false);
    expect(widgetAvailable('water', none)).toBe(true); expect(widgetAvailable('nope', {markets: true, notes: true, briefs: true})).toBe(false);
    const list = gallery(none, ['water']);
    expect(list.find(w => w.id === 'water')!.added).toBe(true); expect(list.some(w => w.id === 'markets')).toBe(false);
  });
});

describe('widget words: unknown is never zero', () => {
  it('pace in calm words', () => {
    expect(paceWords('ON_TRACK').words).toBe('On track'); expect(paceWords('ON TRACK').tone).toBe('good');
    expect(paceWords('BEHIND').words).toBe('Behind plan'); expect(paceWords('NO_PLAN').words).toBe('No plan yet');
    expect(paceWords('Value unknown').tone).toBe('unknown'); expect(paceWords('REVIEW').words).toBe('Needs a look');
  });
  it('water in the person’s unit; no bar without a target', () => {
    // Lane L8f (Part 13, deliberate): Health's own words (waterText), so NOVA says "1,250 mL" as Health and Today do (was "1.3 L").
    expect(waterAmount(450, 'ml')).toBe('450 mL'); expect(waterAmount(1250, 'ml')).toBe('1,250 mL'); expect(waterAmount(473.176, 'fl-oz-us')).toBe('16 fl oz');
    expect(waterAmount(Number.NaN, 'ml')).toBe('');
    expect(shareOf(500, 2000)).toBe(0.25); expect(shareOf(5000, 2000)).toBe(1); expect(shareOf(500, null)).toBeNull(); expect(shareOf(500, 0)).toBeNull();
  });
  it('durations and days', () => {
    expect(durationWords(45)).toBe('45 min'); expect(durationWords(60)).toBe('1 h'); expect(durationWords(80)).toBe('1 h 20 min'); expect(durationWords(-5)).toBe('0 min');
    expect(whenWords(0)).toBe('today'); expect(whenWords(1)).toBe('tomorrow'); expect(whenWords(3)).toBe('in 3 days'); expect(whenWords(-2)).toBe('2 days ago');
  });
  it('the day at a glance leaves out what it does not know and says a known zero plainly', () => {
    const unknown: GlanceFacts = {orbit: null, water: null, meals: null, nextBill: null, focusMinutes: null, sleepMinutes: null, contributionsDue: null};
    expect(glanceLines(unknown)).toEqual([]);
    expect(glanceLines({...unknown, water: {ml: 0, targetMl: null, unit: 'ml'}, meals: 0})).toEqual(['No water logged yet today.', 'No meals logged yet today.']);
    const full = glanceLines({orbit: {done: 2, total: 5, unit: 'habit'}, water: {ml: 750, targetMl: 2000, unit: 'ml'}, meals: 2, nextBill: {title: 'Rent', days: 2}, focusMinutes: 50, sleepMinutes: 440, contributionsDue: 1});
    expect(full).toHaveLength(5);
    expect(full[0]).toBe('2 of 5 habits done so far.'); expect(full[1]).toBe('You slept 7 h 20 min last night.'); expect(full[2]).toBe('750 mL of water of 2,000 mL so far.'); // lane L8f (Part 13, deliberate): Health's water words
    expect(glanceLines({...unknown, orbit: {done: 3, total: 3, unit: 'planet'}})).toEqual(['Your orbit is complete: all 3 planets done.']);
    expect(glanceLines({...unknown, nextBill: {title: 'Rent', days: 20}})).toEqual([]);
  });
});

describe('EX-14 (Session AK lane EXF): a widget never repeats its own link', () => {
  it('no widget body offers the words of the widget\'s own link again (a screen reader\'s link list had them twice)', () => {
    const dir = join(__dirname, '../../../components/nova/widgets');
    for (const w of WIDGETS) {
      const file = join(dir, `${w.id}.tsx`);
      expect(existsSync(file), w.id).toBe(true);
      const source = readFileSync(file, 'utf8'), words = w.open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(source, w.id).not.toMatch(new RegExp(`action="${words}"|>${words}<`));
    }
  });
});

describe('EX-16 (Session AK lane EXF): Goal pace in whole percents', () => {
  it('one format in one list: rounded down, a bound kept, unknown never a number', () => {
    // Before: "45%", "65%" and "41.66%" side by side (Today's exact progressText).
    // Second review M6 (lane L8f, deliberate): the Goals page's rounding (half up; 100 only when finished), so 2,500 of
    // 6,000 (41.66…) reads 42% on NOVA as on Goals (it read 41%, rounded down).
    expect(['45', '65', '41.66'].map(p => wholePercent(p))).toEqual(['45%', '65%', '42%']);
    expect(wholePercent('99.6')).toBe('99%'); expect(wholePercent('99.6', undefined, true)).toBe('100%'); expect(wholePercent('41.5')).toBe('42%');
    expect(wholePercent('99.99')).toBe('99%');
    expect(wholePercent('100')).toBe('100%');
    expect(wholePercent('0')).toBe('0%');
    expect(wholePercent('12.5', 'at-least')).toBe('At least 13%');
    expect(wholePercent('40', 'unavailable')).toBe('Unavailable');
    expect(wholePercent('')).toBe('Unavailable');
    expect(wholePercent('n/a')).toBe('Unavailable');
  });
});
