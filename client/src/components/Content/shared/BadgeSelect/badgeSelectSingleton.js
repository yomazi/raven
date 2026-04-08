// Module-level singleton — mutated only in effects and event handlers
export const currentBadge = { close: null };

export function closeCurrentBadge() {
  currentBadge.close?.();
  currentBadge.close = null;
}
