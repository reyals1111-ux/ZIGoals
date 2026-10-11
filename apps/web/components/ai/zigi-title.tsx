'use client';
import {NebulaFlow} from '../nebula-flow';

/**
 * ZIGi's full name (Session Z-Cloud Part 2, ADR-019): "ZIGi · Your Personal AI Companion". The app's middle dot is kept
 * (the owner wrote a dash; the dot is the app's separator everywhere else). Panel polish round 2: always one line; "ZIGi"
 * in the nebula flow, and the role as the app's headings are, white on the left and the nebula from its middle ("AI") to
 * its end. Its own tiny module, so Settings and Help ship the name without the panel's header code.
 */
export const ZIGI_NAME = 'ZIGi';
export const ZIGI_ROLE = 'Your Personal AI Companion';
export const ZIGI_TITLE = `${ZIGI_NAME} · ${ZIGI_ROLE}`;
export function ZigiTitle({id, className = 'ai-chat-title'}: {id?: string; className?: string}) {
  return <h2 id={id} className={className}><NebulaFlow identity="zigi-title-name" className="ai-title-name">{ZIGI_NAME}</NebulaFlow><span className="ai-title-dot"> · </span><NebulaFlow identity="zigi-title-role" className="ai-title-role">{ZIGI_ROLE}</NebulaFlow></h2>;
}
