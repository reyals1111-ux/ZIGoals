'use client';
import {useState} from 'react';
import {PAGE_LABEL, withChoice} from '../../lib/pages/visibility';
import type {PageId} from '../../lib/pages/schema';

/**
 * A hidden page stays reachable by its address (Session W Part 2): this small note says so and brings it back to the
 * navigation in one tap (the same stamped choice as Settings → Your pages & buttons).
 */
export function HiddenPageBanner({page}: {page: PageId}) {
  const [failed, setFailed] = useState('');
  // Session X Part 5b ([TIER 3] (sync)): the settings store (and the sync homes behind it) loads with this tap, not with
  // every page; the stamped choice it saves is the same.
  const show = () => { setFailed(''); import('../../lib/w-homes-store').then(({updateSettingsGroup}) => updateSettingsGroup('pages', pages => withChoice(pages, page, true, new Date().toISOString()))).catch((error: unknown) => setFailed(error instanceof Error ? error.message : 'Could not save.')); };
  return <div className="hidden-page-banner notice" role="region" aria-label="Hidden page">
    <p>This page is hidden — <button type="button" className="text-link" onClick={show} aria-label={`Show it again: ${PAGE_LABEL[page]}`}>show it again</button></p>
    {failed && <p role="alert">{failed}</p>}
  </div>;
}
