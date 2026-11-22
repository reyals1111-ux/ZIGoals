import {describe, expect, test} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {showcaseEvening} from '../../evening-plan/showcase';
import {withShowcaseMorning} from '../../evening-plan/morning-showcase';
import {AV2_BODYMIND_R2} from '../evals/as/cases-av2-bodymind-r2';
import {av2BodymindR2Answer} from './av2-bodymind-r2';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (bodymind-r2): the on-device answers of lib/ai/local-answers/av2-bodymind-r2.ts, on the Showcase
 * (17 Nov 2026) and on a fresh profile, in English and Dutch, under each part's switch. Every corpus phrasing is answered.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
/** The Showcase with the evening plan in the AK sources (the lead's registry step), and its morning steps. */
const showcase = () => { const s = showcaseAll(); s.ak = {...s.ak, eveningPlan: withShowcaseMorning(showcaseEvening(DAY), DAY)} as typeof s.ak; return s; };
const ask = (q: string, s = showcase(), health = true) => av2BodymindR2Answer(q, zigiEnv(s, health));

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_BODYMIND_R2) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    const r = ask(q);
    expect(r?.kind, q).toBe('answer');
    for (const n of c.never ?? []) expect(text(r)).not.toContain(n);
  });
  test('Health closed: the Health refusal for the Health questions, never the data', () => {
    for (const c of AV2_BODYMIND_R2.filter(x => x.pillar === 'health')) { const r = ask(c.en[0]!, showcase(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('a question with an action in it is left alone', () => {
    expect(ask('what is my sleep need and log one more glass')).toBeNull();
  });
});

describe('Rise: sleep need and naps (LEDGER #237, #238)', () => {
  test('the Showcase\'s estimate from its weekend nights, labelled an estimate, in English and Dutch', () => {
    const en = text(ask('what is my sleep need')), nl = text(ask('wat is mijn slaapbehoefte'));
    expect(en).toMatch(/^About \d+ h \d{2} min a night, an estimate: the middle of your \d+ weekend nights in the last 30 days\./);
    expect(en).toContain('not medical advice');
    expect(nl).toMatch(/^Ongeveer \d+ h \d{2} min per nacht, een schatting/);
    expect(text(ask('how much sleep do I need', freshAll()))).toContain('Not enough nights yet');
  });
  test('the Showcase\'s one nap counts in the balance, marked as a nap', () => {
    expect(text(ask('do my naps count in my sleep balance'))).toContain('Yes: 1 nap (0 h 25 min) in the last 14 days count on the day each ended, marked as naps.');
    expect(text(ask('tellen mijn dutjes mee in de slaapbalans'))).toContain('Ja: 1 dutje (0 h 25 min)');
  });
});

describe('Rise: morning steps (LEDGER #236)', () => {
  test('the Showcase\'s two steps at their times from the wake time, daylight done, in English and Dutch', () => {
    const en = text(ask('what are my morning steps')), nl = text(ask('wat zijn mijn ochtendstappen'));
    expect(en).toMatch(/^Timed from your wake time today, /);
    expect(en).toContain('Daylight outside, or by a bright window (done)');
    expect(en).toContain('First coffee or tea, once the grogginess has passed');
    expect(nl).toContain('Daglicht buiten, of bij een licht raam (gedaan)');
    const without = showcaseAll(); without.ak = {...without.ak, eveningPlan: undefined} as typeof without.ak;
    expect(text(ask('what are my morning steps', without))).toContain('I can’t read them here yet');
    const fresh = freshAll(); fresh.ak = {...fresh.ak, eveningPlan: null} as typeof fresh.ak;
    expect(text(ask('what are my morning steps', fresh))).toContain('No morning steps yet');
  });
});
