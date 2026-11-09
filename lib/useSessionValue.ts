"use client";

import { useSyncExternalStore } from "react";
import { subscribeSession } from "./sessionStore";

/**
 * Reads a value out of browser storage without a mount effect.
 *
 * The server snapshot is always empty, so the markup React prerenders matches
 * the markup it hydrates; the real value appears right after hydration, and
 * again whenever something writes to storage.
 */
export function useSessionValue(read: () => string): string {
  return useSyncExternalStore(subscribeSession, read, () => "");
}
