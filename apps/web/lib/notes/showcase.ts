import {addLocalDays} from '../local-date';
import {notesSchema, type Notes} from './schema';
import {periodStart} from './schedules';
import {noteSearchesSchema, type NoteSearches} from './saved-searches';

/**
 * Session AK (B): the Showcase's fictional notes, labelled as examples. They link to the Showcase's own goals ("Japan
 * adventure", "Emergency fund") and habits ("Read", "Meditate", "Walk"), so backlinks, the graph and the daily note's
 * "This day" strip all have something to show; two captures wait in the inbox to be filed.
 */
export function showcaseNotes(day: string): Notes {
  const at = (offset: number, time = '20:30:00') => `${addLocalDays(day, offset)}T${time}.000Z`;
  const notes = [
    {id: 'showcase-note-japan', kind: 'topic', title: 'Japan trip ideas', body: 'For [[Japan adventure]].\n\n- Kyoto in spring, two nights in a ryokan\n- Rail pass: compare prices in March\n- Keep the daily [[Walk]] going: Tokyo is a walking city\n\nSee also [[Books to read]].', createdAt: at(-20), updatedAt: at(-2), tags: ['travel'], pinned: true},
    {id: 'showcase-note-books', kind: 'topic', title: 'Books to read', body: 'Twenty minutes a day with the [[Read]] habit.\n\n1. A short history of Japan\n2. The Psychology of Money\n3. Atomic Habits', createdAt: at(-18), updatedAt: at(-5), tags: ['reading']},
    {id: 'showcase-note-calm', kind: 'topic', title: 'What helps me stay calm', body: '[[Meditate]] before work beats meditating at night.\nA walk at lunch helps on busy days ([[Walk]]).\nKeep the [[Emergency fund]] growing: money worries are lighter with a cushion.', createdAt: at(-12), updatedAt: at(-3)},
    {id: 'showcase-note-day-2', kind: 'daily', title: addLocalDays(day, -2), day: addLocalDays(day, -2), body: 'Said no to takeaway and put the difference toward [[Japan adventure]].\nRead on the train.', createdAt: at(-2, '21:10:00')},
    {id: 'showcase-note-day-1', kind: 'daily', title: addLocalDays(day, -1), day: addLocalDays(day, -1), body: 'Long meeting, skipped the gym. Ten minutes of [[Meditate]] in the evening helped.', createdAt: at(-1, '21:30:00')},
    {id: 'showcase-note-day-0', kind: 'daily', title: day, day, body: 'Calm start, a long walk before work.\n\nIdeas for the weekend: [[Japan trip ideas]].', createdAt: at(0, '07:45:00')},
    {id: 'showcase-note-inbox-1', kind: 'inbox', title: '', body: 'Ask about the rail pass price in March', day, source: 'text', createdAt: at(0, '09:12:00')},
    {id: 'showcase-note-inbox-2', kind: 'inbox', title: '', body: 'Try a 5-minute breathing break after lunch', day: addLocalDays(day, -1), source: 'voice', createdAt: at(-1, '13:40:00')},
  ].map(n => ({...n, body: `${n.body}\n\n(SHOWCASE DATA)`, example: true}))
    // Session AV lane 2 (r3-notes; LEDGER #270): two notes carry their own properties, so Table and Board show them.
    .map(n => n.id === 'showcase-note-japan' ? {...n, props: [{k: 'Status', t: 'choice' as const, v: 'Planning'}, {k: 'Budget', t: 'number' as const, v: 2400}]}
      : n.id === 'showcase-note-books' ? {...n, props: [{k: 'Status', t: 'choice' as const, v: 'Reading'}]} : n);
  // Session AV lane 2 (notes; LEDGER #32): one repeating note, labelled as an example, already made for this week (the
  // Showcase never makes notes on its own, so its counts stay as they are).
  const weekly = {id: 's-showcase01', title: 'Example · Week plan', body: 'Week of {date}\n\nThree things this week:\n- \n- \n- \n\n(SHOWCASE DATA)', every: 'week' as const, weekday: 1};
  return notesSchema.parse({version: 1, notes: notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt)), voice: false, schedules: [{...weekly, lastMade: periodStart(weekly, day)}],
    // Session AV lane 2 (notes; LEDGER #33): "Books to read" was changed once, so it has one earlier version.
    versions: [{id: 'v-showcasenote1', noteId: 'showcase-note-books', title: 'Books to read', body: 'Twenty minutes a day with the [[Read]] habit.\n\n1. A short history of Japan\n2. The Psychology of Money\n\n(SHOWCASE DATA)', savedAt: at(-18)}]});
}

/**
 * Session AW (x3; LEDGER #441, Evernote's saved searches): two labelled example searches kept by name — the travel notes
 * still being planned (a tag and a property filter) and the reading notes (words and a kind) — so Notes → Notes shows
 * them above the search. Only the searches; the notes they find are the Showcase's own.
 */
export function showcaseNoteSearches(): NoteSearches {
  return noteSearchesSchema.parse({version: 1, searches: [
    {id: 'ns-showcase01', name: 'Example · Travel being planned', tag: 'travel', filters: [{name: 'Status', op: 'is', value: 'Planning'}]},
    {id: 'ns-showcase02', name: 'Example · Reading', words: 'read', kind: 'topic'},
  ]});
}
