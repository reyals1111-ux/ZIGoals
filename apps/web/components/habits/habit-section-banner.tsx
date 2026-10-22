import {NebulaFlow} from '../nebula-flow';

/**
 * The Habits page's section banner, its inner parts (H1; Session AG Polish, ADR-030 J7): the time-of-day symbol, the
 * title in the nebula colour flow, the count chip and the fold's chevron — the exact markup the Habits page's `<summary>`
 * has always drawn (components/habits/habit-sections.tsx, styled by habits-aa.css), shared so the Checklist's orbits wear
 * the same banner instead of a lookalike. The caller gives the element around it (Habits: the `<summary>` of its fold;
 * the Checklist: a plain block) and the title's level.
 */
export function HabitSectionBannerParts({symbol, title, identity, titleId, count, spoken, chevron = true, heading: Heading = 'h2'}: {symbol: string; title: string; identity: string; titleId?: string; count: string; spoken: string; chevron?: boolean; heading?: 'h2' | 'h3'}) {
  return <>
    <span className="habit-section-mark" aria-hidden="true">{symbol}</span>
    <Heading className="habit-section-title" {...(titleId ? {id: titleId} : {})}><NebulaFlow identity={identity}>{title}</NebulaFlow></Heading>
    <span className="habit-section-count"><span aria-hidden="true">{count}</span><span className="sr-only">{spoken}</span></span>
    {chevron && <span className="habit-section-chevron" aria-hidden="true">›</span>}
  </>;
}
