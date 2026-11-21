import {MAX_OWN_TEMPLATES, OWN_HEADING_MAX, OWN_TITLE_MAX, journalSchema, type Journal, type OwnTemplate} from '../journal/schema';
import type {JournalTemplate} from './templates';

/**
 * Session AV (owner follow-up 1, F-OWN-TEMPLATES; Day One's own templates): the person's own journal templates, written
 * as a title and one heading per line, kept in the journal record (`templates`, additive). Picking one fills the entry
 * exactly as an authored template does. Pure.
 */
export function readHeadings(text: string): string[] { return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean); }
export function ownTemplateIssue(title: string, headingsText: string, record: Journal, {editing = false}: {editing?: boolean} = {}): string | null {
  const t = title.trim(), headings = readHeadings(headingsText);
  if (!t) return 'Give the template a name.';
  if (t.length > OWN_TITLE_MAX) return `A name can be at most ${OWN_TITLE_MAX} characters.`;
  if (!headings.length) return 'Write at least one heading, one per line.';
  if (headings.length > 6) return 'Up to six headings, one per line.';
  if (headings.some(h => h.length > OWN_HEADING_MAX)) return `A heading can be at most ${OWN_HEADING_MAX} characters.`;
  if (!editing && (record.templates ?? []).length >= MAX_OWN_TEMPLATES) return `Up to ${MAX_OWN_TEMPLATES} templates of your own. Remove one first.`;
  return null;
}
export function addOwnTemplate(record: Journal, input: {title: string; headingsText: string}, id: string): Journal {
  const issue = ownTemplateIssue(input.title, input.headingsText, record);
  if (issue) throw new Error(issue);
  return journalSchema.parse({...record, templates: [...(record.templates ?? []), {id, title: input.title.trim(), headings: readHeadings(input.headingsText)}]});
}
/** Session AV (1c, q4 #45, fresh-agent review; Day One edits a template): a new name and headings, in its place, same id. */
export function editOwnTemplate(record: Journal, id: string, input: {title: string; headingsText: string}): Journal {
  if (!(record.templates ?? []).some(t => t.id === id)) throw new Error('That template is no longer on this device.');
  const issue = ownTemplateIssue(input.title, input.headingsText, record, {editing: true});
  if (issue) throw new Error(issue);
  return journalSchema.parse({...record, templates: (record.templates ?? []).map(t => t.id === id ? {...t, title: input.title.trim(), headings: readHeadings(input.headingsText)} : t)});
}
export const removeOwnTemplate = (record: Journal, id: string): Journal => journalSchema.parse({...record, templates: (record.templates ?? []).filter(t => t.id !== id)});
/** The template as the picker and `startFrom` read it (the person's words in both languages). */
export const asJournalTemplate = (t: OwnTemplate): JournalTemplate => ({id: t.id, title: {en: t.title, nl: t.title}, headings: {en: t.headings, nl: t.headings}});
export const newOwnTemplateId = () => `own-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
