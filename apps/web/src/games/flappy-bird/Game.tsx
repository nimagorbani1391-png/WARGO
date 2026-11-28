import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

const SAVE_KEY = "wargo:flappy-progress";
const LEGACY_BEST_KEY = "wargo:flappy-best";
const WIDTH = 360;
const HEIGHT = 560;
const BIRD_X = 88;
const PIPE_WIDTH = 62;
const PIPE_GAP = 164;

type BirdId = "classic" | "flame" | "mint" | "cosmic";
type BirdSkin = { id: BirdId; name: string; emoji: string; body: string; wing: string; beak: string; unlockAt: number };
type Pipe = { x: number; gapY: number; scored: boolean };
type World = { birdY: number; velocity: number; pipes: Pipe[]; score: number; last: number; raf: number; over: boolean; elapsed: number };
type SaveData = { best: number; selectedBird: BirdId; achievements: string[] };

const BIRDS: BirdSkin[] = [
  { id: "classic", name: "طلایی", emoji: "🐤", body: "#ffd166", wing: "#e7a93e", beak: "#f08c46", unlockAt: 0 },
  { id: "flame", name: "آتشین", emoji: "🔥", body: "#ff765e", wing: "#d94c3d", beak: "#ffd166", unlockAt: 5 },
  { id: "mint", name: "زمردی", emoji: "🪽", body: "#65dfbd", wing: "#27a98c", beak: "#f5b84b", unlockAt: 12 },
  { id: "cosmic", name: "کیهانی", emoji: "🌌", body: "#b69aff", wing: "#7957d5", beak: "#72d8ff", unlockAt: 20 },
];

const MISSIONS = [
  { id: "m5", title: "پرواز اول", detail: "از ۵ مانع عبور کن", target: 5, reward: "نشان تازه‌کار" },
  { id: "m12", title: "پرواز بلند", detail: "به امتیاز ۱۲ برس", target: 12, reward: "نشان خلبان" },
  { id: "m20", title: "فرمانروای آسمان", detail: "به امتیاز ۲۰ برس", target: 20, reward: "نشان افسانه‌ای" },
];

const ACHIEVEMENTS = [
  { id: "m5", title: "تازه‌کار", icon: "🌱", description: "۵ مانع را پشت سر گذاشتی" },
  { id: "m12", title: "خلبان", icon: "🛩️", description: "به امتیاز ۱۲ رسیدی" },
  { id: "m20", title: "افسانه‌ای", icon: "🏆", description: "به امتیاز ۲۰ رسیدی" },
];

function readSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const best = Number(parsed.best);
      const selectedBird = BIRDS.some((bird) => bird.id === parsed.selectedBird) ? parsed.selectedBird as BirdId : "classic";
      return {
        best: Number.isSafeInteger(best) && best > 0 ? best : 0,
        selectedBird,
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((id): id is string => typeof id === "string") : [],
      };
    }
    const legacy = Number(localStorage.getItem(LEGACY_BEST_KEY) || 0);
    return { best: Number.isSafeInteger(legacy) && legacy > 0 ? legacy : 0, selectedBird: "classic", achievements: [] };
  } catch {
    return { best: 0, selectedBird: "classic", achievements: [] };
  }
}

function makeWorld(): World {
  return {
    birdY: HEIGHT * 0.46,
    velocity: 0,
    pipes: [
      { x: WIDTH + 35, gapY: 265, scored: false },
      { x: WIDTH + 250, gapY: 205, scored: false },
    ],
    score: 0,
    last: 0,
    raf: 0,
    over: false,
    elapsed: 0,
  };
}

function environmentFor(score: number) {
  if (score >= 25) return { name: "فضای کیهانی", top: "#10132f", bottom: "#38265f", pipe: "#9b82ff", glow: "#d7c7ff", ground: "#282044", stars: true };
  if (score >= 16) return { name: "آسمان شب", top: "#101f3c", bottom: "#244b70", pipe: "#5dc7c2", glow: "#a6fff0", ground: "#1d3447", stars: true };
  if (score >= 8) return { name: "غروب طلایی", top: "#713d63", bottom: "#f3a45d", pipe: "#5a9c78", glow: "#ffe0a6", ground: "#76513e", stars: false };
  return { name: "دشت سبز", top: "#172b4c", bottom: "#4b8c91", pipe: "#5b9b78", glow: "#b7f4df", ground: "#8d744d", stars: false };
}

export default function FlappyBird({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(makeWorld());
  const saveRef = useRef<SaveData>(readSave());
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(saveRef.current.best);
  const [selectedBird, setSelectedBird] = useState<BirdId>(saveRef.current.selectedBird);
  const [achievements, setAchievements] = useState<string[]>(saveRef.current.achievements);
  const [showAchievements, setShowAchievements] = useState(false);

  const activeBird = useMemo(() => BIRDS.find((bird) => bird.id === selectedBird) ?? BIRDS[0], [selectedBird]);
  const environment = environmentFor(score);
  const completedMissions = MISSIONS.filter((mission) => achievements.includes(mission.id)).length;

  const persist = useCallback((next: SaveData) => {
    saveRef.current = next;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); } catch { /* Local progress is optional when storage is unavailable. */ }
  }, []);

  const selectBird = (bird: BirdSkin) => {
    if (best < bird.unlockAt || running) return;
    setSelectedBird(bird.id);
    persist({ ...saveRef.current, selectedBird: bird.id });
  };

  const flap = useCallback(() => {
    if (!running || world.current.over) return;
    world.current.velocity = -430;
  }, [running]);

  const start = useCallback(() => {
    cancelAnimationFrame(world.current.raf);
    world.current = makeWorld();
    setScore(0);
    setOver(false);
    setRunning(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.code !== "ArrowUp") return;
      event.preventDefault();
      if (!running && !over) start();
      else flap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, over, flap, start]);

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
      setRunning(false);
      setOver(true);
      const nextBest = Math.max(saveRef.current.best, current.score);
      const nextAchievements = [...new Set([
        ...saveRef.current.achievements,
        ...MISSIONS.filter((mission) => current.score >= mission.target).map((mission) => mission.id),
      ])];
      setBest(nextBest);
      setAchievements(nextAchievements);
      persist({ ...saveRef.current, best: nextBest, achievements: nextAchievements });
    };

    const draw = (time: number) => {
      const w = world.current;
      const dt = Math.min((time - (w.last || time)) / 1000, 0.032);
      w.last = time;
      if (running && !w.over) {
        w.elapsed += dt;
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
            pipe.x = Math.max(...w.pipes.map((item) => item.x)) + 215;
            pipe.gapY = 120 + Math.random() * 285;
            pipe.scored = false;
          }
          const overlapsX = BIRD_X + 13 > pipe.x && BIRD_X - 13 < pipe.x + PIPE_WIDTH;
          const topEdge = pipe.gapY - PIPE_GAP / 2;
          const bottomEdge = pipe.gapY + PIPE_GAP / 2;
          if (overlapsX && (w.birdY - 12 < topEdge || w.birdY + 12 > bottomEdge)) finish();
        }
        if (w.birdY < 0 || w.birdY > HEIGHT - 48) finish();
      }

      const scene = environmentFor(w.score);
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, scene.top);
      sky.addColorStop(1, scene.bottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (scene.stars) {
        for (let i = 0; i < 38; i++) {
          const x = (i * 97 + 23) % WIDTH;
          const y = (i * 67 + 31) % 390;
          const pulse = 0.45 + Math.sin(time / 420 + i) * 0.25;
          ctx.globalAlpha = pulse;
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x, y, i % 5 === 0 ? 1.8 : 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "rgba(255,255,255,.13)";
        for (let i = 0; i < 6; i++) {
          const x = ((i * 105 - w.elapsed * (running ? 17 : 3)) % 460 + 460) % 460 - 45;
          const y = 72 + (i % 3) * 61;
          ctx.beginPath();
          ctx.ellipse(x, y, 31, 10, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 22, y + 2, 22, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Distant hills add depth without extra assets or network requests.
      ctx.fillStyle = scene.stars ? "rgba(90,85,150,.28)" : "rgba(24,60,67,.25)";
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT - 100);
      for (let x = 0; x <= WIDTH; x += 24) ctx.quadraticCurveTo(x + 12, HEIGHT - 145 - Math.sin(x * 0.035) * 15, x + 24, HEIGHT - 100);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.fill();

      for (const pipe of w.pipes) {
        const top = pipe.gapY - PIPE_GAP / 2;
        const bottom = pipe.gapY + PIPE_GAP / 2;
        const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        pipeGradient.addColorStop(0, scene.pipe);
        pipeGradient.addColorStop(.5, scene.glow);
        pipeGradient.addColorStop(1, scene.pipe);
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, top - 15);
        ctx.fillRect(pipe.x - 5, top - 17, PIPE_WIDTH + 10, 17);
        ctx.fillRect(pipe.x, bottom + 15, PIPE_WIDTH, HEIGHT - bottom - 63);
        ctx.fillRect(pipe.x - 5, bottom, PIPE_WIDTH + 10, 17);
        ctx.fillStyle = "rgba(255,255,255,.2)";
        ctx.fillRect(pipe.x + 9, 0, 6, Math.max(0, top - 18));
        ctx.fillRect(pipe.x + 9, bottom + 18, 6, Math.max(0, HEIGHT - bottom - 81));
      }

      ctx.fillStyle = scene.ground;
      ctx.fillRect(0, HEIGHT - 48, WIDTH, 48);
      ctx.fillStyle = "rgba(255,255,255,.2)";
      for (let x = 0; x < WIDTH; x += 22) ctx.fillRect(x, HEIGHT - 48, 10, 4);

      const bob = running ? 0 : Math.sin(time / 260) * 5;
      const birdY = w.birdY + bob;
      ctx.save();
      ctx.translate(BIRD_X, birdY);
      ctx.rotate(Math.max(-.45, Math.min(.75, w.velocity / 700)));
      ctx.shadowColor = activeBird.body;
      ctx.shadowBlur = 13;
      ctx.fillStyle = activeBird.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = activeBird.wing;
      ctx.beginPath();
      ctx.ellipse(-5, 5 + Math.sin(time / 65) * (running ? 2 : 0), 8, 4, -.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(7, -5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2940";
      ctx.beginPath();
      ctx.arc(9, -5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = activeBird.beak;
      ctx.beginPath();
      ctx.moveTo(13, 1);
      ctx.lineTo(25, 4);
      ctx.lineTo(13, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#fff";
      ctx.font = "800 28px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,.35)";
      ctx.shadowBlur = 8;
      ctx.fillText(String(w.score), WIDTH / 2, 48);
      ctx.shadowBlur = 0;
      if (running && !w.over) w.raf = requestAnimationFrame(draw);
    };

    world.current.raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(world.current.raf);
  }, [running, activeBird, persist]);

  return <GameFrame title="پرنده پرشی" onExit={onExit}>
    <div className="game-stats flappy-stats">
      <span>امتیاز <b>{score}</b></span>
      <span>رکورد <b>{best}</b></span>
      <span>نشان‌ها <b>{completedMissions}/3</b></span>
    </div>

    <section className="flappy-bird-picker" aria-label="انتخاب پرنده">
      <div className="flappy-section-heading"><strong>پرنده‌ات را انتخاب کن</strong><span>با رکوردت شخصیت‌های جدید باز کن</span></div>
      <div className="flappy-bird-list">
        {BIRDS.map((bird) => {
          const unlocked = best >= bird.unlockAt;
          return <button key={bird.id} type="button" className={`flappy-bird-option ${selectedBird === bird.id ? "is-selected" : ""} ${!unlocked ? "is-locked" : ""}`} onClick={() => selectBird(bird)} disabled={!unlocked || running} aria-pressed={selectedBird === bird.id}>
            <span className="flappy-bird-avatar" style={{ background: bird.body }}>{unlocked ? bird.emoji : "🔒"}</span>
            <b>{bird.name}</b>
            <small>{unlocked ? (bird.unlockAt === 0 ? "آزاد" : `رکورد ${bird.unlockAt}+`) : `رکورد ${bird.unlockAt}`}</small>
          </button>;
        })}
      </div>
    </section>

    <div className="flappy-scene-label"><span className="flappy-scene-dot" /> {environment.name} <span>• با پیشرفت تغییر می‌کند</span></div>
    <button type="button" className="flappy-stage" onPointerDown={(event) => { event.preventDefault(); if (!running && !over) start(); else flap(); }} aria-label="برای پرش لمس کن">
      <canvas ref={canvas} />
    </button>

    <section className="flappy-missions">
      <div className="flappy-section-heading"><strong>مأموریت‌های پرواز</strong><span>{completedMissions} از ۳ تکمیل‌شده</span></div>
      <div className="flappy-mission-list">
        {MISSIONS.map((mission) => {
          const done = achievements.includes(mission.id);
          const progress = Math.min(score, mission.target);
          return <div key={mission.id} className={`flappy-mission ${done ? "is-done" : ""}`}>
            <span className="flappy-mission-icon">{done ? "✓" : "✦"}</span>
            <div className="flappy-mission-copy"><b>{mission.title}</b><small>{done ? mission.reward : mission.detail}</small><div className="flappy-progress"><i style={{ width: `${done ? 100 : (progress / mission.target) * 100}%` }} /></div></div>
            <strong className="flappy-mission-count">{done ? "کامل" : `${progress}/${mission.target}`}</strong>
          </div>;
        })}
      </div>
      <button type="button" className="flappy-achievement-toggle" onClick={() => setShowAchievements((value) => !value)} aria-expanded={showAchievements}>
        {showAchievements ? "بستن دستاوردها" : "مشاهده دستاوردها"} <span>{achievements.length}/3</span>
      </button>
      {showAchievements && <div className="flappy-achievements">
        {ACHIEVEMENTS.map((item) => <div key={item.id} className={`flappy-achievement ${achievements.includes(item.id) ? "is-earned" : ""}`}><span>{achievements.includes(item.id) ? item.icon : "🔒"}</span><div><b>{item.title}</b><small>{item.description}</small></div></div>)}
      </div>}
    </section>

    <GameStartOverlay visible={!running} title={over ? "پرواز به پایان رسید" : "آماده پرواز؟"} description={over ? `امتیاز این دور: ${score} — ${score >= best ? "رکورد جدید ثبت شد!" : "برای رکورد بهتر دوباره تلاش کن."}` : "با هر لمس بال بزن، از موانع عبور کن و پرنده‌های تازه را آزاد کن."} buttonLabel={over ? "پرواز دوباره" : "شروع پرواز"} onStart={start} />
    <p className="game-help">برای بال زدن صفحه را لمس کن یا Space را بزن. هر مانع یک امتیاز دارد؛ با پیشرفت، آسمان و چالش‌ها تغییر می‌کنند.</p>
    <p className="flappy-local-note">پیشرفت و دستاوردها فقط روی همین دستگاه ذخیره می‌شوند.</p>
  </GameFrame>;
}
