import type {GuidedAction} from './programs';

/**
 * Session AW (content; owner decision 1d, ADR-046; LEDGER #278, Stoic's insomnia lessons): seven short written lessons on
 * sleeping better, in the "Sleep better" collection of Guided journeys (lib/guided/collections.ts). Written for ZIGoals;
 * text only, read in place or with Read aloud in the device's own voice (no audio or video). General guidance only:
 * every lesson carries the care line, the last says to see a doctor if sleep stays hard, and nothing promises a result.
 * Reading a lesson stores nothing. Each lesson may link to the place in the app where its idea is tried, where one exists.
 * Pure data.
 */
export type SleepLesson = {id: string; title: string; paragraphs: readonly string[]; action?: GuidedAction};
/** The care line every lesson shows and reads (the wording of the programmes' care line, owner decision 1d). */
export const LESSON_CARE = 'General guidance, not medical advice.';

const link = (href: GuidedAction['href'], label: string): GuidedAction => ({kind: 'link', href, label});

export const SLEEP_LESSONS: readonly SleepLesson[] = [
  {id: 'wake-time', title: 'A steady wake time', paragraphs: [
    'Getting up at about the same time every day, weekends too, gives your body clock a steady anchor. Choose a time you can keep on most days.',
    'Bedtime can follow from it: go to bed when you feel sleepy, not only tired. A late night now and then is fine; the next morning, get up at your usual time again.',
  ], action: link('/app/habits?add=habit', 'Add “Wake up at the same time” (Start from an idea, then Sleep)')},
  {id: 'wind-down', title: 'Wind down before bed', paragraphs: [
    'The last hour before bed is a bridge from the day to the night. Dim the lights, put screens away when you can, and do something calm: a book, a bath, quiet music, a few lines in a journal.',
    'The same small steps each evening can become a signal that the day is ending. Keep them simple enough to do on a tired night.',
  ], action: link('/app/habits#routines', 'Open Routines (the evening routine)')},
  {id: 'bed-for-sleep', title: 'Keep the bed for sleep', paragraphs: [
    'When the bed is where you work, scroll or go over the day, the mind can learn to stay busy there. Keep it for sleep and intimacy, and do the rest somewhere else.',
    'A cool, dark and quiet room may help too: curtains drawn, a window open a little, the phone out of reach or out of the room.',
  ]},
  {id: 'twenty-minutes', title: 'The 20-minute rule', paragraphs: [
    'If you lie awake for what feels like about twenty minutes, get up and go to another room. Do something quiet in dim light, such as reading a paper book, and go back to bed when you feel sleepy.',
    'There is no need to watch the clock; a rough sense of the time is enough. It can take a few nights before this feels natural.',
  ]},
  {id: 'light-caffeine', title: 'Light and caffeine', paragraphs: [
    'Daylight in the morning, outside or by a window, tells your body clock that the day has begun. In the evening, softer and dimmer light lets it wind down.',
    'Caffeine stays in the body for many hours, so many people keep coffee, tea, cola and energy drinks to the morning or early afternoon. Alcohol can make you drowsy, yet it often makes sleep lighter later in the night.',
  ], action: link('/app/habits?add=habit', 'Add “No caffeine after 14:00” (Start from an idea, then Sleep)')},
  {id: 'worry-time', title: 'Worry time', paragraphs: [
    'If worries crowd in at night, give them a time of their own earlier in the evening. Sit for ten minutes and write down what is on your mind, with one small next step beside each worry, or “nothing to do tonight”.',
    'If a worry comes back in bed, remind yourself that it is on paper and has its own time tomorrow.',
  ], action: link('/app/journal', 'Open your journal')},
  {id: 'see-a-doctor', title: 'When to see a doctor', paragraphs: [
    'These lessons are general guidance. If sleep stays hard for a few weeks or more, or it makes your days hard, see a doctor.',
    'See a doctor sooner if you snore loudly or stop breathing for moments in your sleep, feel very sleepy in the day, or if low mood or worry stays with you. Asking for help with sleep is an ordinary thing to do.',
  ]},
];

/** The words Read aloud reads for a lesson: its number and title, its paragraphs, then the care line. */
export const lessonWords = (lesson: SleepLesson, n: number): string => [`Lesson ${n}. ${lesson.title}.`, ...lesson.paragraphs, LESSON_CARE].join(' ');
