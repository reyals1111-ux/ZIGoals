import type {ZigiState} from './manifest';

/**
 * Meet ZIGi's words for each state (Session AD item 13, ADR-026; the meanings since Session X-Local Part 4): a one-line
 * meaning and when ZIGi actually shows it, read from the code that signals it (events.ts `transition`, semantic.ts, the
 * chat session, the knock, the habit, health and goal pages), never promised. A state nothing triggers yet would say
 * "Not used yet." The name is the manifest's own label, so the page and the manifest never disagree; the unit test
 * (lib/ai/zigi-gallery.test.ts) keeps this table to exactly the manifest's states and its numbers to the code's. The
 * page lists each group in this table's order (a conversation in the order it happens).
 */
export type GalleryGroup = 'everyday' | 'conversation' | 'moods' | 'moments';
export const GALLERY_GROUPS: readonly {id: GalleryGroup; title: string; line: string}[] = [
  {id: 'everyday', title: 'Around the app', line: 'How ZIGi rests, says hello and goodbye, and shows how things stand.'},
  {id: 'conversation', title: 'In a conversation', line: 'From your question to the answer, step by step.'},
  {id: 'moods', title: 'After an answer', line: 'A short look that fits what was said.'},
  {id: 'moments', title: 'Moments', line: 'Things you did that the app confirmed, and the reminder knock.'},
];
export type StateText = {group: GalleryGroup; meaning: string; when: string};
export const STATE_TEXT: Readonly<Record<ZigiState, StateText>> = {
  idle: {group: 'everyday', meaning: 'At rest, quietly there.', when: 'Whenever nothing else is happening; every other state comes back here when it ends.'},
  greeting: {group: 'everyday', meaning: 'Hello.', when: 'The first time you open ZIGi’s panel today in this browser tab.'},
  'wave-goodbye': {group: 'everyday', meaning: 'Goodbye for now.', when: 'You close ZIGi’s panel.'},
  sleepy: {group: 'everyday', meaning: 'Dozing off.', when: 'ZIGi’s panel has been open with nothing happening for 90 seconds; the next thing that happens wakes it.'},
  peek: {group: 'everyday', meaning: 'Peeking out.', when: 'On the small edge tab while you have hidden ZIGi, and beside an empty page or list with nothing to show yet.'},
  attention: {group: 'everyday', meaning: 'Waiting to be set up.', when: 'ZIGi is turned on but no AI provider or model is chosen yet; choosing one ends it.'},
  offline: {group: 'everyday', meaning: 'No connection.', when: 'Your device goes offline while ZIGi is resting; ZIGi rests as usual again once you are back online.'},
  listening: {group: 'conversation', meaning: 'Listening to you.', when: 'You type in a text box, the chat box has the focus, or the microphone is on.'},
  thinking: {group: 'conversation', meaning: 'Thinking it over.', when: 'You sent a message and your AI has not started answering yet.'},
  'loading-model': {group: 'conversation', meaning: 'Getting the on-device model ready.', when: 'Chrome’s built-in model on this computer starts up to answer a question or to reword your brief (Say it nicer).'},
  'reading-your-data': {group: 'conversation', meaning: 'Looking at your records.', when: 'Your connected AI uses ZIGi’s lookups to read the records you shared with that message.'},
  speaking: {group: 'conversation', meaning: 'Answering you.', when: 'Your AI’s answer is coming in, or an answer is being read aloud.'},
  'writing-proposal': {group: 'conversation', meaning: 'Writing a card for you.', when: 'Your AI’s answer holds a proposal card that is still being written.'},
  presenting: {group: 'conversation', meaning: 'Here are some cards to look at.', when: 'An answer arrives with proposal cards for you to review.'},
  insight: {group: 'conversation', meaning: 'Got it: here is the answer.', when: 'An answer arrives without cards, or your AI marks its answer as an insight.'},
  error: {group: 'conversation', meaning: 'That did not work; you can try again.', when: 'A message to your AI could not be answered, for example with no connection or a key that was refused.'},
  success: {group: 'moods', meaning: 'A small success.', when: 'ZIGi answers on this device, you check in a habit, log a health entry, or add a card ZIGi proposed.'},
  curious: {group: 'moods', meaning: 'Which one do you mean?', when: 'Your question matches more than one thing and ZIGi asks you to choose, or your AI marks its answer as curious.'},
  confused: {group: 'moods', meaning: 'ZIGi could not answer that here.', when: 'ZIGi cannot answer a question on this device and shows examples it can answer, or your AI marks its answer as confused.'},
  empathetic: {group: 'moods', meaning: 'A gentle look.', when: 'Your message touches a sensitive topic, or your AI marks its answer as empathetic.'},
  encouraging: {group: 'moods', meaning: 'Cheering you on.', when: 'You open Your week with ZIGi (the weekly review), or your AI marks its answer as encouraging.'},
  surprised: {group: 'moods', meaning: 'Oh!', when: 'Only when your connected AI marks its answer as surprised; nothing in the app shows it on its own.'},
  celebrate: {group: 'moments', meaning: 'A moment the app confirmed.', when: 'All of today’s habits done, a challenge or goal milestone, a goal reached or funded, a routine or meditation finished, the first night of sleep logged for a day, or a new level or badge; at most 3 a day.'},
  proud: {group: 'moments', meaning: 'Proud of your streak.', when: 'A habit check-in, on Habits or from a ZIGi card, reaches a streak milestone the app counted.'},
  reminder: {group: 'moments', meaning: 'A knock: something is due.', when: 'With knocking on, a reminder is due on a page other than Today; at most one knock a visit, never between 22:00 and 08:00 or while you type.'},
};
/**
 * Session AK Part 13 (Studio-4): Meet ZIGi also shows every extra move the studio delivered — the thirteen reactions, the
 * rest variations, the variations of a state and the special moves — each with its meaning and when it appears, read from
 * the code that plays it (semantic.ts reactions and host facts, idle.ts, variants.ts, the Checklist's orbit cheer). A move
 * nothing plays yet says "Not used yet." The unit test (lib/zigi-studio4/meet-moves.test.ts) keeps this table to exactly
 * the manifest's delivered clips, by code.
 */
export type MoveGroup = 'reactions' | 'rest' | 'variations' | 'special';
export const MOVE_GROUPS: readonly {id: MoveGroup; title: string; line: string}[] = [
  {id: 'reactions', title: 'Reactions', line: 'A short move over whatever ZIGi is doing, for something that just happened.'},
  {id: 'rest', title: 'While resting', line: 'Under Full animation, now and then, while ZIGi rests.'},
  {id: 'variations', title: 'Variations', line: 'Under Full animation, now and then in place of the usual move; the usual one plays at least half the time.'},
  {id: 'special', title: 'Special moves', line: 'Moves for one place in the app.'},
];
export type MoveText = {group: MoveGroup; label: string; meaning: string; when: string};
export const MOVE_TEXT: Readonly<Record<string, MoveText>> = {
  R001: {group: 'reactions', label: 'A quick nod', meaning: 'Got your message.', when: 'You send ZIGi a message.'},
  R002: {group: 'reactions', label: 'Not quite sure', meaning: 'Hmm, which one?', when: 'ZIGi asks which one you mean or cannot answer a question here, or your AI marks its answer as curious or confused.'},
  R003: {group: 'reactions', label: 'Working on it', meaning: 'Busy with your records.', when: 'Your connected AI reads the records you shared with that message.'},
  R004: {group: 'reactions', label: 'A pattern holds', meaning: 'Oh, look at that!', when: 'A cross-insight on your records has held, the first time you see it that day.'},
  R005: {group: 'reactions', label: 'Here for you', meaning: 'A gentle, supportive look.', when: 'You check in with low energy or a low mood.'},
  R006: {group: 'reactions', label: 'Keep it up', meaning: 'Cheering your check-ins on.', when: 'Your check-ins reach a milestone the app counted.'},
  R007: {group: 'reactions', label: 'Oops', meaning: 'Taken back.', when: 'You undo something with Undo.'},
  R008: {group: 'reactions', label: 'Day wrapped up', meaning: 'A wave for the end of the day.', when: 'You save your day’s wrap-up.'},
  R009: {group: 'reactions', label: 'Thanks', meaning: 'Thanks for the note.', when: 'You mark one of your AI’s answers with a thumbs up or down.'},
  R010: {group: 'reactions', label: 'Reading along', meaning: 'Thinking about what you wrote.', when: 'ZIGi asks its one question after you save a journal entry.'},
  R011: {group: 'reactions', label: 'Waiting for a connection', meaning: 'Still offline, waiting.', when: 'Your device reports it went offline again while ZIGi already shows No connection.'},
  R012: {group: 'reactions', label: 'Back online', meaning: 'Connected again.', when: 'Your device is back online.'},
  R013: {group: 'reactions', label: 'Hide', meaning: 'Off it goes.', when: 'You dismiss ZIGi’s knock.'},
  X010: {group: 'rest', label: 'A glance around', meaning: 'Looking about.', when: 'Now and then while ZIGi rests, under Full animation.'},
  X011: {group: 'rest', label: 'Settling in', meaning: 'Getting comfortable.', when: 'Now and then while ZIGi rests, under Full animation.'},
  X012: {group: 'rest', label: 'The logo', meaning: 'Showing off the ZIGoals mark.', when: 'Now and then while ZIGi rests, under Full animation.'},
  X050: {group: 'variations', label: 'Answering, a second way', meaning: 'Another way of answering you.', when: 'Now and then in place of Speaking, under Full animation.'},
  X051: {group: 'variations', label: 'Answering, a third way', meaning: 'A longer way of answering you.', when: 'Now and then in place of Speaking, under Full animation.'},
  X052: {group: 'variations', label: 'Listening, a second way', meaning: 'Another way of listening.', when: 'Now and then in place of Listening, under Full animation.'},
  X053: {group: 'variations', label: 'Thinking, a second way', meaning: 'Another way of thinking it over.', when: 'Now and then in place of Thinking, under Full animation.'},
  X054: {group: 'variations', label: 'A small celebration', meaning: 'A little hop for a small success.', when: 'Now and then in place of Success, under Full animation.'},
  X030: {group: 'special', label: 'Cheer', meaning: 'Arms up: well done!', when: 'On the Checklist’s path, when a tick completes an orbit.'},
  X001: {group: 'special', label: 'Hello, in place', meaning: 'Hello, without walking in.', when: 'Not used yet.'},
  X020: {group: 'special', label: 'A look at the chat box', meaning: 'Looking down at where you type.', when: 'While ZIGi’s chat box has the focus and ZIGi listens, under animation.'},
  X021: {group: 'special', label: 'A look at you', meaning: 'Looking out at you.', when: 'While ZIGi rests after asking which one you mean, until you choose, under animation.'},
  X022: {group: 'special', label: 'A look at something', meaning: 'Looking at something on the page.', when: 'While ZIGi rests and cards it proposed wait for you to add or dismiss them, under animation.'},
};
