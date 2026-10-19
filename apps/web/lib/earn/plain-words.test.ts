import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {createElement, type ReactElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {GLOSSARY, glossaryTerm} from '../ai/earn/glossary';
import {PLAIN_ASK, PLAIN_TERMS, PLAN_LIST} from './plain-words';
import {WhatsThis} from '../../components/earn/whats-this';
import {Risk} from '../../components/earn/risk';

/**
 * Session AF (L1c; non-negotiables N1 and N5): every term of the plan's plain-words list (PLAN_APPROVED 11.9) has a
 * definition in the one glossary (lib/ai/earn/glossary.ts) and a "What's this?" tap on the pages; the words carry no
 * number (a number needs its source); the coach's own matching is unchanged; and every risk of an earning option says
 * where it comes from.
 */
const WEB = join(__dirname, '..', '..'), ROOT = join(WEB, '..', '..');
const sources = (dir: string): string[] => !existsSync(join(WEB, dir)) ? [] : readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
});
/** The plan's list as written: the line after the 11.9 heading, split on the commas outside brackets and quotes. */
function planItems(): string[] {
  const lines = readFileSync(join(ROOT, 'docs', 'research', 'session-af', 'PLAN_APPROVED.md'), 'utf8').split('\n');
  const at = lines.findIndex(l => l.startsWith('### 11.9 '));
  const text = lines.slice(at + 1).find(l => l.trim())!.trim().replace(/\.$/, '');
  const out: string[] = [];
  let depth = 0, current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(current.trim()); current = ''; } else current += ch;
  }
  out.push(current.trim());
  return out;
}
describe('the plan\'s plain-words list: one definition each, in the Earn glossary', () => {
  it('lists exactly the plan\'s items, in its order, and every term the list names', () => {
    expect(PLAN_LIST.map(([item]) => item)).toEqual(planItems());
    expect(planItems()).toHaveLength(22);
    expect([...new Set(PLAN_LIST.flatMap(([, terms]) => terms))]).toEqual([...PLAIN_TERMS]);
  });
  it('every term has exactly one glossary entry with plain English words: no number, no promise, no advice', () => {
    for (const term of PLAIN_TERMS) {
      const entries = GLOSSARY.filter(t => t.id === term);
      expect(entries, term).toHaveLength(1);
      const words = entries[0]!.text.en;
      expect(words.length, term).toBeGreaterThan(120);
      expect(words.length, term).toBeLessThanOrEqual(480);
      expect(words, term).not.toMatch(/\d/);
      expect(words, term).not.toMatch(/partners?\b|guarantee|you should|we recommend|\bbest\b/i);
      expect(words, term).toMatch(/[.!?]$/);
    }
    expect(new Set(GLOSSARY.map(t => t.id)).size).toBe(GLOSSARY.length);
  });
  it('each tap asks its own question, short and distinct', () => {
    expect(Object.keys(PLAIN_ASK).sort()).toEqual([...PLAIN_TERMS].sort());
    for (const term of PLAIN_TERMS) expect(PLAIN_ASK[term], term).toMatch(/^What(’s| are| does) .{2,28}\?$/);
    expect(new Set(Object.values(PLAIN_ASK)).size).toBe(PLAIN_TERMS.length);
  });
  it('the page terms change nothing ZIGi answers: they have no patterns, and the coach still answers only its own terms', () => {
    const coach = ['apr', 'apy', 'unbonding', 'staking', 'validator', 'commission', 'slashing', 'liquid-staking', 'impermanent-loss', 'pool', 'slippage', 'gas', 'decoy', 'custody'];
    for (const term of GLOSSARY) {
      if (coach.includes(term.id)) { expect(term.en, term.id).toBeInstanceOf(RegExp); expect(term.nl, term.id).toBeInstanceOf(RegExp); expect(term.text.nl, term.id).toBeTruthy(); }
      else { expect(term.en, term.id).toBeUndefined(); expect(term.nl, term.id).toBeUndefined(); }
    }
    for (const q of ['What is a seed phrase?', 'What does jailed mean?', 'What is quorum?', 'What are my rewards?', 'Explain the bridge', 'What is a verified link?']) expect(glossaryTerm(q), q).toBeNull();
    expect(glossaryTerm('What is unbonding?')).toMatchObject({term: {id: 'unbonding'}, lang: 'en'});
  });
});
describe('the "What\'s this?" taps on the pages', () => {
  const files = [...sources('components/earn'), ...sources('components/staking'), ...sources('components/governance')];
  const used = new Set(files.flatMap(f => [...readFileSync(join(WEB, f), 'utf8').matchAll(/<WhatsThis(?: key=\{[^}]+\})? term="([a-z-]+)"/g)].map(m => m[1]!)));
  it('every term of the list has a tap somewhere on Earn, Staking or Governance, and every tap names a listed term', () => {
    for (const term of PLAIN_TERMS) expect(used.has(term), term).toBe(true);
    for (const term of used) expect((PLAIN_TERMS as readonly string[]).includes(term), term).toBe(true);
  });
  it('a tap is a button with aria-expanded that controls its own inline answer, hidden until pressed; the words load on the tap', () => {
    const html = renderToStaticMarkup(createElement(WhatsThis, {term: 'validator'}));
    const id = /aria-controls="([^"]+)"/.exec(html)![1];
    expect(html).toMatch(/^<button type="button" class="whats-this" aria-expanded="false" aria-controls="[^"]+" data-whats-this="validator">What’s a validator\?<\/button>/);
    expect(html).toContain(`<span id="${id}" class="whats-this-def" data-term="validator" hidden="" aria-live="polite"></span>`);
    // The glossary is a chunk of its own, loaded on the first tap: no page carries the definitions until asked.
    const code = readFileSync(join(WEB, 'components/earn/whats-this.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/^import[^;]*ai\/earn\/glossary/m);
    expect(code).toMatch(/import\('\.\.\/\.\.\/lib\/ai\/earn\/glossary'\)/);
    expect(code).not.toMatch(/fetch\(|animat|transition/i);
    // Still in every motion setting: the sheet sets no transition and no animation of its own.
    const css = readFileSync(join(WEB, 'components/earn/whats-this.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/animation|@keyframes|transition:(?!\s*none\s*;)/);
    expect(css).toMatch(/\.whats-this \{[^}]*transition: none;/);
  });
});
describe('every risk of an earning option says where it comes from (N5)', () => {
  // The risk's words as createElement's third argument (react/no-children-prop).
  const SourcedRisk = Risk as unknown as (props: {link?: ReactNode; chain?: ReactNode; tap?: ReactNode}) => ReactElement;
  it('a risk names its source: a verified link, the chain read in words, or both', () => {
    // Critique round 2 (L5c), equal strength (still the exact markup): "Source:" is glued to what it names by a no-break
    // space. Added beside it: a tap comes after the source, and a link's closing stop is kept with it (.earn-risk-end).
    expect(renderToStaticMarkup(createElement(SourcedRisk, {chain: 'ZIGChain’s slashing rules, read live'}, 'Slashing.'))).toBe('<li data-risk-source="chain">Slashing. <span class="earn-risk-source">Source:\u00a0ZIGChain’s slashing rules, read live.</span></li>');
    expect(renderToStaticMarkup(createElement(SourcedRisk, {link: createElement('a', {href: '#x'}, 'a page'), tap: createElement('button', {type: 'button'}, 'What’s this?')}, 'Linked.'))).toBe('<li data-risk-source="link">Linked. <span class="earn-risk-source">Source:\u00a0<span class="earn-risk-end"><a href="#x">a page</a>.</span></span> <button type="button">What’s this?</button></li>');
    expect(renderToStaticMarkup(createElement(SourcedRisk, {link: createElement('a', {href: '#x'}, 'a page'), chain: 'the chain'}, 'Both.'))).toContain('data-risk-source="chain link"');
  });
  it('the Risks lists of the Earn sections hold only sourced risks, never a bare item', () => {
    let lists = 0;
    for (const file of sources('components/earn')) {
      const text = readFileSync(join(WEB, file), 'utf8');
      for (const list of text.match(/<ul className="earn-risks">[\s\S]*?<\/ul>/g) ?? []) {
        lists++;
        expect(list, file).not.toMatch(/<li\b/);
        expect((list.match(/<Risk\b/g) ?? []).length, file).toBeGreaterThanOrEqual(5);
        for (const risk of list.match(/<Risk\b[^>]*>/g) ?? []) expect(risk, file).toMatch(/\b(link|chain)=/);
      }
    }
    expect(lists).toBe(11);
  });
});
