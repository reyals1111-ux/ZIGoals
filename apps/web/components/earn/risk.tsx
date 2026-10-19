import type {ReactNode} from 'react';

/**
 * Session AF (L1c, non-negotiable N5): one risk of an earning option in plain words, with where it comes from. A source
 * is a link from the verified link registry (`link`: a `VerifiedLink` the research notes record as checked) or, when
 * there is no page to link, the on-chain read named in words (`chain`), never a link built here. Both may be given.
 * `data-risk-source` says which (the browser tests read it); nothing here is a number of its own.
 */
export function Risk({children, link, chain}: {children: ReactNode; link?: ReactNode; chain?: ReactNode}) {
  const kinds = [chain ? 'chain' : '', link ? 'link' : ''].filter(Boolean).join(' ');
  return <li data-risk-source={kinds}>
    {children} <span className="earn-risk-source">Source: {chain}{chain && link ? '; ' : null}{link}.</span>
  </li>;
}
