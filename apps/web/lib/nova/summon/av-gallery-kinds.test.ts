import {describe, expect, it} from 'vitest';
import {AV_FAMILIES, AV_NL_TITLES} from './more-families';
import {FAMILIES, summonFor} from './summon';
import {widgetSpec} from '../widgets/catalog';
import {widgetTitle} from './words';

/**
 * Session AV (A42-4, ADR-045): the six kinds ADR-042 left "gallery only" are made by a request now, in English and Dutch,
 * and stand in for the general widget the same words would also make. Each stays under its own pillar's switch.
 */
const CASES: readonly [string, readonly string[], readonly string[], string][] = [
  ['sleep-stages', ['show my sleep stages', 'how much deep sleep did I get', 'my REM sleep this week'], ['toon mijn slaapfasen', 'hoeveel diepe slaap had ik'], 'sleep'],
  ['sleep-times', ['what time did I go to bed', 'show my bed and wake times', 'when did I wake up this week'], ['hoe laat ging ik naar bed', 'hoe laat werd ik wakker'], 'sleep'],
  ['fasting-windows', ['show my fasting windows', 'my past fasts'], ['toon mijn vastvensters', 'mijn laatste vastenperiodes'], 'fasting'],
  ['mood-map', ['show my mood map', 'my moods this month'], ['toon mijn stemmingskaart', 'mijn stemming per dag'], 'mood-tags'],
  ['debt-ranks', ['rank my debts', 'which debt is the biggest', 'show my debt balances'], ['rangschik mijn schulden', 'welke schuld is het grootst'], 'accounts'],
  ['body-scan', ['show my body measurements', 'my waist and hips'], ['toon mijn lichaamsmaten', 'mijn taille'], 'weight'],
];
describe('Session AV (A42-4): the gallery-only kinds are made by words', () => {
  it('each is in the closed catalogue, under a switch, with a Dutch title, and matched before the general families', () => {
    expect(AV_FAMILIES.map(f => f.id)).toEqual(CASES.map(c => c[0]));
    for (const [id] of CASES) {
      expect(widgetSpec(id)?.gate, id).toBeTruthy();
      expect(widgetTitle(id, 'nl'), id).toBe(AV_NL_TITLES[id]);
    }
    const at = (id: string) => FAMILIES.findIndex(f => f.id === id);
    for (const [id, , , general] of CASES) if (at(general) >= 0 && general !== 'accounts' && general !== 'fasting' && general !== 'mood-tags') expect(at(id), id).toBeLessThan(at(general));
  });
  for (const [id, en, nl, general] of CASES) it(`${id}: English and Dutch requests make it and not the general "${general}"`, () => {
    for (const text of [...en, ...nl]) {
      const plan = summonFor(text), ids = plan.widgets.map(w => w.id);
      expect(ids, text).toContain(id);
      expect(ids, text).not.toContain(general);
    }
    for (const text of nl) expect(summonFor(text).lang, text).toBe('nl');
  });
  it('everyday words keep their own widgets: sleep, a fast and the accounts are not taken over', () => {
    expect(summonFor('how did I sleep').widgets.map(w => w.id)).toContain('sleep');
    expect(summonFor('show my fasts').widgets.map(w => w.id)).toContain('fasting');
    expect(summonFor('what do I owe').widgets.map(w => w.id)).toContain('accounts');
  });
});
