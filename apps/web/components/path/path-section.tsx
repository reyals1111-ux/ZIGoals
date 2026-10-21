import type {CSSProperties} from 'react';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {PathSection} from '../../lib/path/model';

/**
 * An orbit's banner (P7.5): a glass band in the orbit's colour with its planet and a faint orbit ring, the orbit's name and
 * how many of its dots are done ("2 of 3"). The line between orbits passes behind it, so moving down the path feels like
 * travelling from one star system to the next. The heading is a real heading; the planet is decorative. A plain block, not
 * a <header>, so the app's own header rules (phones pad headers to the edge) never reach it.
 *
 * Session AF (L3b), the Checklist's orbit look (`meter`): the banner is a big bar filled with the orbit's own colour, with
 * its progress as a bar along its foot; the moment its last dot is done (`justComplete`) a shine crosses it and sparks
 * leave its planet, once, and it says "Orbit complete".
 */
export function PathBanner({section, index, done, total, headingId, meter = false, justComplete = false}: {section: PathSection; index: number; done: number; total: number; headingId: string; meter?: boolean; justComplete?: boolean}) {
  const complete = total > 0 && done === total;
  return <div className="path-banner" data-colour={section.colour} data-complete={complete ? '' : undefined} data-just={meter && justComplete ? '' : undefined} style={{'--banner': PATH_COLOURS[section.colour].token, ...(meter ? {'--share': total ? done / total : 0} : {})} as CSSProperties}>
    <span className="path-banner-planet" aria-hidden="true"><i/></span>
    <span className="path-banner-text">
      <span className="path-banner-eyebrow">{section.eyebrow ?? `Orbit ${index + 1}`}</span>
      <h2 className="path-banner-title" id={headingId}>{section.label}</h2>
    </span>
    <span className="path-banner-count">{total ? `${done} of ${total}` : 'Nothing here yet'}</span>
    {meter && <>
      <span className="path-banner-meter" aria-hidden="true"><i/></span>
      {justComplete && <span className="path-banner-shine" aria-hidden="true"/>}
      {complete && <span className="path-banner-done" aria-hidden="true"><span className="path-banner-done-long">Orbit complete</span><span className="path-banner-done-short">Complete</span></span>}
      {justComplete && <span className="path-banner-sparks" aria-hidden="true">{Array.from({length: 32}, (_, n) => <i key={n} data-tone={n % 4} style={{'--a': `${Math.round(n * 11.25 + (n % 3) * 4)}deg`, '--d': `${60 + (n * 37) % 70}px`, '--t': `${760 + (n * 53) % 420}ms`} as CSSProperties}/>)}</span>}
    </>}
  </div>;
}
