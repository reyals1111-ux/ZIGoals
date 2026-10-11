'use client';
import {useEffect, useState} from 'react';

/**
 * One ZIGi picture (Session X-Local Part 1): the poster (the state's still frame) shows at once; when an animated file
 * is given, it is fetched and decoded off screen and swapped in only once it can play, so nothing large is on the
 * critical path and a browser that cannot show it keeps the poster. The caller decides whether motion is allowed and
 * which animated file the browser can play (animated WebP, or the APNG fallback). A static file from /public, like the
 * brand marks: no optimizer, no loader, nothing fetched beyond the file. Shipped in the launcher shell: no manifest here.
 */
export type Poster = {src: string; srcSet?: string};
export function ZigiImage({poster, animated = null, width, height, alt, decorative = false}: {poster: Poster; animated?: string | null; width: number; height: number; alt: string; decorative?: boolean}) {
  const [ready, setReady] = useState<string | null>(null);
  useEffect(() => {
    if (!animated) { setReady(null); return; }
    let live = true;
    const image = new Image();
    image.decoding = 'async';
    const show = () => { if (live) setReady(animated); };
    image.onload = show; image.onerror = () => { /* the poster stays */ };
    image.src = animated;
    // decode() resolves once the first frame can be painted; a browser without it swaps on load.
    if (typeof image.decode === 'function') image.decode().then(show, () => undefined);
    return () => { live = false; image.onload = null; };
  }, [animated]);
  const playing = ready !== null && ready === animated;
  // A static figure from /public, like the brand mark: no optimizer, no loader, nothing fetched beyond the file.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={playing ? ready : poster.src} srcSet={playing ? undefined : poster.srcSet} width={width} height={height} alt={decorative ? '' : alt} aria-hidden={decorative || undefined} draggable={false} decoding="async" data-playing={playing ? '' : undefined}/>;
}
