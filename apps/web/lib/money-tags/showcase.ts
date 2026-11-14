import {moneyTagsSchema, type MoneyTags} from './schema';
import type {MoneyLog} from '../money-log/schema';

/**
 * Session AP: the Showcase's example tags, only on that log's own fictional entries (lib/money-log/showcase.ts, each
 * noted "SHOWCASE DATA"); the Tags view says "Fictional Showcase entries" beside them. Deterministic for a log. For
 * lib/showcase-data.ts: `records[MONEY_TAGS_KEY] = JSON.stringify(showcaseMoneyTags(showcaseMoneyLog(day)))`.
 */
const BY_NOTE: [RegExp, string[]][] = [
  [/^Lunch\b/, ['example', 'work']], [/^Weekly shop\b/, ['example', 'household']], [/^Market\b/, ['example', 'household']],
  [/^Cinema\b|^Pizza\b|^Dinner\b/, ['example', 'going out']], [/^Birthday present\b/, ['example', 'family']], [/^Logo design\b/, ['example', 'side work']],
];
export function showcaseMoneyTags(log: MoneyLog): MoneyTags {
  const tags = log.entries.filter(e => e.id.startsWith('showcase-money-')).flatMap(e => {
    const hit = BY_NOTE.find(([re]) => re.test(e.note ?? ''));
    return hit ? [[e.id, hit[1]] as const] : [];
  });
  return moneyTagsSchema.parse({version: 1, tags: Object.fromEntries(tags)});
}
