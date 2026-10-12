'use client';
/**
 * Session AA-Local's mirror of AA-Cloud's slot registry (ADR-022 B4, B40) became this one line at the merge (B52):
 * one registry, AA-Cloud's `components/progress/slot.tsx`; every AA-Local import of `../game/slot-local` keeps working.
 */
export * from '../progress/slot';
