/**
 * Session AV lane 2 (PK-10, owner decision 21 Nov, follow-up 3): "the chain Help topics are hidden while no chain is
 * chosen, and they still turn up in Help search with a note on how to choose one." Consumer first, chain invisible
 * (lib/chain-choice.ts is the one rule for "chosen").
 *
 * This module is constants and pure helpers only (no React), so the search palette and Help's own search can read it
 * without pulling any component in. `CHAIN_HELP` lists every Help answer whose subject is crypto, staking, governance,
 * Earn, wallets, the chain, validators or ZIG, as [id, question] in Help's page order; the question is word for word
 * lib/search/static.ts's (a unit test keeps the two in step). General answers that only mention a wallet or staking in
 * passing (privacy, the Alpha notice, what ZIGi sends) are not here: they help everyone.
 * docs/review/session-av/lane2/pk10.md gives the reason for each id.
 */
export const CHAIN_HELP: readonly (readonly [id: string, question: string])[] = [
  ['av-move-alert', 'Can I be told when a coin moves by a percent, or my portfolio reaches a value?'],
  ['av2-money-can-an-alert-follow-a-day-s-move-rather', 'Can an alert follow a day’s move rather than a fixed price?'],
  ['av2-money-can-i-leave-a-transaction-out-of-my-prof', 'Can I leave a transaction out of my profit and loss?'],
  ['av2-money-what-was-my-portfolio-worth-on-a-past-da', 'What was my portfolio worth on a past day?'],
  ['al-more-pages', 'Where are Earn, Staking, Governance and Ecosystem?'],
  ['al-wallets', 'Can I rename or remove a wallet I track?'],
  ['al-ledger', 'Can I stake with a Ledger, or from a multisig account?'],
  ['al-ecosystem', 'What is the Ecosystem page?'],
  ['al-reward-goals', 'Where are Reward goals?'],
  ['w-portfolio', 'Where do Portfolio’s charts and changes come from?'],
  ['ae-wallets', 'Can I use a wallet other than Keplr?'],
  ['ae-wallet-card', 'What does Today’s wallet card show now?'],
  ['af-earn', 'What is the Earn page?'],
  ['af-staking', 'Can I stake ZIG from ZIGoals?'],
  ['af-governance', 'Can I vote on ZIGChain proposals from ZIGoals?'],
  ['af-practice-badges', 'What are practice badges?'],
  ['af-start-here', 'How does Start here on Earn work?'],
  ['af-academy', 'What is the Earn Academy?'],
  ['af-earn-dock', 'What is the Earn dock?'],
  ['af-validator-alerts', 'What are validator alerts?'],
  ['af-wallets', 'Which wallets can I link, and what does ZIGoals read?'],
  ['af-add-money', 'How do I add money?'],
  ['af-goal-vaults', 'What is a Goal Vault?'],
  ['af-earn-coach', 'What does ZIGi’s Earn coach do?'],
  ['aj-wealth', 'What are trader tools, and how do I watch a Bitcoin wallet by its public key?'],
  ['aj-v6', 'Why did the network fee change when I stake?'],
  ['ak-wallets', 'Can I link a wallet on my phone?'],
  ['ak-staking-clarity', 'Where do I see my staking rewards, unstaking dates and practice steps?'],
];
export const CHAIN_HELP_IDS: readonly string[] = CHAIN_HELP.map(([id]) => id);
const IDS: ReadonlySet<string> = new Set(CHAIN_HELP_IDS);
export const isChainHelpId = (id: string): boolean => IDS.has(id);

/** The note a chain answer carries while the chain is not chosen (at the top of a deep-linked answer, and in search). */
export const CHAIN_HELP_NOTE = 'This answer is about the money and chain pages. Switch one on in Settings → Your pages & buttons to see these topics in Help.';
/** Where the note's "Settings → Your pages & buttons" opens. */
export const CHAIN_HELP_SETTINGS_HREF = '/app/settings#your-pages';

/**
 * Headings that name the chain while their section keeps consumer answers: the plain words shown until the chain is
 * chosen ([chosen, plain]). The topic index and the search palette use the topic's; help-page.tsx the sections'.
 */
export const CHAIN_HELP_PLAIN = {
  topicMorePages: ['Earn, Staking, Ecosystem and Chess', 'More pages and Chess'],
  morePagesTitle: ['Earn, Staking, Governance, Ecosystem and Chess', 'More pages and Chess'],
  aeEyebrow: ['TODAY’S SCENE, THE SIDEBAR AND WALLETS', 'TODAY’S SCENE AND THE SIDEBAR'],
  afEyebrow: ['EARN, STAKING AND THE CHECKLIST', 'ZIGI AND THE CHECKLIST'],
  afTitle: ['Earn, stake in your own wallet, and your day as one path', 'ZIGi, and your day as one path'],
} as const satisfies Record<string, readonly [chosen: string, plain: string]>;
/** The topic index's plain labels by section id (components/help/help-topics.tsx). */
export const CHAIN_TOPIC_PLAIN: Readonly<Record<string, string>> = {'more-pages': CHAIN_HELP_PLAIN.topicMorePages[1]};

/**
 * The search palette's Help results (lib/search/static.ts HELP_ITEMS) while the chain is not chosen. Before the search,
 * `chainHelpItem` gives the chain topic its plain label (so it is found by the words Help shows). After it,
 * `chainHelpResult` adds the note to a chain answer's line (after, so the note's own words never make a match).
 * Anything else, and everything once the chain is chosen, is returned unchanged.
 */
export function chainHelpItem<T extends {id: string; title: string}>(item: T, chosen: boolean): T {
  const plain = !chosen && item.id.startsWith('help-topic:') ? CHAIN_TOPIC_PLAIN[item.id.slice(11)] : undefined;
  return plain ? {...item, title: plain} : item;
}
export function chainHelpResult<T extends {id: string; subtitle?: string}>(hit: T, chosen: boolean): T {
  return !chosen && hit.id.startsWith('help:') && isChainHelpId(hit.id.slice(5)) ? {...hit, subtitle: `${hit.subtitle ?? 'Help'} · ${CHAIN_HELP_NOTE}`} : hit;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/**
 * Help's own search on a device that has not chosen the chain: the hidden chain answers whose question (or id, as the
 * palette's keywords) holds every word. `shown(id)` says an answer is on the page already (opened from a link), so Help
 * finds it the usual way and it is not listed twice. `words` are components/help/help-search.tsx's helpWords.
 */
export function chainHelpMatches(words: readonly string[], shown: (id: string) => boolean = () => false): readonly (readonly [id: string, question: string])[] {
  if (!words.length) return [];
  return CHAIN_HELP.filter(([id, question]) => !shown(id) && words.every(w => norm(`${question} ${id.split('-').join(' ')}`).includes(w)));
}
