import {moneyRulesSchema, type MoneyRules} from './schema';

/**
 * Session AK (lane M, item 1): the Showcase's two fictional money rules beside its money log (lib/money-log/showcase.ts),
 * so Wealth → Spending → Money tools → Rules has something to show. Each matches only the Showcase's own fictional entries
 * ("Tram · SHOWCASE DATA", "Music · SHOWCASE DATA"); the memo after " · " is kept, so a renamed entry still says SHOWCASE
 * DATA. Nothing is applied until someone uses "Apply to the past 90 days" in the Showcase tab. Deterministic for a day.
 */
export function showcaseMoneyRules(day: string): MoneyRules {
  const at = `${day}T09:00:00.000Z`;
  return moneyRulesSchema.parse({version: 1, rules: [
    {id: 'showcase-rule-tram', field: 'payee', op: 'equals', text: 'Tram', direction: 'out', category: 'Transport', tag: 'commute', enabled: true, createdAt: at},
    {id: 'showcase-rule-music', field: 'payee', op: 'equals', text: 'Music', direction: 'out', category: 'Subscriptions', renameTo: 'Music subscription', enabled: true, createdAt: at},
  ]});
}
