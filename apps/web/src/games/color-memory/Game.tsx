import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";
import { reportGameScore } from "../reportScore";

const BEST_KEY = "wargo:color-memory-best";
const COLORS = ["قرمز", "سبز", "آبی", "زرد"];
const PAD_COLORS = ["#ef476f", "#06b88b", "#3478f6", "#f4b942"];
function readBest() { try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; } }
function randomPad() { return Math.floor(Math.random() * 4); }

export default function ColorMemory({ onExit }: { onExit: () => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [best, setBest] = useState(readBest);
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "over">("idle");
  const [lit, setLit] = useState<number | null>(null);
  const [message, setMessage] = useState("برای شروع آماده‌ای؟");
  const [inputCount, setInputCount] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  function begin() {
    clearTimers();
    const first = [randomPad()];
    setSequence(first);
    setRound(1);
    setInputCount(0);
    setLit(null);
    setMessage("ترتیب نورها را به خاطر بسپار");
    setPhase("show");
  }

  useEffect(() => {
    if (phase !== "show" || sequence.length === 0) return;
    clearTimers();
    setLit(null);
    setMessage("نگاه کن...");
    sequence.forEach((pad, index) => {
      const on = setTimeout(() => setLit(pad), 450 + index * 720);
      const off = setTimeout(() => setLit(null), 820 + index * 720);
      timers.current.push(on, off);
    });
    const finish = setTimeout(() => {
      setLit(null);
      setInputCount(0);
      setMessage("حالا ترتیب را تکرار کن");
      setPhase("input");
    }, 450 + sequence.length * 720);
    timers.current.push(finish);
    return clearTimers;
  }, [phase, sequence]);

  useEffect(() => () => clearTimers(), []);

  function choose(pad: number) {
    if (phase !== "input") return;
    const index = inputCount;
    if (sequence[index] !== pad) {
      setLit(null);
      setMessage("ترتیب اشتباه بود!");
      setPhase("over");
      return;
    }
    setLit(pad);
    const flash = setTimeout(() => setLit(null), 160);
    timers.current.push(flash);
    if (index === sequence.length - 1) {
      const nextRound = round + 1;
      setRound(nextRound);
      setBest((current) => {
        const value = Math.max(current, round);
        try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* Optional storage. */ }
        return value;
      });
      setMessage("درست بود! مرحله بعد...");
      setPhase("show");
      setSequence((current) => [...current, randomPad()]);
    } else {
      setInputCount(index + 1);
    }
  }

  useEffect(() => { if (phase === "over") reportGameScore("color-memory", Math.max(0, round - 1)); }, [phase]);

  return <GameFrame title="حافظه رنگی" onExit={onExit}>
    <div className="game-stats">
      <span>مرحله <b>{round}</b></span>
      <span>رکورد <b>{best}</b></span>
      <span>نورها <b>{sequence.length}</b></span>
    </div>
    <div className="color-memory-status" aria-live="polite">{message}</div>
    <div className="color-memory-board" aria-label="چهار دکمه رنگی">
      {COLORS.map((name, index) => <button key={name} type="button" className={`color-memory-pad ${lit === index ? "is-lit" : ""}`} data-pad={index} style={{ backgroundColor: PAD_COLORS[index] }} onClick={() => choose(index)} disabled={phase !== "input"} aria-label={name} />)}
    </div>
    <GameStartOverlay visible={phase === "idle" || phase === "over"} title={phase === "over" ? "بازی تمام شد!" : "حافظه رنگی"} description={phase === "over" ? `تا مرحله ${round} پیش رفتی. رکوردت را بهتر کن.` : "نورها را به خاطر بسپار و دقیقاً با همان ترتیب روی رنگ‌ها بزن. هر مرحله یک رنگ به دنباله اضافه می‌شود."} buttonLabel={phase === "over" ? "شروع دوباره" : "شروع بازی"} onStart={begin} />
    <p className="game-help">اول فقط تماشا کن؛ بعد همان ترتیب را با لمس رنگ‌ها تکرار کن. با هر مرحله، دنباله طولانی‌تر می‌شود.</p>
  </GameFrame>;
}
