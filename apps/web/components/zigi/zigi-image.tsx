'use client';
import {useEffect, useRef, useState} from 'react';
import {firstIdle} from '../../lib/first-idle';

/**
 * One ZIGi picture (Session X-Local Part 1): the poster (the state's still frame) shows at once; when an animated file
 * is given, it is fetched and decoded off screen and swapped in only once it can play, so nothing large is on the
 * critical path and a browser that cannot show it keeps the poster. The caller decides whether motion is allowed and
 * which animated file the browser can play (animated WebP, or the APNG fallback). A static file from /public, like the
 * brand marks: no optimizer, no loader, nothing fetched beyond the file. Shipped in the launcher shell: no manifest here.
 */
export type Poster = {src: string; srcSet?: string};
/**
 * Session AO (LS-067): `lazy` (a figure that may sit off screen, such as an empty state's) waits until the picture is
 * actually on screen: the poster loads lazily and the animated clip (the peek's is 1.71 MB) is fetched only once the
 * picture has been in view, never on a cold load of a page where it is not shown. The look is unchanged.
 */
export function ZigiImage({poster, animated = null, width, height, alt, decorative = false, lazy = false}: {poster: Poster; animated?: string | null; width: number; height: number; alt: string; decorative?: boolean; lazy?: boolean}) {
  const [ready, setReady] = useState<string | null>(null);
  const picture = useRef<HTMLImageElement>(null), [seen, setSeen] = useState(!lazy);
  useEffect(() => {
    if (seen) return;
    const el = picture.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    // A picture under display: none (a folded part, a hidden breakpoint) never intersects, so it never fetches its clip.
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setSeen(true); observer.disconnect(); } });
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);
  const clip = seen ? animated : null;
  // Session AA-Local (ADR-022 B45, AA-Cloud's Gate C note): offline with the poster not cached, the browser drew a broken-image
  // icon in the launcher; a failed poster now yields a plain nebula disc of the same size, and a later source starts afresh.
  const [broken, setBroken] = useState<string | null>(null);
  useEffect(() => {
    if (!clip) { setReady(null); return; }
    const animated = clip;
    let live = true, image: HTMLImageElement | null = null;
    const show = () => { if (live) setReady(animated); };
    // Session AK G2 (SESSION_AK_F8 proposal 5): on a cold load the clip waits until the page has loaded and the browser is
    // first idle (4 s at most), so its 358 KB never compete with the page's own first requests; the poster shows until
    // then, as it always did while the clip loads. Later clips on the same page start at once.
    void firstIdle().then(() => {
      if (!live) return;
      image = new Image();
      image.decoding = 'async';
      image.onload = show; image.onerror = () => { /* the poster stays */ };
      image.src = animated;
      // decode() resolves once the first frame can be painted; a browser without it swaps on load.
      if (typeof image.decode === 'function') image.decode().then(show, () => undefined);
    });
    return () => { live = false; if (image) image.onload = null; };
  }, [clip]);
  const playing = ready !== null && ready === animated;
  // A static figure from /public, like the brand mark: no optimizer, no loader, nothing fetched beyond the file.
  if (broken === poster.src) return <span className="zigi-image-fallback" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : alt} aria-hidden={decorative || undefined} style={{width, height}} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={picture} loading={lazy ? 'lazy' : undefined} src={playing ? ready : poster.src} srcSet={playing ? undefined : poster.srcSet} width={width} height={height} alt={decorative ? '' : alt} aria-hidden={decorative || undefined} draggable={false} decoding="async" data-playing={playing ? '' : undefined} onError={() => { if (!playing) setBroken(poster.src); }}/>;
}
