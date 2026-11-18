'use client';
import type {OrbitSummary} from '../../../lib/orbit-card/summary';
import {formatClock} from '../../../lib/visual-format';
import {AxdKey} from '../cards/ax/day-key';
import {AxdOrbit} from '../cards/ax/day-orbit';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {OrbitSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: the orbit): "Checklist orbit" — today's Checklist dots on one ring, the done ones
 * lit, the count in the middle. The count is the Checklist's own (the hook "Today's orbit" uses); where no Checklist is
 * kept the ring holds today's due habits, and says so. Read only: ticking happens on the Checklist. Compact: the count.
 */
const MAX_DOTS = 36;
export default function ChecklistOrbit({size}: AxProps) {
  return <OrbitSource>{orbit => <Ring orbit={orbit} size={size}/>}</OrbitSource>;
}
function Ring({orbit, size}: {orbit: OrbitSummary; size: AxProps['size']}) {
  const {done, total} = orbit, checklist = orbit.source === 'checklist', what = checklist ? 'Checklist dots' : 'habits', next = orbit.next[0];
  // One dot for each thing; a very long path is drawn in proportion (the figure always says the exact count).
  const dots = total <= MAX_DOTS ? Array.from({length: total}, (_, i) => i < done) : Array.from({length: MAX_DOTS}, (_, i) => i < Math.round(done / total * MAX_DOTS));
  const note = done >= total ? 'Your orbit is complete for today' : next ? `Next: ${next.label}${next.time ? ` at ${formatClock(next.time)}` : ''}` : `${total - done} still to do`;
  return <AxBody kind="checklist-orbit" size={size}>
    <AxHead figure={String(done)} unit={`of ${total}`} label={`${what} done today`} note={note} tone={done >= total ? 'clear' : undefined}/>
    {size !== 'S' && <AxdOrbit dots={dots} figure={`${done}/${total}`} unit="done"/>}
    {size === 'L' && <AxdKey items={[['lit', 'Done'], ['ring', 'Still to do']]}/>}
    <CardFoot source={checklist ? 'Your Checklist' : 'Your habits'} asOf="today"/>
    <HoloTable caption={checklist ? 'Today’s Checklist' : 'Today’s habits (no Checklist path yet)'} rows={[
      [`${checklist ? 'Dots' : 'Habits'} done`, `${done} of ${total}`], ['Still to do', String(Math.max(0, total - done))],
      ...(next ? [['Next', `${next.label}${next.time ? ` at ${formatClock(next.time)}` : ''}`] as const] : []),
      ...(orbit.contributionsDue ? [['Contributions due today', String(orbit.contributionsDue)] as const] : []),
    ]}/>
  </AxBody>;
}
