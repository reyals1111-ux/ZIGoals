import {addLocalDays} from '../local-date';
import {notesSchema, type Notes} from './schema';

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
  ].map(n => ({...n, body: `${n.body}\n\n(SHOWCASE DATA)`, example: true}));
  return notesSchema.parse({version: 1, notes: notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt)), voice: false});
}
