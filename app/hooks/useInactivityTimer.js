// useInactivityTimer
// A simple hook to auto-run a callback after a period of inactivity.
// It exposes a reset() function you can call from any interaction handlers.
//
// Usage:
// const { reset } = useInactivityTimer(5 * 60 * 1000, onTimeout);
// <View onTouchStart={reset}>...</View>
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
