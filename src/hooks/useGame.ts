import { useCallback, useEffect, useMemo, useState } from "react";
import { fracToValue } from "../lib/format";
import { scoreQuestion, scoreRound } from "../lib/scoring";
import type { DailyPuzzle, Fact, Guess, QuestionResult, RoundResult } from "../lib/types";

/** Seconds a player gets per question before the clock auto-locks their box. */
export const QUESTION_TIME_MS = 30_000;
/** Cap any single question's recorded answering time (guards idle/untimed play). */
const ANSWER_CAP_MS = 120_000;

function defaultGuess(f: Fact): Guess {
  return {
    low: fracToValue(0.3, f.min, f.max, f.scale),
    high: fracToValue(0.7, f.min, f.max, f.scale),
  };
}

export interface GameApi {
  phase: "playing" | "results";
  index: number;
  total: number;
  fact: Fact;
  guess: Guess;
  setGuess: (low: number, high: number) => void;
  locked: boolean;
  currentResult: QuestionResult | null;
  /** Points banked so far across all locked questions. */
  runningScore: number;
  /** Timestamp (ms) the current question's clock started, or null while revealed. */
  startedAt: number | null;
  lockIn: () => void;
  next: () => void;
  result: RoundResult | null;
}

/**
 * Drives one round: five questions, one at a time, each locked and revealed
 * before moving on. Tracks per-question answering time for the solve clock.
 * Mount with a `key` tied to the puzzle so replays reset.
 */
export function useGame(
  puzzle: DailyPuzzle,
  isArchive: boolean,
  onComplete: (result: RoundResult) => void,
): GameApi {
  const facts = puzzle.questions;
  const total = facts.length;

  const [guesses, setGuesses] = useState<Guess[]>(() => facts.map(defaultGuess));
  const [locked, setLocked] = useState<boolean[]>(() => facts.map(() => false));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [result, setResult] = useState<RoundResult | null>(null);

  // Timing.
  const [startedAt, setStartedAt] = useState<number | null>(() => Date.now());
  const [answerMs, setAnswerMs] = useState(0);

  // Start (or restart) the clock whenever a fresh question becomes active.
  useEffect(() => {
    setStartedAt(Date.now());
  }, [index]);

  const fact = facts[index];
  const guess = guesses[index];
  const isLocked = locked[index];

  const currentResult = useMemo(
    () => (isLocked ? scoreQuestion(guess, fact) : null),
    [isLocked, guess, fact],
  );

  const runningScore = useMemo(
    () =>
      guesses.reduce(
        (sum, g, i) => (locked[i] ? sum + scoreQuestion(g, facts[i]).points : sum),
        0,
      ),
    [guesses, locked, facts],
  );

  const setGuess = useCallback(
    (low: number, high: number) => {
      if (locked[index]) return;
      setGuesses((prev) => {
        const next = prev.slice();
        next[index] = { low, high };
        return next;
      });
    },
    [index, locked],
  );

  const lockIn = useCallback(() => {
    if (locked[index]) return;
    setLocked((prev) => {
      const next = prev.slice();
      next[index] = true;
      return next;
    });
    const spent = startedAt ? Math.min(ANSWER_CAP_MS, Date.now() - startedAt) : 0;
    setAnswerMs((ms) => ms + spent);
    setStartedAt(null); // pause the clock during the reveal
  }, [index, locked, startedAt]);

  const next = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    const round = scoreRound(guesses, facts, {
      puzzleId: puzzle.id,
      dateISO: puzzle.dateISO,
      isArchive,
      durationMs: answerMs,
    });
    setResult(round);
    setPhase("results");
    onComplete(round);
  }, [answerMs, facts, guesses, index, isArchive, onComplete, puzzle.dateISO, puzzle.id, total]);

  return {
    phase,
    index,
    total,
    fact,
    guess,
    setGuess,
    locked: isLocked,
    currentResult,
    runningScore,
    startedAt,
    lockIn,
    next,
    result,
  };
}
