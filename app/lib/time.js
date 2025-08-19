/**
 * time.js
 *
 * Provides time formatting helpers for the app.
 * Includes functions for displaying relative time (e.g., "5m ago").
 */

/**
 * since
 *
 * Returns a human-readable string for the time elapsed since the given timestamp.
 * @param {number} ts - Timestamp in milliseconds
 * @returns {string} - Relative time string (e.g., "5m ago", "2h ago", "3d ago")
 */
export function since(ts) {
  const d = Date.now() - (ts || 0);
  const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
  if (d < hour) return `${Math.max(1, Math.floor(d / min))}m ago`;
  if (d < day) return `${Math.floor(d / hour)}h ago`;
  return `${Math.floor(d / day)}d ago`;
}

export default { since };
