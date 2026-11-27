import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type SnakeState = { snake: Point[]; apple: Point; direction: Direction; nextDirection: Direction; score: number; running: boolean; over: boolean };
const SIZE = 20, CELL = 20, BEST_KEY = "wargo:snake-apple-best";
const opposite: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
const delta: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
function randomApple(snake: Point[]): Point {
  const free: Point[] = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!snake.some(p => p.x === x && p.y === y)) free.push({ x, y });
  return free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
}
function initialState(): SnakeState {
  const snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
  return { snake, apple: randomApple(snake), direction: "right", nextDirection: "right", score: 0, running: false, over: false };
}
export default function SnakeApple({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SnakeState>(initialState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; } });
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [speed, setSpeed] = useState(145);

  const turn = useCallback((direction: Direction) => {
    const s = stateRef.current;
    if (direction !== opposite[s.direction]) s.nextDirection = direction;
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = SIZE * CELL, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr; canvas.height = size * dpr; ctx.scale(dpr, dpr);
    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, size, size);
      const bg = ctx.createLinearGradient(0, 0, size, size); bg.addColorStop(0, "#0b2932"); bg.addColorStop(1, "#101321"); ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(167,139,250,.07)"; ctx.lineWidth = .5;
      for (let i = 0; i <= SIZE; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, size); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(size, i * CELL); ctx.stroke(); }
      const apple = s.apple;
      ctx.shadowColor = "#fb7185"; ctx.shadowBlur = 12; ctx.fillStyle = "#fb526c"; ctx.beginPath(); ctx.arc(apple.x * CELL + CELL / 2, apple.y * CELL + CELL / 2 + 1, CELL * .36, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#86efac"; ctx.beginPath(); ctx.ellipse(apple.x * CELL + CELL * .63, apple.y * CELL + CELL * .18, 3, 2, -.5, 0, Math.PI * 2); ctx.fill();
      s.snake.forEach((p, i) => {
        const inset = i === 0 ? 1 : 2;
        ctx.fillStyle = i === 0 ? "#d9c7ff" : i % 2 ? "#9b7bea" : "#7654c7";
        ctx.shadowColor = "#9b7bea"; ctx.shadowBlur = i === 0 ? 9 : 3;
        ctx.beginPath(); ctx.roundRect(p.x * CELL + inset, p.y * CELL + inset, CELL - inset * 2, CELL - inset * 2, 5); ctx.fill(); ctx.shadowBlur = 0;
      });
      const head = s.snake[0]; const eyes = delta[s.direction];
      ctx.fillStyle = "#211a32";
      const eyeX = head.x * CELL + CELL / 2 + eyes.x * 3, eyeY = head.y * CELL + CELL / 2 + eyes.y * 3;
      ctx.beginPath(); ctx.arc(eyeX - (eyes.y ? 3 : 0), eyeY - (eyes.x ? 3 : 0), 1.5, 0, Math.PI * 2); ctx.arc(eyeX + (eyes.y ? 3 : 0), eyeY + (eyes.x ? 3 : 0), 1.5, 0, Math.PI * 2); ctx.fill();
    };
    draw();
    const interval = window.setInterval(() => {
      const s = stateRef.current;
      if (!s.running || s.over) { draw(); return; }
      s.direction = s.nextDirection;
      const d = delta[s.direction], head = { x: s.snake[0].x + d.x, y: s.snake[0].y + d.y };
      const eating = head.x === s.apple.x && head.y === s.apple.y;
      const body = eating ? s.snake : s.snake.slice(0, -1);
      if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE || body.some(p => p.x === head.x && p.y === head.y)) {
        s.running = false; s.over = true setRunning(false); setOver(true); draw(); return;
      }
      s.snake.unshift(head);
      if (eating) {
        s.score += 1; setScore(s.score);
        s.apple = randomApple(s.snake);
        setSpeed(v => Math.max(75, v - 2));
        setBest(old => {
          const next = Math.max(old, s.score);
          try { localStorage.setItem(BEST_KEY, String(next)); } catch { /* local record optional */ }
          return next;
        });
      } else s.snake.pop();
      if (s.snake.length === SIZE * SIZE) { s.running = false; s.over = true setRunning(false); setOver(true); }
      draw();
    }, speed);
    return () => { window.clearInterval(interval); };
  }, [speed, turn]);

  const start = () => { const s = stateRef.current; if (s.over) stateRef.current = initialState(); stateRef.current.running = true; setScore(stateRef.current.score); setRunning(true); setOver(false); setSpeed(145); };
  const restart = () => { stateRef.current = initialState(); setScore(0); setRunning(false); setOver(false); setSpeed(145); };
  const touchStart = useRef<Point | null>(null);
  const onTouchStart = (event: PointerEvent<HTMLCanvasElement>) => { if (event.pointerType !== "touch") return; touchStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const onTouchEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType !== "touch" || !touchStart.current) return;
    const dx = event.clientX - touchStart.current.x, dy = event.clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 18) turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    touchStart.current = null;
  };
  return <GameFrame title="مار و سیب" onExit={onExit}>
    <div className="game-stats"><span>امتیاز <b>{score}</b></span><span>رکورد <b>{best}</b></span><span>سرعت <b>{Math.round(1000 / speed)} حرکت/ثانیه</b></span></div>
    <canvas ref={canvasRef} className="snake-canvas" onPointerDown={onTouchStart} onPointerUp={onTouchEnd} onPointerCancel={() => { touchStart.current = null; }} aria-label="برای تغییر جهت، انگشتت را روی صفحه بکش و سیب‌ها را بخور" />
    <GameStartOverlay visible={!running} title={over ? "بازی تمام شد!" : "مار و سیب"} description={over ? "به بدنت یا دیوار برخورد کردی. دوباره تلاش کن." : "سیب‌ها را بخور و طول مار را بیشتر کن."} buttonLabel={over ? "دور بعدی" : "شروع بازی"} onStart={over ? restart : start} />
    <p className="game-help">فقط با کشیدن انگشت روی صفحه جهت مار را تغییر بده؛ به دیوار و بدن خودت برخورد نکن.</p>
  </GameFrame>;
}
