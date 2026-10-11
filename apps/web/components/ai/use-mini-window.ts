'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {copyRootMarks, copyStylesheets, openPipWindow, pipHost} from '../../lib/ai/pip';
import {setChatWindow} from '../../lib/ai/chat-window';

/**
 * ZIGi's mini window (Session V Part 14): the chat goes on in a small always-on-top window of this tab (Document
 * Picture-in-Picture) where the browser has it. One window per tab. It opens only from the person's click and closes:
 * - by its own close button or "Back to tab" (the chat then opens in the tab);
 * - when the tab closes;
 * - when the chat leaves the page (outside the app);
 * - on an account change.
 * While it is open, styles the page loads later and the page root's display marks follow it.
 */
export type MiniWindow = {supported: boolean; win: Window | null; popOut: () => Promise<boolean>; backToTab: () => void; close: () => void};
export function useMiniWindow(onBack: () => void): MiniWindow {
  const [supported, setSupported] = useState(false), [win, setWin] = useState<Window | null>(null);
  const back = useRef(false), current = useRef<Window | null>(null), onBackRef = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; });
  useEffect(() => { queueMicrotask(() => setSupported(pipHost() !== null)); }, []);
  useEffect(() => {
    if (!win) return;
    current.current = win; setChatWindow(win);
    // Styles the page loads later (a view opened in the chat) follow once they have loaded.
    const carry = () => { if (!win.closed) copyStylesheets(document, win.document); };
    const styles = new MutationObserver(records => {
      carry();
      for (const record of records) for (const node of Array.from(record.addedNodes)) if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') node.addEventListener('load', carry, {once: true});
    });
    styles.observe(document.head, {childList: true});
    const marks = new MutationObserver(() => copyRootMarks(document, win.document));
    marks.observe(document.documentElement, {attributes: true});
    const onHide = () => {
      current.current = null; setChatWindow(null); setWin(null);
      if (back.current) { back.current = false; onBackRef.current(); }
    };
    const onAccount = () => { back.current = false; win.close(); };
    win.addEventListener('pagehide', onHide); window.addEventListener(ACCOUNT_CHANGE, onAccount);
    return () => { styles.disconnect(); marks.disconnect(); win.removeEventListener('pagehide', onHide); window.removeEventListener(ACCOUNT_CHANGE, onAccount); };
  }, [win]);
  // The chat leaves the page (outside the app): the window does not stay behind, empty.
  useEffect(() => () => { const open = current.current; current.current = null; setChatWindow(null); open?.close(); }, []);
  const popOut = useCallback(async () => {
    const host = pipHost(); if (!host || current.current) return false;
    try { setWin(await openPipWindow(host)); return true; } catch { return false; }
  }, []);
  const backToTab = useCallback(() => { back.current = true; current.current?.close(); }, []);
  const close = useCallback(() => { back.current = false; current.current?.close(); }, []);
  return {supported, win, popOut, backToTab, close};
}
