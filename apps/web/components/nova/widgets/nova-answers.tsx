'use client';
import {NOVA_ANSWER_GROUPS} from '../../../lib/nova/cards/ax/day-nova';
import {AxdGuide} from '../cards/ax/day-guide';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';

/**
 * Session AS (ADR-042 Part 2, NOVA itself): "What NOVA answers" — a static card: six kinds of question, each with two
 * examples in plain words ("Which days did I skip meditation this month?"). It reads no record and no switch: the words
 * ship with the app (lib/nova/cards/ax/day-nova.ts). The period a request carries is not used.
 * Compact: the count. Medium: one example a kind. Large: both.
 */
export default function NovaAnswers({size}: AxProps) {
  return <AxBody kind="nova-answers" size={size}>
    <AxHead figure={String(NOVA_ANSWER_GROUPS.length)} unit="kinds" label="of question I answer" note="Asked in your own words: what you did, missed or skipped, on which days and how much"/>
    {size !== 'S' && <AxdGuide groups={NOVA_ANSWER_GROUPS} both={size === 'L'}/>}
    <CardFoot source="Your own records, read on this device" asOf={null}/>
    <HoloTable caption="What NOVA answers, with examples" rows={NOVA_ANSWER_GROUPS.map(g => [g.label, g.asks.join(' ')] as const)}/>
  </AxBody>;
}
