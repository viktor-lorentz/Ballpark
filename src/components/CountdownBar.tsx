import { useEffect, useRef, useState } from "react";
import { ClockIcon } from "./icons";

interface Props {
  /** Timestamp (ms) the clock started. Changing it restarts the countdown. */
  startedAt: number;
  limitMs: number;
  /** Called once when the clock reaches zero. */
  onExpire: () => void;
}

/**
 * A slim per-question countdown. The bar width is CSS-transitioned between
 * coarse samples so it depletes smoothly without a per-frame render loop, and
 * the color escalates amber → red in the final seconds.
 */
export default function CountdownBar({ startedAt, limitMs, onExpire }: Props) {
  const [remaining, setRemaining] = useState(limitMs);
  const firedRef = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    setRemaining(limitMs);
    const id = setInterval(() => {
      const left = Math.max(0, startedAt + limitMs - Date.now());
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        expireRef.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [startedAt, limitMs]);

  const secs = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / limitMs) * 100));
  const warn = remaining <= 7000;
  const danger = remaining <= 3000;

  const barColor = danger ? "bg-miss" : warn ? "bg-truth" : "bg-accent";
  const textColor = danger ? "text-miss" : warn ? "text-truth" : "text-muted";

  return (
    <div className="mb-4 flex items-center gap-3" aria-hidden>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${textColor} ${
          danger ? "animate-pulse" : ""
        }`}
      >
        <ClockIcon width={14} height={14} />
        0:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}
