import { useEffect, useReducer, useRef } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";
import { reportGameScore } from "../reportScore";

type Board = number[][];
type Direction = "left" | "right" | "up" | "down";
type GameState = {
  board: Board;
  score: number;
  won: boolean;
  continued: boolean;
  over: boolean;
  started: boolean;
};
type Action =
  | { type: "move"; direction: Direction }
  | { type: "start" }
  | { type: "continue" };

const SIZE = 4;
const TARGET = 2048;
const BEST_KEY = "wargo:2048-best";

const freshBoard = (): Board =>
  Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));

function spawnTile(board: Board): Board {
  const next = board.map((row) => [...row]);
  const empty: number[] = [];
  next.forEach((row, rowIndex) =>
    row.forEach((value, columnIndex) => {
      if (value === 0) empty.push(rowIndex * SIZE + columnIndex);
    }),
  );
  if (empty.length === 0) return next;
  const position = empty[Math.floor(Math.random() * empty.length)];
  next[Math.floor(position / SIZE)][position % SIZE] =
    Math.random() < 0.9 ? 2 : 4;
  return next;
}

function createNewBoard(): Board {
  return spawnTile(spawnTile(freshBoard()));
}

function slideLine(line: number[]): { line: number[]; gained: number } {
  const compact = line.filter((value) => value !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const value = compact[index] * 2;
      merged.push(value);
      gained += value;
      index += 1;
    } else {
      merged.push(compact[index]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { line: merged, gained };
}

function moveBoard(board: Board, direction: Direction): { board: Board; gained: number } {
  const next = freshBoard();
  let gained = 0;
  for (let index = 0; index < SIZE; index += 1) {
    let line =
      direction === "left" || direction === "right"
        ? [...board[index]]
        : board.map((row) => row[index]);
    if (direction === "right" || direction === "down") line.reverse();
    const result = slideLine(line);
    gained += result.gained;
    line = result.line;
    if (direction === "right" || direction === "down") line.reverse();
    for (let offset = 0; offset < SIZE; offset += 1) {
      if (direction === "left" || direction === "right") next[index][offset] = line[offset];
      else next[offset][index] = line[offset];
    }
  }
  return { board: next, gained };
}

function boardsEqual(first: Board, second: Board): boolean {
  return first.every((row, r) => row.every((value, c) => value === second[r][c]));
}

function isGameOver(board: Board): boolean {
  return board.every((row) => row.every((value) => value !== 0));
}

function initialState(): GameState {
  return {
    board: createNewBoard(),
    score: 0,
    won: false,
    continued: false,
    over: false,
    started: false,
  };
}

// Reducer keeps every move atomic: rapid inputs always use the latest board.
function gameReducer(state: GameState, action: Action): GameState {
  if (action.type === "start") {
    return { ...initialState(), started: true };
  }
  if (action.type === "continue") {
    if (!state.won || state.continued || state.over) return state;
    return { ...state, continued: true };
  }
  if (!state.started || state.over || (state.won && !state.continued)) return state;

  const result = moveBoard(state.board, action.direction);
  if (boardsEqual(state.board, result.board)) return state;

  const board = spawnTile(result.board);
  return {
    ...state,
    board,
    score: state.score + result.gained,
    won: state.won || board.some((row) => row.includes(TARGET)),
    over: isGameOver(board),
  };
}

function readBestScore(): number {
  try {
    const value = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export default function Game2048({ onExit }: { onExit: () => void }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const [best, setBest] = useReducer(
    (current: number, score: number) => Math.max(current, score),
    readBestScore(),
  );
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const resultReported = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
  }, [best]);

  useEffect(() => {
    const directions: Record<string, Direction> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      a: "left",
      d: "right",
      w: "up",
      s: "down",
      A: "left",
      D: "right",
      W: "up",
      S: "down",
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        event.altKey || event.ctrlKey || event.metaKey
      ) return;

      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      dispatch({ type: "move", direction });
    };
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!state.started || state.over || (state.won && !state.continued)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is an enhancement; the game still accepts keyboard input.
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    if (!state.started || state.over || (state.won && !state.continued)) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
    const direction =
      Math.abs(deltaX) > Math.abs(deltaY)
        ? deltaX > 0 ? "right" : "left"
        : deltaY > 0 ? "down" : "up";
    dispatch({ type: "move", direction });
  };

  const overlayVisible = !state.started || (state.won && !state.continued) || state.over;
  const overlayTitle = !state.started
    ? "آماده‌ی ۲۰۴۸؟"
    : state.over
      ? "حرکت دیگری باقی نمانده."
      : "آفرین! به ۲۰۴۸ رسیدی.";
  const overlayDescription = !state.started
    ? "عددهای برابر را ترکیب کن و به ۲۰۴۸ برس."
    : state.over
      ? `امتیاز نهایی: ${state.score.toLocaleString("fa-IR")}`
      : "می‌توانی بازی را ادامه بدهی یا یک صفحه‌ی تازه بسازی.";

  useEffect(() => { if (!state.over && state.score === 0) resultReported.current = false; if (state.over && !resultReported.current) { resultReported.current = true; reportGameScore("game-2048", state.score); } }, [state.over, state.score]);

  // Keep the best score synchronized with every committed game state.
  useEffect(() => setBest(state.score), [state.score]);

  return (
    <GameFrame title="2048" onExit={onExit}>
      <div className="game-stats">
        <span>امتیاز <b>{state.score.toLocaleString("fa-IR")}</b></span>
        <span>بهترین <b>{best.toLocaleString("fa-IR")}</b></span>
      </div>

      <div
        className="g2048-board"
        role="grid"
        aria-label="صفحه بازی ۲۰۴۸"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
        onLostPointerCapture={() => { pointerStart.current = null; }}
      >
        {state.board.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <div
              key={`${rowIndex * SIZE + columnIndex}-${value}`}
              role="gridcell"
              aria-label={value === 0 ? "خالی" : String(value)}
              className={`g2048-tile v${Math.min(value, TARGET)}`}
            >
              {value || ""}
            </div>
          )),
        )}
      </div>

      <GameStartOverlay
        visible={overlayVisible}
        title={overlayTitle}
        description={overlayDescription}
        buttonLabel={!state.started ? "شروع بازی" : state.over ? "بازی جدید" : "ادامه بازی"}
        onStart={state.over || !state.started
          ? () => dispatch({ type: "start" })
          : () => dispatch({ type: "continue" })}
      >
        {state.started && state.won && !state.continued && !state.over && (
          <button type="button" className="game-secondary" onClick={() => dispatch({ type: "start" })}>
            بازی جدید
          </button>
        )}
      </GameStartOverlay>

      <p className="game-help">
        با کشیدن انگشت یا کلیدهای جهت‌دار (یا WASD)، خانه‌ها را حرکت بده. هر حرکت فقط یک‌بار هر جفت عدد برابر را ادغام می‌کند.
      </p>
    </GameFrame>
  );
}
