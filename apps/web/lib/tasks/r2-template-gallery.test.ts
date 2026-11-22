import {describe, expect, it} from 'vitest';
import {emptyTasks} from './schema';
import {BUILT_IN_TEMPLATES, applyTemplate} from './templates';
import {GALLERY_GROUPS, TEMPLATE_GALLERY, galleryByGroup, galleryTemplate} from './template-gallery';

/** Session AV lane 2 (tasks-r2, LEDGER #226; Any.do's gallery): the written template gallery, English and Dutch. */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
let n = 0;
const ids = () => `g${++n}`;

describe('the template gallery (LEDGER #226)', () => {
  it('every group holds templates; ids are their own; names differ from the built-in four', () => {
    expect(TEMPLATE_GALLERY.length).toBeGreaterThanOrEqual(15);
    for (const g of GALLERY_GROUPS) expect(TEMPLATE_GALLERY.filter(t => t.group === g).length).toBeGreaterThanOrEqual(3);
    const all = [...BUILT_IN_TEMPLATES.map(t => t.id), ...TEMPLATE_GALLERY.map(t => t.id)];
    expect(new Set(all).size).toBe(all.length);
    expect(TEMPLATE_GALLERY.map(t => t.name[0])).toEqual(expect.arrayContaining(['Cleaning week', 'A party', 'A packing list', 'Project kick-off', 'Weekly review', 'School year start']));
  });
  it('each one is written in English and Dutch, and both make the same project from a start day', () => {
    for (const t of TEMPLATE_GALLERY) {
      const en = galleryTemplate(t, 'en'), nl = galleryTemplate(t, 'nl');
      expect(nl.name, t.id).not.toBe(en.name);
      expect(nl.items.filter((x, k) => x.title === en.items[k]!.title).map(x => x.title), t.id).toEqual([]);
      for (const x of t.items) { expect(x.title[0].length).toBeLessThanOrEqual(140); expect(x.title[1].length).toBeLessThanOrEqual(140); if (x.parent !== undefined) expect(x.parent).toBeLessThan(t.items.indexOf(x)); }
      const made = {en: applyTemplate(emptyTasks(), en, {start: today, today, at, ids}), nl: applyTemplate(emptyTasks(), nl, {start: today, today, at, ids})};
      const shape = (m: typeof made.en) => m.record.tasks.map(x => [x.due ?? null, !!x.parentId, x.minutes ?? null, x.level ?? null]);
      expect(shape(made.nl), t.id).toEqual(shape(made.en));
      expect(made.en.record.tasks).toHaveLength(t.items.length);
      expect((made.nl.record.sections ?? []).length).toBe((made.en.record.sections ?? []).length);
    }
  });
  it('the party is on day 21 and school starts on day 14, counted from the start day', () => {
    const party = applyTemplate(emptyTasks(), galleryTemplate(TEMPLATE_GALLERY.find(t => t.id === 'gallery-party')!, 'en'), {start: '2026-12-01', today, at, ids});
    expect(party.record.tasks.find(x => x.title === 'Decorate and set out the food')!.due).toBe('2026-12-22');
    const school = applyTemplate(emptyTasks(), galleryTemplate(TEMPLATE_GALLERY.find(t => t.id === 'gallery-school-year')!, 'nl'), {start: '2027-08-16', today, at, ids, name: 'Schooljaar'});
    expect(school.record.projects![0]!.name).toBe('Schooljaar');
    expect(school.record.tasks.find(x => x.title === 'Foto van de eerste schooldag')!.due).toBe('2027-08-30');
    expect(school.record.tasks.filter(x => x.parentId).map(x => x.title)).toEqual(['Boeken bestellen', 'Pennen, mappen en een tas kopen']);
  });
  it('by group, in the language chosen', () => {
    expect(galleryByGroup('nl').map(g => g.title)).toEqual(['Thuis', 'Werk', 'Gezin', 'Persoonlijk']);
    expect(galleryByGroup('en')[0]!.items[0]!.name).toBe('Cleaning week');
  });
});
