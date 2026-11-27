import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import { reportGameScore } from "../reportScore";

type Side = "heads" | "tails";
const LABELS: Record<Side, string> = { heads: "شیر", tails: "خط" };

export default function CoinToss({ onExit }: { onExit: () => void }) {
  const [choice, setChoice] = useState<Side | null>(null);
  const [result, setResult] = useState<Side | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function toss() {
    if (!choice || spinning) return;
    const landed = Math.random() < 0.5 ? "heads" : "tails";
    setResult(landed);
    setSpinning(true);
    setRound((n) => n + 1);
    timer.current = setTimeout(() => { setSpinning(false); reportGameScore("coin-toss", landed === choice ? 1 : 0); }, 1850);
  }

  const won = !spinning && result !== null && result === choice;
  const lost = !spinning && result !== null && result !== choice;

  return <GameFrame title="شیر یا خط" onExit={onExit}>
    <div className="coin-game">
      <div className="coin-intro">
        <span className="coin-eyebrow">شانس با تو یاره؟</span>
        <h2>شیر یا خط؟</h2>
        <p>اول حدست رو انتخاب کن، بعد سکه رو بنداز!</p>
      </div>

      <div className="coin-choice" role="group" aria-label="انتخاب شیر یا خط">
        {(["heads", "tails"] as const).map((side) => <button
          key={side}
          type="button"
          className={`coin-choice-button ${choice === side ? "selected" : ""}`}
          onClick={() => { if (!spinning) { setChoice(side); setResult(null); } }}
          disabled={spinning}
          aria-pressed={choice === side}
        >
          <span className="coin-choice-symbol">{side === "heads" ? "♔" : "✦"}</span>
          <strong>{LABELS[side]}</strong>
        </button>)}
      </div>

      <div className={`coin-stage ${spinning ? "is-spinning" : ""}`} aria-live="polite">
        <div className={`coin-3d ${result === "tails" ? "show-tails" : ""} ${spinning ? "coin-animate" : ""}`} key={round}>
          <div className="coin-face coin-heads"><span className="coin-rim">W</span><b>شیر</b><small>WARGO</small></div>
          <div className="coin-face coin-tails"><span className="coin-rim">✦</span><b>خط</b><small>WARGO</small></div>
        </div>
        <div className="coin-shadow" />
      </div>

      <div className="coin-message" aria-live="polite">
        {spinning ? <><strong>سکه در حال چرخشه...</strong><span>ببین چی میاد!</span></> :
          won ? <><strong className="coin-win">آفرین به مغزت👏</strong><span>درست حدس زدی؛ سکه {LABELS[result!]} اومد.</span></> :
          lost ? <><strong className="coin-lose">اشتباه گفتی!</strong><span>سکه {LABELS[result!]} اومد؛ بازم شانستو امتحان کن.</span></> :
          <><strong>{choice ? `حدست: ${LABELS[choice]}` : "یکی رو انتخاب کن"}</strong><span>{choice ? "حالا دکمه انداختن سکه رو بزن." : "شیر یا خط؟ انتخاب با توئه."}</span></>}
      </div>

      <button type="button" className="coin-toss-button" onClick={toss} disabled={!choice || spinning}>
        {spinning ? "در حال انداختن..." : "🪙 انداختن سکه"}
      </button>
      <div className="coin-round">تعداد پرتاب‌ها: <b>{round}</b></div>
    </div>
  </GameFrame>;
}
