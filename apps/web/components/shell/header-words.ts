'use client';
import {useEffect, type RefObject} from 'react';

/**
 * Session AO (D-070, DV-247, DV-223; owner decision 13 Nov): the header's icon buttons show a short visible word beside
 * their icon wherever it fits (components/shell/header-words-measure.ts does the measuring). As served, the icons alone;
 * the measuring code loads after the page has shown (its own chunk, so the shell every page loads stays as light as it was:
 * route weights), then tries the words and keeps them only where the row still fits.
 */
export const WORDS_ATTR = 'data-words';

/** The status row: the words show on the row itself (`.status-row[data-words]`, shell-ab.css). */
export function useStatusRowWords(rowRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const row = rowRef.current; if (!row) return;
    let stop: (() => void) | null = null, alive = true;
    void import('./header-words-measure').then(m => { if (alive) stop = m.watchStatusRow(row); }, () => {});
    return () => { alive = false; stop?.(); };
  }, [rowRef]);
}

/** The phone top bar's wallet shortcut: its word sits under the icon where the bar has room (phone-shell.css). */
export function useTopBarWord(linkRef: RefObject<HTMLElement | null>, active: boolean, page?: string) {
  useEffect(() => {
    const link = linkRef.current, row = link?.closest<HTMLElement>('.phone-topbar-row'), actions = link?.parentElement ?? null;
    if (!active || !link || !row) return;
    let stop: (() => void) | null = null, alive = true;
    void import('./header-words-measure').then(m => { if (alive) stop = m.watchTopBar(link, row, actions); }, () => {});
    return () => { alive = false; stop?.(); };
  }, [linkRef, active, page]);
}
