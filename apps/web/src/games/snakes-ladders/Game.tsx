import { useState } from "react";
import GameFrame from "../GameFrame";

const ladders: Record<number, number> = { 3: 22, 8: 30, 20: 41, 28: 55, 36: 57, 51: 72, 71: 92, 80: 99 };
const actualSnakes: Record<number, number> = { 17: 7, 32: 11, 48: 26, 62: 19, 88: 67, 95: 75, 97: 78 };
type State = { player: number; cpu: number; turn: "player" | "cpu"; winner: string; rolls: number };
function move(position: number, dice: number) {
  const raw = position + dice;
  if (raw > 100) return position;
  return ladders[raw] || actualSnakes[raw] || raw;
}
export default function SnakesLadders({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<State>({ player: 0, cpu: 0, turn: "player", winner: "", rolls: 0 });
  const [dice, setDice] = useState(1);
  const [busy, setBusy] = useState(false);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem("wargo:snakes-best") || 0); } catch { return 0; } });
  function roll() {
    if (busy || state.winner || state.turn !== "player") return;
    setBusy(true);
    const value = Math.floor(Math.random() * 6) + 1; setDice(value);
    const player = move(state.player, value), won = player === 100;
    const next = { ...state, player, rolls: state.rolls + 1, turn: won ? "player" as const : "cpu" as const, winner: won ? "player" : "" };
    if (won) {
      const record = best === 0 ? next.rolls : Math.min(best, next.rolls); setBest(record);
      try { localStorage.setItem("wargo:snakes-best", String(record)); } catch { /* Optional local record. */ }
    }
    setState(next);
    if (!won) window.setTimeout(() => {
      setState((current) => {
        const cpuDice = Math.floor(Math.random() * 6) + 1; setDice(cpuDice);
        const cpu = move(current.cpu, cpuDice), cpuWon = cpu === 100;
        return { ...current, cpu, turn: "player", winner: cpuWon ? "cpu" : "" };
      });
      setBusy(false);
    }, 650);
    else setBusy(false);
  }
  function restart() { setState({ player: 0, cpu: 0, turn: "player", winner: "", rolls: 0 }); setDice(1); setBusy(false); }
  const cell = (n: number) => <div key={n} className={`snakes-cell ${ladders[n] ? "ladder-cell" : ""} ${actualSnakes[n] ? "snake-cell" : ""}`}><small>{n}</small>{state.player === n && <i className="pawn player-pawn">●</i>}{state.cpu === n && <i className="pawn cpu-pawn">●</i>}{ladders[n] && <em>↗</em>}{actualSnakes[n] && <em>↘</em>}</div>;
  const cells = Array.from({ length: 100 }, (_, i) => 100 - i);
  return <GameFrame title="مار و پله" onExit={onExit}>
    <div className="snakes-score"><span>تو <b>{state.player || "شروع"}</b></span><span>ربات <b>{state.cpu || "شروع"}</b></span><span>بهترین رکورد <b>{best ? best + " حرکت" : "—"}</b></span></div>
    <div className="snakes-board">{cells.map((n, i) => { const row = Math.floor(i / 10); const col = i % 10; const number = row % 2 === 0 ? n - col : n - (9 - col); return cell(number); })}</div>
    <div className="snakes-controls"><div className="dice-face">{["⚀","⚁","⚂","⚃","⚄","⚅"][dice - 1]}</div><div><strong>{state.winner ? state.winner === "player" ? "تو برنده شدی!" : "ربات برنده شد." : busy ? "نوبت ربات…" : "نوبت توست؛ تاس بنداز."}</strong><p>برای بردن باید دقیقاً به خانهٔ ۱۰۰ برسی.</p></div><button className="game-primary" type="button" disabled={busy || !!state.winner} onClick={roll}>تاس بنداز</button></div>
    {state.winner && <button className="game-secondary snakes-restart" type="button" onClick={restart}>بازی دوباره</button>}
  </GameFrame>;
}
