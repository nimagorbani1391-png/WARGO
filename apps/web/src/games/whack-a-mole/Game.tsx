import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const BEST_KEY = "wargo:whack-best";
const ROUND_SECONDS = 30;
function readBest() { try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; } }
function nextHole(previous: number) { let n = Math.floor(Math.random()*9); if (n===previous) n=(n+1+Math.floor(Math.random()*8))%9; return n; }

export default function WhackAMole({ onExit }: { onExit: () => void }) {
  const [running,setRunning]=useState(false);
  const [time,setTime]=useState(ROUND_SECONDS);
  const [score,setScore]=useState(0);
  const [best,setBest]=useState(readBest);
  const [active,setActive]=useState(-1);
  const [misses,setMisses]=useState(0);
  const previous=useRef(-1);
  const hitLock=useRef(false);
  const start=()=>{previous.current=-1;hitLock.current=false;setTime(ROUND_SECONDS);setScore(0);setMisses(0);setActive(nextHole(-1));setRunning(true);};

  useEffect(()=>{
    if(!running)return;
    const clock=window.setInterval(()=>setTime(t=>{if(t<=1){setRunning(false);setActive(-1);return 0;}return t-1;}),1000);
    const spawn=window.setInterval(()=>{setActive(current=>{previous.current=current;return nextHole(current);});hitLock.current=false;},560);
    return()=>{clearInterval(clock);clearInterval(spawn);};
  },[running]);

  const hit=(index:number)=>{
    if(!running)return;if(index!==active){setMisses(m=>m+1);return;}if(hitLock.current)return;
    hitLock.current=true;
    setScore(s=>{const n=s+10;setBest(b=>{const v=Math.max(b,n);try{localStorage.setItem(BEST_KEY,String(v));}catch{/* Optional storage. */}return v;});return n;});
    setActive(-1);
  };
  const ended=!running&&time===0;
  return <GameFrame title="موش‌گیر" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>رکورد <b>{best}</b></span><span>زمان <b>{time} ثانیه</b></span></div>
    <section className="mole-arena" aria-label="زمین بازی موش‌گیر">
      <div className="mole-arena-top"><span>شکار سریع</span><strong className={time<=5&&running?"mole-time-danger":""}>{String(time).padStart(2,"0")}<small> ثانیه</small></strong></div>
      <div className="mole-grid">
        {Array.from({length:9},(_,i)=><button type="button" key={i} className={`mole-hole ${active===i&&running?"has-mole":""}`} onPointerDown={e=>{e.preventDefault();hit(i);}} aria-label={active===i?"موش ظاهر شده، ضربه بزن":"سوراخ خالی"} disabled={!running}>
          <span className="mole-shadow"/>{active===i&&running&&<span className="mole-character" aria-hidden="true"><i/><b/><em/></span>}
        </button>)}
      </div>
      <div className="mole-arena-footer"><span>هر ضربه موفق <b>+۱۰</b></span><span>خطاها <b>{misses}</b></span></div>
    </section>
    <GameStartOverlay visible={!running} title={ended?"زمان تمام شد!":"آماده‌ای شکارچی؟"} description={ended?`امتیاز نهایی تو: ${score}. برای شکستن رکورد دوباره بازی کن.`:"۳۰ ثانیه فرصت داری؛ موش‌ها را قبل از ناپدیدشدن بزن."} buttonLabel={ended?"بازی دوباره":"شروع بازی"} onStart={start}/>
    <p className="game-help">موش‌ها کوتاه ظاهر می‌شوند؛ سریع و دقیق روی آن‌ها ضربه بزن.</p>
  </GameFrame>;
}
