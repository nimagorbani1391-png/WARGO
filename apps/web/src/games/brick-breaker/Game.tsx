import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

type Brick = { id: number; x: number; y: number; w: number; h: number; hp: number; color: string };
type Ball = { x: number; y: number; vx: number; vy: number; delay: number };
type Engine = { width: number; height: number; bricks: Brick[]; balls: Ball[]; launching: boolean; score: number; volley: number; won: boolean; lost: boolean; lastTick: number; accumulator: number; lastUiScore: number };
const BALLS_PER_VOLLEY = 10;
const BALL_RADIUS = 4.2;
const BALL_SPEED = 410;
const BEST_KEY = "wargo:brick-best";
function bestScore() { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; } }
function makeBricks(width: number): Brick[] {
  const cols = 8, gap = 5, margin = 8, brickW = (width - margin * 2 - gap * (cols - 1)) / cols, brickH = 37;
  const rows = [
    { start: 1, end: 6, hp: 3, color: "#b77aff" },
    { start: 0, end: 7, hp: 3, color: "#b77aff" },
    { start: 1, end: 6, hp: 2, color: "#b77aff" },
    { start: 0, end: 7, hp: 2, color: "#ff727b" },
    { start: 1, end: 6, hp: 2, color: "#ff626f" },
    { start: 0, end: 7, hp: 1, color: "#ff626f" },
  ];
  return rows.flatMap((row, r) => Array.from({ length: row.end - row.start + 1 }, (_, j) => ({ id: r * 10 + j, x: margin + (row.start + j) * (brickW + gap), y: 58 + r * (brickH + 7), w: brickW, h: brickH, hp: row.hp, color: row.color })));
}
function freshEngine(width: number, height: number): Engine {
  return { width, height, bricks: makeBricks(width), balls: [], launching: false, score: 0, volley: 1, won: false, lost: false, lastTick: 0, accumulator: 0, lastUiScore: 0 };
}
export default function BrickBreaker({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(bestScore);
  const [ballsLeft, setBallsLeft] = useState(BALLS_PER_VOLLEY);
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [started, setStarted] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const aimAngleRef = useRef(0);
  const sliderActiveRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let width = 320, height = 560, raf = 0;
    const resize = () => {
      const nextWidth = Math.max(280, canvas.clientWidth);
      const nextHeight = Math.max(500, Math.min(760, nextWidth * 1.58));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = nextWidth; height = nextHeight;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!engineRef.current) engineRef.current = freshEngine(width, height);
      else {
        const s = engineRef.current;
        const sx = width / s.width, sy = height / s.height;
        s.bricks.forEach(b => { b.x *= sx; b.y *= sy; b.w *= sx; b.h *= sy; });
        s.balls.forEach(b => { b.x *= sx; b.y *= sy; });
s.width = width; s.height = height;
      }
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const anchor = () => ({ x: width / 2, y: height - 34 });
    const draw = (now: number) => {
      const s = engineRef.current!;
      const dt = s.lastTick ? Math.min((now - s.lastTick) / 1000, .035) : 0;
      s.lastTick = now;
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, 0, height); bg.addColorStop(0, "#082a37"); bg.addColorStop(.24, "#02080d"); bg.addColorStop(1, "#08020e"); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(110,220,255,.13)"; ctx.strokeRect(.5, .5, width - 1, height - 1);

      for (const b of s.bricks) {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        grad.addColorStop(0, b.color); grad.addColorStop(1, b.color === "#b77aff" ? "#35204f" : "#4c171d");
        ctx.shadowColor = b.color; ctx.shadowBlur = 8; ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff0ff"; ctx.lineWidth = 1.7; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "600 14px Vazirmatn, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2);
      }

      const a = anchor();
      ctx.shadowColor = "#e879f9"; ctx.shadowBlur = 15; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(a.x, a.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

      if (s.launching && !s.won && !s.lost) {
        s.accumulator += dt;
        while (s.accumulator >= 1 / 120) {
          s.accumulator -= 1 / 120;
          for (let i = s.balls.length - 1; i >= 0; i--) {
            const ball = s.balls[i];
            if (ball.delay > 0) { ball.delay -= 1 / 120; continue; }
            const nx = ball.x + ball.vx / 120, ny = ball.y + ball.vy / 120;
            if (nx < BALL_RADIUS || nx > width - BALL_RADIUS) ball.vx *= -1;
            if (ny < BALL_RADIUS) ball.vy = Math.abs(ball.vy);
            ball.x += ball.vx / 120; ball.y += ball.vy / 120;
            let hit = false;
            for (let j = s.bricks.length - 1; j >= 0; j--) {
              const b = s.bricks[j];
              const cx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), cy = Math.max(b.y, Math.min(ball.y, b.y + b.h));
              const dx = ball.x - cx, dy = ball.y - cy;
              if (dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS) {
                b.hp -= 1; s.score += b.hp <= 0 ? 15 : 5;
                if (b.hp <= 0) s.bricks.splice(j, 1);
                if (Math.abs(dx) > Math.abs(dy)) ball.vx *= -1; else ball.vy *= -1;
                hit = true; break;
              }
            }
            if (ball.y > height + 12) s.balls.splice(i, 1);
            if (hit && s.bricks.length === 0) { s.won = true; s.launching = false; setStatus("won"); break; }
          }
        }
        if (s.bricks.length === 0) { s.won = true; s.launching = false; setStatus("won"); }
        if (s.balls.length === 0 && !s.won) { s.launching = false; s.volley += 1; setRound(s.volley); setBallsLeft(BALLS_PER_VOLLEY); setStatus("ready"); }
        if (s.score !== s.lastUiScore) {
          s.lastUiScore = s.score;
          setScore(s.score);
          const record = bestScore();
          if (s.score > record) {
            try { localStorage.setItem(BEST_KEY, String(s.score)); } catch { /* local record is optional */ }
            setBest(s.score);
          }
        }
      }
      for (const ball of s.balls) {
        if (ball.delay > 0) continue;
        ctx.shadowColor = "#e879f9"; ctx.shadowBlur = 15; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [status]);

  const launchVolley = () => {
    const s = engineRef.current;
    if (!s || s.launching || status !== "ready" || s.won || s.lost) return;
    const angle = aimAngleRef.current * Math.PI / 180;
    const speed = BALL_SPEED;
    s.balls = Array.from({ length: BALLS_PER_VOLLEY }, (_, i) => ({
      x: s.width / 2,
      y: s.height - 34,
      vx: Math.sin(angle) * speed,
      vy: -Math.cos(angle) * speed,
      delay: i * .075
    }));
    s.launching = true;
    s.accumulator = 0;
    setBallsLeft(0);
    setStatus("playing");
  };
  const changeAim = (value: number) => {
    const next = Math.max(-65, Math.min(65, value));
    aimAngleRef.current = next;
    setAimAngle(next);
  };
  const releaseSlider = () => {
    if (!sliderActiveRef.current) return;
    sliderActiveRef.current = false;
    launchVolley();
  };
  const restart = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    engineRef.current = freshEngine(w, h); setScore(0); setBallsLeft(BALLS_PER_VOLLEY); setRound(1); setStatus("ready");
  };
  const begin = () => { restart(); setStarted(true); };
  return <GameFrame title="شکستن آجرها" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>توپ در نوبت بعد <b>{ballsLeft}</b></span><span>راند <b>{round}</b></span><span>رکورد <b>{best}</b></span></div>
    <canvas ref={canvasRef} className="brick-canvas" aria-label="میدان بازی شکستن آجرها" />
    <div className={`brick-aim-control ${status !== "ready" ? "is-disabled" : ""}`}>
      <label className="brick-aim-label" htmlFor="brick-aim-slider">زاویه پرتاب <b>{aimAngle > 0 ? "+" : ""}{aimAngle}°</b></label>
      <input
        id="brick-aim-slider"
        className="brick-aim-slider"
        type="range"
        min="-65"
        max="65"
        step="1"
        value={aimAngle}
        disabled={status !== "ready"}
        onChange={event => changeAim(Number(event.currentTarget.value))}
        onPointerDown={() => { sliderActiveRef.current = true; }}
        onPointerUp={releaseSlider}
        onPointerCancel={releaseSlider}
        onKeyUp={event => { if (event.key.startsWith("Arrow")) launchVolley(); }}
        aria-label="زاویه پرتاب توپ‌ها؛ دستگیره را حرکت بده و رها کن تا ۱۰ توپ شلیک شوند"
      />
      <div className="brick-aim-scale"><span>چپ</span><span>مستقیم</span><span>راست</span></div>
      <p className="game-help">{status === "playing" ? "۱۰ توپ در حال حرکت‌اند..." : "دستگیره را به چپ یا راست بکش؛ با رها کردن، ۱۰ توپ خودکار شلیک می‌شوند."}</p>
    </div>
    <GameStartOverlay visible={!started || status === "won" || status === "lost"} title={!started ? "آماده‌ای؟" : status === "won" ? "تبریک! همه آجرها را شکستی!" : "بازی تمام شد"} description={status === "won" ? `امتیاز نهایی: ${score}` : !started ? "زاویه پرتاب را بعد از شروع تنظیم کن." : "برای تلاش دوباره آماده‌ای؟"} buttonLabel={!started ? "شروع بازی" : "دور بعدی"} onStart={begin} />
  </GameFrame>;
}
