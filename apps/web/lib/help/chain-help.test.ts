// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, createElement, type FunctionComponent, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {CHAIN_HELP, CHAIN_HELP_IDS, CHAIN_HELP_NOTE, CHAIN_HELP_PLAIN, CHAIN_TOPIC_PLAIN, chainHelpItem, chainHelpMatches, chainHelpResult, isChainHelpId} from './chain-help';
import {HELP_ITEMS, HELP_QUESTIONS, HELP_TOPICS} from '../search/static';
import {CHAIN_LINE} from '../whats-new-chain/filter';

/** Session AV lane 2 (PK-10, owner decision 21 Nov): chain Help answers wait for the chain choice; search still finds them. */
const env = vi.hoisted(() => ({chosen: false}));
vi.mock('../../components/chain/use-chain-choice', () => ({useChainChoice: () => ({chosen: env.chosen})}));
vi.mock('next/navigation', () => ({useRouter: () => ({push: () => {}, replace: () => {}, prefetch: () => {}}), usePathname: () => '/app/help', useSearchParams: () => new URLSearchParams()}));
const {ChainHelp, ChainText} = await import('../../components/help/chain-help');
const {HelpQuestion} = await import('../../components/help/help-question');
const {HelpTopics} = await import('../../components/help/help-topics');
const {HelpSearch} = await import('../../components/help/help-search');

/** createElement with its children as arguments, for components whose props require them. */
const el = <P extends object>(type: FunctionComponent<P>, props: Omit<P, 'children'>, ...children: ReactNode[]) => createElement(type as FunctionComponent<object>, props, ...children);
const help = readFileSync(join(__dirname, '../../components/help/help-page.tsx'), 'utf8');
const answer = (id: string) => help.slice(help.indexOf(`<HelpQuestion id="${id}"`), help.indexOf('</HelpQuestion>', help.indexOf(`<HelpQuestion id="${id}"`)));

describe('the chain answers (CHAIN_HELP)', () => {
  it('is exactly this list, so adding or removing one is a deliberate change', () => {
    expect(CHAIN_HELP_IDS).toEqual(['av-move-alert', 'al-more-pages', 'al-wallets', 'al-ledger', 'al-ecosystem', 'al-reward-goals', 'w-portfolio', 'ae-wallets', 'ae-wallet-card', 'af-earn', 'af-staking', 'af-governance', 'af-practice-badges', 'af-start-here', 'af-academy', 'af-earn-dock', 'af-validator-alerts', 'af-wallets', 'af-add-money', 'af-goal-vaults', 'af-earn-coach', 'aj-wealth', 'aj-v6', 'ak-wallets', 'ak-staking-clarity']);
    expect(new Set(CHAIN_HELP_IDS).size).toBe(CHAIN_HELP_IDS.length);
  });
  it('holds Help’s own questions, word for word as Search has them, in Help’s page order', () => {
    const search = new Map(HELP_QUESTIONS);
    for (const [id, question] of CHAIN_HELP) { expect(search.get(id), id).toBe(question); expect(help, id).toContain(`<HelpQuestion id="${id}"`); }
    const order = HELP_QUESTIONS.map(([id]) => id).filter(isChainHelpId);
    expect(order).toEqual([...CHAIN_HELP_IDS]);
  });
  it('lists answers whose subject is the chain: each question or answer names it', () => {
    const CHAIN_SUBJECT = /\bZIG\b|ZIGChain|Keplr|testnet|practice network|\bstak(?:e|ed|ing)\b|\bwallets?\b|\bEarn\b|Ecosystem|Governance|validator|Portfolio|\bcoin\b|Bitcoin|ATOM/i;
    for (const [id, question] of CHAIN_HELP) expect(`${question} ${answer(id)}`, id).toMatch(CHAIN_SUBJECT);
  });
  it('leaves out the general answers that mention a wallet or staking only in passing', () => {
    for (const id of ['z-alpha', 'z-about', 'z-status', 'z-more', 'your-ai-what', 'your-ai-writes', 'your-ai-pack', 'your-ai-private', 'nova-privacy', 'ai-what-sent', 'ah-freshness', 'aj-alerts', 'aj-look', 'ak-safety-more', 'ak-agenda', 'al-xp', 'al-chess', 'ap-new-launchers', 'imports']) {
      expect(help, id).toContain(`<HelpQuestion id="${id}"`);
      expect(isChainHelpId(id), id).toBe(false);
    }
  });
});

describe('the plain headings', () => {
  it('replace words Help really has, and name no chain feature', () => {
    for (const [key, [chain, plain]] of Object.entries(CHAIN_HELP_PLAIN)) {
      const raw = chain.replace(/’/g, '&rsquo;');
      expect(help.includes(`"${chain}"`) || help.includes(`"${raw}"`) || help.includes(`'${chain}'`), key).toBe(true);
      expect(plain, key).not.toMatch(CHAIN_LINE);
      expect(plain, key).not.toMatch(/\bEarn\b|Staking|Governance|Ecosystem/i);
    }
    expect(HELP_TOPICS.find(([id]) => id === 'more-pages')?.[1]).toBe(CHAIN_HELP_PLAIN.topicMorePages[0]);
    expect(CHAIN_TOPIC_PLAIN).toEqual({'more-pages': 'More pages and Chess'});
  });
  // Once the lead applies the help-page.tsx patch (docs/review/session-av/lane2/pk10.md), every chain answer is wrapped
  // and each section heading says these plain words; before it, the checks below have nothing to read yet.
  it.runIf(help.includes('<ChainHelp'))('help-page.tsx wraps every chain answer and gives each heading these plain words', () => {
    for (const id of CHAIN_HELP_IDS) expect(help, id).toContain(`<ChainHelp id="${id}"><HelpQuestion id="${id}"`);
    expect([...help.matchAll(/<ChainHelp id="([^"]+)">/g)].map(m => m[1])).toEqual([...CHAIN_HELP_IDS]);
    expect(help).toContain('<ChainHelp><Question question="Are my Goals on the blockchain?">');
    for (const key of ['morePagesTitle', 'aeEyebrow', 'afEyebrow', 'afTitle'] as const) {
      const [chain, plain] = CHAIN_HELP_PLAIN[key].map(t => t.replace(/’/g, '&rsquo;'));
      expect(help, key).toContain(`<ChainText chosen="${chain}" plain="${plain}"/>`);
    }
    expect(help).toContain('<HelpTopics topics={TOPICS} plain={CHAIN_TOPIC_PLAIN}/>');
  });
});

describe('the search palette’s Help results', () => {
  const item = (id: string) => HELP_ITEMS.find(i => i.id === id)!;
  it('a chain answer carries the note until the chain is chosen; other answers never do', () => {
    expect(chainHelpResult(item('help:af-staking'), false).subtitle).toBe(`Help · ${CHAIN_HELP_NOTE}`);
    expect(chainHelpResult(item('help:af-staking'), true)).toEqual(item('help:af-staking'));
    expect(chainHelpResult(item('help:af-staking'), false).href).toBe('/app/help#help-af-staking');
    expect(chainHelpResult(item('help:z-alpha'), false)).toEqual(item('help:z-alpha'));
    expect(chainHelpResult(item('help-topic:more-pages'), false)).toEqual(item('help-topic:more-pages'));
    expect(CHAIN_HELP_NOTE).toBe('This answer is about the money and chain pages. Switch one on in Settings → Your pages & buttons to see these topics in Help.');
  });
  it('the chain topic has its plain label until the chain is chosen', () => {
    expect(chainHelpItem(item('help-topic:more-pages'), false).title).toBe('More pages and Chess');
    expect(chainHelpItem(item('help-topic:more-pages'), true).title).toBe('Earn, Staking, Ecosystem and Chess');
    expect(chainHelpItem(item('help:af-staking'), false)).toEqual(item('help:af-staking'));
  });
});

describe('Help’s own search (chainHelpMatches)', () => {
  it('finds a hidden chain answer by every word of its question or id, and not one already on the page', () => {
    expect(chainHelpMatches(['validator'])).toEqual([['af-validator-alerts', 'What are validator alerts?']]);
    expect(chainHelpMatches(['stake', 'zig']).map(([id]) => id)).toEqual(['af-staking']);
    expect(chainHelpMatches(['earn']).map(([id]) => id)).toEqual(['al-more-pages', 'af-earn', 'af-start-here', 'af-academy', 'af-earn-dock', 'af-earn-coach']);
    expect(chainHelpMatches(['validator'], id => id === 'af-validator-alerts')).toEqual([]);
    expect(chainHelpMatches([])).toEqual([]);
    expect(chainHelpMatches(['breakfast'])).toEqual([]);
  });
});

describe('ChainHelp, ChainText, HelpTopics and HelpSearch on the page', () => {
  let root: Root, host: HTMLDivElement;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); env.chosen = false; window.history.replaceState(null, '', '/app/help'); host = document.createElement('div'); host.className = 'help-page'; document.body.append(host); root = createRoot(host); HTMLElement.prototype.scrollIntoView = () => {}; });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
  const staking = () => el(ChainHelp, {id: 'af-staking'}, el(HelpQuestion, {id: 'af-staking', question: 'Can I stake ZIG from ZIGoals?'}, createElement('p', null, 'Yes, from the Staking page.')));
  const render = (node: Parameters<Root['render']>[0]) => act(() => root.render(node));

  it('leaves a chain answer out until the chain is chosen, then shows it as before, with no note', () => {
    render(staking());
    expect(host.querySelector('#help-af-staking')).toBeNull();
    env.chosen = true; render(staking());
    expect(host.querySelector('#help-af-staking > summary')?.textContent).toBe('Can I stake ZIG from ZIGoals?');
    expect(host.querySelector('.help-chain-note')).toBeNull();
  });

  it('a link that names it shows and opens it with the note on top, and it stays when the address moves on', () => {
    window.history.replaceState(null, '', '/app/help#help-af-staking');
    render(staking());
    const details = host.querySelector<HTMLDetailsElement>('#help-af-staking')!;
    expect(details).not.toBeNull();
    expect(details.open).toBe(true);
    const note = details.querySelector('div > .help-chain-note')!;
    expect(note.textContent).toBe(CHAIN_HELP_NOTE);
    expect(note.querySelector('a')?.getAttribute('href')).toBe('/app/settings#your-pages');
    expect(details.querySelector('div')!.firstElementChild).toBe(note);
    act(() => { window.history.replaceState(null, '', '/app/help#help-topics'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(host.querySelector('#help-af-staking')).not.toBeNull();
    // Once chosen, the same answer stays (not remounted, still open) and loses the note.
    env.chosen = true; render(staking());
    expect(host.querySelector('#help-af-staking')).toBe(details);
    expect(details.open).toBe(true);
    expect(host.querySelector('.help-chain-note')).toBeNull();
  });

  it('a hash naming another answer, or a plain question without an id, never shows it', () => {
    window.history.replaceState(null, '', '/app/help#help-af-earn');
    render(staking());
    expect(host.querySelector('#help-af-staking')).toBeNull();
    render(el(ChainHelp, {}, createElement('details', {className: 'help-question'}, createElement('summary', null, 'Are my Goals on the blockchain?'))));
    expect(host.textContent).toBe('');
  });

  it('ChainText and the topic index say the plain words until the chain is chosen', () => {
    const page = () => createElement('div', null, createElement('h2', null, createElement(ChainText, {chosen: CHAIN_HELP_PLAIN.afTitle[0], plain: CHAIN_HELP_PLAIN.afTitle[1]})), createElement(HelpTopics, {topics: HELP_TOPICS, plain: CHAIN_TOPIC_PLAIN}));
    render(page());
    expect(host.querySelector('h2')?.textContent).toBe('ZIGi, and your day as one path');
    const link = host.querySelector('a[href="#more-pages"]')!;
    expect(link.textContent).toBe('More pages and Chess');
    expect(host.querySelectorAll('nav a')).toHaveLength(HELP_TOPICS.length);
    env.chosen = true; render(page());
    expect(host.querySelector('h2')?.textContent).toBe('Earn, stake in your own wallet, and your day as one path');
    expect(link.textContent).toBe('Earn, Staking, Ecosystem and Chess');
  });

  it('Help search lists the hidden chain answers that match, with the note, and links each to its answer', () => {
    const type = (value: string) => act(() => {
      const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', {bubbles: true}));
    });
    const page = () => createElement('div', null, createElement(HelpSearch), el(HelpQuestion, {id: 'z-alpha', question: 'What does the notice at the top mean?'}, createElement('p', null, 'Staking and votes sign in your own wallet.')), staking());
    render(page());
    type('validator');
    const status = host.querySelector('[role="status"]')!;
    expect(status.textContent).toBe('1 answer about the money and chain pages matches, listed under the search.');
    const list = host.querySelector('.help-search-chain')!;
    expect(list.querySelector('p')?.textContent).toBe(CHAIN_HELP_NOTE);
    expect([...list.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')])).toEqual([['What are validator alerts?', '#help-af-validator-alerts']]);
    type('staking');
    expect(status.textContent).toBe('1 answer matches, opened below. 3 answers about the money and chain pages match, listed under the search.');
    expect([...host.querySelectorAll('.help-search-chain a')].map(a => a.getAttribute('href'))).toEqual(['#help-al-more-pages', '#help-ak-staking-clarity', '#help-af-staking'].sort((a, b) => CHAIN_HELP_IDS.indexOf(a.slice(6)) - CHAIN_HELP_IDS.indexOf(b.slice(6))));
    type('breakfast');
    expect(status.textContent).toBe('No answer holds every word. Try fewer words, or the app’s search (it covers pages and your records too).');
    expect(host.querySelector('.help-search-chain')).toBeNull();
    env.chosen = true; render(page()); type('validator');
    expect(host.querySelector('.help-search-chain')).toBeNull();
  });
});
