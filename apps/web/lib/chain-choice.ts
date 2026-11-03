import type {PageId, Pages, PagesView} from './pages/schema';

/**
 * Session AK X1 (RELEASE_REVIEW R2–R5, R8, R14; the owner's non-negotiable "consumer first, chain invisible: crypto
 * wording only in the modules people chose"): ONE rule for whether this person chose the chain. Pure, over records the
 * app already keeps; nothing new is stored.
 *
 * - **Linked** (`chainLinked`): the Showcase is open (it demonstrates everything, labelled), a wallet is in use in this tab
 *   (Keplr connected or connecting, testnet mode, or the reconnect hint of an earlier Keplr session), or at least one
 *   wallet is linked read-only on this device (`zigoals:linked-wallets:v1` holds an entry).
 * - **Chosen** (`chainChosenFrom` over the stored choices, `chainChosen` over the pages view): linked, or the person
 *   switched on a crypto page — Markets, Staking, Portfolio or Ecosystem under Settings → Your pages & buttons or with the
 *   welcome's "Goals & money" (a stamped choice in the synced pages format), or Earn or Governance on this device
 *   (`zigoals:earn-prefs:v1` `pageShown` / `governanceShown`, the switches Settings → Your pages & buttons writes).
 *
 * Until the chain is chosen the app speaks consumer words only: the crypto pages start hidden (Governance's pattern; once
 * chosen they all show by default, and each keeps its own switch), Today has no wallet or staking card, the header no
 * wallet buttons, Settings no wallet and network rows, and Create a goal starts with money in the person's currency.
 * Once chosen, everything is as it always was.
 */
export const CRYPTO_PAGES = ['markets', 'staking', 'portfolio', 'ecosystem'] as const satisfies readonly PageId[];
export type CryptoPage = typeof CRYPTO_PAGES[number];
export const isCryptoPage = (id: string): id is CryptoPage => (CRYPTO_PAGES as readonly string[]).includes(id);

/** The goal provider's wallet fields (components/goal-provider.tsx) that say a wallet is in use in this tab. */
export type WalletUse = {mode: 'local' | 'testnet' | string; walletState: string; walletReconnectHint?: boolean};
export const walletInUse = (s: WalletUse): boolean => s.mode !== 'local' || s.walletState !== 'DISCONNECTED' || s.walletReconnectHint === true;

/**
 * How many wallets the linked-wallets record holds, read tolerantly from its raw bytes (any entry counts: the check is
 * "did the person link something", not "can this build show it"). Missing, unreadable or another shape: 0.
 */
export function linkedWalletCount(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const record = JSON.parse(raw) as unknown;
    if (!record || typeof record !== 'object' || (record as {version?: unknown}).version !== 1) return 0;
    const wallets = (record as {wallets?: unknown}).wallets;
    return Array.isArray(wallets) ? Math.min(wallets.length, 1000) : 0;
  } catch { return 0; }
}

export type ChainLinkSignals = {showcase: boolean; wallet: boolean; linkedWallets: number};
/** Linked: the Showcase, a wallet in use in this tab, or a wallet linked on this device. */
export const chainLinked = (s: ChainLinkSignals): boolean => s.showcase || s.wallet || s.linkedWallets > 0;

/** The Earn and Governance switches on this device (`zigoals:earn-prefs:v1`), as stored (absent: never chosen). */
export type EarnChoice = {pageShown?: boolean; governanceShown?: boolean};
/** The Earn and Governance switches read tolerantly from the record's raw bytes (anything else: never chosen). */
export function earnChoiceOf(raw: string | null | undefined): EarnChoice {
  if (!raw) return {};
  try {
    const r = JSON.parse(raw) as {version?: unknown; pageShown?: unknown; governanceShown?: unknown} | null;
    if (!r || typeof r !== 'object' || r.version !== 1) return {};
    return {...(typeof r.pageShown === 'boolean' ? {pageShown: r.pageShown} : {}), ...(typeof r.governanceShown === 'boolean' ? {governanceShown: r.governanceShown} : {})};
  } catch { return {}; }
}
/** A crypto page the person switched on (a stamped 'shown' in the synced pages choice). */
export const pagesChoseChain = (pages: Pages | undefined): boolean => CRYPTO_PAGES.some(id => pages?.items[id]?.v === 'shown');
/** The predicate from the stored choices themselves (the pages store uses it to set the crypto pages' defaults). */
export const chainChosenFrom = ({linked, pages, earn}: {linked: boolean; pages: Pages | undefined; earn?: EarnChoice}): boolean =>
  linked || pagesChoseChain(pages) || earn?.pageShown === true || earn?.governanceShown === true;
/** Whether a crypto page shows in this view (switched on, or shown by default because the chain is chosen). */
export const cryptoPageShown = (view: PagesView): boolean => CRYPTO_PAGES.some(id => !view.hidden.includes(id));

/**
 * The predicate as a component sees it, from the pages view (whose crypto defaults already follow `chainChosenFrom`): the
 * same answer, since a crypto page shows in the view exactly when it was switched on or the chain is otherwise chosen.
 */
export function chainChosen({linked, view, earn, viewIsChoice = true}: {linked: boolean; view: PagesView; earn?: EarnChoice; /** false while the
  settings are unreadable: every page shows then (the safe fallback), which is no choice of the person's. */ viewIsChoice?: boolean}): boolean {
  return linked || (viewIsChoice && cryptoPageShown(view)) || earn?.pageShown === true || earn?.governanceShown === true;
}

/**
 * Earn has no id in the synced pages format (a new id would break older builds' strict reader), so its switch is the
 * device-only `pageShown`: true shows it, false hides it, absent follows the chain choice. It sits in the Wealth group,
 * so it never shows while Wealth is hidden.
 */
export const earnShown = ({wealthShown, chosen, earn}: {wealthShown: boolean; chosen: boolean; earn?: EarnChoice}): boolean =>
  wealthShown && (earn?.pageShown ?? chosen);
