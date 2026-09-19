'use client';
import { useCallback } from 'react';
import { usePrivateStore } from '../use-private-store';
import { assertGoalEditsUnlocked, PLATFORM_KEY, platformSchema, emptyPlatform, type Platform } from '../../lib/positions';
export function usePlatform(){
 const store=usePrivateStore(PLATFORM_KEY,platformSchema,emptyPlatform);
 const originalUpdate=store.update;
 const update=useCallback((updater:(s:Platform)=>Platform)=>originalUpdate(s=>{const next=updater(s);assertGoalEditsUnlocked(s,next);return platformSchema.parse(next);}),[originalUpdate]);
 return {...store,update};
}
