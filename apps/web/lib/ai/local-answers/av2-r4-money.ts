import type {MoneyEntry, MoneyLog} from '../../money-log/schema';
import {fromCents} from '../../money-log/engine';
import type {MoneyMore} from '../../money-more/schema';
import {formatCurrencyAmount, formatPercent} from '../../visual-format';
import {busiestDays, calendarCurrencies, monthCalendar} from '../../money-insights/month-days';
import {archivedOf, entriesIn} from '../../money-log/category';
import {STARTER_SETS} from '../../money-log/starter-sets';
import {groupsOf} from '../../money-log/groups';
import {placesOf} from '../../money-log/places';
import {lastChecked} from '../../money-log/reconcile';
import {questionChart, questionEntries, questionsOf} from '../../money-log/saved-searches';
import {tagsOf} from '../../money-tags/tags';
import type {MoneyTags} from '../../money-tags/schema';
import {monthlyAverage, type AverageSpan} from '../../money-insights/cash-flow';
import {crossover, CROSSOVER_MONTHS} from '../../money-insights/crossover';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, monthIn, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2, round 4 (money; Actual Budget, Lunch Money): the on-device answers to round 4's money features, in
 * English and Dutch, each read from the feature's own pure function (the figures its page shows) and only while Wealth is
 * shared. Every spending and income figure comes from Wealth → Spending's own `totals` / `byCategory` and the shared rule
 * in lib/money-log/counted.ts (through each feature's function), so NOVA, ZIGi and the pages say the same amounts. A
 * Dutch answer writes money the Dutch way ("€ 12,50") and its days and months as Dutch words. No money advice: figures
 * and plain words only. The lead wires `av2R4MoneyAnswer` into lib/ai/local-answers/engine.ts before `av2R3MoneyAnswer`;
 * lib/ai/local-answers/av2-r4-money.test.ts proves it claims none of the earlier corpus questions. Null when the question
 * is not one of these.
 */
export function av2R4MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Answer = (a: Asked) => LocalReply | null;
const ANSWERS: Answer[] = [];
const add = (...more: Answer[]) => { ANSWERS.push(...more); };
/** Money in the answer's language: "€12.50" in English (the display locale), "€ 12,50" in Dutch. */
export const moneyIn = (lang: Lang, cents: number, currency: string) => formatCurrencyAmount(fromCents(cents), currency, lang === 'nl' ? 'nl-NL' : undefined);
const logOf = (env: ToolEnv): MoneyLog | null => env.moneyLog ?? null;
const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
export const moreOf = (env: ToolEnv): MoneyMore | null => (env as ToolEnv & {moneyMore?: MoneyMore | null}).moneyMore ?? ((env.ak as {moneyMore?: MoneyMore | null} | null | undefined)?.moneyMore ?? null);
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];
export const PLACES = {
  spending: {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'},
  insights: {en: 'Wealth → Spending → Your money over time', nl: 'Vermogen → Uitgaven → Your money over time'},
  accounts: {en: 'Wealth → Accounts', nl: 'Vermogen → Rekeningen'},
} as const;

// ── A calendar of the month (#338) ─────────────────────────────────────────────────────────────────────────────────
/** "Which day did I spend the most this month", "op welke dag gaf ik deze maand het meest uit". */
function monthDays(a: Asked): LocalReply | null {
  const en = (/\b(?:which|what) days?\b.*\bspen[dt]\b.*\bmost\b|\bspen[dt]\b.*\b(?:each|every|per) day\b|\bspending\b.*\b(?:each|every|per) day\b/.test(a.f) && /\bthis month\b/.test(a.f)) || /\bspending calendar\b|\bcalendar of (?:my|the) (?:month|spending|money)\b/.test(a.f);
  const nl = (/\b(?:welke|op welke) dag(?:en)?\b.*\b(?:meest|meeste)\b|\bper dag\b.*\buit(?:gegeven|gaf|geven)\b|\buit(?:gegeven|gaf)\b.*\bper dag\b/.test(a.f) && /\bdeze maand\b/.test(a.f)) || /\buitgavenkalender\b|\bkalender van (?:mijn|de) (?:maand|uitgaven)\b/.test(a.f);
  if (!(en || nl) || /\b(?:average|on average|gemiddeld|usually|meestal)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const month = a.today.slice(0, 7), entries = entriesOf(a.env), calls = call('money_log', {calendar: month}, 'Spending · a calendar of the month');
  const cals = calendarCurrencies(entries, month).map(c => monthCalendar(entries, month, c, a.today, a.env.moneyLog?.weekStartsOn ?? 'monday')).filter(c => c.days > 0);
  if (!cals.length) return answer(say(a.lang, `Nothing logged this month yet. Each day you log spending or income shows on ${PLACES.insights.en} → A calendar of the month.`,
    `Deze maand is nog niets gelogd. Elke dag dat je uitgaven of inkomsten logt, staat op ${PLACES.insights.nl} → A calendar of the month.`), calls);
  const text = cals.map(cal => {
    const top = (lang: Lang) => busiestDays(cal).map(d => `${dayIn(lang, d.date, a.today)} ${moneyIn(lang, d.spent, cal.currency)}`), spentDays = cal.weeks.flat().filter(d => d.inMonth && d.spent > 0).length;
    return say(a.lang, `This month in ${cal.currency}: ${moneyIn('en', cal.spent, cal.currency)} spent on ${spentDays} ${spentDays === 1 ? 'day' : 'days'}, ${moneyIn('en', cal.received, cal.currency)} received${spentDays ? `; the largest ${spentDays === 1 ? 'day' : 'days'}: ${list(top('en'), 'en')}` : ''}.`,
      `Deze maand in ${cal.currency}: ${moneyIn('nl', cal.spent, cal.currency)} uitgegeven op ${spentDays} ${spentDays === 1 ? 'dag' : 'dagen'}, ${moneyIn('nl', cal.received, cal.currency)} ontvangen${spentDays ? `; de grootste ${spentDays === 1 ? 'dag' : 'dagen'}: ${list(top('nl'), 'nl')}` : ''}.`);
  }).join(' ');
  return answer(`${text} ${say(a.lang, `Each day is on ${PLACES.insights.en} → A calendar of the month; a cost spread over months counts its share each month, as your budgets do.`,
    `Elke dag staat op ${PLACES.insights.nl} → A calendar of the month; een kost verspreid over maanden telt elke maand zijn deel, zoals je budgetten.`)}`, calls);
}
add(monthDays);

// ── Archived categories and starter sets (#342, #347) ──────────────────────────────────────────────────────────────
/** "Which categories have I archived", "welke categorieën heb ik gearchiveerd". */
function archivedCategories(a: Asked): LocalReply | null {
  const en = /\barchived (?:categor(?:y|ies))\b|\bcategor(?:y|ies)\b.*\barchived\b/.test(a.f);
  const nl = /\bgearchiveerde categorie(?:en|n)?\b|\bcategorie(?:en|n)?\b.*\bgearchiveerd\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const log = logOf(a.env), calls = call('money_log', {archived: true}, 'Money log · archived categories');
  const rows = (['expense', 'income'] as const).flatMap(kind => (log ? archivedOf(log, kind) : []).map(name => ({kind, name, n: entriesIn(log?.entries ?? [], kind, name)})));
  if (!rows.length) return answer(say(a.lang, `No category is archived. In ${PLACES.spending.en} → Log spending → Your own categories, "Archive a category" takes one out of the pickers; its entries keep it.`,
    `Er is geen categorie gearchiveerd. In ${PLACES.spending.nl} → Log spending → Your own categories haalt "Archive a category" er een uit de keuzelijsten; je invoer houdt hem.`), calls);
  const item = (lang: Lang, r: typeof rows[number]) => `${r.name}${r.kind === 'income' ? say(lang, ' (money received)', ' (inkomsten)') : ''}${r.n ? say(lang, `, ${r.n} ${r.n === 1 ? 'entry' : 'entries'}`, `, ${r.n} ${r.n === 1 ? 'invoer' : 'invoeren'}`) : ''}`;
  return answer(say(a.lang, `Archived: ${list(rows.map(r => item('en', r)), 'en')}. They are no longer offered in the pickers; their entries keep them, and reports and search still show them. "Bring back" offers one again.`,
    `Gearchiveerd: ${list(rows.map(r => item('nl', r)), 'nl')}. Ze staan niet meer in de keuzelijsten; je invoer houdt ze, en overzichten en zoeken tonen ze nog. "Bring back" maakt er weer een kiesbaar.`), calls);
}
/** "What starter category sets are there", "welke startsets met categorieën zijn er". */
function starterSets(a: Asked): LocalReply | null {
  const en = /\bstarter (?:category )?sets?\b|\bcategory (?:sets?|templates?)\b/.test(a.f);
  const nl = /\bstartsets?\b|\bcategorieset\b|\bcategoriesets\b|\bset (?:met|van) categorie(?:en|n)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = call('money_log', {starterSets: true}, 'Money log · starter sets');
  const sets = (lang: Lang) => STARTER_SETS.map(s => `${s.title[lang].toLowerCase()} (${s.about[lang].replace(/\.$/, '').toLowerCase()})`);
  return answer(say(a.lang, `Four written starter sets: ${list(sets('en'), 'en')}. In ${PLACES.spending.en} → Log spending → Your own categories → Start from a set, see what each adds (in English or Dutch), then add it in one tap; nothing already there is changed.`,
    `Vier geschreven startsets: ${list(sets('nl'), 'nl')}. In ${PLACES.spending.nl} → Log spending → Your own categories → Start from a set zie je wat elke set toevoegt (in het Engels of Nederlands) en voeg je hem in één tik toe; wat er al is, blijft zoals het is.`), calls);
}
add(archivedCategories, starterSets);

// ── Groups of entries (#341) ───────────────────────────────────────────────────────────────────────────────────────
/** "Which groups of entries do I have", "welke groepen heb ik in mijn uitgaven". Totals by Wealth → Spending's `totals`. */
function entryGroups(a: Asked): LocalReply | null {
  const en = /\bgroups? of (?:my )?(?:entries|transactions|spending)\b|\b(?:entry|transaction|spending) groups?\b|\bgrouped (?:entries|transactions)\b/.test(a.f);
  const nl = /\bgroepen? (?:van |in )?(?:mijn )?(?:invoer|uitgaven|transacties|boekingen)\b|\bgegroepeerde (?:invoer|uitgaven|transacties)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const groups = groupsOf(entriesOf(a.env)), calls = call('money_log', {groups: true}, 'Money log · groups');
  if (!groups.length) return answer(say(a.lang, `You have no groups yet. In ${PLACES.spending.en} → Search all your entries, Select two or more entries and "Group" them under a name; they show as one line, and each still counts on its own.`,
    `Je hebt nog geen groepen. In ${PLACES.spending.nl} → Search all your entries kies je met Select twee of meer invoeren en zet je ze met "Group" onder een naam; ze staan dan als één regel, en elke telt nog apart mee.`), calls);
  const one = (lang: Lang, g: typeof groups[number]) => {
    const sums = g.totals.map(t => [t.expenses ? say(lang, `${moneyIn(lang, t.expenses, t.currency)} spent`, `${moneyIn(lang, t.expenses, t.currency)} uitgegeven`) : '', t.income ? say(lang, `${moneyIn(lang, t.income, t.currency)} received`, `${moneyIn(lang, t.income, t.currency)} ontvangen`) : ''].filter(Boolean).join(', ')).filter(Boolean);
    return `${g.name}: ${g.entries.length} ${say(lang, g.entries.length === 1 ? 'entry' : 'entries', g.entries.length === 1 ? 'invoer' : 'invoeren')}${sums.length ? `, ${sums.join('; ')}` : ''} (${dayIn(lang, g.from, a.today)}${g.to !== g.from ? ` – ${dayIn(lang, g.to, a.today)}` : ''})`;
  };
  return answer(say(a.lang, `${groups.slice(0, 5).map(g => one('en', g)).join('. ')}.${groups.length > 5 ? ` And ${groups.length - 5} more.` : ''} Each entry still counts on its own in your totals and budgets.`,
    `${groups.slice(0, 5).map(g => one('nl', g)).join('. ')}.${groups.length > 5 ? ` En nog ${groups.length - 5}.` : ''} Elke invoer telt nog apart mee in je totalen en budgetten.`), calls);
}
add(entryGroups);

// ── Payee places, typed names only (#346) ──────────────────────────────────────────────────────────────────────────
/** "Which places have I kept for my payees", "welke plekken heb ik voor mijn betalingen". Never a location. */
function payeePlaces(a: Asked): LocalReply | null {
  const en = /\b(?:my )?places\b.*\bpayees?\b|\bpayees?\b.*\b(?:my )?places\b|\bpayee places\b/.test(a.f);
  const nl = /\bplekken\b.*\b(?:betalingen|ontvangers|winkels|begunstigden)\b|\b(?:betalingen|ontvangers|winkels|begunstigden)\b.*\bplekken\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const places = placesOf(moreOf(a.env)), calls = call('money_more', {places: true}, 'Money · your places');
  if (!places.length) return answer(say(a.lang, `You have no places yet. In ${PLACES.spending.en} → Log spending → "Where are you?", add the places you often pay at (Work, The market); choosing one later lists the payees you logged there first. Typed names only: ZIGoals never reads where you are.`,
    `Je hebt nog geen plekken. In ${PLACES.spending.nl} → Log spending → "Where are you?" voeg je de plekken toe waar je vaak betaalt (werk, de markt); kies je er later een, dan komen de ontvangers die je daar logde eerst. Alleen namen die je typt: ZIGoals leest nooit waar je bent.`), calls);
  const one = (lang: Lang, p: typeof places[number]) => p.payees?.length ? `${p.name}: ${list(p.payees.slice(0, 5), lang)}${p.payees.length > 5 ? say(lang, ` and ${p.payees.length - 5} more`, ` en nog ${p.payees.length - 5}`) : ''}` : say(lang, `${p.name}: no payee kept yet`, `${p.name}: nog geen ontvanger bewaard`);
  return answer(say(a.lang, `${places.map(p => one('en', p)).join('. ')}. Places are names you typed, kept on this device; "Forget places" clears them.`,
    `${places.map(p => one('nl', p)).join('. ')}. Plekken zijn namen die je typte, bewaard op dit apparaat; "Forget places" wist ze.`), calls);
}
add(payeePlaces);

// ── Checked against the bank (#340) ────────────────────────────────────────────────────────────────────────────────
/** "When did I last check my account against my bank", "wanneer heb ik voor het laatst met mijn bank gecontroleerd". */
function checkedWithBank(a: Asked): LocalReply | null {
  const en = /\b(?:check(?:ed)?|reconcil(?:e|ed|iation))\b.*\b(?:against|with) (?:my|the) (?:bank|statement)\b|\breconcil(?:e|ed|iation)\b/.test(a.f);
  const nl = /\b(?:gecontroleerd|controleren|afgestemd|afstemmen|vergeleken)\b.*\b(?:met|tegen) (?:mijn|de) (?:bank|afschrift)\b|\b(?:met|tegen) (?:mijn|de) (?:bank|afschrift)\b.*\b(?:gecontroleerd|afgestemd)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const entries = entriesOf(a.env), calls = call('money_log', {checked: true}, 'Money log · checked against the bank');
  const currencies = [...new Set(entries.map(e => e.currency))].sort().filter(c => entries.some(e => e.currency === c && e.checked));
  if (!currencies.length) return answer(say(a.lang, `Nothing is checked against your bank yet. In ${PLACES.accounts.en}, "Check against my bank" on an account takes your statement's balances; tick the entries it shows until the difference is zero, then mark them checked.`,
    `Er is nog niets met je bank gecontroleerd. In ${PLACES.accounts.nl} neemt "Check against my bank" bij een rekening de saldi van je afschrift; vink de invoer aan die erop staat tot het verschil nul is, en markeer ze als gecontroleerd.`), calls);
  const text = currencies.map(c => {
    const last = lastChecked(entries, c)!, done = entries.filter(e => e.currency === c && e.checked).length, open = entries.filter(e => e.currency === c && !e.checked && e.date > last && e.date <= a.today).length;
    return say(a.lang, `In ${c}: checked up to ${dayIn('en', last, a.today)} (${done} ${done === 1 ? 'entry' : 'entries'}); ${open} ${open === 1 ? 'entry' : 'entries'} since then not yet checked.`,
      `In ${c}: gecontroleerd tot ${dayIn('nl', last, a.today)} (${done} ${done === 1 ? 'invoer' : 'invoeren'}); ${open} ${open === 1 ? 'invoer' : 'invoeren'} sindsdien nog niet gecontroleerd.`);
  }).join(' ');
  return answer(text, calls);
}
add(checkedWithBank);

// ── Saved searches with a chart (#344) ─────────────────────────────────────────────────────────────────────────────
const tagsRecordOf = (env: ToolEnv): MoneyTags | null => (env as ToolEnv & {moneyTags?: MoneyTags | null}).moneyTags ?? ((env.ak as {moneyTags?: MoneyTags | null} | null | undefined)?.moneyTags ?? null);
/** "What are my saved searches", "wat zijn mijn opgeslagen zoekopdrachten". Each with its total and monthly average. */
function savedSearches(a: Asked): LocalReply | null {
  const en = /\bsaved (?:money )?(?:searches|search|queries|query|questions)\b/.test(a.f);
  const nl = /\bopgeslagen (?:zoekopdrachten|zoekopdracht|zoekvragen|vragen)\b|\bbewaarde (?:zoekopdrachten|zoekvragen)\b/.test(a.f);
  // Session AW (#441): saved searches of notes are the Notes answer's (aw-x3.ts), in either language.
  if (!(en || nl) || /\b(?:notes?|notities?|aantekeningen)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const list = questionsOf(moreOf(a.env)), entries = entriesOf(a.env), tags = tagsRecordOf(a.env), calls = call('money_more', {questions: true}, 'Money · saved searches');
  if (!list.length) return answer(say(a.lang, `You have no saved searches yet. In ${PLACES.spending.en} → Search all your entries, set your filters and tap "Save this search"; ${PLACES.insights.en} → Saved searches then draws it as a chart, with its total and monthly average.`,
    `Je hebt nog geen opgeslagen zoekopdrachten. In ${PLACES.spending.nl} → Search all your entries kies je je filters en tik je op "Save this search"; ${PLACES.insights.nl} → Saved searches tekent hem dan als grafiek, met het totaal en het maandgemiddelde.`), calls);
  const one = (lang: Lang, q: typeof list[number]) => {
    const tagged = q.tag && tags ? new Set(entries.filter(e => tagsOf(tags, e.id).includes(q.tag!)).map(e => e.id)) : undefined;
    const charts = questionChart(questionEntries(entries, q, tagged), q, a.today, a.env.moneyLog?.weekStartsOn ?? 'monday');
    if (!charts.length) return say(lang, `${q.name}: nothing found right now`, `${q.name}: nu niets gevonden`);
    return `${q.name}: ${charts.map(c => say(lang, `${moneyIn(lang, c.total, c.currency)} ${c.figure} since ${dayIn(lang, c.from, a.today)}, ${moneyIn(lang, c.monthly, c.currency)} a month on average`, `${moneyIn(lang, c.total, c.currency)} ${c.figure === 'spent' ? 'uitgegeven' : 'ontvangen'} sinds ${dayIn(lang, c.from, a.today)}, gemiddeld ${moneyIn(lang, c.monthly, c.currency)} per maand`)).join('; ')}`;
  };
  return answer(say(a.lang, `${list.map(q => one('en', q)).join('. ')}. Counted as Wealth → Spending counts; each is drawn in ${PLACES.insights.en} → Saved searches.`,
    `${list.map(q => one('nl', q)).join('. ')}. Geteld zoals Vermogen → Uitgaven telt; elke staat als grafiek in ${PLACES.insights.nl} → Saved searches.`), calls);
}
add(savedSearches);

// ── The monthly average and investment income beside spending (#343, #345) ─────────────────────────────────────────
/** "How does this month's spending compare to my 6-month average", "hoe verhouden mijn uitgaven zich tot mijn gemiddelde". A fact. */
function monthAverage(a: Asked): LocalReply | null {
  const en = /\b(?:3|6|12|three|six|twelve) ?months? average\b|\bmonthly average\b|\baverage month\b/.test(a.f) && /\b(?:spend|spent|spending)\b/.test(a.f);
  const nl = /\b(?:3|6|12|drie|zes|twaalf) ?maands? ?gemiddelde\b|\bmaandgemiddelde\b|\bgemiddelde maand\b/.test(a.f) && /\b(?:uitgaven|uitgegeven|uitgeven)\b/.test(a.f);
  if (!(en || nl) || /\b(?:per day|a day|per dag|saved search|zoekopdracht)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const span: AverageSpan = /\b(?:3|three|drie)\b/.test(a.f) ? 3 : /\b(?:12|twelve|twaalf)\b/.test(a.f) ? 12 : 6, entries = entriesOf(a.env), calls = call('money_log', {average: span}, `Spending · ${span}-month average`);
  const rows = [...new Set(entries.map(e => e.currency))].sort().map(c => monthlyAverage(entries, c, a.today, span)).filter(r => r.total.average !== null);
  if (!rows.length) return answer(say(a.lang, `No ${span}-month average yet: the months before this one have no spending logged. ${PLACES.insights.en} → Categories over a year shows the average once they do.`,
    `Nog geen gemiddelde over ${span} maanden: de maanden hiervoor hebben geen gelogde uitgaven. ${PLACES.insights.nl} → Categories over a year toont het gemiddelde zodra dat zo is.`), calls);
  const one = (lang: Lang, r: typeof rows[number]) => {
    const m = (c: number) => moneyIn(lang, c, r.currency), d = r.total.diff!, over = r.recorded < span ? say(lang, ` (over the ${r.recorded} ${r.recorded === 1 ? 'month' : 'months'} with records)`, ` (over de ${r.recorded} ${r.recorded === 1 ? 'maand' : 'maanden'} met gegevens)`) : '';
    return say(lang, `In ${r.currency}, ${monthIn('en', r.month)} so far: ${m(r.total.thisMonth)}, ${d === 0 ? 'the same as' : `${m(Math.abs(d))} ${d > 0 ? 'above' : 'below'}`} your ${span}-month average of ${m(r.total.average!)}${over}.`,
      `In ${r.currency}, ${monthIn('nl', r.month)} tot nu toe: ${m(r.total.thisMonth)}, ${d === 0 ? 'gelijk aan' : `${m(Math.abs(d))} ${d > 0 ? 'boven' : 'onder'}`} je gemiddelde over ${span} maanden van ${m(r.total.average!)}${over}.`);
  };
  return answer(`${rows.map(r => one(a.lang, r)).join(' ')} ${say(a.lang, 'A figure from your own entries, not a target.', 'Een bedrag uit je eigen invoer, geen doel.')}`, calls);
}
const pctIn = (lang: Lang, share: number) => { const v = Math.round(share * (share < 0.1 ? 1000 : 100)) / (share < 0.1 ? 10 : 1); return lang === 'nl' ? `${String(v).replace('.', ',')}%` : formatPercent(share * 100, {decimals: share < 0.1 && share > 0 ? 1 : 0}); };
/** "How much of my spending does my investment income cover", "welk deel van mijn uitgaven dekken mijn beleggingsinkomsten". */
function investCover(a: Asked): LocalReply | null {
  const en = /\b(?:investment|passive|dividend|interest|staking) (?:income|rewards?)\b/.test(a.f) && /\b(?:cover|covers|spending|expenses|beside|against|share)\b/.test(a.f);
  const nl = /\b(?:beleggingsinkomsten|beleggingsinkomen|passief inkomen|dividend|rente|stakingbeloningen)\b/.test(a.f) && /\b(?:dekt|dekken|uitgaven|naast|deel)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const marks = a.env.moneyLog?.investIncome, entries = entriesOf(a.env), calls = call('money_log', {investIncome: true}, 'Spending · investment income beside spending');
  if (!marks?.length) return answer(say(a.lang, `No income category is marked as investment income yet. In ${PLACES.insights.en} → Month by month → Investment income beside spending, mark the categories that are (interest, dividends, staking rewards); each month is then set beside your spending.`,
    `Nog geen inkomstencategorie is gemarkeerd als beleggingsinkomen. In ${PLACES.insights.nl} → Month by month → Investment income beside spending markeer je welke dat zijn (rente, dividend, stakingbeloningen); elke maand staat dan naast je uitgaven.`), calls);
  const rows = [...new Set(entries.map(e => e.currency))].sort().map(c => crossover(entries, marks, c, a.today)).filter(r => r.recordedMonths > 0 && r.spending > 0);
  if (!rows.length) return answer(say(a.lang, `Nothing to set side by side yet: no spending logged in the last ${CROSSOVER_MONTHS} months.`, `Nog niets naast elkaar te zetten: geen uitgaven gelogd in de laatste ${CROSSOVER_MONTHS} maanden.`), calls);
  const one = (lang: Lang, r: typeof rows[number]) => say(lang, `In ${r.currency}, the last ${CROSSOVER_MONTHS} months: ${moneyIn('en', r.invest, r.currency)} investment income beside ${moneyIn('en', r.spending, r.currency)} spending, so it covers ${pctIn('en', r.share ?? 0)} of spending${r.latest && r.latest.share !== null ? `; in ${monthIn('en', r.latest.month)}, ${pctIn('en', r.latest.share)}` : ''}.`,
    `In ${r.currency}, de laatste ${CROSSOVER_MONTHS} maanden: ${moneyIn('nl', r.invest, r.currency)} beleggingsinkomen naast ${moneyIn('nl', r.spending, r.currency)} uitgaven, dus het dekt ${pctIn('nl', r.share ?? 0)} van je uitgaven${r.latest && r.latest.share !== null ? `; in ${monthIn('nl', r.latest.month)} ${pctIn('nl', r.latest.share)}` : ''}.`);
  return answer(`${rows.map(r => one(a.lang, r)).join(' ')} ${say(a.lang, 'From your own records and marks; not a forecast.', 'Uit je eigen gegevens en markeringen; geen voorspelling.')}`, calls);
}
add(monthAverage, investCover);
