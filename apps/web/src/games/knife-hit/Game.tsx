import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const BEST_KEY = "wargo:knife-hit-best";
type Knife = { angle: number };
type State = { angle: number; knives: Knife[]; flying: number | null; remaining: number; score: number; last: number; raf: number; over: boolean; won: boolean };
const W = 420, H = 560, CX = 210, CY = 205, R = 82, NEED = 7;

function readBest() { try { return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; } }
function makeState(): State { return { angle: 0, knives: [], flying: null, remaining: NEED, score: 0, last: 0, raf: 0, over: false, won: false }; }

export default function KnifeHit({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<State>(makeState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [remaining, setRemaining] = useState(NEED);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);

  const start = useCallback(() => { game.current = makeState(); setScore(0); setRemaining(NEED); setWon(false); setOver(false); setRunning(true); }, []);
  const throwKnife = useCallback(() => {
    const g = game.current;
    if (!running || g.flying !== null || g.over) return;
    g.flying = 0;
  }, [running]);

  useEffect(() => {
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const draw = (time: number) => {
      const g = game.current;
      const dt = Math.min((time - (g.last || time)) / 1000, 0.032); g.last = time;
      if (running && !g.over) {
        g.angle += dt * (0.78 + Math.min(g.score, 30) * 0.009);
        if (g.flying !== null) {
          g.flying += dt * 760;
          if (g.flying >= H - 35 - (CY + R + 18)) {
            const impact = -Math.PI / 2 - g.angle;
            const collision = g.knives.some(k => {
              const diff = Math.atan2(Math.sin(k.angle - impact), Math.cos(k.angle - impact));
              return Math.abs(diff) < 0.23;
            });
            if (collision) { g.over = true; setOver(true); setRunning(false); }
            else {
              g.knives.push({ angle: impact }); g.flying = null; g.remaining -= 1; g.score += 1;
              setRemaining(g.remaining); setScore(g.score);
              if (g.score > readBest()) { try { localStorage.setItem(BEST_KEY, String(g.score)); } catch { /* Storage is optional. */ } setBest(g.score); }
              if (g.remaining <= 0) { g.won = true; g.over = true; setWon(true); setOver(true); setRunning(false); }
            }
          }
        }
      }
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#111a35"); bg.addColorStop(1, "#080d1b");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (let i=0;i<34;i++) { const x=(i*83)%W, y=(i*137)%H; ctx.fillStyle="rgba(130,190,255,.22)"; ctx.fillRect(x,y,2,2); }
      // Rotating target
      ctx.save(); ctx.translate(CX,CY); ctx.rotate(g.angle);
      const wood = ctx.createRadialGradient(-22,-25,8,0,0,R); wood.addColorStop(0,"#f4bd75"); wood.addColorStop(.58,"#b86a3c"); wood.addColorStop(1,"#713a2e");
      ctx.fillStyle=wood; ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(255,226,176,.45)"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,R-12,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle="rgba(74,34,29,.45)"; ctx.lineWidth=2; for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(0,0,22+i*14,10+i*13,i*.7,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle="#f8d6a0"; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
      g.knives.forEach(k=>{ctx.save();ctx.rotate(k.angle);drawKnife(ctx,0,-R-5);ctx.restore();});
      ctx.restore();
      // Current knife and remaining counter
      if (g.flying !== null) drawKnife(ctx,CX,H-35-g.flying);
      ctx.fillStyle="#eaf3ff"; ctx.font="700 18px sans-serif"; ctx.textAlign="center"; ctx.fillText("KNIVES",W/2,36);
      ctx.font="800 30px sans-serif"; ctx.fillStyle="#70e1ff"; ctx.fillText(String(g.remaining),W/2,72);
      ctx.fillStyle="rgba(255,255,255,.22)"; ctx.fillRect(30,H-35,W-60,5);
      ctx.fillStyle="#55d8ff"; ctx.fillRect(30,H-35,(W-60)*(g.score/NEED),5);
      if (running) g.raf=requestAnimationFrame(draw);
    };
    game.current.raf=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(game.current.raf);
  }, [running]);

  useEffect(() => () => cancelAnimationFrame(game.current.raf), []);
  return <GameFrame title="چاقو به هدف" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>رکورد <b>{best}</b></span><span>چاقو <b>{remaining}</b></span></div>
    <button type="button" className="knife-stage" onPointerDown={(e) => { e.preventDefault(); throwKnife(); }} aria-label="برای پرتاب چاقو لمس کن">
      <canvas ref={canvas} />
      <span className="sr-only">برای پرتاب چاقو روی صفحه ضربه بزن</span>
    </button>
    <GameStartOverlay visible={!running} title={over ? (won ? "مرحله کامل شد!" : "برخورد کردی!") : "آماده‌ی پرتابی؟"} description={over ? (won ? "همه چاقوها به هدف نشستند. رکورد بعدی را بساز." : "چاقوها به هم برخورد کردند. دوباره امتحان کن.") : "چاقوها را با زمان‌بندی دقیق به هدف بچسبان؛ مراقب چاقوهای قبلی باش."} buttonLabel={over ? "مرحله بعد" : "شروع بازی"} onStart={start} />
    <p className="game-help">برای پرتاب هر چاقو یک‌بار روی میدان بازی ضربه بزن. به چاقوهای قبلی برخورد نکن.</p>
  </GameFrame>;
}

function drawKnife(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save(); ctx.translate(x,y);
  ctx.shadowColor="rgba(89,220,255,.45)"; ctx.shadowBlur=10;
  ctx.fillStyle="#dce8f2"; ctx.beginPath(); ctx.moveTo(0,-29); ctx.lineTo(7,-7); ctx.lineTo(4,5); ctx.lineTo(-4,5); ctx.lineTo(-7,-7); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle="#f4a261"; ctx.fillRect(-5,5,10,19);
  ctx.fillStyle="#75452f"; ctx.fillRect(-7,21,14,5);
  ctx.restore();
}
