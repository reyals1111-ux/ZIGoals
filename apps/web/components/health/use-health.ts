"use client";
import { usePrivateStore } from "../use-private-store";
import { createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY } from "../../lib/health";

export function useHealth() {
  return usePrivateStore(HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth);
}
