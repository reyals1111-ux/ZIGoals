'use client';
import { useCallback } from 'react';
import { usePrivateStore } from '../use-private-store';
import { PLATFORM_KEY, platformSchema, emptyPlatform, type Platform } from '../../lib/positions';
export function usePlatform(){
 const store=usePrivateStore(PLATFORM_KEY,platformSchema,emptyPlatform);
 const originalUpdate=store.update;
 const update=useCallback((updater:(s:Platform)=>Platform)=>originalUpdate(s=>platformSchema.parse(updater(s))),[originalUpdate]);
 return {...store,update};
}
