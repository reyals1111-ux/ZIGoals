import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {runTool} from '../tools/registry';
import type {ToolOk} from '../tools/types';
import type {LocalReply} from './engine';
import {amount} from './words';
import type {OPEN_PAGES, PAGE_VIEWS} from '../actions/schema';

/**
 * Session AL (lane L7; Denver DV-061a/P-DV-84, Nairobi NB-104/P-NB-59, Tokyo TK-049/TK-051/P-TK-32, Berlin BN-058/059/060
 * and P-BN-16): questions ZIGi's no-model path answered with the examples list. Asked only after every other device answer
 * had none and with no model to ask (lib/ai/local-answers/no-model.ts), so every pinned answer stays as it is. Figures come
 * from the same tools (and so the same stores) the pages use; app facts come from Help, each with the place to go. What
 * ZIGi cannot work out here says so plainly, never a generic list.
 */
type Lang = 'en' | 'nl';
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const open = (page: (typeof OPEN_PAGES)[number], view?: (typeof PAGE_VIEWS)[number]) => `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page, ...(view ? {view} : {})})}\n\`\`\``;
const NOT_HERE = /\b(?:should|recommend|advi[cs]e|suggest|better|worth|zou ik|advies)\b|\b(?:and|then|en|dan)\s+(?:log|add|set|mark|delete|zet|voeg|vink|maak)\b/i;

const GOALS_LIST = /\b(?:list|show(?: me)?|what are|which are)\s+(?:all\s+)?(?:of\s+)?my goals\b|\bwhich goals (?:do )?i have\b|\bwhat goals (?:do )?i have\b|\bhow many goals\b|\bmy goals\s*[?.!]*$|\bwelke doelen heb ik\b|\bhoeveel doelen\b/i;
const GOALS_BEHIND = /\b(?:which|what|any)\s+goals?\s+(?:are|is)\s+(?:behind|off track|late|falling behind)\b|\bgoals?\s+(?:that are\s+)?behind\b|\bwelke doelen (?:lopen|liggen) achter\b/i;
const BIGGEST = /\b(?:biggest|largest|top)\s+(?:holding|position|asset|coin)\b|\bwhat do i (?:hold|own) (?:the )?most (?:of)?\b|\bgrootste (?:positie|bezit)\b/i;
const PNL = /\bp\s*&\s*l\b|\bpnl\b|\bprofit (?:and|&) loss\b|\bhow much (?:have i|did i) (?:made|make|lost|lose)\b|\bwinst (?:en|of) verlies\b/i;
type Fact = {re: RegExp; en: string; nl: string; page?: (typeof OPEN_PAGES)[number]; view?: (typeof PAGE_VIEWS)[number]};
// Each fact is from Help (components/help/help-page.tsx, the anchor named) and names where it is done.
const FACTS: readonly Fact[] = [
  {re: /\b(?:export|download|back ?up|backup|copy of)\b[^.?!]{0,30}\b(?:my )?(?:data|records|everything)\b|\bexport everything\b|\b(?:exporteer|back-?up)\b[^.?!]{0,30}\b(?:gegevens|data|alles)\b/i, page: 'settings', view: 'data',
    en: 'Settings → Your data → Export everything makes one ZIP of all your records (photos included); Restore from a backup reads it back, and Test a backup checks it without changing anything. (Help: “How do I restore from a backup?”)',
    nl: 'Settings → Your data → Export everything maakt één ZIP met al je gegevens (ook foto’s); Restore from a backup leest hem terug, en Test a backup controleert hem zonder iets te veranderen. (Help: “How do I restore from a backup?”)'},
  {re: /\b(?:erase|wipe|delete|remove)\b[^.?!]{0,20}\b(?:everything|all (?:my )?(?:data|records))\b|\breset (?:the )?app\b|\b(?:wis|verwijder)\b[^.?!]{0,20}\b(?:alles|al mijn gegevens)\b/i, page: 'settings', view: 'data',
    en: 'Settings → Backup & restore ends with “Erase everything on this device”: after you type ERASE it removes every ZIGoals record from this browser. Make Export everything first if you want a copy; nothing on a blockchain or another device changes. ZIGi never erases anything from a chat.',
    nl: 'Settings → Backup & restore eindigt met “Erase everything on this device”: nadat je ERASE typt, verwijdert het alle ZIGoals-gegevens uit deze browser. Maak eerst Export everything als je een kopie wilt; niets op een blockchain of een ander apparaat verandert. ZIGi wist nooit iets vanuit een chat.'},
  {re: /\b(?:what|does|do|is|how)\b[^.?!]{0,30}\bsync(?:s|ed|ing)?\b|\bsynchroni[sz]\w*\b/i, page: 'settings',
    en: 'With an account and encrypted sync on, Goals and Wealth, Habits and Today’s preferences sync, and Health only after you tick it on each device; it is encrypted on this device before it leaves. Settings → Account & devices shows Sync by section. Photos stay on the device where you added them. (Help: “What syncs now?”)',
    nl: 'Met een account en versleutelde sync aan synchroniseren Goals en Wealth, Habits en de voorkeuren van Today, en Health pas als je het op elk apparaat aanvinkt; het wordt op dit apparaat versleuteld voordat het vertrekt. Settings → Account & devices toont Sync by section. Foto’s blijven op het apparaat waar je ze toevoegde. (Help: “What syncs now?”)'},
  {re: /\b(?:vot(?:e|ing)|governance|proposals?|quorum|deposit period|voting period)\b|\b(?:stemmen|stemming|voorstel(?:len)?)\b/i,
    en: 'On the Governance page each proposal shows, in plain words, its deadline and the tally so far against the chain’s quorum, threshold and veto, read from the network. You can vote Yes, No, Abstain or No with veto if you have ZIG staked with an active validator; you review it and sign in Keplr, and a vote is public. ZIGi does not read chain parameters itself, so for a period or a figure, open Governance. (Help: “Can I vote on ZIGChain proposals from ZIGoals?”)',
    nl: 'Op de Governance-pagina toont elk voorstel in gewone woorden de deadline en de stand tot nu toe tegenover het quorum, de drempel en het veto van de chain, gelezen van het netwerk. Je kunt stemmen met Yes, No, Abstain of No with veto als je ZIG hebt gestaked bij een actieve validator; je controleert het en tekent in Keplr, en een stem is openbaar. ZIGi leest zelf geen chain-parameters, dus open Governance voor een periode of een getal. (Help: “Can I vote on ZIGChain proposals from ZIGoals?”)'},
];
const run = (tool: string, args: Record<string, unknown>, env: ToolEnv) => { const result = runTool(tool, args, env); return {result, record: {tool, args, label: result.label}}; };
const dataOf = (r: ReturnType<typeof runTool>): Data => (r as ToolOk).data as Data;
const money = (value: unknown) => { const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(String(value ?? '')); return m ? amount(m[1]!, m[2]!) : String(value ?? ''); };

export function alFactsAnswer(question: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  const q = question.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
  if (!q || q.length > 200 || NOT_HERE.test(q)) return null;
  if (env && (GOALS_BEHIND.test(q) || GOALS_LIST.test(q))) {
    const r = run('list_goals', {}, env);
    if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const goals = ((dataOf(r.result).goals ?? []) as Data[]).filter(g => g.status !== 'closed');
    if (!goals.length) return {kind: 'answer', text: say(lang, 'You have no goals yet. Open Goals to create one.', 'Je hebt nog geen doelen. Open Goals om er een te maken.') + open('goals'), calls: [r.record]};
    const behind = GOALS_BEHIND.test(q), rows = behind ? goals.filter(g => /behind|off track|late/i.test(String(g.funding ?? ''))) : goals;
    const line = (g: Data) => `• ${clean(String(g.name), 60)}: ${g.progress && g.progress !== 'unknown' ? g.progress : say(lang, 'progress unknown', 'voortgang onbekend')}${g.now && g.target && g.now !== 'unknown' ? ` (${money(g.now)} ${say(lang, 'of', 'van')} ${money(g.target)})` : ''}${g.funding ? ` · ${g.funding}` : ''}`;
    if (behind && !rows.length) return {kind: 'answer', text: say(lang, `None of your ${goals.length} goals is marked behind on its plan right now.`, `Geen van je ${goals.length} doelen loopt nu achter op het plan.`), calls: [r.record]};
    const head = behind ? say(lang, `${rows.length} of your ${goals.length} goals ${rows.length === 1 ? 'is' : 'are'} behind on its plan:`, `${rows.length} van je ${goals.length} doelen ${rows.length === 1 ? 'loopt' : 'lopen'} achter op het plan:`) : say(lang, `You have ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}:`, `Je hebt ${goals.length} ${goals.length === 1 ? 'doel' : 'doelen'}:`);
    return {kind: 'answer', text: [head, ...rows.slice(0, 10).map(line), ...(rows.length > 10 ? [say(lang, `…and ${rows.length - 10} more on Goals.`, `…en nog ${rows.length - 10} op Goals.`)] : []), say(lang, 'Figures as the Goals page shows them; not financial advice.', 'Cijfers zoals de Goals-pagina ze toont; geen financieel advies.')].join('\n'), calls: [r.record]};
  }
  if (env && BIGGEST.test(q)) {
    const r = run('holdings', {}, env);
    if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const rows = ((dataOf(r.result).holdings ?? []) as Data[]).filter(h => /^-?\d/.test(String(h.value ?? '')));
    if (!rows.length) return {kind: 'answer', text: say(lang, 'No holding has a known value here, so there is no biggest one to name (unknown, not zero).', 'Geen positie heeft hier een bekende waarde, dus er is geen grootste te noemen (onbekend, niet nul).'), calls: [r.record]};
    // Per currency, never converted: the biggest in each currency the holdings are valued in.
    const byCurrency = new Map<string, Data>();
    for (const h of rows) { const [v, c] = String(h.value).split(' '); const best = byCurrency.get(c!); if (!best || Number(v) > Number(String(best.value).split(' ')[0])) byCurrency.set(c!, h); }
    const lines = [...byCurrency.values()].map(h => `• ${clean(String(h.asset ?? h.name ?? ''), 40)}: ${money(h.value)}`);
    return {kind: 'answer', text: [say(lang, 'Your biggest holding, per currency (never converted), as Wealth shows it:', 'Je grootste positie, per valuta (nooit omgerekend), zoals Wealth het toont:'), ...lines].join('\n'), calls: [r.record]};
  }
  if (PNL.test(q)) return {kind: 'answer', text: say(lang, 'I can’t work out profit and loss on this device yet: it needs what you paid, which ZIGi doesn’t read. Wealth → Portfolio shows each holding’s value and change as the page computes it.', 'Winst en verlies kan ik op dit apparaat nog niet berekenen: daarvoor is nodig wat je betaalde, en dat leest ZIGi niet. Wealth → Portfolio toont de waarde en verandering per positie zoals de pagina die berekent.') + open('portfolio'), calls: []};
  const fact = FACTS.find(f => f.re.test(q));
  if (fact) return {kind: 'answer', text: say(lang, fact.en, fact.nl) + (fact.page ? open(fact.page, fact.view) : ''), calls: []};
  return null;
}
