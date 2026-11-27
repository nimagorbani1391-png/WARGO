import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";
import { reportGameScore } from "../reportScore";

const BEST_KEY = "wargo:flappy-best";
const WIDTH = 360;
const HEIGHT = 560;
const BIRD_X = 88;
const PIPE_WIDTH = 62;
const GAP = 158;
type Pipe = { x: number; gapY: number; scored: boolean };
type World = { birdY: number; velocity: number; pipes: Pipe[]; score: number; last: number; raf: number; over: boolean };

function readBest() {
  try { const n = Number(localStorage.getItem(BEST_KEY) || 0); return Number.isSafeInteger(n) && n > 0 ? n : 0; }
  catch { return 0; }
}
function makeWorld(): World {
  return { birdY: HEIGHT * 0.46, velocity: 0, pipes: [{ x: WIDTH + 35, gapY: 270, scored: false }, { x: WIDTH + 245, gapY: 205, scored: false }], score: 0, last: 0, raf: 0, over: false };
}

export default function FlappyBird({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(makeWorld());
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);

  const flap = useCallback(() => {
    if (!running || world.current.over) return;
    world.current.velocity = -430;
  }, [running]);

  function start() {
    cancelAnimationFrame(world.current.raf);
    world.current = makeWorld();
    setScore(0);
    setOver(false);
    setRunning(true);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      event.preventDefault();
      if (!running) start();
      else flap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, over, flap]);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d", { alpha: false });
    if (!element || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    element.width = WIDTH * dpr;
    element.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const finish = () => {
      const current = world.current;
      if (current.over) return;
      current.over = true;
      reportGameScore("flappy-bird", current.score);
      setRunning(false);
      setOver(true);
      setBest((old) => {
        const next = Math.max(old, current.score);
        try { localStorage.setItem(BEST_KEY, String(next)); } catch { /* Optional storage. */ }
        return next;
      });
    };

    const draw = (time: number) => {
      const w = world.current;
      const dt = Math.min((time - (w.last || time)) / 1000, 0.032);
      w.last = time;
      if (running && !w.over) {
        w.velocity += 1450 * dt;
        w.birdY += w.velocity * dt;
        const speed = 178 + Math.min(w.score * 3, 90);
        for (const pipe of w.pipes) {
          pipe.x -= speed * dt;
          if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.scored = true;
            w.score += 1;
            setScore(w.score);
          }
          if (pipe.x + PIPE_WIDTH < 0) {
            pipe.x = Math.max(...w.pipes.map((p) => p.x)) + 215;
            pipe.gapY = 120 + Math.random() * 285;
            pipe.scored = false;
          }
          const overlapsX = BIRD_X + 13 > pipe.x && BIRD_X - 13 < pipe.x + PIPE_WIDTH;
          const topEdge = pipe.gapY - GAP / 2;
          const bottomEdge = pipe.gapY + GAP / 2;
          if (overlapsX && (w.birdY - 12 < topEdge || w.birdY + 12 > bottomEdge)) finish();
        }
        if (w.birdY < 0 || w.birdY > HEIGHT - 48) finish();
      }

      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#172b4c"); sky.addColorStop(1, "#315d72");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "rgba(255,255,255,.12)";
      for (let i = 0; i < 5; i++) {
        const x = ((i * 105 - (running ? time * 0.018 : 0)) % 460 + 460) % 460 - 45;
        ctx.beginPath(); ctx.ellipse(x, 90 + (i % 3) * 55, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#5b9b78";
      for (const pipe of w.pipes) {
        const top = pipe.gapY - GAP / 2;
        const bottom = pipe.gapY + GAP / 2;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, top - 15);
        ctx.fillRect(pipe.x - 5, top - 17, PIPE_WIDTH + 10, 17);
        ctx.fillRect(pipe.x, bottom + 15, PIPE_WIDTH, HEIGHT - bottom - 63);
        ctx.fillRect(pipe.x - 5, bottom, PIPE_WIDTH + 10, 17);
        ctx.fillStyle = "rgba(255,255,255,.16)";
        ctx.fillRect(pipe.x + 9, 0, 7, Math.max(0, top - 18));
        ctx.fillRect(pipe.x + 9, bottom + 18, 7, Math.max(0, HEIGHT - bottom - 81));
        ctx.fillStyle = "#5b9b78";
      }
      ctx.fillStyle = "#d5b477"; ctx.fillRect(0, HEIGHT - 48, WIDTH, 48);
      ctx.fillStyle = "#8d744d"; for (let x = 0; x < WIDTH; x += 22) ctx.fillRect(x, HEIGHT - 48, 10, 4);
      const bob = running ? 0 : Math.sin(time / 260) * 5;
      const birdY = w.birdY + bob;
      ctx.save(); ctx.translate(BIRD_X, birdY); ctx.rotate(Math.max(-0.45, Math.min(0.75, w.velocity / 700)));
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(7, -5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1c2940"; ctx.beginPath(); ctx.arc(9, -5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f08c46"; ctx.beginPath(); ctx.moveTo(13, 1); ctx.lineTo(25, 4); ctx.lineTo(13, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e7a93e"; ctx.beginPath(); ctx.ellipse(-5, 5, 8, 4, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#fff"; ctx.font = "800 28px sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(w.score), WIDTH / 2, 48);
      if (running && !w.over) w.raf = requestAnimationFrame(draw);
    };
    world.current.raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(world.current.raf);
  }, [running]);

  return <GameFrame title="پرنده پرشی" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>رکورد <b>{best}</b></span></div>
    <button type="button" className="flappy-stage" onPointerDown={(event) => { event.preventDefault(); if (!running && !over) start(); else flap(); }} aria-label="برای پرش لمس کن">
      <canvas ref={canvas} />
    </button>
    <GameStartOverlay visible={!running} title={over ? "پرنده متوقف شد!" : "آماده پرواز؟"} description={over ? `امتیاز این دور: ${score} — برای رکورد بهتر دوباره تلاش کن.` : "با هر لمس، پرنده یک‌بار بال می‌زند. از لوله‌ها عبور کن."} buttonLabel={over ? "بازی دوباره" : "شروع بازی"} onStart={start} />
    <p className="game-help">برای بال زدن صفحه را لمس کن یا Space را بزن. هر لوله یک امتیاز دارد.</p>
  </GameFrame>;
}
