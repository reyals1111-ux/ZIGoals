import {describe, expect, it} from 'vitest';
import {PATH_LABEL_MAX, cleanPathLabel, pathLabelOf, suggestPathLabel} from './path-label';
import {addCustom, updateItem} from './store';
import {checklistSchema, emptyChecklist} from './schema';

// Session AG Polish 3 (ADR-032 L23; owner amendment 10, step 4): one short word per node on the path.
describe('the one word on the path', () => {
  it('suggests a curated word for familiar items, else the main word with numbers, units and filler verbs dropped', () => {
    const cases: [string, string][] = [
      ['Play piano 15 minutes', 'Piano'], ['Take Vitamins & Creatine', 'Vitamins'], ['Water', 'Water'], ['Read ten pages', 'Read'],
      ['Meditate ten minutes', 'Meditate'], ['Walk 8,000 steps', 'Walk'], ['Cold shower', 'Shower'], ['Journal three lines before bed', 'Journal'],
      ['No sugar today', 'Sugar'], ['Learn Spanish', 'Spanish'], ['Log breakfast', 'Breakfast'], ['Weigh in', 'Weigh-in'], ['Morning run', 'Run'],
      ['Call grandma', 'Call'], ['Do 20 push-ups', 'Push-ups'], ['15', 'Step'], ['', 'Step'],
    ];
    for (const [name, word] of cases) expect(suggestPathLabel(name), name).toBe(word);
  });
  it('is one word of 12 letters at most, whatever the name', () => {
    for (const name of ['Supercalifragilistic exercises', 'Practise the cello for an hour', 'Ünïcödé wörds', '— 10 km —', 'a b c d e f g'])
      expect(suggestPathLabel(name), name).toMatch(new RegExp(`^\\S{1,${PATH_LABEL_MAX}}$`));
  });
  it("keeps a person's own word: its first word, 12 letters at most; empty for none", () => {
    expect(cleanPathLabel('  Cello  practice ')).toBe('Cello');
    expect(cleanPathLabel('Extraordinarily')).toBe('Extraordinar');
    expect(cleanPathLabel('   ')).toBe('');
    expect(pathLabelOf({pathLabel: 'Cello'}, 'Practise the cello')).toBe('Cello');
    expect(pathLabelOf({}, 'Practise the cello')).toBe('Cello');
    expect(pathLabelOf({pathLabel: ' '}, 'Play piano 15 minutes')).toBe('Piano');
  });
  it('is stored as an optional field: set, cleaned, cleared, and a record without it still reads', () => {
    let r = addCustom(emptyChecklist(), {label: 'Play piano 15 minutes', colour: 'gold', section: 'evening'}, {id: 'ck_1', at: new Date(Date.UTC(2026, 0, 1))});
    expect(r.items[0]!.pathLabel).toBeUndefined();
    r = updateItem(r, 'ck_1', {pathLabel: '  Keys and more '});
    expect(r.items[0]!.pathLabel).toBe('Keys');
    expect(checklistSchema.parse(JSON.parse(JSON.stringify(r))).items[0]!.pathLabel).toBe('Keys');
    r = updateItem(r, 'ck_1', {pathLabel: null});
    expect('pathLabel' in r.items[0]!).toBe(false);
    expect(r.items[0]!.label).toBe('Play piano 15 minutes');
  });
});
