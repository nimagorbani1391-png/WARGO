import { useEffect, useRef, useState, type PointerEvent } from "react";
import GameFrame from "../GameFrame";

type Brick = { id: number; x: number; y: number; w: number; h: number; hp: number; color: string };
type Ball = { x: number; y: number; vx: number; vy: number; delay: number };
type Engine = { width: number; height: number; bricks: Brick[]; balls: Ball[]; launching: boolean; score: number; volley: number; won: boolean; lost: boolean; aimX: number; aimY: number; dragging: boolean; lastTick: number; accumulator: number };
const BALLS_PER_VOLLEY = 10;
const BALL_RADIUS = 4.2;
const BALL_SPEED = 410;
const BEST_KEY = "wargo:brick-best";
function bestScore() { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; } }
function makeBricks(width: number): Brick[] {
  const cols = 8, gap = 5, margin = 8, brickW = (width - margin * 2 - gap * (cols - 1)) / cols, brickH = 37;
  const rows = [
    { start: 1, end: 6, hp: 3, color: "#b77aff" },
    { start: 0, end: 7, hp: 2, color: "#b77aff" },
    { start: 1, end: 6, hp: 2, color: "#ff727b" },
    { start: 0, end: 7, hp: 1, color: "#ff626f" },
    { start: 1, end: 6, hp: 1, color: "#ff626f" },
  ];
  return rows.flatMap((row, r) => Array.from({ length: row.end - row.start + 1 }, (_, j) => ({ id: r * 10 + j, x: margin + (row.start + j) * (brickW + gap), y: 58 + r * (brickH + 7), w: brickW, h: brickH, hp: row.hp, color: row.color })));
}
function freshEngine(width: number, height: number): Engine {
  return { width, height, bricks: makeBricks(width), balls: [], launching: false, score: 0, volley: 1, won: false, lost: false, aimX: width / 2, aimY: height - 90, dragging: false, lastTick: 0, accumulator: 0 };
}
export default function BrickBreaker({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(bestScore);
  const [ballsLeft, setBallsLeft] = useState(BALLS_PER_VOLLEY);
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");

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
        s.aimX *= sx; s.aimY *= sy; s.width = width; s.height = height;
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

      if (s.dragging && !s.launching && status === "ready") {
        const a = anchor(), dx = a.x - s.aimX, dy = a.y - s.aimY, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(225,190,255,.65)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + ux * 100, a.y + uy * 100); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#e879f9"; ctx.beginPath(); ctx.arc(s.aimX, s.aimY, 8, 0, Math.PI * 2); ctx.fill();
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
            if (hit && s.bricks.length === 0) { s.won = true; s.launching = false; break; }
          }
        }
        if (s.bricks.length === 0) { s.won = true; s.launching = false; }
        if (s.balls.length === 0 && !s.won) { s.launching = false; s.volley += 1; setRound(s.volley); setBallsLeft(BALLS_PER_VOLLEY); setStatus("ready"); }
        setScore(s.score);
        const record = bestScore();
        if (s.score > record) { try { localStorage.setItem(BEST_KEY, String(s.score)); } catch { /* local record is optional */ } setBest(s.score); }
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

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const s = engineRef.current; if (!s || s.launching || status !== "ready" || s.won || s.lost) return;
    const p = pointFromEvent(event); s.dragging = true; s.aimX = p.x; s.aimY = Math.min(s.height - 70, Math.max(s.height - 210, p.y));
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const s = engineRef.current; if (!s?.dragging) return;
    const p = pointFromEvent(event); s.aimX = Math.max(12, Math.min(s.width - 12, p.x)); s.aimY = Math.min(s.height - 70, Math.max(s.height - 210, p.y));
  };
  const pointerUp = () => {
    const s = engineRef.current; if (!s?.dragging) return;
    s.dragging = false;
    const a = { x: s.width / 2, y: s.height - 34 }, dx = a.x - s.aimX, dy = a.y - s.aimY, length = Math.hypot(dx, dy);
    if (length < 18 || dy < 10) return;
    const ux = dx / length, uy = dy / length, speed = BALL_SPEED * Math.min(1.18, Math.max(.78, length / 100));
    s.balls = Array.from({ length: BALLS_PER_VOLLEY }, (_, i) => ({ x: a.x, y: a.y, vx: ux * speed, vy: uy * speed, delay: i * .075 }));
    s.launching = true; s.accumulator = 0; setBallsLeft(0); setStatus("playing");
  };
  const restart = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    engineRef.current = freshEngine(w, h); setScore(0); setBallsLeft(BALLS_PER_VOLLEY); setRound(1); setStatus("ready");
  };
  return <GameFrame title="شکستن آجرها" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>توپ در نوبت بعد <b>{ballsLeft}</b></span><span>راند <b>{round}</b></span><span>رکورد <b>{best}</b></span></div>
    <canvas ref={canvasRef} className="brick-canvas" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} aria-label="برای نشانه‌گیری توپ‌ها را به عقب بکش و رها کن" />
    {status !== "playing" && <div className="game-action-panel"><strong>{status === "won" ? "همه آجرها شکسته شدند!" : status === "lost" ? "بازی تمام شد" : round === 1 ? "۱۰ توپ را مثل تیرکمان بکش و رها کن" : "۱۰ توپ بعدی آماده‌اند؛ نشانه بگیر"}</strong><button className="game-primary" type="button" onClick={restart}>شروع دوباره</button></div>}
    <p className="game-help">انگشتت را از نقطهٔ پایین به عقب بکش و رها کن؛ ۱۰ توپ پشت‌سرهم پرتاب می‌شوند. هر آجری که جانش تمام شود، از صفحه حذف می‌شود.</p>
  </GameFrame>;
}
