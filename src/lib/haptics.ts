/**
 * Tiny haptic helpers for supported mobile browsers. All calls are guarded and
 * silently no-op where the Vibration API or a device motor isn't available
 * (desktop, iOS Safari, reduced-interaction settings), so they're always safe.
 */
function buzz(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

/** A light tick — e.g. locking in a guess. */
export const tap = () => buzz(10);

/** A firmer thud — e.g. a correct, boxed answer. */
export const thud = () => buzz(22);

/** A celebratory pattern — e.g. winning the round. */
export const celebrate = () => buzz([18, 40, 18, 40, 45]);
