import '../cards/connect-cards.css';

/**
 * Session AM-3 (round 6): behind a locked widget's strip, the faint silhouette of the instrument that kind draws once its
 * switch is on (a ring, columns, a lattice, a line, a meter, rows). Decoration only, hidden from assistive technology.
 * Every shape is a FIXED drawing chosen by the widget's kind: nothing of the person's is read here and no value is shown
 * (the switch is off; the strip in front says which one).
 */
type Shape = 'ring' | 'columns' | 'lattice' | 'trend' | 'meter' | 'rows' | 'bars';
const SHAPES: Readonly<Record<string, Shape>> = {
  water: 'meter', sleep: 'meter', 'health-hud': 'ring', weight: 'trend', steps: 'columns', workouts: 'columns', 'health-trends': 'bars',
  'food-days': 'lattice', fasting: 'ring', meditation: 'columns', supplements: 'rows', cycle: 'ring', 'run-splits': 'columns',
  'mood-tags': 'bars', symptoms: 'bars', notes: 'rows', journal: 'rows', 'journal-numbers': 'columns',
  'habit-week': 'lattice', 'habits-hud': 'lattice', 'perfect-days': 'lattice', 'goals-hud': 'ring', 'goal-focus': 'ring', 'goal-pace': 'bars', milestones: 'ring',
  'net-worth': 'trend', 'net-worth-history': 'trend', 'wealth-hud': 'ring', spending: 'bars', budgets: 'bars', bills: 'rows',
};
const COLUMNS = [14, 24, 18, 30, 22, 34, 16, 28, 20], BARS = [118, 76, 98];
function drawing(shape: Shape) {
  switch (shape) {
    case 'ring': return <><circle className="nx-lg-dash" cx="80" cy="20" r="15.5"/><path className="nx-lg-line" d="M80 4.5a15.5 15.5 0 0 1 14.7 20.4"/><path className="nx-lg-dash" d="M8 20H52M108 20H152"/></>;
    case 'columns': return <>{COLUMNS.map((h, i) => <rect key={i} className="nx-lg-line" x={14 + i * 15} y={38 - h} width="9" height={h} rx="1.5"/>)}<path className="nx-lg-dash" d="M6 38.5H154"/></>;
    case 'lattice': return <>{Array.from({length: 27}, (_, i) => <rect key={i} className={i % 4 === 1 || i % 7 === 3 ? 'nx-lg-dash' : 'nx-lg-line'} x={13 + (i % 9) * 15} y={1 + Math.floor(i / 9) * 13.5} width="10" height="10" rx="2"/>)}</>;
    case 'trend': return <><path className="nx-lg-dash" d="M4 12H156M4 26H156"/><path className="nx-lg-line" d="M6 32C22 30 30 18 46 22S70 34 84 22s24-16 40-12 18 2 30-6"/><circle className="nx-lg-line" cx="154" cy="4.5" r="3"/></>;
    case 'meter': return <>{Array.from({length: 14}, (_, i) => <rect key={i} className={i < 8 ? 'nx-lg-line' : 'nx-lg-dash'} x={6 + i * 10.7} y="14" width="8" height="12" rx="1.5"/>)}</>;
    case 'rows': return <>{[0, 1, 2].map(i => <g key={i}><circle className="nx-lg-line" cx="10" cy={7 + i * 13} r="3"/><path className="nx-lg-line" d={`M22 ${7 + i * 13}H${[112, 84, 126][i]}`}/><path className="nx-lg-dash" d={`M${[122, 94, 136][i]} ${7 + i * 13}H154`}/></g>)}</>;
    default: return <>{BARS.map((w, i) => <g key={i}><rect className="nx-lg-dash" x="6" y={3 + i * 13} width="148" height="8" rx="2"/><rect className="nx-lg-line" x="6" y={3 + i * 13} width={w} height="8" rx="2"/></g>)}</>;
  }
}
export function NxLockGhost({id}: {id: string}) {
  const shape = SHAPES[id] ?? 'trend';
  return <span className="nx-lockghost" data-shape={shape} aria-hidden="true"><svg viewBox="0 0 160 40" preserveAspectRatio="xMidYMid slice" focusable="false">{drawing(shape)}</svg></span>;
}
