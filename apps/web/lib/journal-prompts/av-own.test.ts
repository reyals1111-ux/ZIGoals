import {describe, expect, it} from 'vitest';
import {addOwnTemplate, asJournalTemplate, editOwnTemplate, ownTemplateIssue, removeOwnTemplate} from './own';
import {DAILY_QUESTIONS, DAILY_QUESTIONS_NL, questionOfTheDay} from './daily';
import {startFrom} from './templates';
import {emptyJournal, journalSchema} from '../journal/schema';

/** Session AV (owner follow-up 1, F-OWN-TEMPLATES; Day One): own templates, and the daily question in Dutch. */
describe('Session AV (F-OWN-TEMPLATES)', () => {
  it('keeps a template of the person\'s own, which fills an entry like an authored one', () => {
    const j = addOwnTemplate(emptyJournal(), {title: 'Fictional run diary', headingsText: 'How the legs felt:\n\nWhat I saw on the way:\n'}, 'own-abc123def4');
    expect(j.templates).toEqual([{id: 'own-abc123def4', title: 'Fictional run diary', headings: ['How the legs felt:', 'What I saw on the way:']}]);
    expect(startFrom('', asJournalTemplate(j.templates![0]!), 'en')).toBe('How the legs felt:\n\nWhat I saw on the way:\n');
    expect(removeOwnTemplate(j, 'own-abc123def4').templates).toEqual([]);
    expect(ownTemplateIssue('x', '', emptyJournal())).toBe('Write at least one heading, one per line.');
    expect(ownTemplateIssue('', 'a', emptyJournal())).toBe('Give the template a name.');
  });
  it('drops a template this build cannot read and keeps the rest; a record without any reads as before', () => {
    const parsed = journalSchema.parse({version: 1, entries: [], shareWithAi: false, followUps: true, templates: [{id: 'own-abc123def4', title: 'Kept', headings: ['A:']}, {id: 'bad id', title: 'x', headings: []}]});
    expect(parsed.templates!.map(t => t.title)).toEqual(['Kept']);
    expect(journalSchema.parse(emptyJournal()).templates).toBeUndefined();
  });
  it('asks the day\'s question in Dutch, the same one as in English', () => {
    expect(DAILY_QUESTIONS_NL).toHaveLength(DAILY_QUESTIONS.length);
    const i = DAILY_QUESTIONS.indexOf(questionOfTheDay('2026-11-21'));
    expect(questionOfTheDay('2026-11-21', 0, 'nl')).toBe(DAILY_QUESTIONS_NL[i]);
  });
});

/** Session AV (1c, q4 #45, fresh-agent review; Day One): an own template is edited in place, keeping its id and place. */
describe('Session AV (1c): editing an own template', () => {
  it('a new name and headings, same id and place; the same checks; the cap does not block an edit', () => {
    let j = addOwnTemplate(emptyJournal(), {title: 'Fictional run diary', headingsText: 'Legs:'}, 'own-abc123def4');
    j = addOwnTemplate(j, {title: 'Fictional week', headingsText: 'Best bit:'}, 'own-abc123def5');
    j = editOwnTemplate(j, 'own-abc123def4', {title: ' Run notes ', headingsText: 'Legs:\nWeather:'});
    expect(j.templates).toEqual([{id: 'own-abc123def4', title: 'Run notes', headings: ['Legs:', 'Weather:']}, {id: 'own-abc123def5', title: 'Fictional week', headings: ['Best bit:']}]);
    expect(() => editOwnTemplate(j, 'own-abc123def4', {title: '', headingsText: 'a'})).toThrow('Give the template a name.');
    expect(() => editOwnTemplate(j, 'own-gone000000', {title: 'x', headingsText: 'a'})).toThrow();
    const full = journalSchema.parse({...emptyJournal(), templates: Array.from({length: 20}, (_, i) => ({id: `own-full${String(i).padStart(6, '0')}`, title: `T${i}`, headings: ['A:']}))});
    expect(editOwnTemplate(full, 'own-full000003', {title: 'Kept', headingsText: 'B:'}).templates![3]!.title).toBe('Kept');
  });
});
