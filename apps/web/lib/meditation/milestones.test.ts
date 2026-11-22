import {describe, expect, test} from 'vitest';
import {longestRun, meditationMilestones} from './milestones';
import {BADGES} from '../game/badges';
import {addDays} from '../zone-time';
import type {MeditationSession} from './schema';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

/** Session AV lane 2 (habits; LEDGER #186, Insight Timer's milestones): seven in a row, 50 and 100 days, once only. */
const session = (day: string, i: number): MeditationSession => ({id: `health_med-av2-${String(i).padStart(4, '0')}`, startedAt: `${day}T08:00:00.000Z`, seconds: 600, kind: 'timer', timeZone: 'UTC', source: 'timer', createdAt: `${day}T08:10:00.000Z`, updatedAt: `${day}T08:10:00.000Z`});
const days = (from: string, n: number, gap = 1) => Array.from({length: n}, (_, i) => addDays(from, i * gap));
describe('meditation milestones', () => {
  test('the longest run, days in all, and a rest day later takes nothing away', () => {
    expect(longestRun(new Set(['2026-11-01', '2026-11-02', '2026-11-04', '2026-11-05', '2026-11-06']))).toBe(3);
    const seven = days('2026-10-01', 7).map(session);
    const ms = meditationMilestones({sessions: [...seven, session('2026-10-20', 99)]}, '2026-11-22');
    expect(ms.map(m => [m.id, m.reached, m.have])).toEqual([['meditate-7', true, 7], ['meditate-50', false, 8], ['meditate-100', false, 8]]);
    expect(meditationMilestones({sessions: days('2026-01-01', 100, 2).map(session)}, '2026-11-22').map(m => m.reached)).toEqual([false, true, true]);
    expect(meditationMilestones(null, '2026-11-22').every(m => !m.reached && m.have === 0)).toBe(true);
    // A session after today does not count yet.
    expect(meditationMilestones({sessions: days('2026-11-20', 7).map(session)}, '2026-11-22')[0]!.have).toBe(3);
  });
  test('three calm badges in the cabinet', () => {
    expect(BADGES.filter(b => b.id.startsWith('meditate-')).map(b => b.title)).toEqual(['Seven days in a row', 'Fifty days', 'A hundred days']);
  });
  test('NOVA and ZIGi say the milestones, in English and Dutch', () => {
    const s = showcaseAll(), text = (q: string) => { const r = av2HabitsAnswer(q, zigiEnv(s)); return r && 'text' in r ? r.text : ''; };
    expect(text('which meditation milestones have i reached')).toMatch(/^(?:No meditation milestone yet\.|Meditation milestones reached: )/);
    expect(text('welke meditatiemijlpalen heb ik bereikt')).toMatch(/^(?:Nog geen meditatiemijlpaal\.|Meditatiemijlpalen bereikt: )/);
    expect(text('which meditation milestones have i reached')).not.toMatch(/minutes|score/);
  });
});
