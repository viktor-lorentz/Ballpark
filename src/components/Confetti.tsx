import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["var(--accent)", "var(--truth)", "var(--accent-2)", "var(--hit)", "var(--miss)"];

/** A lightweight, dependency-free confetti burst. No-ops under reduced-motion. */
export default function Confetti({ count = 64 }: { count?: number }) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.random() * 2 - 1) * 55; // horizontal spread, degrees
      const dist = 160 + Math.random() * 260;
      return {
        id: i,
        x: Math.sin((angle * Math.PI) / 180) * dist,
        y: 240 + Math.random() * 360,
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.12,
        dur: 1.2 + Math.random() * 0.9,
        w: 6 + Math.random() * 7,
        h: 9 + Math.random() * 8,
        left: 50 + (Math.random() * 18 - 9),
        color: COLORS[i % COLORS.length],
      };
    });
  }, [count]);

  if (reduce) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "16%",
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            backgroundColor: `rgb(${p.color})`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
