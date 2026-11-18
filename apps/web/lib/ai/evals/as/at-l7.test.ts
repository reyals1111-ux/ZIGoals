import {describe, expect, test} from 'vitest';
import {xpSummary} from '../../../game/xp';
import {journeyFacts} from '../../local-answers/exact/journey';
import {withPortfolios} from '../../tools/fixtures';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from './harness';

/**
 * Session AT (L7, docs/review/session-al/CARRIED.md): Session AL's carried ZIGi/NOVA rows replayed against Session AS's
 * on-device answers, the corpus's way (`ask`: the device's reply with no model), on the Showcase of 17 November 2026 and
 * on a fresh profile, on both surfaces. What is pinned here beside the corpus (cases-day.ts `journey-level`,
 * cases-money.ts `goals-milestones`): the switches and the two sources of a coin.
 */
const surfaces = (sources = showcaseAll(), health = true) => [['NOVA', novaEnv(sources, undefined, health)], ['ZIGi', zigiEnv(sources, health)]] as const;

describe('NB:N11: the level and XP, as Journey counts them', () => {
  test('the Showcase: Journey’s own figures (lib/game/xp.ts on the same records), labelled as the Showcase’s', () => {
    for (const [name, env] of surfaces()) {
      const want = xpSummary({habits: env.habits, health: env.health!, platform: env.platform, weekly: env.weekly, earnAcademy: env.game!.earnAcademy}, env.habitDay);
      const text = ask('what level am I', env).text;
      expect(text, name).toContain(`Showcase example (fictional records): You are level ${want.level.level}, ${want.level.name}, with ${want.total.toLocaleString('en-US')} XP`);
      expect(text, name).toContain(`${want.level.into} of ${want.level.span} XP to level ${want.level.level + 1}`);
      expect(text, name).not.toContain('in a chat yet');
    }
  });
  test('Health not shared: unknown here, never a smaller figure; no figure at all', () => {
    for (const [name, env] of surfaces(showcaseAll(), false)) {
      const text = ask('how much XP do I have', env).text;
      expect(text, name).toContain(`Your level counts your habits, Health logs, goals and weekly reviews, and Health isn’t shared with ${name} here, so I can’t count it in a chat (unknown here, not zero).`);
      expect(text, name).not.toMatch(/\d/);
    }
  });
  test('Goals or Today closed, the game layer off, its switch unreadable', () => {
    const env = zigiEnv(showcaseAll());
    expect(journeyFacts({...env, areas: {...env.areas, goals: false}})).toEqual({state: 'closed', closed: ['Goals']});
    expect(journeyFacts({...env, areas: {...env.areas, today: false, habits: false}})).toEqual({state: 'closed', closed: ['Habits', 'Today']});
    expect(journeyFacts({...env, game: {enabled: false, earnAcademy: null}})).toEqual({state: 'off'});
    expect(journeyFacts({...env, game: null})).toEqual({state: 'unknown'});
    expect(ask('what level am I', zigiEnv(freshAll())).text).toMatch(/^The game layer is off on this device, so there is no level or XP/);
  });
});

describe('TK:1, TK-048, TK-052: a coin held, each source named', () => {
  test('the Showcase: Wealth’s 0.45 BTC and the Portfolio named; its what-if portfolio is never counted as holding', () => {
    for (const [name, env] of surfaces()) {
      const text = ask('How much BTC do I have?', env).text;
      expect(text, name).toBe('You hold 0.45 BTC in Wealth (1 holding), with no price, so no value.\n- Portfolio (separate from Wealth): no BTC in a Real portfolio');
      expect(ask('How much BTC is in my portfolio?', env).text, name).toContain('Fictional long-term coins (Hypothetical): 0.07 BTC, 4,550.00 USD');
    }
  });
  test('nothing in Wealth, BTC in a Real portfolio: the Portfolio is still named (it was left out)', () => {
    const env = zigiEnv(withPortfolios(freshAll()));
    expect(ask('How much BTC do I have?', env).text).toBe('You have no BTC recorded in Wealth, so there is no amount to show.\n- Portfolio (separate from Wealth): 0.05 BTC in your Real portfolio Long-term coins\n- To track it: Wealth → + Add asset → Crypto, then BTC and the amount you hold');
    expect(ask('How much BTC do I have?', zigiEnv(freshAll())).text).not.toContain('Portfolio');
  });
});

test('Z-057: every active goal is named, with its milestones or as having none; one goal keeps its own answer', () => {
  for (const [name, env] of surfaces()) {
    const all = ask('Show me the milestones for all goals', env).text, older = ask('what are my milestones', env).text;
    expect(all, name).toBe(older);
    expect(all, name).toContain('- Your other open goals have no milestones: Emergency fund, First home deposit, Japan adventure, Reward income reserve, Create 2 hours a day, Sleep 8 hours a night');
    expect(all, name).not.toContain('My first 0.1 BTC');
  }
});

test('LS:#012, #194, #351, C-LA-07: a bulk tick stays one item at a time, with nothing written and no card', () => {
  for (const [name, env] of surfaces()) for (const q of ['Uncheck everything', 'Tick all my habits done for today', 'Tick everything on my checklist as done']) {
    const got = ask(q, env);
    expect(got.text, `${name} ${q}`).toBe(`${name} checks off one item at a time: name one, or tick them on the Checklist itself.`);
    expect(got.tools, `${name} ${q}`).toEqual([]);
  }
});
