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
export function OrbitBanner({section, done, total, headingId, justComplete = false, planet = null, planetLit = false, planetJust = false, box = false, heading = 'h2', title}: {section: PathSection; /** The title's level (the List's sections: h3). */ heading?: 'h2' | 'h3'; done: number; total: number; headingId: string; justComplete?: boolean; planet?: PlanetDesign | null;
  /** Session AJ (owner D3): the title as the caller names it (Earn's Start here: "Get ready"). Default: "<name> Orbit". */ title?: string;
  /** Session AG Polish 2 (owner Part 2b): the planet is lit once reached, and plays its completion the moment it is. */ planetLit?: boolean; planetJust?: boolean;
  /** Session AG Polish 2: the phone's line keeps clear of the banner's words (`data-path-box`). */ box?: boolean}) {
  const complete = total > 0 && done === total, kind = KNOWN.has(section.id) ? section.id as keyof typeof SECTION_SYMBOLS : 'anytime', name = title ?? orbitTitle(section.label);
  return <div className={`path-banner orbit-banner habit-section-${kind}`} data-colour={section.colour} data-complete={complete ? '' : undefined} data-just={justComplete ? '' : undefined} style={{'--banner': PATH_COLOURS[nebulaColour(section.colour)].token} as CSSProperties}>
    <div className="habit-section-summary" data-path-box={box ? `banner:${section.id}` : undefined}>
      {/* (Session AG Polish 2, owner's change to Part 1b: a phone's banner is one row — "0/5", or "✓ Done" (the check alone
          under 360 px) — and says the whole in words: "0 of 5 complete", "Morning Orbit complete".) */}
      <HabitSectionBannerParts symbol={SECTION_SYMBOLS[kind]} title={name} identity={`orbit-banner:${section.id}`} titleId={headingId} chevron={false} heading={heading}
        count={total ? complete ? 'Complete ✓' : `${done} of ${total}` : 'Nothing here yet'}
        countShort={total ? complete ? <><span className="orbit-banner-check">✓</span><span className="orbit-banner-done"> Done</span></> : `${done}/${total}` : '—'}
        spoken={total ? complete ? `${name} complete` : `${done} of ${total} complete` : 'nothing here yet'}/>
      {justComplete && <span className="orbit-banner-sweep" aria-hidden="true"/>}
    </div>
    {/* (Its planet on the line, at the banner's height; where the banner leaves it too little room — a narrow phone — it
        wraps to its own band just under the banner, still on the line.) */}
    {planet && <OrbitPlanet design={planet} lit={planetLit} just={planetJust} point={`planet:${section.id}`}/>}
  </div>;
}
