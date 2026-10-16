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
