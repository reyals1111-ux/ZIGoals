import type {HabitData} from '../habits';
import type {HabitExtras} from '../habits-extras/schema';
import {setHabitIntention} from './intentions';

/**
 * Session AK (F5b): the Showcase person's implementation intentions, fictional and labelled ("(Showcase)" in each "where"):
 * Exercise after the alarm, Read after the morning coffee, Meditate after brushing teeth. Added to the Showcase habit
 * extras record (lib/habits-extras/showcase.ts) by the lead: `showcaseHabitIntentions(showcaseHabitExtras(habits), habits)`.
 * A habit the Showcase does not have is left out; nothing else in the record changes.
 */
const EXAMPLES = [['Exercise', 'After my alarm goes off', 'in the living room (Showcase)'], ['Read', 'After I pour my morning coffee', 'on the sofa (Showcase)'], ['Meditate', 'After I brush my teeth', 'by the bedroom window (Showcase)']] as const;
export function showcaseHabitIntentions(extras: HabitExtras, habits: HabitData): HabitExtras {
  let r = extras;
  for (const [title, when, where] of EXAMPLES) { const habit = habits.habits.find(h => h.title === title); if (habit) r = setHabitIntention(r, habit.id, {when, where}); }
  return r;
}
