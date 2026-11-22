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
  const body = (record.templates ?? []).find(t => t.id === id)?.body;
  const issue = ownTemplateIssue(input.title, body ? headingsOf(input.headingsText).join('\n') : input.headingsText, record, {editing: true});
  if (issue) throw new Error(issue);
  // Session AV lane 2 (LEDGER #39): a template saved from an entry is edited as its whole words (its headings follow them).
  return journalSchema.parse({...record, templates: (record.templates ?? []).map(t => t.id !== id ? t : t.body ? {...t, title: input.title.trim(), body: input.headingsText.trim(), headings: headingsOf(input.headingsText)} : {...t, title: input.title.trim(), headings: readHeadings(input.headingsText)})});
}
export const removeOwnTemplate = (record: Journal, id: string): Journal => journalSchema.parse({...record, templates: (record.templates ?? []).filter(t => t.id !== id)});
/** The template as the picker and `startFrom` read it (the person's words in both languages). */
export const asJournalTemplate = (t: OwnTemplate): JournalTemplate => ({id: t.id, title: {en: t.title, nl: t.title}, headings: {en: t.headings, nl: t.headings}, ...(t.body ? {body: t.body} : {}), ...(t.tags?.length ? {tags: t.tags} : {})});
/**
 * Session AV lane 2 (journal; LEDGER #39, Day One saves an entry as a template; QUALITY.md "Not fixed"): a template made
 * from an entry — its whole text and tags (`body`, `tags`), with its heading-like lines (ending in ":" or "?") as the
 * headings older builds start from (the first line when it has none). The same checks and the same cap of 20.
 */
export function headingsOf(text: string): string[] {
  const lines = readHeadings(text).map(l => l.slice(0, OWN_HEADING_MAX)), marked = lines.filter(l => /[:?]$/.test(l));
  return (marked.length ? marked : lines.slice(0, 1)).slice(0, 6);
}
export function templateFromEntry(record: Journal, entry: {text: string; tags?: readonly string[]}, title: string, id: string): Journal {
  const issue = ownTemplateIssue(title, headingsOf(entry.text).join('\n'), record);
  if (issue) throw new Error(issue);
  return journalSchema.parse({...record, templates: [...(record.templates ?? []), {id, title: title.trim(), headings: headingsOf(entry.text), body: entry.text.trim(), ...(entry.tags?.length ? {tags: [...entry.tags]} : {})}]});
}
/** A template's name suggested from an entry: its first heading or first words, at most 40 characters. */
export const suggestedTitle = (text: string) => { const first = headingsOf(text)[0] ?? 'My template'; const t = first.replace(/[:?]$/, '').trim(); return t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t || 'My template'; };
/** The journal's default template (the one a new entry starts from), or null. */
export const withDefault = (record: Journal, id: string | null): Journal => { const {defaultTemplate: _d, ...rest} = record; void _d; return journalSchema.parse(id ? {...rest, defaultTemplate: id} : rest); };
export const newOwnTemplateId = () => `own-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
