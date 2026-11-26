import { useEffect, useMemo, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const symbols: Record<string, string> = { wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙", bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟" };
const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
function evaluate(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "b" ? 100000 : -100000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) for (const piece of row) if (piece) score += (piece.color === "b" ? 1 : -1) * (values[piece.type] || 0);
  return score;
}
function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = game.moves({ verbose: true }).sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
  if (game.turn() === "b") {
    let best = -Infinity;
    for (const move of moves) { game.move(move); best = Math.max(best, search(game, depth - 1, alpha, beta)); game.undo(); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
    return best;
  }
  let best = Infinity;
  for (const move of moves) { game.move(move); best = Math.min(best, search(game, depth - 1, alpha, beta)); game.undo(); beta = Math.min(beta, best); if (beta <= alpha) break; }
  return best;
}
function chooseComputerMove(fen: string, level: string): string | null {
  const game = new Chess(fen), moves = game.moves({ verbose: true }) as Move[];
  if (!moves.length) return null;
  if (level === "easy") return moves[Math.floor(Math.random() * moves.length)].san;
  const depth = level === "hard" ? 3 : 1;
  let best = -Infinity; let choices: string[] = [];
  for (const move of moves) {
    game.move(move); const score = search(game, depth, -Infinity, Infinity); game.undo();
    const noise = level === "normal" ? Math.random() * 45 : Math.random() * 3;
    const value = score + noise;
    if (value > best) { best = value; choices = [move.san]; } else if (value === best) choices.push(move.san);
  }
  return choices[Math.floor(Math.random() * choices.length)] || moves[0].san;
}
export default function ChessGame({ onExit }: { onExit: () => void }) {
  const [fen, setFen] = useState(() => new Chess().fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [difficulty, setDifficulty] = useState("normal");
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const game = useMemo(() => new Chess(fen), [fen]);
  const moves = selected ? game.moves({ square: selected, verbose: true }) as Move[] : [];
  const legalTargets = moves.map((move) => move.to);

  useEffect(() => {
    if (!started || game.turn() !== "b" || game.isGameOver()) return;
    setThinking(true);
    const timer = window.setTimeout(() => {
      const san = chooseComputerMove(fen, difficulty);
      if (san) {
        const next = new Chess(fen); const move = next.move(san);
        setFen(next.fen()); setHistory((old) => [...old, move.san]); setSelected(null);
      }
      setThinking(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fen, difficulty, game, started]);

  const message = game.isCheckmate() ? "کیش‌ومات! " + (game.turn() === "w" ? "ربات برنده شد." : "تو برنده شدی!") : game.isDraw() ? "بازی مساوی شد." : thinking ? "ربات در حال فکر کردن است…" : game.isCheck() ? "کیش!" : game.turn() === "w" ? "نوبت توست؛ سفید بازی می‌کند." : "نوبت ربات است.";
  function play(square: Square) {
    if (!started || thinking || game.turn() !== "w" || game.isGameOver()) return;
    if (selected) {
      const target = moves.find((move) => move.to === square);
      if (target) {
        const next = new Chess(fen);
        const played = next.move({ from: selected, to: square, promotion: "q" });
        if (played) { setFen(next.fen()); setHistory((old) => [...old, played.san]); setSelected(null); return; }
      }
    }
    const piece = game.get(square);
    setSelected(piece?.color === "w" ? square : null);
  }
  function restart() { setFen(new Chess().fen()); setHistory([]); setSelected(null); setThinking(false); setStarted(true); }
  return <GameFrame title="شطرنج با ربات" onExit={onExit}>
    <div className="chess-toolbar"><label>سختی ربات<select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); restart(); }}><option value="easy">آسان</option><option value="normal">متوسط</option><option value="hard">سخت</option></select></label><span className="chess-turn">{message}</span></div>
    <div className="chess-board" role="grid" aria-label="صفحه شطرنج">
      {game.board().map((row, r) => row.map((piece, c) => {
        const square = (String.fromCharCode(97 + c) + (8 - r)) as Square;
        const light = (r + c) % 2 === 0;
        const isSelected = selected === square, isTarget = legalTargets.includes(square);
        return <button type="button" role="gridcell" key={square} aria-label={square} className={`chess-square ${light ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`} onClick={() => play(square)}>
          {piece && <span className={piece.color === "w" ? "white-piece" : "black-piece"}>{symbols[piece.color + piece.type]}</span>}
        </button>;
      }))}
    </div>
    <div className="chess-bottom"><span>حرکت‌ها: {history.length}</span></div>
    <GameStartOverlay visible={!started || game.isGameOver()} title={!started ? "آماده‌ی شطرنجی؟" : message} description={!started ? "برای شروع بازی با ربات آماده شو." : "یک بازی تازه شروع کن."} buttonLabel={!started ? "شروع بازی" : "دور بعدی"} onStart={restart} />
    {history.length > 0 && <div className="chess-history">{history.slice(-8).join(" · ")}</div>}
    <p className="game-help">مهره را لمس کن، سپس خانهٔ مقصد را انتخاب کن. ارتقای سرباز به وزیر انجام می‌شود.</p>
  </GameFrame>;
}
