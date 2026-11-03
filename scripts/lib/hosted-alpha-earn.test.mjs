import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {AS_OF, EARN_PATH, EARN_STAGE, EARN_TITLE, FIGURE, OUTGOING, earnStage, figureProblems, linkProblems} from './hosted-alpha-earn.mjs';
import {VERIFIED_URLS} from '../../packages/ecosystem-registry/src/verified-links.ts';
import {VERIFIER_STAGES} from './hosted-alpha-stages.mjs';

// Session AF chunk 2 (L1; ADR-028 H57): the Earn stage module the lead appends as stage 9. These checks keep its words and
// selectors tied to the app's own source, so a renamed attribute fails here instead of the owner's live check.
const read = rel => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const source = read('./hosted-alpha-earn.mjs'), code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the Earn verifier stage (stage 9, appended)', () => {
  test('its shape: number 9, key earn, a browser stage, not live-only, recorded by the verifier', () => {
    expect(EARN_STAGE).toMatchObject({number: 9, key: 'earn', browser: true, liveOnly: false, reportsItself: false});
    expect(EARN_STAGE.run).toBe(earnStage);
    expect(Object.isFrozen(EARN_STAGE)).toBe(true);
    // Wired by the lead (Session AF): in the verifier's list exactly once, as 9, right before the Checklist's 10.
    expect(VERIFIER_STAGES.filter(stage => stage.key === 'earn')).toEqual([EARN_STAGE]);
    // Session AK appended stage 11 after the Checklist's 10; 9 and 10 keep their places.
    expect(VERIFIER_STAGES.map(stage => stage.number).slice(-3)).toEqual([9, 10, 11]);
    expect(EARN_PATH).toBe('/app/earn');
  });
  test('read-only: no request of its own, no wallet, no typing, no import.meta or top-level await', () => {
    expect(code).not.toMatch(/\bfetch\(|XMLHttpRequest|keplr|signAndBroadcast|\.fill\(|\.type\(|\.press\(|import\.meta/i);
    expect(code.split('\n').filter(line => /^\s*await /.test(line) && !/^\s{2,}/.test(line))).toEqual([]);
  });
  test('its selectors and words are the app’s own', () => {
    const figure = read('../../apps/web/components/earn/live-figure.tsx'), view = read('../../apps/web/components/earn/earn-view.tsx'), link = read('../../apps/web/components/links/verified-link.tsx'), start = read('../../apps/web/components/earn/start-here-section.tsx');
    expect(FIGURE).toBe('[data-live-figure]');
    expect(figure).toContain('data-live-figure={id ?? true} data-state={figure.kind}');
    expect(figure).toContain("data-reason={figure.kind === 'unavailable' ? figure.reason : undefined}");
    expect(figure).toContain('className="earn-source"');
    expect(figure).toContain('<> · as of <time');
    expect(figure).toContain('<span className="earn-unavailable" data-reason={reason}>unavailable');
    expect(AS_OF.test(' · as of 19 Oct 2026')).toBe(true);
    expect(view).toContain(`title="${EARN_TITLE}"`);
    expect(view).toContain('<div className="dashboard earn-page">');
    expect(start).toContain('<section id="start-here"');
    expect(OUTGOING).toContain('.earn-page a[href^="http"]');
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
  });
  test('a figure is honest only with its source and as-of, or "unavailable" with a reason', () => {
    expect(figureProblems({id: 'a', state: 'ok', reason: null, text: '5.06 %', source: 'ZIGChain mainnet LCD (official) · block 1 · updated just now · as of 19 Oct 2026, 01:00'})).toEqual([]);
    expect(figureProblems({id: 'a', state: 'ok', reason: null, text: '5.06 %', source: ''})).toEqual(['a: a value without its source']);
    expect(figureProblems({id: 'a', state: 'ok', reason: null, text: '5.06 %', source: 'ZIGChain · updated just now'})).toEqual(['a: a value without "as of"']);
    expect(figureProblems({id: 'b', state: 'unavailable', reason: 'TIMEOUT', text: 'unavailable (the source took too long)', source: ''})).toEqual([]);
    expect(figureProblems({id: 'b', state: 'unavailable', reason: null, text: '0 %', source: ''})).toEqual(['b: unavailable without a reason', 'b: unavailable but does not say so']);
    expect(figureProblems({id: 'c', state: 'loading', reason: null, text: 'reading…', source: ''})).toEqual(['c: state loading']);
  });
  test('a link is honest only when it is a verified one, in a new tab, noopener noreferrer', () => {
    const good = [...VERIFIED_URLS][0];
    expect(linkProblems([{href: good, target: '_blank', rel: 'noopener noreferrer'}])).toEqual([]);
    expect(linkProblems([{href: `${good}?ref=x`, target: '_blank', rel: 'noopener noreferrer'}])).toHaveLength(1);
    expect(linkProblems([{href: good, target: null, rel: 'noopener'}])).toEqual([`not a new tab: ${good}`, `rel is not noopener noreferrer: ${good}`]);
  });
});
