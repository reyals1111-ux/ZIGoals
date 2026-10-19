import type {EarnSnapshot, SnapshotFigure} from '../../earn/snapshot';

/**
 * Session AF (L4, P8.5; ADR-028 H47, H69; `TIER 3 (public-safety labels)`): the Earn coach's plain-words glossary, in
 * English and Dutch, answered on the device. The words follow the Earn Academy's lessons (lib/earn/academy.ts) and the
 * Earn page; they carry no number of their own. A live figure is added only from the Earn snapshot (what the Earn page
 * read in this visit, lib/earn/snapshot.ts), always with its source and "as of"; without one the answer says where the
 * current figure is. Every answer ends with "Explained by ZIGoals · not advice".
 */
export type GlossaryLang = 'en' | 'nl';
/**
 * Session AF (L1c, N1): a term may also be a page term only, for the "What's this?" taps on Earn, Staking and Governance
 * (components/earn/whats-this.tsx, lib/earn/plain-words.ts): English words and no patterns. The coach matches only the
 * ids in `glossaryTerm`'s order, so a page term changes nothing ZIGi answers; it joins that order once it has its Dutch
 * words and its patterns.
 */
export type GlossaryTerm = {id: string; en?: RegExp; nl?: RegExp; text: {en: string; nl?: string}; figures?: readonly string[]; academy?: string; section?: string};
export const NOT_ADVICE: Record<GlossaryLang, string> = {en: 'Explained by ZIGoals · not advice', nl: 'Uitgelegd door ZIGoals · geen advies'};
export const GLOSSARY: readonly GlossaryTerm[] = [
  {id: 'apr', en: /\bapr\b|\bannual percentage rate\b|\byearly rate\b/i, nl: /\bapr\b|\bjaarrente\b|\bjaarlijks rendement\b/i, figures: ['native-apr-issuance-at-measured', 'native-apr-measured', 'native-apr-before-commission'], academy: 'APR and APY', section: 'native-staking',
    text: {en: 'APR is a simple yearly rate: what a stake would earn over a year if nothing changed, without counting rewards earned on rewards. Staking rewards are not added back by themselves: you claim them and stake them again, each time with a small network fee, which is why ZIGoals shows the APR. A rate today is not a promise for next year, and ZIG’s price can move far more than any rate.',
      nl: 'APR is een eenvoudige jaarrente: wat een stake in een jaar zou opbrengen als er niets veranderde, zonder rente op rente. Staking-beloningen worden niet vanzelf herbelegd: je claimt ze en staket ze opnieuw, telkens met een kleine netwerkvergoeding, en daarom toont ZIGoals de APR. Een rente van vandaag belooft niets voor volgend jaar, en de koers van ZIG kan veel meer bewegen dan welke rente ook.'}},
  {id: 'apy', en: /\bapy\b|\bcompound(?:ing|ed)?\b/i, nl: /\bapy\b|\brente op rente\b|\bsamengestelde rente\b/i, academy: 'APR and APY', section: 'native-staking',
    text: {en: 'APY assumes the rewards are added back as you go (compounding), so for the same rate it reads a little higher than the APR. On ZIGChain rewards are only added back when you claim and stake them again yourself.',
      nl: 'APY gaat ervan uit dat de beloningen onderweg worden bijgeteld (rente op rente), dus bij dezelfde rente lijkt het iets hoger dan de APR. Op ZIGChain worden beloningen pas bijgeteld als je ze zelf claimt en opnieuw staket.'}},
  {id: 'unbonding', en: /\bunbond(?:ing)?\b|\bunstak(?:e|ing) (?:period|time)\b|\bhow long (?:to|does it take to) unstake\b/i, nl: /\bunbond(?:ing)?\b|\bontbind(?:en|ing)\b|\bhoe lang (?:duurt )?(?:het )?unstaken\b/i, figures: ['native-unbonding'], academy: 'Unbonding: the way out', section: 'native-staking',
    text: {en: 'Unbonding is the way out of staking: when you unstake, your ZIG stays locked for a set time before it is back in your balance by itself. During unbonding it earns nothing and cannot be moved. Moving your stake to another validator (redelegating) is instant and keeps earning. So stake only what you can leave alone for weeks.',
      nl: 'Unbonding is de weg uit staking: als je unstaket, blijft je ZIG een vaste tijd vastzitten voor die vanzelf terug in je saldo staat. Tijdens het unbonden verdient het niets en kun je het niet verplaatsen. Je stake naar een andere validator verplaatsen (redelegeren) gaat meteen en blijft verdienen. Stake dus alleen wat je weken kunt laten staan.'}},
  {id: 'staking', en: /\bstaking\b|\bstake\b|\bdelegat(?:e|ion|ing)\b/i, nl: /\bstaken\b|\bstaking\b|\bdelegeren\b|\binzetten\b/i, figures: ['native-apr-before-commission', 'native-unbonding'], academy: 'Staking, in plain words', section: 'native-staking',
    text: {en: 'Staking (delegating) puts your ZIG behind a validator, one of the computers that run ZIGChain. It stays yours, in your own account: the validator cannot spend it and only your signature can move it. The network pays new ZIG to staked ZIG with every block; the validator keeps a share of your rewards, its commission. If a validator misbehaves, a small part of the stake behind it can be slashed.',
      nl: 'Staken (delegeren) zet je ZIG achter een validator, een van de computers die ZIGChain draaien. Het blijft van jou, in je eigen account: de validator kan het niet uitgeven en alleen jouw handtekening kan het verplaatsen. Het netwerk betaalt elke block nieuwe ZIG aan gestakete ZIG; de validator houdt een deel van je beloning, zijn commissie. Als een validator zich misdraagt, kan een klein deel van de stake erachter worden geslasht.'}},
  {id: 'validator', en: /\bvalidators?\b/i, nl: /\bvalidators?\b|\bvalidatoren\b/i, figures: ['native-min-commission'], section: 'validators',
    text: {en: 'A validator is one of the computers that check and add every block on ZIGChain. You choose which one your stake goes behind; the Earn page lists each one’s facts — commission, uptime, status — sorted by name, never by rate. ZIGi never chooses a validator for you.',
      nl: 'Een validator is een van de computers die elke block op ZIGChain controleren en toevoegen. Jij kiest achter welke je stake staat; de Earn-pagina toont van elke validator de feiten — commissie, uptime, status — op naam gesorteerd, nooit op rendement. ZIGi kiest nooit een validator voor je.'}},
  {id: 'commission', en: /\bcommission\b/i, nl: /\bcommissie\b/i, figures: ['native-min-commission'], academy: 'Staking, in plain words', section: 'validators',
    text: {en: 'A validator’s commission is the share of your staking rewards it keeps for running the network; you get the rest. It is set by each validator and can change.',
      nl: 'De commissie van een validator is het deel van je staking-beloning dat hij houdt voor het draaien van het netwerk; jij krijgt de rest. Elke validator stelt die zelf in, en ze kan veranderen.'}},
  {id: 'slashing', en: /\bslash(?:ing|ed)?\b/i, nl: /\bslash(?:ing|en|t)?\b|\bstrafkorting\b/i, figures: ['native-slash-downtime', 'native-slash-double-sign'], academy: 'Staking, in plain words', section: 'native-staking',
    text: {en: 'Slashing is the network taking a small part of the stake behind a validator that misbehaves: one that signs two different blocks, or stays offline too long. It is why a reliable validator matters.',
      nl: 'Slashing is dat het netwerk een klein deel van de stake achter een validator inhoudt als die zich misdraagt: als hij twee verschillende blocks tekent of te lang offline is. Daarom doet een betrouwbare validator ertoe.'}},
  {id: 'liquid-staking', en: /\bliquid staking\b|\bstzig\b/i, nl: /\bliquid staking\b|\bliquide staking\b|\bstzig\b/i, figures: ['valdora-fee', 'valdora-rate'], academy: 'Liquid staking', section: 'valdora',
    text: {en: 'With liquid staking you give ZIG to a contract (on ZIGChain, Valdora’s) that stakes it for you and gives you a token back: stZIG, which is worth more ZIG over time as rewards come in. Two ways back: redeem through the contract (the unbonding time plus a few days), or sell stZIG on an exchange at once, usually for a little less. The trade: a contract now holds the ZIG, so a fault in it, or a change by whoever controls it, can cost you.',
      nl: 'Bij liquid staking geef je ZIG aan een contract (op ZIGChain dat van Valdora) dat het voor je staket en je een token teruggeeft: stZIG, dat met de beloningen steeds meer ZIG waard wordt. Twee wegen terug: inwisselen via het contract (de unbonding-tijd plus een paar dagen), of stZIG meteen verkopen op een beurs, meestal voor iets minder. De keerzijde: een contract houdt nu de ZIG, dus een fout erin, of een wijziging door wie het beheert, kan je geld kosten.'}},
  {id: 'impermanent-loss', en: /\bimpermanent loss\b|\bil\b(?= in| on| when|\?)/i, nl: /\bimpermanent (?:loss|verlies)\b|\btijdelijk verlies\b/i, figures: [], academy: 'Liquidity pools and impermanent loss', section: 'oroswap',
    text: {en: 'Impermanent loss: when one token in a pool rises or falls against the other, swappers trade against the pool, which ends up holding more of the cheaper token and less of the dearer one. When you take your share out, you can have less value than if you had simply kept both tokens. The pool’s swap fees can make up for it, or not.',
      nl: 'Tijdelijk verlies (impermanent loss): als een token in een pool stijgt of daalt tegenover het andere, handelen wisselaars tegen de pool, die zo meer van het goedkopere en minder van het duurdere token overhoudt. Haal je je deel eruit, dan kun je minder waarde hebben dan als je beide tokens gewoon had gehouden. De wisselkosten van de pool kunnen dat goedmaken, of niet.'}},
  {id: 'pool', en: /\bliquidity pools?\b|\bpools?\b|\blp tokens?\b/i, nl: /\bliquiditeitspools?\b|\bpools?\b/i, figures: ['oroswap-fee'], academy: 'Liquidity pools and impermanent loss', section: 'oroswap',
    text: {en: 'A liquidity pool holds two tokens, ZIG and USDC for example. People swap one for the other through it and pay a small fee that goes to the people who provide the pool’s tokens. To provide liquidity you add equal values of both tokens and get LP tokens: your share of the pool and its fees. In a small pool a large swap moves the price a lot.',
      nl: 'Een liquiditeitspool bevat twee tokens, bijvoorbeeld ZIG en USDC. Mensen wisselen het ene voor het andere via de pool en betalen een kleine vergoeding aan wie de tokens van de pool aanlevert. Om liquiditeit te leveren voeg je van beide tokens dezelfde waarde toe en krijg je LP-tokens: je deel van de pool en zijn vergoedingen. In een kleine pool verschuift een grote wissel de prijs flink.'}},
  {id: 'slippage', en: /\bslippage\b|\bprice impact\b/i, nl: /\bslippage\b|\bprijsimpact\b|\bprijsverschuiving\b/i, figures: ['oroswap-fee'], section: 'oroswap',
    text: {en: 'Slippage is the difference between the price you see when you start a swap and the price you get: the pool’s price moves with your own swap (price impact) and with other swaps that land first. A swap screen lets you set the most slippage you accept; past it, the swap does not go through.',
      nl: 'Slippage is het verschil tussen de prijs die je ziet als je een wissel begint en de prijs die je krijgt: de prijs van de pool beweegt met je eigen wissel (prijsimpact) en met andere wissels die eerder binnenkomen. Op een wisselscherm stel je in hoeveel slippage je maximaal aanvaardt; daarboven gaat de wissel niet door.'}},
  {id: 'gas', en: /\bgas\b|\bnetwork fees?\b|\btransaction fees?\b|\bfees? in zig\b/i, nl: /\bgas\b|\bnetwerkkosten\b|\btransactiekosten\b|\bnetwerkvergoeding\b/i, academy: 'Gas and fees', section: 'native-staking',
    text: {en: 'Every transaction on ZIGChain pays a small network fee in ZIG to the validators who process it; gas is the work it needs. Your wallet shows the fee before you sign and may let you raise it. ZIGChain takes its fees in ZIG only, so keep a little ZIG when you stake: “Max” can leave nothing for the next step.',
      nl: 'Elke transactie op ZIGChain betaalt een kleine netwerkvergoeding in ZIG aan de validators die haar verwerken; gas is het werk dat ze vraagt. Je wallet toont de vergoeding voor je tekent en laat je die soms verhogen. ZIGChain neemt zijn vergoedingen alleen in ZIG, dus hou wat ZIG over als je staket: “Max” kan niets overlaten voor de volgende stap.'}},
  {id: 'decoy', en: /\b(?:fake|decoy|real|copy|scam) zig\b|\bzig token (?:is )?(?:real|fake)\b|\bis (?:this|my) zig real\b/i, nl: /\b(?:nep|valse|echte|kopie) zig\b|\bis (?:deze|mijn) zig echt\b/i, academy: 'Spotting scams', section: 'native-staking',
    text: {en: 'Anyone can create a token named “ZIG”. Real ZIG on ZIGChain is the chain’s own coin, azig; a look-alike “ZIG” token with other decimals exists. Match a token by its full denom, never by its name or logo, before you swap or send. Your recovery phrase is your money: real support never asks for it.',
      nl: 'Iedereen kan een token “ZIG” noemen. Echte ZIG op ZIGChain is de eigen munt van de chain, azig; er bestaat een nagemaakt “ZIG”-token met andere decimalen. Herken een token aan zijn volledige denom, nooit aan de naam of het logo, voor je wisselt of verstuurt. Je herstelzin is je geld: echte hulp vraagt er nooit naar.'}},
  {id: 'custody', en: /\b(?:non-?)?custod(?:ial|y)\b/i, nl: /\b(?:niet-?)?custod(?:ial|iaal)\b|\bbewaring\b/i, academy: 'Copy trading and custody', section: 'zignaly',
    text: {en: 'Custodial means a platform holds the money and you hold an account there; it decides what is possible, and when. Non-custodial means you hold the keys yourself in your own wallet: nobody can close your access, and nobody can recover a lost recovery phrase either. ZIGoals never holds keys.',
      nl: 'Custodial betekent dat een platform het geld bewaart en jij er een account hebt; het platform beslist wat kan, en wanneer. Non-custodial betekent dat je de sleutels zelf in je eigen wallet hebt: niemand kan je de toegang ontnemen, en niemand kan een verloren herstelzin terugvinden. ZIGoals houdt nooit sleutels.'}},
  // Session AF (L1c, N1; PLAN_APPROVED 11.9): the plan's other plain-words terms, for the pages' "What's this?" taps only
  // (English, no patterns: the coach does not match them). Facts from docs/earn/af (R2, RECHECK, ONCHAIN, R5); no numbers.
  {id: 'redelegate', section: 'native-staking', text: {en: 'Redelegating moves your stake from one validator to another in one step. It keeps earning the whole time, with no unbonding wait. The same ZIG can only be moved again once the unbonding time has passed, and the chain allows only a few such moves at a time.'}},
  {id: 'rewards', section: 'native-staking', text: {en: 'Rewards are the new ZIG the network pays to staked ZIG with every block, after your validator’s commission. They wait for you, counted on the chain, until you claim them: claiming moves them into your wallet as ZIG you can use, for a small network fee. Staking more with a validator, or unstaking from it, pays out the rewards waiting with it by itself. Claimed rewards earn nothing until you stake them again.'}},
  {id: 'jailed', section: 'validators', text: {en: 'A jailed validator has been paused by the network, for staying offline too long or for signing two different blocks. While it is jailed it adds no blocks and the stake behind it earns nothing. After a waiting time it can ask to come back; one that signed two different blocks is removed for good. Your stake stays yours, and you can move it to another validator at once.'}},
  {id: 'voting-power', section: 'validators', text: {en: 'Voting power is the share of all staked ZIG that stands behind one validator: its own stake and its delegators’. The more it has, the more often it adds blocks and the more its vote weighs in governance. When a few validators hold most of it, the network depends on them, which is why spreading stake helps.'}},
  {id: 'exchange-rate', section: 'valdora', text: {en: 'stZIG’s exchange rate is how much ZIG one stZIG is worth when it is redeemed through Valdora’s contract. It grows as staking rewards come in, so the same stZIG is worth more ZIG over time. On an exchange stZIG trades at the pool’s own price instead, usually a little below the contract’s. ZIGoals shows the contract’s rate only while the two agree closely.'}},
  {id: 'pool-depth', section: 'oroswap', text: {en: 'A pool’s depth is how much of each token it holds. In a deep pool a swap barely moves the price; in a shallow one a large swap moves it a lot, so you get noticeably less than the price you first saw. The Earn page shows each pool’s depth, read from the chain.'}},
  {id: 'swap', section: 'oroswap', text: {en: 'A swap trades one token for another through a pool, at the pool’s price at that moment, in one transaction. You pay the pool’s swap fee and the network fee, and the bigger your swap is against the pool, the more the price moves against you. Your wallet shows what you give and what you get before you sign.'}},
  {id: 'copy-trading', section: 'zignaly', text: {en: 'Copy trading lets a trader or a strategy on a platform invest your money for you; with profit sharing, that trader keeps a share of any profit. The platform holds the money, not your own wallet, and its rules decide when you can take it out. Past results promise nothing. Zignaly offered this, and it is closing.'}},
  {id: 'seed-phrase', section: 'safety', text: {en: 'A seed phrase (or recovery phrase) is the list of words that rebuilds your wallet’s keys. Whoever has it can move everything in the wallet, from anywhere. Write it on paper, keep it offline, and never type it into a website, a chat or an app that asks for it. ZIGoals and real support never ask for it.'}},
  {id: 'practice-network', section: 'start-here', text: {en: 'The practice network (ZIGChain’s testnet) works like the real one, but its ZIG is free test money with no value: a safe place to try staking, voting and fees. The real network (mainnet) is where ZIG has real value and every signed action is final. ZIGoals always says which one you are on.'}},
  {id: 'bridge', section: 'stablecoins', text: {en: 'A bridge moves tokens from one network to another. Between ZIGChain and other Cosmos networks this is IBC, the networks’ own way to pass tokens; routes from Ethereum go through bridge services. Each hop is software that can fail or be paused, and a token can arrive as a different version of itself (USDC.inj or USDC.n, for example), so check what lands.'}},
  {id: 'proposal', section: 'governance', text: {en: 'A governance proposal is a change to ZIGChain put to a vote: a rule, a software upgrade, or who may upload smart contracts, for example. It needs a deposit to start; then staked ZIG votes for a set time, and the chain counts the result against its own quorum and thresholds. Its title and text are written by whoever proposed it, so read what it would actually change.'}},
  {id: 'quorum', section: 'governance', text: {en: 'Quorum is the smallest share of all staked ZIG that must vote for a proposal’s result to count. If less stake than that votes, the proposal fails, whatever the votes said. ZIGChain sets its quorum in its own rules; the Governance page shows it, read from the chain.'}},
  {id: 'verified-link', section: 'safety', text: {en: 'A verified link is an address ZIGoals took from the app’s own official sources and checked itself, kept in one fixed list; the mark beside it shows the day it was checked. ZIGoals never builds a link from something typed, pasted or read from a page. Copies of real sites are used to steal wallets, so open apps from verified links or your own bookmarks.'}},
];
const FILLERS = String.raw`(?:(?:hey|hi|ok|okay|so|um+|uh+|hé|hoi|dus|euh|eh|zigi),?\s+)*`;
const DEFINE_START_EN = new RegExp(`^${FILLERS}(?:what(?:'s| is| are| does)|explain|tell me (?:about|what)|how does|how long does|define|meaning of|is (?:this|my)|can you explain)\\b`, 'i');
const DEFINE_END_EN = /\b(?:mean|means|work|works)\??\s*$/i;
const DEFINE_START_NL = new RegExp(`^${FILLERS}(?:wat (?:is|zijn|betekent|bedoel je met)|leg|uitleg|vertel (?:me )?(?:over|wat)|hoe (?:werkt|lang duurt|zit het met)|is (?:deze|mijn))\\b`, 'i');
const DEFINE_END_NL = /\b(?:uit|uitleggen|betekent|werkt)\??\s*$/i;
/** Advice is never a definition ("should I stake?"), and a question about the person's own figures is a lookup. */
const ADVICE_Q = /\b(?:should|best|recommend|worth it|good idea|which validator|moet ik|zou ik|beste|aanraden|raad je)\b/i;
const LOOKUP_Q = /\b(?:balance|how much|how many|total|holdings?|have i|do i have|earned|hoeveel|saldo|heb ik)\b/i;
/** The term a definition question asks about, in the language it is asked in; null for anything else. */
export function glossaryTerm(question: string): {term: GlossaryTerm; lang: GlossaryLang} | null {
  const q = question.trim().replace(/\s+/g, ' ');
  if (!q || q.length > 160 || ADVICE_Q.test(q) || LOOKUP_Q.test(q)) return null;
  const nl = DEFINE_START_NL.test(q) || (DEFINE_END_NL.test(q) && !DEFINE_START_EN.test(q));
  if (!nl && !DEFINE_START_EN.test(q) && !DEFINE_END_EN.test(q)) return null;
  // The most specific term first (impermanent loss before pool, liquid staking before staking, unbonding before staking).
  const order = ['impermanent-loss', 'liquid-staking', 'unbonding', 'slippage', 'decoy', 'apy', 'apr', 'commission', 'slashing', 'validator', 'gas', 'custody', 'pool', 'staking'];
  for (const id of order) { const term = GLOSSARY.find(t => t.id === id)!; if ((nl ? term.nl : term.en)?.test(q)) return {term, lang: nl ? 'nl' : 'en'}; }
  return null;
}
export const asOfWords = (iso: string): string => { const t = Date.parse(iso); return Number.isFinite(t) ? `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'an unknown time'; };
/** A figure with its source and "as of", as ZIGi says it: the snapshot's own words, never ZIGi's number. */
export function figureSentence(f: SnapshotFigure, lang: GlossaryLang): string {
  return lang === 'nl' ? `${f.label}: ${f.value} (bron: ${f.source}, stand ${asOfWords(f.asOf)}).` : `${f.label}: ${f.value} (source: ${f.source}, as of ${asOfWords(f.asOf)}).`;
}
/** The figures a term may quote from the snapshot (a prefix id takes every figure that starts with it, at most two). */
export function termFigures(term: GlossaryTerm, snapshot: EarnSnapshot | null | undefined): SnapshotFigure[] {
  if (!snapshot || !term.figures?.length) return [];
  const out: SnapshotFigure[] = [];
  for (const id of term.figures) for (const f of snapshot.figures) if ((f.id === id || (f.id.startsWith(`${id}-`) && id === 'oroswap-fee')) && !out.includes(f)) out.push(f);
  // The APR: both native figures side by side when both are there (H97); otherwise the one the page read.
  if (term.id === 'apr' && out.some(f => f.id === 'native-apr-measured') && out.some(f => f.id === 'native-apr-issuance-at-measured')) return out.filter(f => f.id !== 'native-apr-before-commission');
  return out.slice(0, term.id === 'apr' ? 2 : 2);
}
/** The whole answer: the plain words, then the live figures with their sources (or where to find them), then the label. */
export function glossaryAnswer(term: GlossaryTerm, lang: GlossaryLang, snapshot: EarnSnapshot | null | undefined): string {
  const figures = termFigures(term, snapshot);
  const live = figures.length ? figures.map(f => figureSentence(f, lang)).join(' ') + (term.id === 'apr' && snapshot?.disagree ? (lang === 'nl' ? ' De twee cijfers verschillen sterk; de Earn-pagina toont ze allebei.' : ' The two figures disagree; the Earn page shows both.') : '')
    : term.figures?.length ? (lang === 'nl' ? 'Het cijfer van nu staat op de Earn-pagina, met zijn bron; ZIGi heeft het in dit bezoek nog niet gelezen.' : 'The current figure is on the Earn page, with its source; ZIGi has not read it in this visit.') : '';
  const learn = term.academy ? (lang === 'nl' ? `Meer in Earn → Academy: “${term.academy}”.` : `More in Earn → Academy: “${term.academy}”.`) : '';
  return [term.text[lang] ?? term.text.en, live, learn, NOT_ADVICE[lang]].filter(Boolean).join('\n\n');
}
