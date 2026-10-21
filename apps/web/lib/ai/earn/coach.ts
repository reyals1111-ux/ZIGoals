import {START_STEPS, STEP_WORDS} from '../../earn/start-here';
import type {EarnSnapshot, SnapshotFigure} from '../../earn/snapshot';
import {figureSentence, glossaryAnswer, glossaryTerm, NOT_ADVICE, type GlossaryLang} from './glossary';

/**
 * Session AF (L4, P8.5; ADR-028 D7, H17, H47, H69): the Earn coach's answers on the device. It explains each way to earn
 * with the figures the Earn page read (the snapshot, each with its source and "as of"; never a number of ZIGi's own, never
 * ranked by rate), answers glossary questions in English and Dutch, walks the Start-here path, and refuses every signing
 * request in plain words. Filling in the staking review (`prefill-staking`) is a card the person's AI proposes for a stake
 * ask; ZIGi itself never signs, sends, broadcasts or holds keys. Every answer carries "Explained by ZIGoals · not advice".
 */
export type CoachReply = {kind: 'answer' | 'refusal'; text: string};
const FILL = String.raw`(?:(?:hey|hi|ok|okay|so|please|um+|uh+|hé|hoi|dus|euh|eh|zigi|alsjeblieft),?\s+)*`;
/** Signing, broadcasting or approving a transaction: never possible for ZIGi, said plainly (no card). */
const SIGN_ASK = new RegExp(`^${FILL}(?:(?:can|could|would|will) you\\s+|(?:kun|kan|wil) je\\s+)?(?:sign(?!\\s+(?:me\\s+)?(?:up|in|out|on)\\b)|broadcast|onderteken)\\b|\\b(?:sign|broadcast|approve|onderteken|teken|verstuur)\\b[^.?!]{0,40}\\b(?:transaction|tx|transactie)\\b`, 'i');
export const SIGN_REFUSAL: Record<GlossaryLang, string> = {
  en: 'ZIGi never signs, sends or broadcasts anything, and never holds keys. A staking transaction is signed only by you, in your own wallet, after the Staking page’s review. I can fill in that review for you: say what to stake and on which network.',
  nl: 'ZIGi tekent, verstuurt of verzendt nooit iets, en houdt nooit sleutels. Een staking-transactie teken alleen jij, in je eigen wallet, na het nakijken op de Staking-pagina. Ik kan dat nakijkscherm voor je invullen: zeg wat je wilt staken en op welk netwerk.',
};
const WAYS = new RegExp(`^${FILL}(?:what are (?:the |all )?ways to earn|(?:what|which) (?:ways|options) (?:are there )?to earn|how can i earn (?:with|on) (?:zig|zigchain)|(?:explain|show me) (?:the |every |each )?ways? to earn|(?:explain|show me) (?:the )?earn(?:ing)? options|welke manieren (?:zijn er )?om te verdienen|hoe kan ik verdienen (?:met|op) (?:zig|zigchain)|leg (?:de |alle )?manieren om te verdienen uit)\\b`, 'i');
const START = new RegExp(`^${FILL}(?:walk me through (?:the )?start[- ]here|(?:show|explain) (?:me )?(?:the )?start[- ]here(?: path)?|where do i start(?: with (?:earn|staking))?|how do i (?:start|begin) (?:staking|with staking|to stake|earning)|first steps? (?:to|for) staking|neem me mee door start hier|waar begin ik(?: met (?:verdienen|staken))?|hoe begin ik met staken)\\b`, 'i');
const nlOf = (q: string) => /\b(?:welke|manieren|verdienen|waar|begin|ik|hoe|neem|met|staken|leg|uit|kun|je|teken|onderteken)\b/i.test(q) && !/\b(?:what|which|how|where|walk|show|explain|can you|sign)\b/i.test(q);
const fig = (s: EarnSnapshot | null | undefined, id: string): SnapshotFigure | undefined => s?.figures.find(f => f.id === id);
const pageCard = (view?: string) => `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page: 'earn', ...(view ? {view} : {})})}\n\`\`\``;
/** Each way to earn, in the Earn page's order (never ranked by rate), with its live figures and its risk in one line. */
function waysAnswer(snapshot: EarnSnapshot | null | undefined, lang: GlossaryLang): string {
  const say = (f: SnapshotFigure | undefined) => f ? ` ${figureSentence(f, lang)}` : '';
  const pools = snapshot?.figures.filter(f => f.id.startsWith('oroswap-fee-')).slice(0, 2) ?? [];
  const vault = snapshot?.figures.find(f => f.id.startsWith('vault-aum-'));
  const en = [
    `• Native staking: put ZIG behind a validator; it stays in your own account and you sign in your own wallet. Risk: your ZIG is locked while unbonding, and a misbehaving validator can be slashed.${say(fig(snapshot, 'native-apr-issuance-at-measured') ?? fig(snapshot, 'native-apr-before-commission'))}${say(fig(snapshot, 'native-apr-measured'))}${say(fig(snapshot, 'native-unbonding'))}`,
    `• Liquid staking (Valdora stZIG): a contract stakes for you and gives you stZIG. Risk: the contract holds the ZIG.${say(fig(snapshot, 'valdora-fee'))}`,
    `• Pools (OroSwap): earn a share of swap fees by adding two tokens. Risk: impermanent loss and price impact.${pools.map(p => say(p)).join('')}`,
    `• USDC vaults (Valdora, Nawa): lend USDC through a vault. Risk: the vault’s own rules and the issuer of the USDC; the yield is not published as a figure ZIGoals can read.${say(vault)}`,
    '• Governance and Goal Vaults: vote with staked ZIG, or put a stake to work for one of your goals.',
  ];
  const nl = [
    `• Native staking: zet ZIG achter een validator; het blijft in je eigen account en je tekent in je eigen wallet. Risico: tijdens het unbonden zit je ZIG vast, en een validator die zich misdraagt kan geslasht worden.${say(fig(snapshot, 'native-apr-issuance-at-measured') ?? fig(snapshot, 'native-apr-before-commission'))}${say(fig(snapshot, 'native-apr-measured'))}${say(fig(snapshot, 'native-unbonding'))}`,
    `• Liquid staking (Valdora stZIG): een contract staket voor je en geeft je stZIG. Risico: het contract houdt de ZIG.${say(fig(snapshot, 'valdora-fee'))}`,
    `• Pools (OroSwap): verdien een deel van de wisselkosten door twee tokens toe te voegen. Risico: tijdelijk verlies en prijsimpact.${pools.map(p => say(p)).join('')}`,
    `• USDC-kluizen (Valdora, Nawa): leen USDC uit via een kluis. Risico: de regels van de kluis en de uitgever van de USDC; het rendement wordt niet gepubliceerd als cijfer dat ZIGoals kan lezen.${say(vault)}`,
    '• Governance en Goal Vaults: stem met gestakete ZIG, of zet een stake in voor een van je doelen.',
  ];
  const intro = lang === 'nl' ? 'De manieren om op ZIGChain te verdienen, in de volgorde van de Earn-pagina (nooit gerangschikt op rendement):' : 'The ways to earn on ZIGChain, in the Earn page’s order (never ranked by rate):';
  const none = !snapshot?.figures.length ? (lang === 'nl' ? 'De cijfers van nu staan op de Earn-pagina; ZIGi heeft ze in dit bezoek nog niet gelezen.' : 'Today’s figures are on the Earn page; ZIGi has not read them in this visit.') : '';
  return [intro, ...(lang === 'nl' ? nl : en), none, NOT_ADVICE[lang]].filter(Boolean).join('\n');
}
function startAnswer(lang: GlossaryLang): string {
  const nl: Record<string, string> = {'get-wallet': 'Neem een wallet: je eigen sleutels', practice: 'Oefen eerst: gratis test-ZIG', 'add-money': 'Voeg geld toe: kaart of bank', 'get-zig': 'Haal ZIG: naar ZIGChain', 'first-stake': 'Je eerste echte stake: het echte netwerk', explore: 'Ontdek meer: liquid staking, pools, stemmen'};
  const steps = START_STEPS.map((id, i) => `${i + 1}. ${lang === 'nl' ? nl[id] : `${STEP_WORDS[id].label}: ${STEP_WORDS[id].short.toLowerCase()}`}`);
  const intro = lang === 'nl' ? 'Start hier, op de Earn-pagina: van geen wallet naar een eerste stake, in zes stappen. Elke stap opent zijn eigen uitleg; je tekent altijd zelf, in je eigen wallet.' : 'Start here, on the Earn page: from no wallet to a first stake, in six steps. Each step opens its own guide; you always sign yourself, in your own wallet.';
  return [intro, ...steps, NOT_ADVICE[lang]].join('\n');
}
/** The coach's device answer for a message, or null when it is not an Earn question. */
export function earnCoachAnswer(question: string, snapshot: EarnSnapshot | null | undefined): CoachReply | null {
  const q = question.trim().replace(/\s+/g, ' ');
  if (!q || q.length > 200) return null;
  if (SIGN_ASK.test(q)) return {kind: 'refusal', text: SIGN_REFUSAL[nlOf(q) ? 'nl' : 'en']};
  if (WAYS.test(q)) { const lang = nlOf(q) ? 'nl' : 'en'; return {kind: 'answer', text: waysAnswer(snapshot, lang) + pageCard()}; }
  if (START.test(q)) { const lang = nlOf(q) ? 'nl' : 'en'; return {kind: 'answer', text: startAnswer(lang) + pageCard('start-here')}; }
  const term = glossaryTerm(q);
  return term ? {kind: 'answer', text: glossaryAnswer(term.term, term.lang, snapshot)} : null;
}
