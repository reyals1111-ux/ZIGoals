import type {CSSProperties} from 'react';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {PathSection} from '../../lib/path/model';

/**
 * An orbit's banner (P7.5): a glass band in the orbit's colour with its planet and a faint orbit ring, the orbit's name and
 * how many of its dots are done ("2 of 3"). The line between orbits passes behind it, so moving down the path feels like
 * travelling from one star system to the next. The heading is a real heading; the planet is decorative.
 */
export function PathBanner({section, index, done, total, headingId}: {section: PathSection; index: number; done: number; total: number; headingId: string}) {
  return <header className="path-banner" data-colour={section.colour} data-complete={total > 0 && done === total ? '' : undefined} style={{'--banner': PATH_COLOURS[section.colour].token} as CSSProperties}>
    <span className="path-banner-planet" aria-hidden="true"><i/></span>
    <span className="path-banner-text">
      <span className="path-banner-eyebrow">{section.eyebrow ?? `Orbit ${index + 1}`}</span>
      <h2 className="path-banner-title" id={headingId}>{section.label}</h2>
    </span>
    <span className="path-banner-count">{total ? `${done} of ${total}` : 'Nothing here yet'}</span>
  </header>;
}
