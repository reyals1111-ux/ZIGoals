'use client';
import {useState} from 'react';
import {PAGE_LABEL, offUntilChosen, withChoice} from '../../lib/pages/visibility';
import type {PageId} from '../../lib/pages/schema';
import {plainErrorMessage} from '../../lib/plain-error';

/**
 * A hidden page stays reachable by its address (Session W Part 2): this small note says so and brings it back to the
 * navigation in one tap (the same stamped choice as Settings → Your pages & buttons). The shell shows it only once the
 * settings are read (`pagesState === 'ready'`), so it never flashes on a page that shows.
 */
export function HiddenPageBanner({page}: {page: PageId}) {
  const [failed, setFailed] = useState('');
  // Session X Part 5b ([TIER 3] (sync)): the settings store (and the sync homes behind it) loads with this tap, not with
  // every page; the stamped choice it saves is the same.
  const show = () => { setFailed(''); import('../../lib/w-homes-store').then(({updateSettingsGroup}) => updateSettingsGroup('pages', pages => withChoice(pages, page, true, new Date().toISOString()))).catch((error: unknown) => setFailed(plainErrorMessage(error, 'Could not save.'))); };
  // Session AL (AL-NAV-013; TK-021, TK-046, TK-154/171/207/214, TK-6B-03, X3-06): a page that starts out of the menu
  // (Chess, and the crypto pages until the chain is chosen) works when opened, so it is never called "off" on its own
  // route: one short line says it isn't in the menu yet and adds it in one tap (the sidebar, the rail and More alike).
  if (offUntilChosen(page)) return <div className="hidden-page-banner hidden-page-chip" role="region" aria-label="Hidden page">
    <p>{PAGE_LABEL[page]} isn&rsquo;t in your menu yet. <button type="button" className="text-link" onClick={show} aria-label={`Add ${PAGE_LABEL[page]} to your menu`}>Add to menu</button></p>
    {failed && <p role="alert">{failed}</p>}
  </div>;
  return <div className="hidden-page-banner notice" role="region" aria-label="Hidden page">
    {/* Session AH (H5, BUG-068): a page the person hid says so, with the way back. */}
    <p>This page is hidden — <button type="button" className="text-link" onClick={show} aria-label={`Show it again: ${PAGE_LABEL[page]}`}>show it again</button></p>
    {failed && <p role="alert">{failed}</p>}
  </div>;
}
