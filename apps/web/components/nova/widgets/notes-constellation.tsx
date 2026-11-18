'use client';
import {useMemo} from 'react';
import {notesConstellation} from '../../../lib/nova/cards/ax/day-notes';
import type {Notes} from '../../../lib/notes/schema';
import {formatRelativeDay} from '../../../lib/visual-format';
import {useLocalToday} from '../../use-local-today';
import {AxdStars} from '../cards/ax/day-stars';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot, Fact} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {NotesSource} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: maps): "Notes constellation" — the notes as stars, grouped by their kind: the
 * inbox (captures waiting to be filed), daily notes and topic notes. Counts and the newest note's day only: a note's
 * title and text are never read here (the Notes record, as the Notes inbox widget reads it). Compact: the count.
 */
export default function NotesConstellation({size}: AxProps) {
  return <NotesSource>{notes => <Sky notes={notes} size={size}/>}</NotesSource>;
}
const NAME = {inbox: ['in your inbox', 'Inbox'], daily: ['daily', 'Daily notes'], topic: ['topic', 'Topic notes']} as const;
function Sky({notes, size}: {notes: Notes; size: AxProps['size']}) {
  const today = useLocalToday(), sky = useMemo(() => notesConstellation(notes), [notes]);
  const newest = sky.newest ? formatRelativeDay(sky.newest, today, {year: sky.newest.slice(0, 4) !== today.slice(0, 4)}) : null;
  return <AxBody kind="notes-constellation" size={size}>
    <AxHead figure={String(sky.total)} unit={sky.total === 1 ? 'note' : 'notes'} label="kept, by kind" note={sky.groups.map(g => `${g.count} ${NAME[g.kind][0]}`).join(' · ')}/>
    {size !== 'S' && <AxdStars groups={sky.groups.map(g => ({key: g.kind, label: g.label, count: g.count, stars: g.stars}))}/>}
    {size === 'L' && newest && <div className="nc-facts axd-facts"><Fact label="Newest note" value={newest}/></div>}
    <CardFoot source="Your notes" asOf="today"/>
    <HoloTable caption="Notes by kind (counts only)" rows={[['Notes', String(sky.total)], ...sky.groups.map(g => [NAME[g.kind][1], String(g.count)] as const), ...(newest ? [['Newest note', newest] as const] : [])]}/>
  </AxBody>;
}
