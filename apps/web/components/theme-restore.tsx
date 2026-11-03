'use client';
import {useEffect} from 'react';

/**
 * Session AK P6 (the Light and Dark sweep): a page Next renders in the browser from its error shell (an address under
 * /app with no page answers 404 with `<html id="__next_error__">`, without the root layout's <head>) never ran the theme's
 * early script (components/theme-boot-script.tsx), so it showed Nebula to a person who chose Light or Dark. This puts the
 * person's own theme back once, after the first paint. It renders nothing, and does nothing when the theme is already on.
 */
export function ThemeRestore() {
  useEffect(() => {
    if (document.documentElement.dataset.theme) return;
    void import('../lib/ui-prefs/theme').then(({readTheme, applyTheme}) => { const theme = readTheme(); if (theme !== 'nebula') void applyTheme(theme); }).catch(() => undefined);
  }, []);
  return null;
}
