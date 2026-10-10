'use client';
import {NebulaFlow} from '../nebula-flow';

/**
 * ZIGi's full name (Session Z-Cloud Part 2, ADR-019): "ZIGi · Your Personal AI Companion", both halves in the nebula colour
 * flow. The app's middle dot is kept (the owner wrote a dash; the dot is the app's separator everywhere else) and folds
 * away when the two halves sit on separate lines (the panel's narrow header). Its own tiny module, so Settings and Help
 * ship the name without the panel's header code.
 */
export const ZIGI_NAME = 'ZIGi';
export const ZIGI_ROLE = 'Your Personal AI Companion';
export const ZIGI_TITLE = `${ZIGI_NAME} · ${ZIGI_ROLE}`;
export function ZigiTitle({id, className = 'ai-chat-title'}: {id?: string; className?: string}) {
  return <h2 id={id} className={className}><NebulaFlow identity="zigi-title-name" className="ai-title-name">{ZIGI_NAME}</NebulaFlow><span className="ai-title-dot"> · </span><NebulaFlow identity="zigi-title-role" className="ai-title-role">{ZIGI_ROLE}</NebulaFlow></h2>;
}
