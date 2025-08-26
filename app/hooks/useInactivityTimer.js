/**
 * useInactivityTimer
 *
 * React hook to trigger a callback after a period of user inactivity.
 *
 * @param {number} timeoutMs - The inactivity timeout in milliseconds.
 * @param {Function} onTimeout - Callback function to run after timeout.
 * @returns {{ reset: Function, clear: Function }}
 *   reset: Call to restart the inactivity timer (e.g., on user interaction).
 *   clear: Call to manually clear the timer.
 *
 * @example
 * const { reset } = useInactivityTimer(5 * 60 * 1000, onTimeout);
 * <View onTouchStart={reset}>...</View>
 *
 * Notes:
 * - Call `reset` in any event handler that should count as activity.
 * - The timer is automatically reset when the hook mounts or when timeoutMs changes.
 * - Always clear the timer on unmount to avoid memory leaks.
 */
import { useEffect, useRef } from 'react';

export function useInactivityTimer(timeoutMs, onTimeout) {
  const timerRef = useRef(null);

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const reset = () => {
    clear();
    timerRef.current = setTimeout(() => {
      try { onTimeout?.(); } catch {}
    }, timeoutMs);
  };

  useEffect(() => {
    reset();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeoutMs]);

  return { reset, clear };
}

export default useInactivityTimer;
