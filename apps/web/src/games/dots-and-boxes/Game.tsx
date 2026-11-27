import { useEffect, useMemo, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

type Player = "X" | "O";
type Mode = "ai" | "two";
type BoxOwner = Player | null;

const DOTS = 4;
const BOXES = DOTS - 1;
const EDGE_COUNT = DOTS * BOXES * 2;

function horizontalEdge(row: number, col: number) { return row * BOXES + col; }
function verticalEdge(row: number, col: number) { return DOTS * BOXES + row * DOTS + col; }

function boxEdges(row: number, col: number) {
  return [
    horizontalEdge(row, col),
    horizontalEdge(row + 1, col),
    verticalEdge(row, col),
    verticalEdge(row, col + 1),
  ];
}

function adjacentBoxes(edge: number): number[] {
  const result: number[] = [];
  for (let row = 0; row < BOXES; row++) {
    for (let col = 0; col < BOXES; col++) {
      if (boxEdges(row, col).includes(edge)) result.push(row * BOXES + col);
    }
  }
  return result;
}

function scoreMove(edges: readonly (Player | undefined)[], owners: readonly BoxOwner[], edge: number, player: Player) {
  const nextEdges = [...edges];
  nextEdges[edge] = player;
  const nextOwners = [...owners];
  let gained = 0;

  for (let box = 0; box < BOXES * BOXES; box++) {
    if (nextOwners[box] !== null) continue;
    const row = Math.floor(box / BOXES);
    const col = box % BOXES;
    const sides = boxEdges(row, col);
    if (sides.every((side) => nextEdges[side] !== undefined)) {
      nextOwners[box] = player;
      gained++;
    }
  }
  return { edges: nextEdges, owners: nextOwners, gained };
}

/** The robot takes available boxes first, otherwise chooses a move that does not
 * give the opponent a third side. When forced, it minimizes immediate giveaways. */
function chooseRobotMove(edges: readonly Player[], owners: readonly BoxOwner[]): number {
  const available = edges.map((owner, index) => owner === undefined ? index : -1).filter((index) => index >= 0);
  if (available.length === 0) return -1;

  const captures = available
    .map((edge) => ({ edge, gained: scoreMove(edges, owners, edge, "O").gained }))
    .filter((move) => move.gained > 0)
    .sort((a, b) => b.gained - a.gained);
  if (captures.length) return captures[0].edge;

  const risk = (edge: number) => {
    let dangerous = 0;
    let exposure = 0;
    for (const box of adjacentBoxes(edge)) {
      if (owners[box] !== null) continue;
      const row = Math.floor(box / BOXES);
      const col = box % BOXES;
      const sides = boxEdges(row, col);
      const filled = sides.filter((side) => edges[side] !== undefined).length;
      if (filled === 2) dangerous += 1;
      exposure += filled;
    }
    return dangerous * 10 + exposure;
  };

  return available.reduce((best, edge) => risk(edge) < risk(best) ? edge : best, available[0]);
}

function edgeForCell(row: number, col: number): number | null {
  if (row % 2 === 0 && col % 2 === 1) return horizontalEdge(row / 2, (col - 1) / 2);
  if (row % 2 === 1 && col % 2 === 0) return verticalEdge((row - 1) / 2, col / 2);
  return null;
}

export default function DotsAndBoxes({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<Mode>("ai");
  const [edges, setEdges] = useState<(Player | undefined)[]>(Array(EDGE_COUNT).fill(undefined));
  const [owners, setOwners] = useState<BoxOwner[]>(Array(BOXES * BOXES).fill(null));
  const [turn, setTurn] = useState<Player>("X");
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [started, setStarted] = useState(false);
  const [robotThinking, setRobotThinking] = useState(false);

  const totalBoxes = BOXES * BOXES;
  const finished = owners.every((owner) => owner !== null);
  const remaining = totalBoxes - owners.filter(Boolean).length;
  const status = finished
    ? scores.X > scores.O ? "بازیکن X برنده شد!" : scores.O > scores.X ? (mode === "ai" ? "ربات برنده شد!" : "بازیکن O برنده شد!") : "بازی مساوی شد!"
    : robotThinking ? "ربات در حال فکر کردن است..." : mode === "ai" ? (turn === "X" ? "نوبت توست؛ یک خط بکش." : "نوبت ربات است.") : `نوبت بازیکن ${turn}`;

  const lastEdge = useMemo(() => {
    for (let i = edges.length - 1; i >= 0; i--) if (edges[i] !== undefined) return i;
    return -1;
  }, [edges]);

  function applyMove(edge: number, player: Player) {
    if (edges[edge] !== undefined || finished) return;
    const next = scoreMove(edges, owners, edge, player);
    setEdges(next.edges);
    setOwners(next.owners);
    if (next.gained > 0) {
      setScores((current) => ({ ...current, [player]: current[player] + next.gained }));
      setTurn(player);
    } else {
      setTurn(player === "X" ? "O" : "X");
    }
  }

  useEffect(() => {
    if (!started || finished || mode !== "ai" || turn !== "O") return;
    setRobotThinking(true);
    const timer = window.setTimeout(() => {
      const move = chooseRobotMove(edges, owners);
      if (move >= 0) applyMove(move, "O");
      setRobotThinking(false);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [started, finished, mode, turn, edges, owners]);

  function resetRound(nextMode: Mode = mode, resetScores = false) {
    setMode(nextMode);
    setEdges(Array(EDGE_COUNT).fill(undefined));
    setOwners(Array(BOXES * BOXES).fill(null));
    setTurn("X");
    setRobotThinking(false);
    setStarted(true);
    if (resetScores) setScores({ X: 0, O: 0 });
  }

  function changeMode(nextMode: Mode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setEdges(Array(EDGE_COUNT).fill(undefined));
    setOwners(Array(BOXES * BOXES).fill(null));
    setTurn("X");
    setRobotThinking(false);
    setScores({ X: 0, O: 0 });
  }

  return (
    <GameFrame title="نقطه‌بازی" onExit={onExit}>
      <div className="game-stats dots-stats" aria-label="امتیازها">
        <span>❌ بازیکن X <b>{scores.X}</b></span>
        <span>⭕ {mode === "ai" ? "ربات" : "بازیکن O"} <b>{scores.O}</b></span>
        <span>خانه‌های باقی‌مانده <b>{remaining}</b></span>
      </div>

      <div className="dots-mode" aria-label="حالت بازی">
        <button type="button" className={mode === "ai" ? "selected" : ""} aria-pressed={mode === "ai"} onClick={() => changeMode("ai")}>مقابل ربات</button>
        <button type="button" className={mode === "two" ? "selected" : ""} aria-pressed={mode === "two"} onClick={() => changeMode("two")}>دو نفره</button>
      </div>

      <div className={`dots-status ${finished ? "is-finished" : ""}`} role="status">
        <span className={turn === "X" ? "dots-x" : "dots-o"}>{finished ? "🏁" : turn === "X" ? "❌" : "⭕"}</span>
        <strong>{status}</strong>
      </div>

      <div className="dots-board-wrap">
        <div className="dots-board" role="group" aria-label="صفحه نقطه‌بازی">
          {Array.from({ length: 49 }, (_, index) => {
            const row = Math.floor(index / 7);
            const col = index % 7;
            if (row % 2 === 0 && col % 2 === 0) {
              return <div key={index} className="dots-node" aria-hidden="true"><i /></div>;
            }
            if (row % 2 === 1 && col % 2 === 1) {
              const owner = owners[((row - 1) / 2) * BOXES + (col - 1) / 2];
              return <div key={index} className={`dots-box ${owner === "X" ? "owned-x" : owner === "O" ? "owned-o" : ""}`}>
                {owner && <b>{owner === "X" ? "×" : "○"}</b>}
              </div>;
            }
            const edge = edgeForCell(row, col);
            if (edge === null) return <div key={index} />;
            const owner = edges[edge];
            const isLast = edge === lastEdge;
            return <button
              key={index}
              type="button"
              className={`dots-edge ${row % 2 === 0 ? "horizontal" : "vertical"} ${owner === "X" ? "edge-x" : owner === "O" ? "edge-o" : ""} ${isLast ? "last-edge" : ""}`}
              onClick={() => applyMove(edge, "X")}
              disabled={!started || finished || owner !== undefined || robotThinking || (mode === "ai" && turn !== "X")}
              aria-label={owner ? `خط ${edge + 1} توسط ${owner} رسم شده` : `رسم خط ${edge + 1}`}
            ><i /></button>;
          })}
        </div>
      </div>

      <div className="dots-legend">
        <span><i className="legend-x" /> بازیکن X</span>
        <span><i className="legend-o" /> {mode === "ai" ? "ربات" : "بازیکن O"}</span>
        <span><i className="legend-empty" /> خانه آزاد</span>
      </div>

      <p className="game-help">
        هر خط را با لمس فضای بین دو نقطه رسم کن. هرکس چهار ضلع یک مربع را کامل کند، آن مربع را می‌گیرد و یک نوبت اضافه بازی می‌کند.
      </p>

      <GameStartOverlay
        visible={!started || finished}
        title={!started ? "آماده‌ای؟" : status}
        description={!started ? "خطوط را رسم کن، مربع‌ها را تصاحب کن و امتیاز بگیر." : "برای یک دور تازه آماده‌ای؟"}
        buttonLabel={started ? "بازی دوباره" : "شروع بازی"}
        onStart={() => resetRound()}
      />
    </GameFrame>
  );
}
