'use client';
import type {ReactNode} from 'react';
import {LoadBoundary} from '../load-boundary';

/**
 * Session X-Local Phase 2 (P2.8, X-Cloud's H9): a part of ZIGi whose code loads on demand keeps a failed load to itself.
 * Offline, or after a new version replaced the files, the chunk cannot be fetched; without this the chat, a Settings
 * panel or the knock's check-in took the whole launcher or section down. The part says which connection it needs, in
 * place (or, `quiet`, a floating part simply stays away); the rest of ZIGi keeps working. The browser remembers a failed
 * load until the page reloads, so the way back is a reload once online. The wording follows X-Cloud's `LoadBoundary`,
 * which wraps the places where its files mount ZIGi's parts; this one wraps the parts inside ZIGi's own components.
 * After the merge (Session X-Local Part 9, the owner's H9 fold, ADR-017 S80) it renders through that one component with
 * ZIGi's class names and words, so the markup every spec reads is unchanged and the fallback lives in one place.
 */
export function ZigiPartBoundary({children, label, quiet, className}: {children: ReactNode; label?: string; quiet?: boolean; className?: string}) {
  return <LoadBoundary label={label ?? 'This part of ZIGi'} quiet={quiet} className={className ?? 'zigi-part-failed'} noteClassName="ai-note" rest="ZIGi">{children}</LoadBoundary>;
}
