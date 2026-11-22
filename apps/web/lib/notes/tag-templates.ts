import {MAX_TAG_TEMPLATES, MAX_TEMPLATE_BODY, notesSchema, type Notes} from './schema';
import {cleanTag} from './bulk';

/**
 * Session AV lane 2 (r5-notes; LEDGER #362, Logseq's "Apply template to tags"): words set on a tag (#meeting) that a new,
 * still empty note given that tag starts from, once — in the editor's unsaved words, written only when saved. A tag
 * nested under one with a template (#meeting/standup) uses its own template first, then the nearest one above it.
 * `{date}` becomes the day. Kept in the notes record's `tagTemplates` (at most 10). Pure.
 */
export type TagTemplate = {tag: string; body: string};
export const tagTemplatesOf = (record: Pick<Notes, 'tagTemplates'>): TagTemplate[] => record.tagTemplates ?? [];
const key = (t: string) => t.replace(/^#+/, '').trim().toLowerCase();
/** The template the first of these tags (or the nearest tag above it) has, or null. */
export function templateForTags(record: Pick<Notes, 'tagTemplates'>, tags: readonly string[]): TagTemplate | null {
  const list = tagTemplatesOf(record);
  if (!list.length) return null;
  for (const tag of tags) {
    const parts = key(tag).split('/');
    for (let n = parts.length; n > 0; n--) { const found = list.find(t => key(t.tag) === parts.slice(0, n).join('/')); if (found && found.body.trim()) return found; }
  }
  return null;
}
export const templateWords = (t: TagTemplate, day: string) => t.body.replace(/\{date\}/g, day);
/** Sets (or replaces) a tag's template; empty words remove it. */
export function setTagTemplate(record: Notes, tag: string, body: string): Notes {
  const name = cleanTag(tag);
  if (!name) throw new Error('Name the tag first, for example meeting.');
  if (body.length > MAX_TEMPLATE_BODY) throw new Error(`A template holds at most ${MAX_TEMPLATE_BODY.toLocaleString('en-US')} characters.`);
  const rest = tagTemplatesOf(record).filter(t => key(t.tag) !== key(name));
  if (!body.trim()) return removeTagTemplate(record, name);
  if (rest.length >= MAX_TAG_TEMPLATES) throw new Error(`At most ${MAX_TAG_TEMPLATES} tags can have a template. Remove one first.`);
  const at = tagTemplatesOf(record).findIndex(t => key(t.tag) === key(name)), next = [...rest];
  next.splice(at < 0 ? next.length : at, 0, {tag: name, body});
  return notesSchema.parse({...record, tagTemplates: next});
}
export function removeTagTemplate(record: Notes, tag: string): Notes {
  const rest = tagTemplatesOf(record).filter(t => key(t.tag) !== key(tag)), next: Notes = {...record};
  if (rest.length) next.tagTemplates = rest; else delete next.tagTemplates;
  return notesSchema.parse(next);
}
