'use client';
import {useEffect, useState} from 'react';

/**
 * Screens where ZIGi stays out of the way (ADR-012, owner rule 8): any open dialog that is not the chat itself (the
 * Keplr review, a sheet, the phone's More menu), and the account panels on Settings while they show a sign-in or
 * one-time code form, a vault unlock form, a displayed recovery secret or the account-deletion section. The launcher
 * is hidden and the page context is not read while one is showing. Read-only DOM signatures; nothing is written.
 */
/**
 * Session AL (owner reading Q6, ADR-037; O3, BN-064/BN-075/PR-042): ZIGi opens on Settings too. The sign-in email field that
 * Settings shows by default makes the screen sensitive only while it has the focus; an open private step (a one-time code,
 * a password or vault secret, a shown recovery secret, the deletion section) or an open dialog still makes it sensitive as
 * long as it shows, and any focused password, one-time-code, PIN, key, seed or passphrase field anywhere does too.
 */
export const SENSITIVE_SELECTOR = [
  'dialog[open]:not([data-ai-dialog])',
  '#encrypted-sync input[type="password"]',
  '#encrypted-sync input[type="email"]:focus',
  '#encrypted-sync input[autocomplete="one-time-code"]',
  '#encrypted-sync input[inputmode="numeric"]',
  '#encrypted-sync input[readonly]',
  '#encrypted-sync .deletion-copy',
  'input[type="password"]:focus',
  'input[autocomplete="one-time-code"]:focus',
  'input[autocomplete="current-password"]:focus',
  'input[autocomplete="new-password"]:focus',
  'input[data-sensitive]:focus',
  'textarea[data-sensitive]:focus',
].join(', ');
export const isSensitiveScreen = (root: ParentNode = document): boolean => root.querySelector(SENSITIVE_SELECTOR) !== null;
export function useSensitiveScreen(): boolean {
  const [sensitive, setSensitive] = useState(false);
  useEffect(() => {
    let frame = 0;
    const check = () => { frame = 0; setSensitive(isSensitiveScreen()); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'type', 'readonly', 'class']});
    // Session AL (Q6): a focused field is part of the rule, so focus moving in or out checks again.
    document.addEventListener('focusin', schedule); document.addEventListener('focusout', schedule);
    return () => { observer.disconnect(); document.removeEventListener('focusin', schedule); document.removeEventListener('focusout', schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return sensitive;
}
