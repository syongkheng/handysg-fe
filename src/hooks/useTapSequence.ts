import { useCallback, useRef } from "react";

/** Taps needed to unlock, like Android's "tap build number 7 times". */
export const SECRET_TAP_COUNT = 7;
/** A longer pause than this between taps starts the count again. */
export const SECRET_TAP_WINDOW_MS = 1000;

/**
 * Returns an onPress handler that calls `onUnlock` after `count` quick taps in a row.
 * A pause longer than `windowMs` resets the count, so ordinary taps never trigger it.
 */
export function useTapSequence(onUnlock: () => void, count = SECRET_TAP_COUNT, windowMs = SECRET_TAP_WINDOW_MS) {
  const taps = useRef(0);
  const last = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    taps.current = now - last.current <= windowMs ? taps.current + 1 : 1;
    last.current = now;
    if (taps.current >= count) {
      taps.current = 0;
      onUnlock();
    }
  }, [onUnlock, count, windowMs]);
}
