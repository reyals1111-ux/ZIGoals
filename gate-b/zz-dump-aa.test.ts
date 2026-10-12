// Gate B (temporary, never committed): this branch's records and device keys, as a fixture for 32cb9c5's own readers.
import {test} from 'vitest';
import {writeFileSync} from 'node:fs';
import {buildShowcase, showcaseChoices} from './showcase-data';
import {collectEverything, EVERYTHING_KEYS} from './export/everything';
import {searchRecentSchema, SEARCH_RECENT_KEY} from './search/recent';
test('dump', () => {
  const {records} = buildShowcase('2026-10-12', 'UTC');
  const all: Record<string, string> = {...records, ...showcaseChoices(), [SEARCH_RECENT_KEY]: JSON.stringify(searchRecentSchema.parse({version: 1, queries: ['sleep']}))};
  const texts = Object.fromEntries(EVERYTHING_KEYS.map(k => [k, all[k] ?? null]));
  const collected = collectEverything(texts, {now: new Date('2026-10-12T10:00:00Z'), version: 'aa', commit: 'aa', localSimulation: null});
  writeFileSync('/tmp/claude-0/-home-user-ZIGoals/9bf8d9d6-f7e3-5142-a87e-02ce840546f5/scratchpad/frozen/records.json', JSON.stringify(all));
  writeFileSync('/tmp/claude-0/-home-user-ZIGoals/9bf8d9d6-f7e3-5142-a87e-02ce840546f5/scratchpad/frozen/everything.json', JSON.stringify(collected.json));
});
