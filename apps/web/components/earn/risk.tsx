import {Children, Fragment, isValidElement, type ReactNode} from 'react';

/**
 * Session AF (L1c, non-negotiable N5): one risk of an earning option in plain words, with where it comes from. A source
 * is a link from the verified link registry (`link`: a `VerifiedLink` the research notes record as checked) or, when
 * there is no page to link, the on-chain read named in words (`chain`), never a link built here. Both may be given.
 * `data-risk-source` says which (the browser tests read it); nothing here is a number of its own.
 *
 * Critique round 2 (L5c): a "What's this?" tap goes in `tap`, after the source, so the risk's words and its "Source: …"
 * stay together; "Source:" is glued to the first word of what it names (a no-break space), so a line never ends on it;
 * and the closing full stop stays with the last link's mark (`.earn-risk-end` keeps the mark and the stop on one line
 * while the link's own words still wrap), so a stop never starts a line of its own.
 */
function withStop(link: ReactNode): ReactNode {
  if (isValidElement(link) && link.type === Fragment) {
    const kids = Children.toArray((link.props as {children?: ReactNode}).children), last = kids.pop();
    return <>{kids}{withStop(last)}</>;
  }
  return isValidElement(link) ? <span className="earn-risk-end">{link}.</span> : <>{link}.</>;
}
export function Risk({children, link, chain, tap}: {children: ReactNode; link?: ReactNode; chain?: ReactNode; tap?: ReactNode}) {
  const kinds = [chain ? 'chain' : '', link ? 'link' : ''].filter(Boolean).join(' ');
  return <li data-risk-source={kinds}>
    {children} <span className="earn-risk-source">Source:{'\u00a0'}{chain}{chain && link ? '; ' : null}{link ? withStop(link) : '.'}</span>{tap ? <> {tap}</> : null}
  </li>;
}
