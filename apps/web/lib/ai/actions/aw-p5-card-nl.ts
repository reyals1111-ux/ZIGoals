/**
 * Session AW (p5-answers, S-10): the Life review card under a Dutch answer ("Hoe was mijn week?") was all English ("Open
 * the Life review: this week", "Opens /app/review on that period"), while the answer above it is Dutch. A card made on
 * this device for a Dutch question says its title and lines in Dutch; the screen it opens keeps the app's own English
 * name (Life review → This week), as the Dutch answers name screens, and the card's buttons stay the interface's own.
 * Only the Life review's cards (open-review, and open-page on the review's week or month) are said in Dutch here; nothing
 * of what the card does changes (the same navigation, the same device choice). Pure: a planned result in, the same out.
 */
type Planned = {ok: true; plan: {card: {kind: string; title: string; lines: string[]}}};
const NL: readonly [RegExp, string][] = [
  [/^Open the Life review: this week$/, 'Open het Life review: deze week'],
  [/^Open the Life review: this month$/, 'Open het Life review: deze maand'],
  [/^Opens \/app\/review on that period$/, 'Opent /app/review op die periode'],
  [/^Opens \/app\/review on this week$/, 'Opent /app/review op deze week'],
  [/^Opens \/app\/review on this month$/, 'Opent /app/review op deze maand'],
  [/^The period is a choice kept on this device$/, 'De periode is een keuze die op dit apparaat blijft'],
];
const say = (line: string) => { for (const [re, nl] of NL) if (re.test(line)) return nl; return line; };
export function cardInLanguage<T extends {ok: boolean}>(result: T, lang: 'en' | 'nl' | undefined): T {
  if (lang !== 'nl' || !result.ok) return result;
  const r = result as unknown as Planned, kind = r.plan.card.kind;
  if (kind !== 'open-review' && !(kind === 'open-page' && /^Open Life review → This (?:week|month)$/.test(r.plan.card.title))) return result;
  const card = {...r.plan.card, title: say(r.plan.card.title), lines: r.plan.card.lines.map(say)};
  return {...result, plan: {...r.plan, card}} as unknown as T;
}
