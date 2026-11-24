'use client';
import {useEffect, useRef, useState} from 'react';

/**
 * Session AV lane 2 (fixb2): Health reads its view from the address (?view=<name>) when it opens. A link inside Health to
 * another view (the Diary's "See the week" → ?view=insights#health-challenge) changes the address without opening the
 * page again, so the view follows the address whenever its view changes, and a card the hash names (#health-challenge) is
 * shown once its view has drawn it. Choosing a tab writes the same view into the address, which changes nothing here.
 * (On opening, the page's own hash handler shows the card.)
 */
export function useFollowAddressView<V>(param: string, views: Readonly<Record<string, V>>, current: V, show: (view: V) => void, reveal: (id: string) => void) {
  const [followed, setFollowed] = useState(param), first = useRef(true), [, setHash] = useState('');
  if (param !== followed) {
    setFollowed(param);
    const next = views[param];
    if (next !== undefined && next !== current) show(next);
  }
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    // The address is written once this change is drawn, so the view is drawn again with its hash (a fold the hash names,
    // such as the logging challenge's, opens then), and the card is shown once it is there.
    const hash = window.location.hash.slice(1);
    setHash(hash);
    if (hash.includes('-')) reveal(hash);
  }, [param]); // eslint-disable-line react-hooks/exhaustive-deps -- once per change of the address's view
}
