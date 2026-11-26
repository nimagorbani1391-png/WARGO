import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";

type Brick = { x: number; y: number; w: number; h: number; hp: number; color: string };
type Engine = { ballX: number; ballY: number; vx: number; vy: number; paddleX: number; bricks: Brick[]; running: boolean; lives: number; score: number; won: boolean; lost: boolean };
const makeBricks = (width: number): Brick[] => {
  const cols = 7, gap = 7, margin = 12, brickW = (width - margin * 2 - gap * (cols - 1)) / cols, brickH = 43;
  const rows = [
    { start: 1, end: 6, hp: 2, color: "#b77aff" },
    { start: 1, end: 5, hp: 1, color: "#ff727b" },
    { start: 0, end: 6, hp: 1, color: "#ff626f" },
    { start: 1, end: 5, hp: 1, color: "#ff626f" },
    { start: 0, end: 6, hp: 2, color: "#b77aff" },
  ];
  return rows.flatMap((row, r) => Array.from({ length: row.end - row.start + 1 }, (_, j) => ({ x: margin + (row.start + j) * (brickW + gap), y: 80 + r * (brickH + 9), w: brickW, h: brickH, hp: row.hp, color: row.color })));
};

export default function BrickBreaker({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const width = Math.max(280, canvas.clientWidth);
      const height = Math.max(470, Math.min(700, width * 1.48));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!engineRef.current) reset(width, height);
      else { engineRef.current.paddleX = Math.min(width - 55, Math.max(55, engineRef.current.paddleX)); }
    };
    const reset = (w: number, h: number) => {
      engineRef.current = { ballX: w / 2, ballY: h - 78, vx: 3.2, vy: -4.1, paddleX: w / 2, bricks: makeBricks(w), running: false, lives: 3, score: 0, won: false, lost: false };
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    let frame = 0;
    const draw = () => {
      const w = canvas.clientWidth, h = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
      const s = engineRef.current!;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#082a37"); bg.addColorStop(.28, "#02080d"); bg.addColorStop(1, "#08020e"); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(110,220,255,.14)"; ctx.lineWidth = 1; ctx.strokeRect(1, 1, w - 2, h - 2);
      for (const b of s.bricks) {
        const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h); grad.addColorStop(0, b.color); grad.addColorStop(1, b.color === "#b77aff" ? "#35204f" : "#4c171d");
        ctx.shadowColor = b.color; ctx.shadowBlur = 9; ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 9); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff0ff"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "16px Vazirmatn, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(b.hp), b.x + b.w / 2, b.y + b.h / 2);
      }
      const paddleY = h - 36;
      ctx.shadowColor = "#e879f9"; ctx.shadowBlur = 16; ctx.fillStyle = "#e879f9"; ctx.beginPath(); ctx.roundRect(s.paddleX - 45, paddleY, 90, 9, 6); ctx.fill(); ctx.shadowBlur = 0;
      ctx.shadowColor = "#f0abfc"; ctx.shadowBlur = 18; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.ballX, s.ballY, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (s.running && !s.won && !s.lost) {
        s.ballX += s.vx; s.ballY += s.vy;
        if (s.ballX < 7 || s.ballX > w - 7) s.vx *= -1;
        if (s.ballY < 7) s.vy = Math.abs(s.vy);
        if (s.ballY >= paddleY - 7 && s.ballY <= paddleY + 10 && Math.abs(s.ballX - s.paddleX) < 52 && s.vy > 0) {
          s.vy = -Math.abs(s.vy); s.vx += (s.ballX - s.paddleX) * .045; s.vx = Math.max(-6, Math.min(6, s.vx));
        }
        for (const b of s.bricks) {
          if (b.hp > 0 && s.ballX >= b.x - 7 && s.ballX <= b.x + b.w + 7 && s.ballY >= b.y - 7 && s.ballY <= b.y + b.h + 7) {
            b.hp -= 1; s.vy *= -1; s.score += b.hp === 0 ? 15 : 5; setScore(s.score); break;
          }
        }
        if (s.ballY > h + 12) { s.lives -= 1; setLives(s.lives); if (s.lives <= 0) { s.lost = true; setStatus("lost"); } else { s.ballX = s.paddleX; s.ballY = paddleY - 15; s.vx = 3.2; s.vy = -4.1; s.running = false; setStatus("ready"); } }
        if (s.bricks.every((b) => b.hp <= 0)) { s.won = true; setStatus("won"); }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const movePaddle = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (engineRef.current) engineRef.current.paddleX = Math.max(48, Math.min(rect.width - 48, x));
  };
  const start = () => {
    const s = engineRef.current; if (!s) return;
    if (status === "won" || status === "lost") {
      const w = canvasRef.current?.clientWidth || 320, h = canvasRef.current?.clientHeight || 500;
      s.bricks = makeBricks(w); s.ballX = w / 2; s.ballY = h - 78; s.vx = 3.2; s.vy = -4.1; s.paddleX = w / 2; s.lives = 3; s.score = 0; s.won = false; s.lost = false; setScore(0); setLives(3);
    }
    s.running = true; setStatus("playing");
  };
  return <GameFrame title="شکستن آجرها" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>جان <b>{lives} ♥</b></span><span>رکورد <b>{Math.max(score, Number(localStorage.getItem("wargo:brick-best") || 0))}</b></span></div>
    <canvas ref={canvasRef} className="brick-canvas" onPointerMove={movePaddle} onPointerDown={(e) => { movePaddle(e); if (status === "ready") start(); }} aria-label="صفحه بازی شکستن آجرها" />
    {status !== "playing" && <div className="game-action-panel"><strong>{status === "won" ? "همه آجرها شکسته شدند!" : status === "lost" ? "بازی تمام شد" : "برای شروع آماده‌ای؟"}</strong><button className="game-primary" type="button" onClick={start}>{status === "won" || status === "lost" ? "بازی دوباره" : "شروع بازی"}</button></div>}
    <p className="game-help">با لمس یا کشیدن انگشت روی صفحه، سکوی پایین را حرکت بده.</p>
  </GameFrame>;
}
