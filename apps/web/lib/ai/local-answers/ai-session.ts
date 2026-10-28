import Decimal from 'decimal.js';
import {briefChatText} from '../proactive/brief';
import type {ToolEnv} from '../tools/env';
import {runTool} from '../tools/registry';
import type {ToolOk, ToolResult} from '../tools/types';
import {questionLanguage} from './no-model';
import {patternLine, patterns} from '../../journal/reflect';
import type {LocalReply, ToolCallRecord} from './engine';

/**
 * Session AI (ZI2, ZI11, ZI12, ZI13, G11): natural questions the device answers itself, in English and Dutch, from the
 * same tools and records as the pages. Before this, each of them fell through to the canned list of examples:
 * "did I sleep enough?", "am I on track for my Emergency fund?", "which habit am I worst at?", "summarise my day", the
 * price of a coin, "why did my net worth change?", "what can you see of my data?", and the simple command "create a habit
 * called Yoga" (a card, saved only when the person adds it). Consulted only when the main engine has no answer; each
 * pattern is narrow, so no question the engine answered before changes. Facts only: no advice, no judgement words.
 */
type Lang = 'en' | 'nl';
const call = (tool: string, args: Record<string, unknown>, env: ToolEnv): {result: ToolResult; record: ToolCallRecord} => {
  const result = runTool(tool, args, env);
  return {result, record: {tool, args, label: result.label}};
};
const dataOf = (r: ToolResult) => (r as ToolOk).data as Record<string, unknown>;
const refusalOf = (r: ToolResult, calls: ToolCallRecord[]): LocalReply => ({kind: 'refusal', text: (r as {refusal?: string}).refusal ?? 'ZIGi cannot read that here.', calls});
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;

const SUMMARY = /^(?:(?:hey|hi|ok|okay|so|zigi|please),?\s+)*(?:summari[sz]e|sum up|give me (?:a |the )?summary of|recap) (?:my |the )?(?:day|today)\b|^vat (?:mijn |de )?dag samen\b|^geef (?:me )?(?:een )?samenvatting van (?:mijn |de )?dag\b/i;
const SLEEP_ENOUGH = /\b(?:did|do|have|am) i (?:get |been )?(?:sleep(?:ing)?|slept|getting) (?:enough|well|ok(?:ay)?)\b|\benough sleep\b|\bgenoeg (?:ge)?slapen\b|\bgenoeg slaap\b|\b(?:heb|slaap) ik (?:goed|genoeg)\b/i;
const ON_TRACK = /\b(?:am i|are we|is it|ben ik|lig ik|zit ik)\s+(?:still\s+|nog\s+)?(?:on track|on schedule|op schema|op koers|op tijd)\b(?:\s+(?:for|with|voor|met)\s+(?:my |the |mijn |het |de )?(.+?))?\s*\??$/i;
const WORST_HABIT = /\b(?:which|what) habit (?:am i|do i|have i been) (?:the )?(?:worst|weakest|struggling)\b|\bworst habit\b|\bweakest habit\b|\b(?:welke|met welke) gewoonte\b.*\b(?:slechtst|moeilijkst|minst)\b/i;
const PRICE = /\b(?:price|prijs|koers|trading at|waard)\b/i;
const ASSET = /\b(BTC|ETH|ZIG|USDC|USDT|SOL|ATOM|AAPL|NVDA|bitcoin|ether(?:eum)?)\b/i;
const WHY_CHANGE = /\bwhy\b.*\b(?:net worth|wealth|portfolio value|total)\b.*\b(?:change|changed|drop(?:ped)?|went (?:up|down)|go (?:up|down)|rise|rose|fall|fell)\b|\bwaarom\b.*\b(?:vermogen|nettovermogen|totaal)\b.*\b(?:veranderd|gedaald|gestegen|omhoog|omlaag)\b/i;
const WHAT_SEE = /\bwhat (?:can|do) you (?:see|read|know)(?: (?:of|about))? (?:my |me\b)|\bwhat (?:data|records) (?:do|can) you (?:see|read|access)\b|\bwat (?:zie|lees|weet) (?:jij|je) (?:van|over) (?:mijn|mij)\b|\bwelke gegevens (?:zie|lees) (?:jij|je)\b/i;
const NEW_HABIT_EN = /^(?:(?:please|ok|okay|hey|hi|zigi),?\s+)*(?:(?:can|could) you\s+)?(?:create|add|make|start|set up)\s+(?:a\s+)?(?:new\s+)?habit\s+(?:called|named)\s+["“']?([^"”'?.!,]{2,40}?)["”']?\s*[.!?]?$/i;
const NEW_HABIT_NL = /^(?:(?:hé|hoi|ok|zigi),?\s+)*(?:maak|voeg|start)\s+(?:een\s+)?(?:nieuwe\s+)?gewoonte\s+(?:(?:genaamd|met de naam)\s+)?["“']?([^"”'?.!,]{2,40}?)["”']?(?:\s+(?:aan|toe))?\s*[.!?]?$/i;

function sleepAnswer(lang: Lang, env: ToolEnv): LocalReply {
  const {result, record} = call('sleep_summary', {}, env);
  if (!result.ok) return refusalOf(result, [record]);
  const d = dataOf(result) as {last7Days?: {nightsLogged: number; averageAsleep: string}; yourGoal?: string; sleepDebt?: {total: string}};
  const week = d.last7Days;
  if (!week || !week.nightsLogged) return {kind: 'answer', text: say(lang, 'No nights are logged in the last 7 days, so there is nothing to compare with your goal yet.', 'Er zijn de afgelopen 7 dagen geen nachten gelogd, dus er is nog niets te vergelijken met je doel.'), calls: [record]};
  const goal = d.yourGoal ? say(lang, ` Your goal: ${d.yourGoal}.`, ` Je doel: ${d.yourGoal}.`) : '';
  const debt = d.sleepDebt?.total ? say(lang, ` Over those nights that is ${d.sleepDebt.total}.`, ` Over die nachten is dat ${d.sleepDebt.total.replace('less than your goal', 'minder dan je doel')}.`) : '';
  return {kind: 'answer', text: say(lang, `Over the last 7 days you slept ${week.averageAsleep} a night on average (${week.nightsLogged} nights logged).${goal}${debt} Figures from your logged nights; not medical advice.`,
    `De afgelopen 7 dagen sliep je gemiddeld ${week.averageAsleep} per nacht (${week.nightsLogged} nachten gelogd).${goal}${debt} Cijfers uit je gelogde nachten; geen medisch advies.`), calls: [record]};
}
function onTrackAnswer(lang: Lang, named: string | undefined, env: ToolEnv): LocalReply {
  const goals = call('list_goals', {}, env);
  if (!goals.result.ok) return refusalOf(goals.result, [goals.record]);
  const list = (dataOf(goals.result).goals as {name: string}[] | undefined) ?? [];
  const wanted = named?.replace(/\s+goal$|\s+doel$/i, '').trim();
  const match = wanted ? list.find(g => g.name.toLowerCase() === wanted.toLowerCase()) ?? list.find(g => g.name.toLowerCase().includes(wanted.toLowerCase()) || wanted.toLowerCase().includes(g.name.toLowerCase())) : list.length === 1 ? list[0] : undefined;
  if (!match) {
    const names = list.map(g => g.name).slice(0, 8).join(', ');
    return {kind: 'answer', text: wanted ? say(lang, `I could not find a goal called “${wanted}”.${names ? ` Your goals: ${names}.` : ''} Ask again with one of these names.`, `Ik vind geen doel met de naam “${wanted}”.${names ? ` Je doelen: ${names}.` : ''} Vraag het opnieuw met een van deze namen.`)
      : say(lang, `Which goal? ${names ? `Your goals: ${names}.` : 'You have no goals yet.'}`, `Welk doel? ${names ? `Je doelen: ${names}.` : 'Je hebt nog geen doelen.'}`), calls: [goals.record]};
  }
  const g = call('goal_progress', {goal: match.name}, env);
  if (!g.result.ok) return refusalOf(g.result, [goals.record, g.record]);
  const d = dataOf(g.result) as {name: string; progress?: string; now?: string; target?: string; targetDate?: string; funding?: string; plan?: {aheadOrBehind?: string; projectedCompletion?: string}};
  const status = d.plan?.aheadOrBehind ?? d.funding ?? null;
  const en = `${d.name}: ${d.progress ?? '—'}${d.now && d.target ? ` (${d.now} of ${d.target})` : ''}.${status ? ` Against your plan: ${status}.` : ''}${d.plan?.projectedCompletion ? ` At this pace it completes around ${d.plan.projectedCompletion}` : ''}${d.targetDate ? `${d.plan?.projectedCompletion ? '; ' : ' '}target ${d.targetDate}.` : d.plan?.projectedCompletion ? '.' : ''}`;
  const nlStatus = status?.replace(/^ahead by/, 'voor met').replace(/^behind by/, 'achter met').replace(/^on track$/, 'op schema').replace(/^ahead$/, 'voor').replace(/^behind$/, 'achter');
  const nl = `${d.name}: ${d.progress ?? '—'}${d.now && d.target ? ` (${d.now} van ${d.target})` : ''}.${nlStatus ? ` Ten opzichte van je plan: ${nlStatus}.` : ''}${d.plan?.projectedCompletion ? ` In dit tempo is het rond ${d.plan.projectedCompletion} af` : ''}${d.targetDate ? `${d.plan?.projectedCompletion ? '; ' : ' '}doeldatum ${d.targetDate}.` : d.plan?.projectedCompletion ? '.' : ''}`;
  return {kind: 'answer', text: say(lang, en, nl), calls: [goals.record, g.record]};
}
function worstHabitAnswer(lang: Lang, env: ToolEnv): LocalReply {
  const habits = call('list_habits', {}, env);
  if (!habits.result.ok) return refusalOf(habits.result, [habits.record]);
  const list = ((dataOf(habits.result).habits as {title: string; state: string}[] | undefined) ?? []).filter(h => h.state === 'active');
  const calls = [habits.record], rates: {title: string; rate: number; complete: number; scheduled: number}[] = [];
  for (const h of list.slice(0, 20)) {
    const s = call('habit_stats', {habit: h.title, range: 'last 30 days'}, env);
    calls.push(s.record);
    if (!s.result.ok) continue;
    const d = dataOf(s.result) as {days?: {scheduled: number; complete: number}};
    if (d.days && d.days.scheduled >= 3) rates.push({title: h.title, rate: d.days.complete / d.days.scheduled, complete: d.days.complete, scheduled: d.days.scheduled});
  }
  if (!rates.length) return {kind: 'answer', text: say(lang, 'There are not enough scheduled days in the last 30 days to compare your habits yet.', 'Er zijn in de afgelopen 30 dagen nog niet genoeg geplande dagen om je gewoontes te vergelijken.'), calls};
  rates.sort((a, b) => a.rate - b.rate || a.title.localeCompare(b.title));
  const pct = (r: number) => `${Math.round(r * 100)}%`, [low, next] = rates;
  const tail = next ? say(lang, ` Next: ${next.title}, ${pct(next.rate)}.`, ` Daarna: ${next.title}, ${pct(next.rate)}.`) : '';
  return {kind: 'answer', text: say(lang, `Over the last 30 days, ${low!.title} has the lowest completion: ${pct(low!.rate)} of its scheduled days (${low!.complete} of ${low!.scheduled}).${tail} Every check-in still counts.`,
    `De afgelopen 30 dagen heeft ${low!.title} de laagste voltooiing: ${pct(low!.rate)} van de geplande dagen (${low!.complete} van ${low!.scheduled}).${tail} Elke check-in telt.`), calls};
}
function priceAnswer(lang: Lang, asset: string, env: ToolEnv): LocalReply {
  const symbol = /^bitcoin$/i.test(asset) ? 'BTC' : /^ether/i.test(asset) ? 'ETH' : asset.toUpperCase();
  const h = call('holdings', {asset: symbol}, env), calls = [h.record], lines: string[] = [];
  if (h.result.ok) {
    for (const row of (dataOf(h.result).holdings as {asset: string; quantity: string; value: string; priceSource?: string; valuedAt?: string}[] | undefined) ?? []) {
      const m = /^([\d.]+) ([A-Z]{3,10})$/.exec(row.value), qty = Number(row.quantity.replace(/,/g, ''));
      if (!m || !(qty > 0)) { lines.push(say(lang, `Wealth: no price for ${symbol} on this device yet (the Wealth page shows the same).`, `Vermogen: nog geen prijs voor ${symbol} op dit apparaat (de Vermogen-pagina toont hetzelfde).`)); continue; }
      const price = new Decimal(m[1]!).div(row.quantity.replace(/,/g, '')).toDecimalPlaces(2).toFixed(2);
      lines.push(say(lang, `Wealth: ${price} ${m[2]} per ${symbol} (${row.priceSource ?? 'source unknown'}${row.valuedAt && row.valuedAt !== 'unknown' ? `, ${row.valuedAt.slice(0, 16).replace('T', ' ')} UTC` : ''}).`, `Vermogen: ${price} ${m[2]} per ${symbol} (${row.priceSource ?? 'bron onbekend'}${row.valuedAt && row.valuedAt !== 'unknown' ? `, ${row.valuedAt.slice(0, 16).replace('T', ' ')} UTC` : ''}).`));
    }
  }
  const p = call('portfolios', {}, env); calls.push(p.record);
  if (p.result.ok) for (const pf of (dataOf(p.result).portfolios as {portfolio: string; coins: {coin: string; price: string}[]}[] | undefined) ?? []) {
    const coin = pf.coins.find(c => c.coin.toUpperCase() === symbol);
    if (coin && coin.price !== 'no price') lines.push(say(lang, `Portfolio “${pf.portfolio}”: ${coin.price}.`, `Portfolio “${pf.portfolio}”: ${coin.price}.`));
  }
  if (!lines.length) return {kind: 'answer', text: say(lang, `${symbol} is not tracked in Wealth or Portfolio, so this device has no price for it. Prices appear once you track it.`, `${symbol} staat niet in Vermogen of Portfolio, dus dit apparaat heeft er geen prijs voor. Prijzen verschijnen zodra je het bijhoudt.`), calls};
  return {kind: 'answer', text: `${lines.join('\n')}\n${say(lang, 'Prices as these pages show them; facts only, not advice.', 'Prijzen zoals deze pagina’s ze tonen; alleen feiten, geen advies.')}`, calls};
}
function whyAnswer(lang: Lang, q: string, env: ToolEnv): LocalReply {
  const period = /\b(?:month|maand)\b/i.test(q) ? 'month' : /\b(?:year|jaar)\b/i.test(q) ? 'year' : 'week';
  const w = call('net_worth_change', {period}, env);
  if (!w.result.ok) return refusalOf(w.result, [w.record]);
  const rows = (dataOf(w.result).currencies as {currency: string; from?: {at: string; total: string}; to?: {at: string; total: string}; change?: string; changePercent?: string; movedMost?: {assetClass: string; change: string}[]; note?: string}[] | undefined) ?? [];
  if (!rows.length) return {kind: 'answer', text: say(lang, 'No wealth history is recorded yet, so there is no change to explain.', 'Er is nog geen vermogensgeschiedenis vastgelegd, dus er is geen verandering uit te leggen.'), calls: [w.record]};
  const lines = rows.map(r => !r.change ? `${r.currency}: ${r.note ?? ''}` : say(lang,
    `${r.currency}: ${r.change}${r.changePercent ? ` (${r.changePercent})` : ''}, from ${r.from!.total} on ${r.from!.at} to ${r.to!.total} on ${r.to!.at}.${r.movedMost?.length ? ` Moved most: ${r.movedMost.map(m => `${m.assetClass} ${m.change}`).join(', ')}.` : ''}`,
    `${r.currency}: ${r.change}${r.changePercent ? ` (${r.changePercent})` : ''}, van ${r.from!.total} op ${r.from!.at} naar ${r.to!.total} op ${r.to!.at}.${r.movedMost?.length ? ` Grootste bewegingen: ${r.movedMost.map(m => `${m.assetClass} ${m.change}`).join(', ')}.` : ''}`));
  return {kind: 'answer', text: `${lines.join('\n')}\n${say(lang, 'From your recorded wealth totals (tracked holdings; accounts and debts are not in this history), the same rule as the Wealth chart.', 'Uit je vastgelegde vermogenstotalen (bijgehouden bezittingen; rekeningen en schulden zitten niet in deze geschiedenis), dezelfde regel als de Vermogen-grafiek.')}`, calls: [w.record]};
}
function whatSeeAnswer(lang: Lang, env: ToolEnv): LocalReply {
  const health = env.areas.health;
  return {kind: 'answer', text: say(lang,
    `This answer was made on this device: nothing was sent anywhere. When your own AI is connected, ZIGi sends it your question and the records of the areas you share with it (Settings → ZIGi → What your AI sees), and only what the question needs. Health is ${health ? 'shared now' : 'not shared now'} ("Include Health"). Nothing is changed without your OK: every change is a card you add, or a kind you chose yourself to have added automatically (Settings → ZIGi, always with Undo).`,
    `Dit antwoord is op dit apparaat gemaakt: er is niets verstuurd. Als je eigen AI gekoppeld is, stuurt ZIGi je vraag en de gegevens van de gebieden die je deelt (Instellingen → ZIGi → Wat je AI ziet), en alleen wat de vraag nodig heeft. Gezondheid wordt ${health ? 'nu gedeeld' : 'nu niet gedeeld'} („Include Health”). Er verandert niets zonder jouw OK: elke wijziging is een kaart die je toevoegt, of een soort die je zelf automatisch liet toevoegen (Instellingen → ZIGi, altijd met Ongedaan maken).`), calls: []};
}
function newHabitAnswer(lang: Lang, title: string): LocalReply {
  const name = title.trim().replace(/\s+/g, ' ');
  const card = `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'create-habit', title: name})}\n\`\`\``;
  return {kind: 'answer', text: say(lang, `A new habit, ${name}. Add it below when it looks right; nothing is written before.`, `Een nieuwe gewoonte, ${name}. Voeg hem hieronder toe als het klopt; er wordt niets opgeslagen voordat je dat doet.`) + card, calls: []};
}
/**
 * Session AI (ZI11): a simple command answered with its card when no AI is connected ("Create a habit called Yoga",
 * "Maak een gewoonte Yoga aan"). With an AI connected the AI keeps these (it can ask about the schedule), so this runs only
 * on the no-model path (`noModelReply`). The card is saved only when the person adds it.
 */
const MONEY_ADVICE = /\b(?:should i|shall i|do i|would you|is (?:it|now) (?:a )?good (?:time|idea|moment) to|what should i|which (?:coin|asset|stock|validator) should i|moet ik|zal ik|is het (?:een )?goed (?:moment|idee) om|welke (?:munt|coin|validator) moet ik)\b.*\b(?:buy|sell|invest|stake|unstake|hold|put|koop|kopen|verkoop|verkopen|investeren|beleggen|staken|aanhouden)\b/i;
const HEALTH_ADVICE = /\b(?:should i|can i|is it (?:safe|ok|okay|healthy) (?:for me )?to|moet ik|mag ik|is het (?:veilig|gezond|goed) om)\b.*\b(?:take|stop|start|fast|pills?|medication|medicine|tablets?|diet|supplements?|dose|vast(?:en)?|medicijn(?:en)?|pil(?:len)?|tabletten|dieet|supplement(?:en)?|dosis|slaappillen)\b/i;
/** Session AI (ZI10, G8): with no AI, an advice ask gets the guardrail in plain words, never the example list. */
function adviceReply(q: string, lang: Lang): LocalReply | null {
  if (MONEY_ADVICE.test(q)) return {kind: 'answer', text: say(lang, 'I can’t advise on buying, selling, staking or investing: that choice is yours. I can show the facts from your records here, for example “What is the price of BTC?” or “What is my net worth?”.', 'Ik kan geen advies geven over kopen, verkopen, staken of beleggen: die keuze is aan jou. Ik kan de feiten uit je gegevens laten zien, bijvoorbeeld “Wat is mijn nettovermogen?”.'), calls: []};
  if (HEALTH_ADVICE.test(q)) return {kind: 'answer', text: say(lang, 'This is not medical advice, and I can’t give it: a doctor or pharmacist can help with that. I can show what your own records hold, for example “Did I sleep enough?”.', 'Dit is geen medisch advies, en dat kan ik niet geven: een arts of apotheker kan je daarbij helpen. Ik kan laten zien wat je eigen gegevens tonen, bijvoorbeeld “Heb ik genoeg geslapen?”.'), calls: []};
  return null;
}
export function simpleCommand(question: string): LocalReply | null {
  const q = question.trim(), lang: Lang = questionLanguage(q) === 'nl' || NEW_HABIT_NL.test(q) ? 'nl' : 'en';
  const advice = adviceReply(q, lang);
  if (advice) return advice;
  const habit = NEW_HABIT_EN.exec(q) ?? NEW_HABIT_NL.exec(q);
  const title = habit?.[1]?.trim();
  if (title && !/^(?:a|an|een|it|het|to .*|for .*|om .*)$/i.test(title)) return newHabitAnswer(lang, title);
  return null;
}
const SPEND_Q = /\b(?:how much (?:did|have) i (?:spend|spent|spending)|what did i spend|what have i spent|my spending|spent (?:this|last) (?:week|month)|hoeveel heb ik (?:\w+ ){0,3}uitgegeven|wat heb ik uitgegeven|mijn uitgaven)\b/i;
const ROOM_Q = /\b(?:room to spend|left to spend|how much (?:can i|do i have (?:left )?to) spend|budget left|money recap|weekly money|hoeveel (?:kan|mag) ik (?:nog )?uitgeven|budget over|geldoverzicht)\b/i;
function spendAnswer(lang: Lang, q: string, env: ToolEnv): LocalReply {
  const period = /\b(?:last week|vorige week)\b/i.test(q) ? 'last week' : /\b(?:this week|deze week|week)\b/i.test(q) ? 'this week' : /\b(?:last month|vorige maand)\b/i.test(q) ? 'last month' : 'this month';
  const cat = /\bon ([a-z &]{3,30}?)(?: this| last| in|\?|$)/i.exec(q)?.[1] ?? /\baan ([a-z &]{3,30}?)(?: deze| vorige|\?|$)/i.exec(q)?.[1];
  const s = call('spending', {period, ...(cat && !/\b(?:week|month|maand)\b/i.test(cat) ? {category: cat.trim()} : {}), }, env);
  if (!s.result.ok) return refusalOf(s.result, [s.record]);
  const d = dataOf(s.result) as {note?: string; totals?: {currency: string; spent: string; received: string}[]; byCategory?: {category: string; spent: string}[]; roomToSpendThisWeek?: {left: string; budget: string; daysLeft: number}; matched?: string};
  if (d.note) return {kind: 'answer', text: say(lang, d.note, 'Er is nog niets gelogd in Vermogen → Uitgaven.'), calls: [s.record]};
  const tot = (d.totals ?? []).map(t => t.spent).join(' and '), top = (d.byCategory ?? []).slice(0, 3).map(c => `${c.category} ${c.spent}`).join(', ');
  const room = d.roomToSpendThisWeek ? say(lang, ` Room to spend this week: ${d.roomToSpendThisWeek.left} of ${d.roomToSpendThisWeek.budget}.`, ` Ruimte deze week: ${d.roomToSpendThisWeek.left} van ${d.roomToSpendThisWeek.budget}.`) : '';
  const what = cat ? say(lang, ` on ${cat.trim()}`, ` aan ${cat.trim()}`) : '';
  return {kind: 'answer', text: say(lang, `You spent ${tot || 'nothing'}${what} ${period}.${top && !cat ? ` Biggest: ${top}.` : ''}${room} From your own entries in Wealth → Spending, never converted.`,
    `Je gaf ${period === 'this week' ? 'deze week' : period === 'last week' ? 'vorige week' : period === 'last month' ? 'vorige maand' : 'deze maand'} ${tot || 'niets'}${what} uit.${top && !cat ? ` Grootste: ${top}.` : ''}${room} Uit je eigen invoer in Vermogen → Uitgaven, nooit omgerekend.`), calls: [s.record]};
}
function roomAnswer(lang: Lang, env: ToolEnv): LocalReply {
  const s = call('spending', {period: 'this week'}, env);
  if (!s.result.ok) return refusalOf(s.result, [s.record]);
  const d = dataOf(s.result) as {note?: string; totals?: {spent: string; received: string}[]; byCategory?: {category: string; spent: string}[]; roomToSpendThisWeek?: {left: string; budget: string; spent: string; daysLeft: number}};
  const w = call('net_worth_change', {period: 'week'}, env), rows = w.result.ok ? (dataOf(w.result).currencies as {currency: string; change?: string}[] | undefined) ?? [] : [];
  const worth = rows.filter(r => r.change).map(r => `${r.change}`).join(', ');
  const room = d.roomToSpendThisWeek ? say(lang, `Room to spend: ${d.roomToSpendThisWeek.left} left of ${d.roomToSpendThisWeek.budget} (${d.roomToSpendThisWeek.daysLeft} days to go).`, `Ruimte om uit te geven: nog ${d.roomToSpendThisWeek.left} van ${d.roomToSpendThisWeek.budget} (${d.roomToSpendThisWeek.daysLeft} dagen te gaan).`) : say(lang, 'No weekly budget is set (Wealth → Spending).', 'Er is geen weekbudget ingesteld (Vermogen → Uitgaven).');
  const spent = (d.totals ?? []).map(t => t.spent).join(' and '), top = (d.byCategory ?? [])[0];
  return {kind: 'answer', text: say(lang, `This week: spent ${spent || 'nothing yet'}${top ? `, most on ${top.category} (${top.spent})` : ''}. ${room}${worth ? ` Recorded wealth this week: ${worth}.` : ''} Your own figures; not financial advice.`,
    `Deze week: ${spent || 'nog niets'} uitgegeven${top ? `, het meest aan ${top.category} (${top.spent})` : ''}. ${room}${worth ? ` Vastgelegd vermogen deze week: ${worth}.` : ''} Je eigen cijfers; geen financieel advies.`), calls: [s.record, w.record]};
}
const JOURNAL_Q = /\b(?:patterns?|what (?:do you|can you) see|what have i (?:been )?writ(?:ten|ing)|themes?)\b.*\b(?:journal|entries|diary)\b|\bmy journal\b|\b(?:patronen|wat zie je)\b.*\b(?:dagboek|journal)\b/i;
const ENERGY_Q = /\b(?:how (?:is|was|has been) my energy|my energy (?:this|last) week|energy levels?|energy ratings?|energy scores?|rated my energy|hoe (?:is|was) mijn energie|mijn energie|energie(?:score|cijfer)s?)\b/i;
/** Session AI: the daily energy rating, never food energy (kcal): "energy ratings" must not reach the nutrient answer. */
export const isEnergyRatingAsk = (q: string): boolean => ENERGY_Q.test(q) && !/\b(?:kcal|calories?|calorie[eë]n|food|eten|ate|gegeten)\b/i.test(q);
/** Session AI (feature 6): journal patterns, on this device only (nothing is sent; the words never leave it). */
function journalAnswer(lang: Lang, env: ToolEnv): LocalReply {
  const j = env.journal;
  if (!j || !j.entries.length) return {kind: 'answer', text: say(lang, 'Your journal is empty on this device. Write a few lines on Today or the Journal page.', 'Je dagboek is leeg op dit apparaat. Schrijf een paar regels op Vandaag of de dagboekpagina.'), calls: []};
  const found = patterns(j, env.energy ?? null).slice(0, 3);
  if (!found.length) return {kind: 'answer', text: say(lang, `${j.entries.length} entries so far; no theme came up three times in your last 14 yet.`, `Tot nu toe ${j.entries.length} stukjes; nog geen thema kwam drie keer terug in je laatste 14.`), calls: []};
  return {kind: 'answer', text: `${found.map(p => patternLine(p, lang)).join('\n')}\n${say(lang, 'Counts from your own entries, made on this device; never a diagnosis.', 'Tellingen uit je eigen stukjes, op dit apparaat gemaakt; nooit een diagnose.')}`, calls: []};
}
function energyAnswer(lang: Lang, env: ToolEnv, q = ''): LocalReply {
  const n = /\b(?:14|fourteen|two weeks|veertien|twee weken)\b/i.test(q) ? 14 : 7; // the period asked for, else the last 7 days
  const e = call('energy', {days: n}, env);
  if (!e.result.ok) return refusalOf(e.result, [e.record]);
  const d = dataOf(e.result) as {rated: number; average: number | null};
  if (!d.rated) return {kind: 'answer', text: say(lang, `No energy rated in the last ${n} days. Tap 1 to 5 on Today’s journal card.`, `Geen energie gemeten de afgelopen ${n} dagen. Tik 1 tot 5 op de dagboekkaart van Vandaag.`), calls: [e.record]};
  return {kind: 'answer', text: say(lang, `Your energy, the last ${n} days: ${d.average} of 5 on average, rated on ${d.rated} days (1 drained · 5 full of energy).`, `Je energie, de afgelopen ${n} dagen: gemiddeld ${d.average} van 5, op ${d.rated} dagen gemeten (1 leeg · 5 vol energie).`), calls: [e.record]};
}
/** The device's answer to one of these questions, or null (the engine's own fallback stands). */
export function aiLocalAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim(), lang: Lang = questionLanguage(q) === 'nl' ? 'nl' : 'en';
  if (SUMMARY.test(q)) return {kind: 'answer', text: briefChatText(env, env.now.getUTCHours() < 15 ? 'morning' : 'evening', {snapshot: env.earn}), calls: []};
  if (SLEEP_ENOUGH.test(q)) return sleepAnswer(lang, env);
  const track = ON_TRACK.exec(q);
  if (track) return onTrackAnswer(lang, track[1], env);
  if (WORST_HABIT.test(q)) return worstHabitAnswer(lang, env);
  if (WHY_CHANGE.test(q)) return whyAnswer(lang, q, env);
  if (ROOM_Q.test(q)) return roomAnswer(lang, env);
  if (JOURNAL_Q.test(q)) return journalAnswer(lang, env);
  if (ENERGY_Q.test(q)) return energyAnswer(lang, env, q);
  if (SPEND_Q.test(q)) return spendAnswer(lang, q, env);
  if (WHAT_SEE.test(q)) return whatSeeAnswer(lang, env);
  const asset = ASSET.exec(q);
  if (asset && PRICE.test(q)) return priceAnswer(lang, asset[1]!, env);
  return null;
}
