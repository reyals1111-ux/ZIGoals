'use client';
import {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {entitlement} from '../../lib/entitlements';
import './ai-launcher.css';

/**
 * Settings → ZIGi · your AI, the section shell (follow-up part A): the anchor, eyebrow, heading and the one-paragraph
 * promise render with the page, so `#your-ai` links, the sections nav and the phone row land on it at once; the body
 * (setup, switches, voice, the key store, model lists) loads when the section scrolls near, when the page opened on
 * its hash or on the OpenRouter callback, or when the browser is idle. Nothing in the body is needed for a page that
 * never reaches it.
 */
const AiSettingsBody = lazy(() => import('./ai-settings'));
/** The addresses that load the body at once: the section, the notes card (Part 8) and the context pack card (Part 10's /pack). */
const ANCHORS = ['#your-ai', '#zigi-notes', '#zigi-pack', '#zigi-look', '#zigi-setup', '#zigi-on-device', '#zigi-agents', '#zigi-hosted'];
export function AiSettingsSection() {
  const section = useRef<HTMLElement>(null);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (load) return;
    const now = () => setLoad(true);
    if (ANCHORS.includes(window.location.hash) || /[?&]ai-auth=/.test(window.location.search)) { now(); return; }
    const node = section.current;
    const observer = node && 'IntersectionObserver' in window ? new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) now(); }, {rootMargin: '800px 0px'}) : null;
    if (observer && node) observer.observe(node);
    const idle: {cancel: () => void} = typeof window.requestIdleCallback === 'function'
      ? (id => ({cancel: () => window.cancelIdleCallback(id)}))(window.requestIdleCallback(now, {timeout: 2500}))
      : (id => ({cancel: () => window.clearTimeout(id)}))(window.setTimeout(now, 1500));
    const onHash = () => { if (ANCHORS.includes(window.location.hash)) now(); };
    window.addEventListener('hashchange', onHash);
    return () => { observer?.disconnect(); idle.cancel(); window.removeEventListener('hashchange', onHash); };
  }, [load]);
  return <section ref={section} className="panel ai-settings" id="your-ai" aria-labelledby="your-ai-title">
    <p className="eyebrow">ZIGI · YOUR AI <span className="ai-chat-premium">{entitlement('your-ai').label}</span></p>
    <h2 id="your-ai-title">Your own AI, page by page.</h2>
    <p>Connect the AI you already pay for, or one running on your computer. Prompts, replies and keys travel from this browser straight to your provider; ZIGoals never sees them, logs nothing and runs nothing on its servers for this. ZIGi reads a page only with your permission, never writes anything by itself, and proposes changes as cards you add, edit or dismiss.</p>
    {/* Phase 2 (P2.8, X-Cloud's H6): the body's height is reserved until it mounts, so a Settings jump below this section
        lands where it will stay (the body grew the section by ~900 px above the target; the reserve is measured and kept
        honest by tests/zigi-settings-reserve.spec.ts). */}
    {load
      ? <Suspense fallback={<div className="ai-settings-reserve"><p className="ai-settings-loading" aria-live="polite">Loading your AI settings…</p></div>}><AiSettingsBody/></Suspense>
      : <div className="ai-settings-reserve" aria-hidden="true"/>}
  </section>;
}
