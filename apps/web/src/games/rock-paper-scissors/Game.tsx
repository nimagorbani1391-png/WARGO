import { useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";
import { reportGameScore } from "../reportScore";

const choices = [{ id: "rock", label: "سنگ", icon: "✊" }, { id: "paper", label: "کاغذ", icon: "✋" }, { id: "scissors", label: "قیچی", icon: "✌️" }];
const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
type Round = { player: string; cpu: string; result: "win" | "lose" | "draw" };
export default function RockPaperScissors({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState({ player: 0, cpu: 0, draw: 0 });
  const [rounds, setRounds] = useState(0);
  const [history, setHistory] = useState<Round[]>([]);
  const [started, setStarted] = useState(false);
  function play(id: string) {
    if (!started) return;
    const cpu = choices[Math.floor(Math.random() * choices.length)].id;
    const result = id === cpu ? "draw" : beats[id] === cpu ? "win" : "lose";
    const next = { player: id, cpu, result } as Round;
    reportGameScore("rock-paper-scissors", result === "win" ? 3 : result === "draw" ? 1 : 0);
    setRound(next); setStarted(false); setRounds((n) => n + 1); setHistory((h) => [next, ...h].slice(0, 5));
    setScore((s) => ({ player: s.player + (result === "win" ? 1 : 0), cpu: s.cpu + (result === "lose" ? 1 : 0), draw: s.draw + (result === "draw" ? 1 : 0) }));
  }
  function reset() { setRound(null); setScore({ player: 0, cpu: 0, draw: 0 }); setRounds(0); setHistory([]); setStarted(false); }
  function nextRound() { setStarted(true); }
  const getChoice = (id: string) => choices.find((c) => c.id === id)!;
  return <GameFrame title="سنگ، کاغذ، قیچی" onExit={onExit}>
    <div className="rps-score"><div><b>{score.player}</b><span>تو</span></div><div className="rps-round">دور {rounds}</div><div><b>{score.cpu}</b><span>ربات</span></div></div>
    <div className="rps-arena">
      <div className="rps-side"><span>انتخاب تو</span><strong>{round ? getChoice(round.player).icon : "؟"}</strong><b>{round ? getChoice(round.player).label : "منتظر انتخاب"}</b></div>
      <div className="rps-vs">VS</div>
      <div className="rps-side"><span>انتخاب ربات</span><strong>{round ? getChoice(round.cpu).icon : "؟"}</strong><b>{round ? getChoice(round.cpu).label : "منتظر انتخاب"}</b></div>
    </div>
    <div className={`rps-result ${round?.result || ""}`}>{!round ? "حرکتت را انتخاب کن" : round.result === "win" ? "این دور را بردی!" : round.result === "lose" ? "این دور را ربات برد." : "مساوی شد!"}</div>
    <div className="rps-choices">{choices.map((choice) => <button type="button" key={choice.id} onClick={() => play(choice.id)}><span>{choice.icon}</span><b>{choice.label}</b></button>)}</div>
    <GameStartOverlay visible={!started} title={round ? (round.result === "win" ? "این دور را بردی!" : round.result === "lose" ? "این دور را ربات برد." : "مساوی شد!") : "سنگ، کاغذ، قیچی"} description={round ? "برای ادامه‌ی مسابقه آماده‌ای؟" : "حرکتت را انتخاب کن و با ربات رقابت کن."} buttonLabel={round ? "دور بعدی" : "شروع بازی"} onStart={nextRound} />
    <div className="rps-footer"><span>مساوی‌ها: {score.draw}</span><button type="button" className="game-secondary" onClick={reset}>شروع مسابقه جدید</button></div>
    {history.length > 0 && <div className="rps-history">آخرین دورها: {history.map((item, i) => <span key={i} className={item.result}>{item.result === "win" ? "برد" : item.result === "lose" ? "باخت" : "مساوی"}</span>)}</div>}
  </GameFrame>;
}
