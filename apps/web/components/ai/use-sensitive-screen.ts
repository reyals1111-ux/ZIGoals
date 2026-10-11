'use client';
import {useEffect, useState} from 'react';

/**
 * Screens where ZIGi stays out of the way (ADR-012, owner rule 8): any open dialog that is not the chat itself (the
 * Keplr review, a sheet, the phone's More menu), and the account panels on Settings while they show a sign-in or
 * one-time code form, a vault unlock form, a displayed recovery secret or the account-deletion section. The launcher
 * is hidden and the page context is not read while one is showing. Read-only DOM signatures; nothing is written.
 */
export const SENSITIVE_SELECTOR = [
  'dialog[open]:not([data-ai-dialog])',
  '#encrypted-sync input[type="password"]',
  '#encrypted-sync input[type="email"]',
  '#encrypted-sync input[autocomplete="one-time-code"]',
  '#encrypted-sync input[inputmode="numeric"]',
  '#encrypted-sync input[readonly]',
  '#encrypted-sync .deletion-copy',
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
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return sensitive;
}
