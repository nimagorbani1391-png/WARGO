import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import GameFrame from "../GameFrame";

type Point = { x: number; y: number };
type Hunter = Point & { dx: number; dy: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type World = {
  snake: Point[]; prevSnake: Point[]; dir: Point; next: Point; crystal: Point; coin: Point; power: Point | null;
  obstacles: Point[]; hunters: Hunter[]; particles: Particle[]; score: number; runCoins: number;
  level: number; goal: number; stageProgress: number; tickNo: number; started: boolean;
};
const N = 24, CELL = 20, SIZE = 480;
const BEST_KEY = "wargo:neon-arcade:best";
const COIN_KEY = "wargo:neon-arcade:coins";
const LEVEL_KEY = "wargo:neon-arcade:level";
const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const randomPoint = (): Point => ({ x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) });
function makeWorld(): World {
  const world: World = {
    snake: [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }], prevSnake: [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }],
    dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, crystal: { x: 15, y: 12 },
    coin: { x: 18, y: 8 }, power: null, obstacles: [], hunters: [], particles: [],
    score: 0, runCoins: 0, level: 1, goal: 7, stageProgress: 0, tickNo: 0, started: false,
  };
  return world;
}
function drawWorld(canvas: HTMLCanvasElement, world: World, alpha = 1) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, SIZE, SIZE);
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, "#0d1730"); bg.addColorStop(1, "#080d1b");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(137,160,255,.075)"; ctx.lineWidth = 1;
  for (let i = 0; i <= N; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
  }
  ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#ff527d"; ctx.fillStyle = "#ff668b";
  ctx.beginPath(); ctx.arc(world.crystal.x * CELL + 10, world.crystal.y * CELL + 10, 7 + Math.sin(world.tickNo / 5) * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#ffd166"; ctx.fillStyle = "#ffd166";
  ctx.translate(world.coin.x * CELL + 10, world.coin.y * CELL + 10); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
  if (world.power) {
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#bd91ff"; ctx.strokeStyle = "#d5b9ff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(world.power.x * CELL + 10, world.power.y * CELL + 10, 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  world.obstacles.forEach((o) => {
    ctx.fillStyle = "#343d60"; ctx.strokeStyle = "#7784b8"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(o.x * CELL + 2, o.y * CELL + 2, 16, 16, 5); ctx.fill(); ctx.stroke();
  });
  world.hunters.forEach((h) => {
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = "#ff315f"; ctx.fillStyle = "#ff456e";
    ctx.beginPath(); ctx.arc(h.x * CELL + 10, h.y * CELL + 10, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#250817"; ctx.fillRect(h.x * CELL + 6, h.y * CELL + 7, 3, 3); ctx.fillRect(h.x * CELL + 12, h.y * CELL + 7, 3, 3); ctx.restore();
  });
  world.snake.forEach((p, i) => {
    const previous = world.prevSnake[i] || p;
    const px = (previous.x + (p.x - previous.x) * alpha) * CELL;
    const py = (previous.y + (p.y - previous.y) * alpha) * CELL;
    ctx.save(); ctx.shadowBlur = i === 0 ? 19 : 8; ctx.shadowColor = i === 0 ? "#62f4e3" : "#8c69ff";
    ctx.fillStyle = i === 0 ? "#8affec" : `hsl(${258 - i * 2},75%,${Math.max(28, 68 - i * .7)}%)`;
    ctx.beginPath(); ctx.roundRect(px + 2, py + 2, 16, 16, 6); ctx.fill();
    if (i === 0) { ctx.fillStyle = "#11233a"; ctx.beginPath(); ctx.arc(px + 7, py + 7, 1.8, 0, 7); ctx.arc(px + 13, py + 7, 1.8, 0, 7); ctx.fill(); }
    ctx.restore();
  });
  world.particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / 35); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); });
  ctx.globalAlpha = 1;
  if (!world.started) {
    ctx.fillStyle = "#080b19bb"; ctx.fillRect(0, 0, SIZE, SIZE); ctx.textAlign = "center";
    ctx.fillStyle = "#e7e1ff"; ctx.font = "bold 25px Tahoma"; ctx.fillText("مار نئونی", 240, 215);
    ctx.fillStyle = "#a9a4c9"; ctx.font = "15px Tahoma"; ctx.fillText("برای شروع، دکمه مأموریت را بزن", 240, 250);
  }
}

export default function NeonRun({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(makeWorld());
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<number | null>(null);
  const mutedRef = useRef(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; } });
  const [coins, setCoins] = useState(() => { try { return Number(localStorage.getItem(COIN_KEY) || 0); } catch { return 0; } });
  const [level, setLevel] = useState(1);
  const [mission, setMission] = useState("۵ کریستال جمع کن");
  const [powerLabel, setPowerLabel] = useState("نداری");
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState("برای حرکت، انگشتت را روی زمین بازی بکش.");

  const sound = useCallback((freq = 440, duration = .08, type: OscillatorType = "sine", volume = .035) => {
    if (mutedRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioRef.current ??= new AudioContextClass();
      const audio = audioRef.current, oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = type; oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch { /* Audio is optional. */ }
  }, []);
  const stopMusic = useCallback(() => {
    if (musicRef.current !== null) window.clearInterval(musicRef.current);
    musicRef.current = null;
  }, []);
  const startMusic = useCallback(() => {
    if (mutedRef.current || musicRef.current !== null) return;
    const notes = [220, 277, 330, 440, 330, 277]; let i = 0;
    musicRef.current = window.setInterval(() => { sound(notes[i++ % notes.length], .22, "triangle", .012); }, 320);
  }, [running, sound]);

  const redraw = useCallback(() => {
    if (canvasRef.current) drawWorld(canvasRef.current, worldRef.current);
  }, []);
  const persist = useCallback((key: string, value: number) => {
    try { localStorage.setItem(key, String(value)); } catch { /* Local storage is optional. */ }
  }, []);
  const burst = useCallback((x: number, y: number, color: string, count = 14) => {
    const w = worldRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, velocity = 1 + Math.random() * 4;
      w.particles.push({ x: x * CELL + 10, y: y * CELL + 10, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: 25 + Math.random() * 15, color });
    }
  }, []);
  const setupStage = useCallback(() => {
    const w = worldRef.current;
    w.obstacles = []; w.hunters = [];
    const occupied = (p: Point) => w.snake.some((s) => same(s, p)) || w.obstacles.some((o) => same(o, p)) || w.hunters.some((h) => same(h, p));
    const free = (): Point => { let p = randomPoint(); let tries = 0; while (occupied(p) && tries++ < 600) p = randomPoint(); return p; };
    for (let i = 0; i < Math.min(2 + w.level, 9); i++) w.obstacles.push(free());
    if (w.level >= 2) w.hunters.push({ ...free(), dx: 1, dy: 0 });
    if (w.level >= 4) w.hunters.push({ ...free(), dx: 0, dy: 1 });
    w.crystal = free(); w.coin = free(); w.power = null; w.goal = 5 + w.level * 2; w.stageProgress = 0;
    setMission(fa(w.goal) + " کریستال جمع کن"); setLevel(w.level); setPowerLabel("نداری");
  }, []);
  const updateCoins = useCallback((amount: number) => {
    const w = worldRef.current;
    w.runCoins += amount; setCoins((current) => { const next = current + amount; persist(COIN_KEY, next); return next; });
  }, [persist]);
  const finish = useCallback((won = false) => {
    setRunning(false); setOver(true); stopMusic();
    setStatus(won ? "تو قهرمان میدان شدی! رکورد شخصی‌ات ثبت شد." : "برخورد کردی! دوباره وارد میدان شو.");
    sound(won ? 880 : 110, .35, "sawtooth");
  }, [sound, stopMusic]);
  const nextStage = useCallback(() => {
    const w = worldRef.current; w.level++;
    let unlocked = 1; try { unlocked = Number(localStorage.getItem(LEVEL_KEY) || 1); } catch { /* optional */ }
    if (w.level > unlocked) persist(LEVEL_KEY, w.level);
    w.snake = [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }]; w.prevSnake = w.snake.map((p) => ({ ...p }));
    w.dir = { x: 1, y: 0 }; w.next = { ...w.dir }; w.tickNo = 0;
    setupStage(); setStatus("مرحله " + fa(w.level) + " شروع شد؛ سرعت بیشتر و شکارچی‌های خطرناک‌تر!");
    sound(660, .2);
  }, [persist, setupStage, sound]);
  const tick = useCallback(() => {
    const w = worldRef.current; w.tickNo++; w.dir = { ...w.next };
    const head = { x: w.snake[0].x + w.dir.x, y: w.snake[0].y + w.dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
      w.snake.slice(0, -1).some((p) => same(p, head)) || w.obstacles.some((p) => same(p, head)) || w.hunters.some((p) => same(p, head))) {
      burst(w.snake[0].x, w.snake[0].y, "#ff537d", 30); finish(); return;
    }
    w.prevSnake = w.snake.map((p) => ({ ...p }));
    w.snake.unshift(head);
    if (same(head, w.crystal)) {
      w.score += 10; setScore(w.score); burst(head.x, head.y, "#6cf7e7"); w.crystal = randomPoint();
      let tries = 0; while ((w.snake.some((p) => same(p, w.crystal)) || w.obstacles.some((p) => same(p, w.crystal)) || w.hunters.some((p) => same(p, w.crystal))) && tries++ < 500) w.crystal = randomPoint();
      sound(620, .1); setBest((old) => { const next = Math.max(old, w.score); if (next !== old) persist(BEST_KEY, next); return next; });
      w.stageProgress++; setMission(fa(Math.max(0, w.goal - w.stageProgress)) + " کریستال باقی‌مانده");
      if (w.stageProgress >= w.goal) {
        updateCoins(5 + w.level);
        let unlocked = 1; try { unlocked = Number(localStorage.getItem(LEVEL_KEY) || 1); } catch { /* optional */ }
        if (w.level >= unlocked + 3) { finish(true); return; }
        nextStage();
      }
    } else if (same(head, w.coin)) {
      updateCoins(1); burst(head.x, head.y, "#ffd166", 18); w.coin = randomPoint(); sound(940, .12, "triangle");
    } else w.snake.pop();
    if (w.power && same(head, w.power)) {
      updateCoins(3); burst(head.x, head.y, "#c59bff", 22); w.power = null; setPowerLabel("سپر فعال"); sound(760, .18);
    }
    if (!w.power && w.tickNo % 90 === 0) w.power = randomPoint();
    w.hunters.forEach((hunter) => {
      if (w.tickNo % 2 === 0) {
        const dx = Math.sign(head.x - hunter.x), dy = Math.sign(head.y - hunter.y);
        if (Math.random() < .5) hunter.x = Math.max(0, Math.min(N - 1, hunter.x + dx));
        else hunter.y = Math.max(0, Math.min(N - 1, hunter.y + dy));
        if (same(hunter, head)) finish();
      }
    });
    if (w.tickNo % 35 === 0 && w.level >= 3) {
      const hunter = w.hunters[0];
      if (hunter) {
        const options = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
          .filter((d) => hunter.x + d.x >= 0 && hunter.x + d.x < N && hunter.y + d.y >= 0 && hunter.y + d.y < N &&
            !w.obstacles.some((o) => same(o, { x: hunter.x + d.x, y: hunter.y + d.y })));
        if (options.length) { const d = options[Math.floor(Math.random() * options.length)]; hunter.x += d.x; hunter.y += d.y; }
      }
    }
    w.particles = w.particles.filter((p) => p.life-- > 0);
    w.particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vx *= .94; p.vy *= .94; });
    redraw();
  }, [burst, finish, nextStage, persist, redraw, sound, updateCoins]);
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }, [redraw]);
  useEffect(() => {
    if (!running) return;
    const delay = Math.max(72, 145 - worldRef.current.level * 5);
    let frame = 0, lastTime = 0, accumulator = 0;
    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      accumulator += Math.min(50, time - lastTime);
      lastTime = time;
      const delay = Math.max(72, 145 - worldRef.current.level * 5);
      while (accumulator >= delay) {
        tickRef.current();
        accumulator -= delay;
      }
      if (canvasRef.current) drawWorld(canvasRef.current, worldRef.current, Math.min(1, accumulator / delay));
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [running, level]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden && running) {
        setRunning(false); stopMusic(); setStatus("بازی متوقف شد؛ برای ادامه دوباره شروع کن.");
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [running, stopMusic]);
  useEffect(() => () => {
    stopMusic(); void audioRef.current?.close();
  }, [stopMusic]);

  const start = () => {
    const w = worldRef.current;
    w.snake = [{ x: 5, y: 12 }, { x: 4, y: 12 }, { x: 3, y: 12 }]; w.prevSnake = w.snake.map((p) => ({ ...p }));
    w.dir = { x: 1, y: 0 }; w.next = { ...w.dir }; w.score = 0; w.runCoins = 0; w.level = 1;
    w.tickNo = 0; w.particles = []; w.started = true;
    setScore(0); setOver(false); setupStage(); setRunning(true);
    setStatus("با کشیدن انگشت، حرکت کن؛ از شکارچی‌ها دوری کن!");
    redraw(); startMusic();
  };
  const steer = (x: number, y: number) => {
    const w = worldRef.current;
    if (!running || (x === -w.dir.x && y === -w.dir.y)) return;
    w.next = { x, y };
  };
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    touchRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const startPoint = touchRef.current; if (!startPoint) return;
    const dx = event.clientX - startPoint.x, dy = event.clientY - startPoint.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 16) {
      if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0);
      else steer(0, dy > 0 ? 1 : -1);
    }
    touchRef.current = null;
  };
  const toggleSound = () => {
    const next = !muted; mutedRef.current = next; setMuted(next);
    if (next) stopMusic(); else { sound(520); startMusic(); }
  };

  return <GameFrame title="مار نئونی" onExit={onExit}>
    <div className="neon-run">
      <div className="neon-run-heading"><span className="neon-run-tag"><i /> NEON ARCADE</span><h2>وارد میدان نئون شو</h2><p>کریستال جمع کن، از شکارچی‌ها فرار کن و مرحله‌ها را فتح کن.</p></div>
      <section className="neon-run-panel" aria-label="بازی آرکید WARGO Neon Run">
        <div className="neon-run-stats">
          <div><span>امتیاز</span><strong>{fa(score)}</strong></div><div><span>رکورد شخصی</span><strong>{fa(best)}</strong></div>
          <div><span>کریستال</span><strong>{fa(coins)}</strong></div><div><span>مرحله</span><strong>{fa(level)}</strong></div>
        </div>
        <canvas ref={canvasRef} className="neon-run-canvas" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { touchRef.current = null; }} aria-label="با کشیدن انگشت روی صفحه مسیر را تعیین کن" />
        <div className="neon-run-meta"><span>ماموریت: <b>{mission}</b></span><span>قدرت: <b>{powerLabel}</b></span></div>
        <div className="neon-run-actions">
          <button type="button" className="neon-run-start" onClick={start}>{over ? "تلاش دوباره" : running ? "شروع دوباره" : "شروع مأموریت"}</button>
          <button type="button" className="neon-run-sound" onClick={toggleSound} aria-label="خاموش یا روشن کردن صدا">{muted ? "×" : "♫"}</button>
        </div>
        <p className="neon-run-status" aria-live="polite">{status}</p>
      </section>
      <p className="neon-run-tip">کنترل فقط با کشیدن انگشت روی صفحه انجام می‌شود · حرکت مار با انیمیشن نرم و پیوسته نمایش داده می‌شود</p>
      <p className="neon-run-local-note">امتیاز و رکورد فقط روی همین دستگاه نگهداری می‌شوند و به سرور یا رتبه‌بندی ارسال نمی‌شوند.</p>
    </div>
  </GameFrame>;
}
