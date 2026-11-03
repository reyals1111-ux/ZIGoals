import {describe, expect, test} from 'vitest';
import {CRYPTO_PAGES, chainChosen, chainChosenFrom, chainLinked, cryptoPageShown, earnChoiceOf, earnShown, isCryptoPage, linkedWalletCount, pagesChoseChain, walletInUse} from './chain-choice';
import {defaultView, hrefShown, viewOf, withChoice} from './pages/visibility';
import {emptyPages, type Pages} from './pages/schema';

const AT = '2026-10-31T10:00:00.000Z';
const with_ = (id: Parameters<typeof withChoice>[1], shown: boolean, pages: Pages = emptyPages()) => withChoice(pages, id, shown, AT);

describe('the chain choice (Session AK X1, RELEASE_REVIEW R2–R5)', () => {
  test('the crypto pages are exactly Markets, Staking, Portfolio and Ecosystem', () => {
    expect(CRYPTO_PAGES).toEqual(['markets', 'staking', 'portfolio', 'ecosystem']);
    expect(isCryptoPage('staking')).toBe(true);
    expect(isCryptoPage('wealth')).toBe(false);
  });
  test('a wallet is in use in this tab only with Keplr: testnet mode, a wallet state other than disconnected, or the reconnect hint', () => {
    expect(walletInUse({mode: 'local', walletState: 'DISCONNECTED'})).toBe(false);
    expect(walletInUse({mode: 'local', walletState: 'DISCONNECTED', walletReconnectHint: false})).toBe(false);
    expect(walletInUse({mode: 'testnet', walletState: 'DISCONNECTED'})).toBe(true);
    expect(walletInUse({mode: 'local', walletState: 'CONNECTING'})).toBe(true);
    expect(walletInUse({mode: 'local', walletState: 'CONNECTED'})).toBe(true);
    expect(walletInUse({mode: 'local', walletState: 'DISCONNECTED', walletReconnectHint: true})).toBe(true);
  });
  test('linked wallets are counted from the raw record, tolerantly; anything unreadable counts none', () => {
    expect(linkedWalletCount(null)).toBe(0);
    expect(linkedWalletCount(undefined)).toBe(0);
    expect(linkedWalletCount('')).toBe(0);
    expect(linkedWalletCount('not json')).toBe(0);
    expect(linkedWalletCount('null')).toBe(0);
    expect(linkedWalletCount('{"version":2,"wallets":[{}]}')).toBe(0);
    expect(linkedWalletCount('{"version":1}')).toBe(0);
    expect(linkedWalletCount('{"version":1,"wallets":"x"}')).toBe(0);
    expect(linkedWalletCount('{"version":1,"wallets":[]}')).toBe(0);
    expect(linkedWalletCount(JSON.stringify({version: 1, wallets: [{id: 'a', kind: 'evm'}, {id: 'b', kind: 'later-kind'}]}))).toBe(2);
  });
  test('linked: the Showcase, a wallet in use, or a linked wallet; nothing else', () => {
    expect(chainLinked({showcase: false, wallet: false, linkedWallets: 0})).toBe(false);
    expect(chainLinked({showcase: true, wallet: false, linkedWallets: 0})).toBe(true);
    expect(chainLinked({showcase: false, wallet: true, linkedWallets: 0})).toBe(true);
    expect(chainLinked({showcase: false, wallet: false, linkedWallets: 1})).toBe(true);
  });
  test('the Earn switches are read from the raw device record; another shape is never a choice', () => {
    expect(earnChoiceOf(null)).toEqual({});
    expect(earnChoiceOf('{')).toEqual({});
    expect(earnChoiceOf('{"version":2,"pageShown":true}')).toEqual({});
    expect(earnChoiceOf('{"version":1,"pageShown":"yes","governanceShown":1}')).toEqual({});
    expect(earnChoiceOf('{"version":1,"dockShown":true}')).toEqual({});
    expect(earnChoiceOf('{"version":1,"pageShown":false,"governanceShown":true}')).toEqual({pageShown: false, governanceShown: true});
  });
  test('chosen from the stored choices: linked, a crypto page switched on, or Earn or Governance on; a hidden switch never chooses', () => {
    const none = {linked: false, pages: undefined};
    expect(chainChosenFrom(none)).toBe(false);
    expect(chainChosenFrom({...none, linked: true})).toBe(true);
    expect(chainChosenFrom({...none, pages: with_('markets', true)})).toBe(true);
    expect(chainChosenFrom({...none, pages: with_('markets', false)})).toBe(false);
    // Pages that are not the chain's never choose it.
    expect(chainChosenFrom({...none, pages: with_('wealth', true, with_('goals', true))})).toBe(false);
    expect(chainChosenFrom({...none, earn: {pageShown: true}})).toBe(true);
    expect(chainChosenFrom({...none, earn: {governanceShown: true}})).toBe(true);
    expect(chainChosenFrom({...none, earn: {pageShown: false, governanceShown: false}})).toBe(false);
    expect(pagesChoseChain(undefined)).toBe(false);
  });
  test('the pages view and the stored choices give the same answer', () => {
    const cases: {linked: boolean; pages?: Pages; earn?: {pageShown?: boolean; governanceShown?: boolean}}[] = [
      {linked: false}, {linked: true}, {linked: false, pages: with_('staking', true)}, {linked: false, pages: with_('staking', false)},
      {linked: false, earn: {pageShown: true}}, {linked: true, pages: with_('markets', false, with_('staking', false, with_('portfolio', false, with_('ecosystem', false))))},
    ];
    for (const c of cases) {
      const chosen = chainChosenFrom({linked: c.linked, pages: c.pages, earn: c.earn});
      expect(chainChosen({linked: c.linked, view: viewOf(c.pages, false, chosen), earn: c.earn})).toBe(chosen);
    }
  });
  test('unreadable settings show every page, which is no choice: the view then does not choose the chain', () => {
    expect(chainChosen({linked: false, view: {version: 1, hidden: []}, viewIsChoice: false})).toBe(false);
    expect(chainChosen({linked: false, view: {version: 1, hidden: []}})).toBe(true);
    expect(chainChosen({linked: true, view: {version: 1, hidden: []}, viewIsChoice: false})).toBe(true);
  });
  test('the crypto pages start hidden until chosen, then all show; each switch still wins; the Showcase shows everything', () => {
    expect(defaultView().hidden).toEqual(['markets', 'staking', 'portfolio', 'ecosystem', 'chess', 'music']);
    expect(defaultView(false, true).hidden).toEqual(['chess', 'music']);
    expect(defaultView(true).hidden).toEqual([]);
    expect(cryptoPageShown(defaultView())).toBe(false);
    // Switching Markets on shows Markets; once the choice is known, the rest follow (and keep their own switches).
    const markets = with_('markets', true);
    expect(viewOf(markets).hidden).toEqual(['staking', 'portfolio', 'ecosystem', 'chess', 'music']);
    expect(viewOf(markets, false, true).hidden).toEqual(['chess', 'music']);
    expect(viewOf(with_('staking', false, markets), false, true).hidden).toEqual(['staking', 'chess', 'music']);
  });
  test('Earn: its own switch on this device, else the chain choice; never while Wealth is hidden', () => {
    expect(earnShown({wealthShown: true, chosen: false})).toBe(false);
    expect(earnShown({wealthShown: true, chosen: true})).toBe(true);
    expect(earnShown({wealthShown: true, chosen: true, earn: {pageShown: false}})).toBe(false);
    expect(earnShown({wealthShown: true, chosen: false, earn: {pageShown: true}})).toBe(true);
    expect(earnShown({wealthShown: false, chosen: true, earn: {pageShown: true}})).toBe(false);
    // The navigation's rule: false hides Earn, absent keeps the older rule (it follows Wealth).
    const view = viewOf(undefined, false, true);
    expect(hrefShown(view, '/app/earn', {earn: false})).toBe(false);
    expect(hrefShown(view, '/app/earn', {earn: true})).toBe(true);
    expect(hrefShown(view, '/app/earn')).toBe(true);
    expect(hrefShown(viewOf(with_('wealth', false), false, true), '/app/earn', {earn: true})).toBe(false);
  });
});
