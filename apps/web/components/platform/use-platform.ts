'use client';
import { usePrivateStore } from '../use-private-store';
import { PLATFORM_KEY, platformSchema, emptyPlatform } from '../../lib/positions';
export function usePlatform(){return usePrivateStore(PLATFORM_KEY,platformSchema,emptyPlatform);}
