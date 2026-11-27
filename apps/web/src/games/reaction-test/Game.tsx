import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const BEST_KEY = "wargo:reaction-best";
type Phase = "ready" | "waiting" | "go" | "result" | "early";

function readBest(): number {
  try {
    const value = Number(localStorage.getItem(BEST_KEY) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch { return 0; }
}

export default function ReactionTest({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [reaction, setReaction] = useState<number | null>(null);
  const [best, setBest] = useState(readBest);
  const [attempts, setAttempts] = useState(0);
  const [falseStarts, setFalseStarts] = useState(0);
  const startAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  useEffect(() => () => clearTimer(), []);

  function start() {
    clearTimer();
    setReaction(null);
    setPhase("waiting");
    const delay = 1400 + Math.random() * 2600;
    timer.current = setTimeout(() => {
      startAt.current = performance.now();
      setPhase("go");
      timer.current = null;
    }, delay);
  }

  function react() {
    if (phase === "waiting") {
      clearTimer();
      setFalseStarts((count) => count + 1);
      setPhase("early");
      return;
    }
    if (phase !== "go") return;
    const elapsed = Math.max(0, Math.round(performance.now() - startAt.current));
    setReaction(elapsed);
    setAttempts((count) => count + 1);
    setBest((current) => {
      const next = current === 0 ? elapsed : Math.min(current, elapsed);
      try { localStorage.setItem(BEST_KEY, String(next)); } catch { /* Optional storage. */ }
      return next;
    });

    setPhase("result");
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      if (event.repeat) return;
      event.preventDefault();
      if (phase === "ready" || phase === "result" || phase === "early") start();
      else react();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const title = phase === "waiting" ? "هنوز نه!" : phase === "go" ? "الان!" : phase === "early" ? "زود زدی!" : phase === "result" ? "واکنشت ثبت شد" : "آماده‌ای؟";
  const description = phase === "waiting" ? "صبر کن تا صفحه سبز شود..." : phase === "go" ? "همین حالا لمس کن!" : phase === "early" ? "قبل از سبز شدن لمس کردی. دوباره امتحان کن." : phase === "result" ? `زمان واکنش: ${reaction} میلی‌ثانیه` : "به محض سبز شدن صفحه، سریع لمس کن.";
  const overlay = phase === "ready" || phase === "result" || phase === "early";

  return <GameFrame title="تست سرعت واکنش" onExit={onExit}>
    <div className="game-stats">
      <span>بهترین رکورد <b>{best ? `${best} ms` : "—"}</b></span>
      <span>تلاش موفق <b>{attempts}</b></span>
      <span>خطا <b>{falseStarts}</b></span>
    </div>
    <button type="button" className={`reaction-zone reaction-${phase}`} onPointerDown={(event) => { event.preventDefault(); if (overlay) start(); else react(); }} aria-label="برای ثبت زمان واکنش لمس کن">
      <span className="reaction-symbol" aria-hidden="true">{phase === "go" ? "!" : phase === "waiting" ? "…" : phase === "early" ? "×" : phase === "result" ? "✓" : "◷"}</span>
      <strong>{phase === "go" ? "حالا لمس کن!" : phase === "waiting" ? "منتظر سبز شدن..." : phase === "result" ? `${reaction} ms` : phase === "early" ? "زود بود!" : "شروع آزمون"}</strong>
      <span>{phase === "go" ? "هرچه سریع‌تر واکنش نشان بده" : phase === "waiting" ? "صبور باش و آماده بمان" : "برای شروع لمس کن"}</span>
    </button>
    <GameStartOverlay visible={overlay} title={title} description={description} buttonLabel={phase === "ready" ? "شروع آزمون" : "تلاش دوباره"} onStart={start} />
    <p className="game-help">وقتی رنگ صفحه سبز شد، سریع لمس کن یا Space را بزن. لمس زودهنگام به‌عنوان خطا ثبت می‌شود.</p>
  </GameFrame>;
}
