import { useEffect, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";
import { reportGameScore } from "../reportScore";

type Mark = "X" | "O" | null;
type Outcome = Mark | "draw";

const LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// Prefer the center, then corners, then edges when equally good moves exist.
const MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7] as const;

function winningLine(board: readonly Mark[]): number[] {
  const line = LINES.find(([a, b, c]) =>
    board[a] !== null && board[a] === board[b] && board[a] === board[c],
  );
  return line ? [...line] : [];
}

function getOutcome(board: readonly Mark[]): Outcome {
  const line = winningLine(board);
  if (line.length > 0) return board[line[0]];
  return board.every((cell) => cell !== null) ? "draw" : null;
}

/** O is the maximizing player; X is the minimizing player. */
function minimax(
  board: readonly Mark[],
  turn: Exclude<Mark, null>,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const outcome = getOutcome(board);
  if (outcome === "O") return 10 - depth;
  if (outcome === "X") return depth - 10;
  if (outcome === "draw") return 0;

  if (turn === "O") {
    let best = -Infinity;
    for (const index of MOVE_ORDER) {
      if (board[index] !== null) continue;
      const next = [...board];
      next[index] = "O";
      best = Math.max(best, minimax(next, "X", depth + 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const index of MOVE_ORDER) {
    if (board[index] !== null) continue;
    const next = [...board];
    next[index] = "X";
    best = Math.min(best, minimax(next, "O", depth + 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAiMove(board: readonly Mark[]): number {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (const index of MOVE_ORDER) {
    if (board[index] !== null) continue;
    const next = [...board];
    next[index] = "O";
    const score = minimax(next, "X", 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }
  return bestMove;
}

export default function TicTacToe({ onExit }: { onExit: () => void }) {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [mode, setMode] = useState<"ai" | "two">("ai");
  const [scores, setScores] = useState({ x: 0, o: 0, draw: 0 });
  const [started, setStarted] = useState(false);

  const result = getOutcome(board);
  useEffect(() => { if (started && result !== null) reportGameScore("tic-tac-toe", result === "X" ? 3 : result === "draw" ? 1 : 0); }, [started, result]);
  const winning = winningLine(board);

  function record(outcome: Outcome) {
    if (outcome === null) return;
    setScores((current) => ({
      x: current.x + (outcome === "X" ? 1 : 0),
      o: current.o + (outcome === "O" ? 1 : 0),
      draw: current.draw + (outcome === "draw" ? 1 : 0),
    }));
  }

  function resetRound() {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setStarted(true);
  }

  function changeMode(nextMode: "ai" | "two") {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetRound();
  }

  function play(index: number) {
    if (
      board[index] !== null ||
      result !== null ||
      (mode === "ai" && turn !== "X")
    ) return;

    const afterPlayer = [...board];
    afterPlayer[index] = turn;
    const playerOutcome = getOutcome(afterPlayer);

    if (playerOutcome !== null) {
      setBoard(afterPlayer);
      record(playerOutcome);
      return;
    }

    if (mode === "ai") {
      const aiIndex = chooseAiMove(afterPlayer);
      if (aiIndex < 0) {
        setBoard(afterPlayer);
        record("draw");
        return;
      }

      const afterAi = [...afterPlayer];
      afterAi[aiIndex] = "O";
      const aiOutcome = getOutcome(afterAi);
      setBoard(afterAi);
      setTurn("X");
      if (aiOutcome !== null) record(aiOutcome);
      return;
    }

    const nextTurn = turn === "X" ? "O" : "X";
    setBoard(afterPlayer);
    setTurn(nextTurn);
  }

  const statusText = result === "X"
    ? "بازیکن X برنده شد!"
    : result === "O"
      ? (mode === "ai" ? "ربات برنده شد!" : "بازیکن O برنده شد!")
      : result === "draw"
        ? "بازی مساوی شد."
        : mode === "ai"
          ? "نوبت توست؛ X بازی می‌کند."
          : `نوبت بازیکن ${turn}`;

  return (
    <GameFrame title="دوز" onExit={onExit}>
      <div className="game-stats" aria-label="امتیازها">
        <span>❌ <b>{scores.x}</b></span>
        <span>مساوی <b>{scores.draw}</b></span>
        <span>⭕ <b>{scores.o}</b></span>
      </div>

      <div className="ttt-mode" aria-label="حالت بازی">
        <button
          type="button"
          className={mode === "ai" ? "selected" : ""}
          aria-pressed={mode === "ai"}
          onClick={() => changeMode("ai")}
        >
          مقابل ربات
        </button>
        <button
          type="button"
          className={mode === "two" ? "selected" : ""}
          aria-pressed={mode === "two"}
          onClick={() => changeMode("two")}
        >
          دو نفره
        </button>
      </div>

      <div className="ttt-board" role="group" aria-label="صفحه بازی دوز">
        {board.map((mark, index) => {
          const isWinningCell = winning.includes(index);
          const label = mark
            ? `خانه ${index + 1}، ${mark}${isWinningCell ? "، خانه برنده" : ""}`
            : `خانه خالی ${index + 1}`;
          return (
            <button
              key={index}
              type="button"
              className={`${mark === "X" ? "mark-x" : mark === "O" ? "mark-o" : ""} ${isWinningCell ? "is-winning" : ""}`}
              onClick={() => play(index)}
              disabled={mark !== null || result !== null || (mode === "ai" && turn !== "X")}
              aria-label={label}
            >
              {mark ?? ""}
            </button>
          );
        })}
      </div>

      <GameStartOverlay visible={!started || result !== null} title={started ? statusText : "آماده‌ای؟"} description={!started ? "برای شروع، دکمه زیر را بزن." : "برای یک دور تازه آماده‌ای؟"} buttonLabel={started ? "دور بعدی" : "شروع بازی"} onStart={resetRound} />

      <p className="game-help">
        {mode === "ai"
          ? "ربات با الگوریتم Minimax و هرس آلفا-بتا بازی می‌کند؛ بهترین نتیجه ممکن را انتخاب می‌کند."
          : "بازیکنان به نوبت خانه‌های خالی را انتخاب می‌کنند."}
      </p>
    </GameFrame>
  );
}
