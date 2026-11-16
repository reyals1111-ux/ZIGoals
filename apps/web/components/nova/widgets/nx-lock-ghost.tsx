import {Unlit, type UnlitKind} from '../holo/parts';
import '../cards/connect-cards.css';

/**
 * Session AM-3 (round 6, redrawn in round 7): a locked widget shows the instrument that kind draws once its switch is on,
 * at its real size and powered down (a dark tube ring with dead ticks, an empty bezel with unlit slots: `Unlit`).
 * Decoration only, hidden from assistive technology. Every shape is a FIXED drawing chosen by the widget's kind: nothing
 * of the person's is read here and no value is shown (the switch is off; the words beside it say which one).
 */
const SHAPES: Readonly<Record<string, UnlitKind>> = {
  water: 'meter', sleep: 'meter', 'health-hud': 'ring', weight: 'trend', steps: 'columns', workouts: 'columns', 'health-trends': 'bars',
  'food-days': 'lattice', fasting: 'ring', meditation: 'columns', supplements: 'rows', cycle: 'ring', 'run-splits': 'columns',
  'mood-tags': 'bars', symptoms: 'bars', notes: 'rows', journal: 'lattice', 'journal-numbers': 'columns',
  'habit-week': 'lattice', 'habits-hud': 'stack', 'perfect-days': 'lattice', 'goals-hud': 'arcs', 'goal-focus': 'ring', 'goal-pace': 'bars', milestones: 'ring',
  'net-worth': 'trend', 'net-worth-history': 'trend', 'wealth-hud': 'trend', spending: 'bars', budgets: 'bars', bills: 'rows',
};
export function NxLockGhost({id}: {id: string}) {
  const shape = SHAPES[id] ?? 'trend';
  return <span className="nx-lockghost" data-shape={shape} aria-hidden="true"><Unlit key={shape} kind={shape}/></span>;
}
