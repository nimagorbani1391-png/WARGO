import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

type Board = number[][];
type Direction = "left" | "right" | "up" | "down";

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
  const row = Math.floor(position / SIZE);
  const column = position % SIZE;
  next[row][column] = Math.random() < 0.9 ? 2 : 4;
  return next;
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
      if (direction === "left" || direction === "right") {
        next[index][offset] = line[offset];
      } else {
        next[offset][index] = line[offset];
      }
    }
  }

  return { board: next, gained };
}

function boardsEqual(first: Board, second: Board): boolean {
  return first.every((row, rowIndex) =>
    row.every((value, columnIndex) => value === second[rowIndex][columnIndex]),
  );
}

function isGameOver(board: Board): boolean {
  if (board.some((row) => row.includes(0))) return false;

  return !(["left", "right", "up", "down"] as Direction[]).some(
    (direction) => !boardsEqual(board, moveBoard(board, direction).board),
  );
}

function readBestScore(): number {
  try {
    const value = Number(window.localStorage.getItem(BEST_KEY) ?? 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function createNewBoard(): Board {
  return spawnTile(spawnTile(freshBoard()));
}

export default function Game2048({ onExit }: { onExit: () => void }) {
  const [board, setBoard] = useState<Board>(createNewBoard);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBestScore);
  const [won, setWon] = useState(false);
  const [continued, setContinued] = useState(false);
  const [over, setOver] = useState(false);
  const [started, setStarted] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
  }, [best]);

  const play = useCallback(
    (direction: Direction) => {
      if (!started || over || (won && !continued)) return;

      const result = moveBoard(board, direction);
      if (boardsEqual(board, result.board)) return;

      const next = spawnTile(result.board);
      const nextScore = score + result.gained;

      setBoard(next);
      setScore(nextScore);
      setBest((current) => Math.max(current, nextScore));

      if (!won && next.some((row) => row.includes(TARGET))) {
        setWon(true);
      }
      if (isGameOver(next)) setOver(true);
    },
    [board, continued, over, score, started, won],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }

      const directions: Record<string, Direction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const direction = directions[event.key];
      if (!direction || !started || over || (won && !continued)) return;

      event.preventDefault();
      play(direction);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [continued, over, play, started, won]);

  const startNewGame = () => {
    setBoard(createNewBoard());
    setScore(0);
    setWon(false);
    setContinued(false);
    setOver(false);
    setStarted(true);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!started || over || (won && !continued)) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || !started || over || (won && !continued)) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    if (distance < 28) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      play(deltaX > 0 ? "right" : "left");
    } else {
      play(deltaY > 0 ? "down" : "up");
    }
  };

  const overlayVisible = !started || (won && !continued) || over;
  const overlayTitle = !started
    ? "آماده‌ی ۲۰۴۸؟"
    : over
      ? "حرکت دیگری باقی نمانده."
      : "آفرین! به ۲۰۴۸ رسیدی.";
  const overlayDescription = !started
    ? "عددهای برابر را ترکیب کن و به ۲۰۴۸ برس."
    : over
      ? `امتیاز نهایی: ${score.toLocaleString("fa-IR")}`
      : "می‌توانی بازی را ادامه بدهی یا یک صفحه‌ی تازه بسازی.";

  return (
    <GameFrame title="2048" onExit={onExit}>
      <div className="game-stats">
        <span>امتیاز <b>{score.toLocaleString("fa-IR")}</b></span>
        <span>بهترین <b>{best.toLocaleString("fa-IR")}</b></span>
      </div>

      <div
        className="g2048-board"
        role="grid"
        aria-label="صفحه بازی ۲۰۴۸"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        {board.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <div
              key={rowIndex * SIZE + columnIndex}
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
        buttonLabel={!started ? "شروع بازی" : over ? "بازی جدید" : "ادامه بازی"}
        onStart={over || !started ? startNewGame : () => setContinued(true)}
      >
        {started && won && !continued && !over && (
          <button type="button" className="game-secondary" onClick={startNewGame}>
            بازی جدید
          </button>
        )}
      </GameStartOverlay>

      <p className="game-help">
        با کشیدن انگشت یا کلیدهای جهت‌دار، خانه‌ها را حرکت بده. هر حرکت فقط یک‌بار هر جفت عدد برابر را ادغام می‌کند.
      </p>
    </GameFrame>
  );
}
