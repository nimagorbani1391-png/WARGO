import { useEffect, useMemo, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const SYMBOLS = ["🍉","🚀","🎧","🦊","🍩","⚽","🌙","🎲","🧩","🐼","🍓","🎸","🪐","🦋","🍕","🐙","🎯","🌈","🛹","🐸","🍿","🦄","🎈","🍀"];
const BEST_KEY = "wargo:memory-best";
type Card = { id: number; symbol: string; matched: boolean };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function makeDeck(stage: number, previous: string): Card[] {
  const pairs = Math.min(8 + Math.floor((stage - 1) / 2) * 2, 12);
  const chosen = shuffle(SYMBOLS).slice(0, pairs);
  const symbols = shuffle([...chosen, ...chosen]);
  let signature = symbols.join("|");
  let attempts = 0;
  while (signature === previous && attempts < 8) {
    const reshuffled = shuffle(symbols);
    symbols.splice(0, symbols.length, ...reshuffled);
    signature = symbols.join("|");
    attempts += 1;
  }
  return symbols.map((symbol, id) => ({ id, symbol, matched: false }));
}
function readBest() {
  try { const n = Number(localStorage.getItem(BEST_KEY) || 1); return Number.isSafeInteger(n) && n > 0 ? n : 1; }
  catch { return 1; }
}

export default function MemoryMatch({ onExit }: { onExit: () => void }) {
  const [stage, setStage] = useState(1);
  const [deck, setDeck] = useState<Card[]>(() => makeDeck(1, ""));
  const [opened, setOpened] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [bestStage, setBestStage] = useState(readBest);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckSignature = useMemo(() => deck.map((card) => card.symbol).join("|"), [deck]);
  const pairs = deck.length / 2;
  const complete = matches === pairs;

  useEffect(() => {
    if (!started || complete) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [started, complete, stage]);

  useEffect(() => () => {
    if (mismatchTimer.current !== null) clearTimeout(mismatchTimer.current);
  }, []);

  function begin() {
    if (mismatchTimer.current !== null) clearTimeout(mismatchTimer.current);
    setStage(1);
    setDeck(makeDeck(1, ""));
    setOpened([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setLocked(false);
    setStarted(true);
  }

  function nextStage() {
    if (mismatchTimer.current !== null) clearTimeout(mismatchTimer.current);
    const next = stage + 1;
    setStage(next);
    setDeck(makeDeck(next, deckSignature));
    setOpened([]);
    setMoves(0);
    setMatches(0);
    setLocked(false);
    setStarted(true);
    setBestStage((current) => {
      const value = Math.max(current, next);
      try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* Optional storage. */ }
      return value;
    });
  }

  function choose(card: Card) {
    if (!started || locked || complete || card.matched || opened.includes(card.id)) return;
    if (opened.length === 0) {
      setOpened([card.id]);
      return;
    }
    const first = deck[opened[0]];
    setOpened([first.id, card.id]);
    setMoves((value) => value + 1);
    if (first.symbol === card.symbol) {
      setDeck((current) => current.map((item) => item.id === first.id || item.id === card.id ? { ...item, matched: true } : item));
      setMatches((value) => value + 1);
      setOpened([]);
    } else {
      setLocked(true);
      mismatchTimer.current = setTimeout(() => {
        setOpened([]);
        setLocked(false);
        mismatchTimer.current = null;
      }, 720);
    }
  }

  const columns = pairs <= 8 ? 4 : pairs <= 10 ? 5 : 6;
  return <GameFrame title="بازی حافظه" onExit={onExit}>
    <div className="game-stats">
      <span>مرحله <b>{stage}</b></span>
      <span>حرکت <b>{moves}</b></span>
      <span>زمان <b>{seconds.toLocaleString("fa-IR")} ثانیه</b></span>
    </div>
    <div className="memory-progress"><span style={{ width: `${(matches / pairs) * 100}%` }} /></div>
    <div className="memory-meta"><span>{matches} از {pairs} جفت پیدا شده</span><span>بالاترین مرحله: {bestStage}</span></div>
    <div className="memory-board" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} aria-label={`مرحله ${stage}، کارت‌های حافظه`}>
      {deck.map((card) => {
        const visible = opened.includes(card.id) || card.matched;
        return <button type="button" key={card.id} className={`memory-card ${visible ? "is-revealed" : ""} ${card.matched ? "is-matched" : ""}`} onClick={() => choose(card)} disabled={!started || locked || card.matched || visible} aria-label={visible ? `کارت ${card.symbol}` : "کارت پنهان"}>
          <span className="memory-card-back" aria-hidden="true">?</span><span className="memory-card-face" aria-hidden="true">{card.symbol}</span>
        </button>;
      })}
    </div>
    <GameStartOverlay visible={!started || complete} title={!started ? "حافظه‌ات رو محک بزن" : `مرحله ${stage} کامل شد!`} description={!started ? "کارت‌های هم‌شکل را پیدا کن. در هر مرحله چیدمان و نمادها تصادفی عوض می‌شوند." : `همه ${pairs} جفت را در ${moves} حرکت پیدا کردی.`} buttonLabel={!started ? "شروع بازی" : "مرحله بعدی"} onStart={!started ? begin : nextStage}>
      {complete && <button type="button" className="game-secondary" onClick={begin}>شروع از مرحله اول</button>}
    </GameStartOverlay>
    <p className="game-help">دو کارت را باز کن و جفت‌های یکسان را پیدا کن. با پیشرفت مرحله‌ها تعداد کارت‌ها بیشتر می‌شود و در هر مرحله چیدمان تازه‌ای ساخته می‌شود.</p>
  </GameFrame>;
}
