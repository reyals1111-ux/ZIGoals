import type {CSSProperties} from 'react';
import {HabitSectionBannerParts} from '../habits/habit-section-banner';
import {SECTION_SYMBOLS} from '../../lib/habits-extras/sections';
import {PATH_COLOURS} from '../../lib/path/colours';
import {nebulaColour} from '../../lib/path/orbit-colours';
import type {PathSection} from '../../lib/path/model';
import type {PlanetDesign} from '../../lib/path/planet-designs';
import {OrbitPlanet} from './orbit-planet';

/**
 * Session AG Polish (ADR-030 J11; owner Part 3, pointers 1–4, reference 02): an orbit's banner on the Checklist's path is
 * the Habits page's own section banner — the same markup (`HabitSectionBannerParts`), classes and stylesheet
 * (components/habits/habits-aa.css, loaded by the Checklist's path view), the same font and nebula colour flow in the
 * title and the same time-of-day symbols (morning ☀, afternoon ◐, evening ☾, anytime ✦) — titled "Morning Orbit" and so
 * on. AG's fade stays: the band is whole behind the symbol and title and mists away from about the middle; the count chip
 * sits right after the title and reads "Complete ✓" once the orbit is done, with one light sweep along the band then. The
 * heading is a real heading; its planet stands on the line beside it (orbit-planet.tsx).
 */
const KNOWN = new Set(['morning', 'afternoon', 'evening', 'anytime']);
export const orbitTitle = (label: string) => `${label.replace(/\s*orbit\s*$/i, '').trim() || 'Your'} Orbit`;
export function OrbitBanner({section, done, total, headingId, justComplete = false, planet = null, box = false}: {section: PathSection; done: number; total: number; headingId: string; justComplete?: boolean; planet?: PlanetDesign | null; /** Session AG Polish 2: the phone's line keeps clear of the banner's words (`data-path-box`). */ box?: boolean}) {
  const complete = total > 0 && done === total, kind = KNOWN.has(section.id) ? section.id as keyof typeof SECTION_SYMBOLS : 'anytime';
  return <div className={`path-banner orbit-banner habit-section-${kind}`} data-colour={section.colour} data-complete={complete ? '' : undefined} data-just={justComplete ? '' : undefined} style={{'--banner': PATH_COLOURS[nebulaColour(section.colour)].token} as CSSProperties}>
    <div className="habit-section-summary" data-path-box={box ? `banner:${section.id}` : undefined}>
      <HabitSectionBannerParts symbol={SECTION_SYMBOLS[kind]} title={orbitTitle(section.label)} identity={`orbit-banner:${section.id}`} titleId={headingId} chevron={false}
        count={total ? complete ? 'Complete ✓' : `${done} of ${total}` : 'Nothing here yet'} spoken={total ? complete ? 'complete' : `${done} of ${total} done` : 'nothing here yet'}/>
      {justComplete && <span className="orbit-banner-sweep" aria-hidden="true"/>}
    </div>
    {/* (Its planet on the line, at the banner's height; where the banner leaves it too little room — a narrow phone — it
        wraps to its own band just under the banner, still on the line.) */}
    {planet && <OrbitPlanet design={planet} lit={complete} just={justComplete} point={`planet:${section.id}`}/>}
  </div>;
}
