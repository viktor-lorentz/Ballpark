import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { QUESTION_TIME_MS, useGame } from "../hooks/useGame";
import { dateLabel } from "../lib/daily";
import { formatValue } from "../lib/format";
import * as haptics from "../lib/haptics";
import { coverageOf, MAX_PER_QUESTION, tierOf } from "../lib/scoring";
import { hasSeenFirstReveal, markFirstRevealSeen } from "../lib/storage";
import type { DailyPuzzle, RoundResult } from "../lib/types";
import AnimatedNumber from "./AnimatedNumber";
import CountdownBar from "./CountdownBar";
import { CheckIcon, LockIcon } from "./icons";
import LogRangeSlider from "./LogRangeSlider";

interface Props {
  puzzle: DailyPuzzle;
  isArchive: boolean;
  onComplete: (result: RoundResult) => void;
  /** When false, no countdown / auto-lock (still records solve time). */
  timed?: boolean;
}

const tierLabel: Record<string, string> = {
  pinpoint: "Pinpoint!",
  solid: "Solid box",
  wide: "A bit wide",
  miss: "Missed it",
};

export default function PlayScreen({ puzzle, isArchive, onComplete, timed = true }: Props) {
  const game = useGame(puzzle, isArchive, onComplete);
  const { fact, guess, index, total } = game;

  const coverage = coverageOf(guess.low, guess.high, fact.min, fact.max, fact.scale);
  const potential = Math.round(MAX_PER_QUESTION * (1 - coverage));
  const last = index === total - 1;

  // Show a one-time coaching line on the player's very first reveal.
  const [coachEligible] = useState(() => !isArchive && !hasSeenFirstReveal());

  const doLock = useCallback(() => {
    haptics.tap();
    game.lockIn();
  }, [game]);

  // Enter locks the current box, or advances from the reveal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (game.locked) game.next();
      else doLock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, doLock]);

  return (
    <div className="mx-auto w-full max-w-md">
      {/* puzzle meta + progress */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-tight">
              Ballpark #{puzzle.id}
            </h1>
            {isArchive && <span className="chip">archive</span>}
          </div>
          <p className="text-xs text-muted">{dateLabel(puzzle.dateISO)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted">
            Question {index + 1} of {total}
          </p>
          <div className="mt-1.5 flex justify-end gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-full transition-colors ${
                  i < index ? "bg-accent" : i === index ? "bg-accent/60" : "bg-surface-2"
                }`}
              />
            ))}
          </div>
          <p
            className={`mt-1.5 text-xs font-semibold text-accent nums transition-opacity ${
              game.runningScore > 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            {game.runningScore} pts
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="card p-5 sm:p-6"
        >
          {timed && !game.locked && game.startedAt !== null && (
            <CountdownBar
              startedAt={game.startedAt}
              limitMs={QUESTION_TIME_MS}
              onExpire={doLock}
            />
          )}

          <span className="chip mb-4">{fact.category}</span>
          <h2 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {fact.prompt}
          </h2>

          <div className="mt-6">
            <LogRangeSlider
              min={fact.min}
              max={fact.max}
              scale={fact.scale}
              low={guess.low}
              high={guess.high}
              onChange={game.setGuess}
              disabled={game.locked}
              truth={game.locked ? fact.value : undefined}
              inside={game.currentResult?.inside}
            />
          </div>

          {/* bracket readout */}
          <div className="rounded-xl bg-surface-2 px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted">Your range</p>
            <p className="font-display text-lg font-semibold nums">
              {formatValue(guess.low, fact.unit)}{" "}
              <span className="text-muted">–</span> {formatValue(guess.high, fact.unit)}
            </p>
            {!game.locked && (
              <p className="mt-1 text-sm font-semibold text-accent nums">
                up to {potential} pts{" "}
                <span className="font-normal text-muted">if it's inside</span>
              </p>
            )}
          </div>

          {/* action / reveal */}
          {!game.locked ? (
            <button className="btn-primary mt-5 w-full py-3" onClick={doLock}>
              <LockIcon width={18} height={18} /> Lock in
            </button>
          ) : (
            <Reveal
              points={game.currentResult!.points}
              inside={game.currentResult!.inside}
              fact={fact}
              onNext={game.next}
              last={last}
              coach={
                coachEligible && index === 0
                  ? game.currentResult!.inside
                    ? "Nice — you boxed it. Your points come from how tight the box was."
                    : "Just outside. A tight box is a gamble, so this one scored 0."
                  : null
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      {!game.locked && (
        <p className="mt-4 text-center text-xs text-muted">
          Drag the handles to box the answer. Tighter = more points — but only if the
          true value lands inside.
        </p>
      )}

      {/* Screen-reader announcement of the reveal. */}
      <p className="sr-only" role="status" aria-live="polite">
        {game.locked && game.currentResult
          ? `Answer: ${formatValue(fact.value, fact.unit)}. ${
              game.currentResult.inside ? "Inside your range" : "Outside your range"
            }. You scored ${game.currentResult.points} points.`
          : ""}
      </p>
    </div>
  );
}

function Reveal({
  points,
  inside,
  fact,
  onNext,
  last,
  coach,
}: {
  points: number;
  inside: boolean;
  fact: DailyPuzzle["questions"][number];
  onNext: () => void;
  last: boolean;
  coach: string | null;
}) {
  const tier = tierOf(points);
  const color = inside ? "text-hit" : "text-miss";

  useEffect(() => {
    if (inside) haptics.thud();
    else haptics.tap();
  }, [inside]);

  useEffect(() => {
    if (coach) markFirstRevealSeen();
  }, [coach]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-5"
    >
      <div className="flex items-end justify-between">
        <div>
          <p className={`font-display text-sm font-bold ${color}`}>{tierLabel[tier]}</p>
          <p className="text-sm text-muted">
            Answer: <span className="font-semibold text-text nums">
              {formatValue(fact.value, fact.unit)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <AnimatedNumber
            value={points}
            className={`font-display text-3xl font-bold nums ${color}`}
          />
          <p className="text-[11px] text-muted">/ {MAX_PER_QUESTION} pts</p>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted">
        {fact.blurb}
      </p>

      {coach && (
        <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 text-xs font-medium leading-relaxed text-text">
          {coach}
        </p>
      )}

      <button className="btn-primary mt-4 w-full py-3" onClick={onNext}>
        {last ? (
          <>
            <CheckIcon width={18} height={18} /> See results
          </>
        ) : (
          "Next question →"
        )}
      </button>
    </motion.div>
  );
}
