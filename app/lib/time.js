// Human-friendly time helpers
export function since(ts) {
  const d = Date.now() - (ts || 0);
  const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
  if (d < hour) return `${Math.max(1, Math.floor(d / min))}m ago`;
  if (d < day) return `${Math.floor(d / hour)}h ago`;
  return `${Math.floor(d / day)}d ago`;
}

export default { since };
