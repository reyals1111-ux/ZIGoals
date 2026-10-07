'use client';
import {useState} from 'react';
import {PAGE_LABEL, withChoice} from '../../lib/pages/visibility';
import type {PageId} from '../../lib/pages/schema';
import {updateSettingsGroup} from '../../lib/w-homes-store';

/**
 * A hidden page stays reachable by its address (Session W Part 2): this small note says so and brings it back to the
 * navigation in one tap (the same stamped choice as Settings → Your pages & buttons).
 */
export function HiddenPageBanner({page}: {page: PageId}) {
  const [failed, setFailed] = useState('');
  const show = () => { setFailed(''); updateSettingsGroup('pages', pages => withChoice(pages, page, true, new Date().toISOString())).catch((error: unknown) => setFailed(error instanceof Error ? error.message : 'Could not save.')); };
  return <div className="hidden-page-banner notice" role="region" aria-label="Hidden page">
    <p>This page is hidden — <button type="button" className="text-link" onClick={show} aria-label={`Show it again: ${PAGE_LABEL[page]}`}>show it again</button></p>
    {failed && <p role="alert">{failed}</p>}
  </div>;
}
