import { useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";

type Brick = { id: number; x: number; y: number; w: number; h: number; hp: number; color: string };
type Ball = { x: number; y: number; vx: number; vy: number; delay: number };
type Engine = {
  width: number;
  height: number;
  bricks: Brick[];
  balls: Ball[];
  launching: boolean;
  score: number;
  volley: number;
  won: boolean;
  lost: boolean;
  lastTick: number;
  accumulator: number;
  lastUiScore: number;
};

const BALLS_PER_VOLLEY = 10;
const BALL_RADIUS = 4.2;
const BALL_SPEED = 410;
const FIXED_STEP = 1 / 120;
const BEST_KEY = "wargo:brick-best";

function bestScore() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY) || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function makeBricks(width: number): Brick[] {
  const cols = 8;
  const gap = 5;
  const margin = 8;
  const brickW = (width - margin * 2 - gap * (cols - 1)) / cols;
  const brickH = 37;
  const rows = [
    { start: 1, end: 6, hp: 3, color: "#b77aff" },
    { start: 0, end: 7, hp: 3, color: "#b77aff" },
    { start: 1, end: 6, hp: 2, color: "#b77aff" },
    { start: 0, end: 7, hp: 2, color: "#ff727b" },
    { start: 1, end: 6, hp: 2, color: "#ff626f" },
    { start: 0, end: 7, hp: 1, color: "#ff626f" },
  ];

  return rows.flatMap((row, rowIndex) =>
    Array.from({ length: row.end - row.start + 1 }, (_, index) => ({
      id: rowIndex * 10 + index,
      x: margin + (row.start + index) * (brickW + gap),
      y: 58 + rowIndex * (brickH + 7),
      w: brickW,
      h: brickH,
      hp: row.hp,
      color: row.color,
    })),
  );
}

function freshEngine(width: number, height: number): Engine {
  return {
    width,
    height,
    bricks: makeBricks(width),
    balls: [],
    launching: false,
    score: 0,
    volley: 1,
    won: false,
    lost: false,
    lastTick: 0,
    accumulator: 0,
    lastUiScore: 0,
  };
}

function circleTouchesBrick(ball: Ball, brick: Brick) {
  const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
  const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= BALL_RADIUS * BALL_RADIUS;
}

function damageBrick(engine: Engine, brickIndex: number) {
  const brick = engine.bricks[brickIndex];
  if (!brick) return;
  brick.hp -= 1;
  engine.score += brick.hp <= 0 ? 15 : 5;
  if (brick.hp <= 0) engine.bricks.splice(brickIndex, 1);
}

function drawAimPreview(
  ctx: CanvasRenderingContext2D,
  engine: Engine,
  angleDegrees: number,
) {
  const startX = engine.width / 2;
  const startY = engine.height - 34;
  let x = startX;
  let y = startY;
  let dx = Math.sin((angleDegrees * Math.PI) / 180);
  let dy = -Math.cos((angleDegrees * Math.PI) / 180);
  const points: Array<{ x: number; y: number }> = [{ x, y }];
  let target: { x: number; y: number } | null = null;

  // Cast a lightweight ray and reflect it from the side/top walls.
  for (let step = 0; step < 2200; step += 1) {
    x += dx * 3;
    y += dy * 3;

    if (x < BALL_RADIUS || x > engine.width - BALL_RADIUS) {
      dx *= -1;
      x = Math.max(BALL_RADIUS, Math.min(engine.width - BALL_RADIUS, x));
    }
    if (y < BALL_RADIUS) {
      dy *= -1;
      y = BALL_RADIUS;
    }

    const hitIndex = engine.bricks.findIndex((brick) => {
      const expanded = {
        x: brick.x - BALL_RADIUS,
        y: brick.y - BALL_RADIUS,
        w: brick.w + BALL_RADIUS * 2,
        h: brick.h + BALL_RADIUS * 2,
      };
      return x >= expanded.x && x <= expanded.x + expanded.w &&
        y >= expanded.y && y <= expanded.y + expanded.h;
    });

    if (hitIndex !== -1) {
      target = { x, y };
      points.push(target);
      break;
    }
    if (y >= startY - 5) break;
    if (step % 4 === 0) points.push({ x, y });
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "rgba(103, 232, 249, .95)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  if (target) {
    ctx.beginPath();
    ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#a5f3fc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  ctx.restore();
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
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    let width = 320;
    let height = 560;
    let raf = 0;

    const resize = () => {
      const nextWidth = Math.max(280, canvas.clientWidth || 320);
      const nextHeight = Math.max(500, Math.min(760, nextWidth * 1.58));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!engineRef.current) {
        engineRef.current = freshEngine(width, height);
        return;
      }

      const engine = engineRef.current;
      const scaleX = width / engine.width;
      const scaleY = height / engine.height;
      engine.bricks.forEach((brick) => {
        brick.x *= scaleX;
        brick.y *= scaleY;
        brick.w *= scaleX;
        brick.h *= scaleY;
      });
      engine.balls.forEach((ball) => {
        ball.x *= scaleX;
        ball.y *= scaleY;
        ball.vx *= scaleX;
        ball.vy *= scaleY;
      });
      engine.width = width;
      engine.height = height;
      engine.lastTick = 0;
      engine.accumulator = 0;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const anchor = () => ({ x: width / 2, y: height - 34 });

    const draw = (now: number) => {
      const engine = engineRef.current;
      if (!engine) return;

      const delta = engine.lastTick
        ? Math.min((now - engine.lastTick) / 1000, 0.05)
        : 0;
      engine.lastTick = now;
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#082a37");
      background.addColorStop(0.24, "#02080d");
      background.addColorStop(1, "#08020e");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(110,220,255,.13)";
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

      for (const brick of engine.bricks) {
        const gradient = ctx.createLinearGradient(
          brick.x,
          brick.y,
          brick.x,
          brick.y + brick.h,
        );
        gradient.addColorStop(0, brick.color);
        gradient.addColorStop(1, brick.color === "#b77aff" ? "#35204f" : "#4c171d");
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 7;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,.88)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "600 14px Vazirmatn, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(brick.hp), brick.x + brick.w / 2, brick.y + brick.h / 2);
      }

      const launchPoint = anchor();
      if (!engine.launching && !engine.won && !engine.lost) {
        drawAimPreview(ctx, engine, aimAngleRef.current);
      }

      ctx.shadowColor = "#e879f9";
      ctx.shadowBlur = 13;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(launchPoint.x, launchPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (engine.launching && !engine.won && !engine.lost) {
        engine.accumulator = Math.min(engine.accumulator + delta, 0.12);

        while (engine.accumulator >= FIXED_STEP) {
          engine.accumulator -= FIXED_STEP;

          for (let ballIndex = engine.balls.length - 1; ballIndex >= 0; ballIndex -= 1) {
            const ball = engine.balls[ballIndex];
            if (ball.delay > 0) {
              ball.delay = Math.max(0, ball.delay - FIXED_STEP);
              continue;
            }

            const previousX = ball.x;
            ball.x += ball.vx * FIXED_STEP;
            if (ball.x < BALL_RADIUS || ball.x > width - BALL_RADIUS) {
              ball.x = Math.max(BALL_RADIUS, Math.min(width - BALL_RADIUS, ball.x));
              ball.vx *= -1;
            } else {
              const horizontalHit = engine.bricks.findIndex((brick) => circleTouchesBrick(ball, brick));
              if (horizontalHit !== -1) {
                ball.x = previousX;
                ball.vx *= -1;
                damageBrick(engine, horizontalHit);
              }
            }

            const previousY = ball.y;
            ball.y += ball.vy * FIXED_STEP;
            if (ball.y < BALL_RADIUS) {
              ball.y = BALL_RADIUS;
              ball.vy = Math.abs(ball.vy);
            } else {
              const verticalHit = engine.bricks.findIndex((brick) => circleTouchesBrick(ball, brick));
              if (verticalHit !== -1) {
                ball.y = previousY;
                ball.vy *= -1;
                damageBrick(engine, verticalHit);
              }
            }

            if (ball.y > height + BALL_RADIUS * 2) {
              engine.balls.splice(ballIndex, 1);
            }
          }
        }

        if (engine.bricks.length === 0) {
          engine.won = true;
          engine.launching = false;
          setStatus("won");
        } else if (engine.balls.length === 0) {
          engine.launching = false;
          engine.volley += 1;
          setRound(engine.volley);
          setBallsLeft(BALLS_PER_VOLLEY);
          setStatus("ready");
        }

        if (engine.score !== engine.lastUiScore) {
          engine.lastUiScore = engine.score;
          setScore(engine.score);
          const record = bestScore();
          if (engine.score > record) {
            try {
              localStorage.setItem(BEST_KEY, String(engine.score));
            } catch {
              // Saving a local record is optional.
            }
            setBest(engine.score);
          }
        }
      }

      for (const ball of engine.balls) {
        if (ball.delay > 0) continue;
        ctx.shadowColor = "#e879f9";
        ctx.shadowBlur = 13;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const launchVolley = () => {
    const engine = engineRef.current;
    if (!engine || engine.launching || status !== "ready" || engine.won || engine.lost) return;

    const angle = (aimAngleRef.current * Math.PI) / 180;
    engine.balls = Array.from({ length: BALLS_PER_VOLLEY }, (_, index) => ({
      x: engine.width / 2,
      y: engine.height - 34,
      vx: Math.sin(angle) * BALL_SPEED,
      vy: -Math.cos(angle) * BALL_SPEED,
      delay: index * 0.075,
    }));
    engine.launching = true;
    engine.accumulator = 0;
    engine.lastTick = 0;
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
    const canvas = canvasRef.current;
    const width = Math.max(280, canvas?.clientWidth || 320);
    const height = Math.max(500, Math.min(760, width * 1.58));
    engineRef.current = freshEngine(width, height);
    setScore(0);
    setBallsLeft(BALLS_PER_VOLLEY);
    setRound(1);
    setStatus("ready");
    changeAim(0);
  };

  const begin = () => {
    restart();
    setStarted(true);
  };

  return (
    <GameFrame title="شکستن آجرها" onExit={onExit}>
      <div className="game-stats">
        <span>امتیاز <b>{score}</b></span>
        <span>توپ در نوبت بعد <b>{ballsLeft}</b></span>
        <span>راند <b>{round}</b></span>
        <span>رکورد <b>{best}</b></span>
      </div>

      <canvas
        ref={canvasRef}
        className="brick-canvas"
        aria-label="میدان بازی شکستن آجرها؛ خط نقطه‌چین مسیر پیش‌بینی‌شده پرتاب را نشان می‌دهد"
      />

      <div className={`brick-aim-control ${status !== "ready" ? "is-disabled" : ""}`}>
        <label className="brick-aim-label" htmlFor="brick-aim-slider">
          <span>زاویه پرتاب</span>
          <b>{aimAngle > 0 ? "+" : ""}{aimAngle}°</b>
        </label>
        <input
          id="brick-aim-slider"
          className="brick-aim-slider"
          type="range"
          min="-65"
          max="65"
          step="1"
          value={aimAngle}
          disabled={status !== "ready"}
          onChange={(event) => changeAim(Number(event.currentTarget.value))}
          onPointerDown={() => { sliderActiveRef.current = true; }}
          onPointerUp={releaseSlider}
          onPointerCancel={releaseSlider}
          onKeyUp={(event) => {
            if (event.key.startsWith("Arrow")) launchVolley();
          }}
          aria-label="زاویه پرتاب؛ خط نقطه‌چین روی میدان مسیر و محل برخورد احتمالی را پیش‌نمایش می‌کند"
        />
        <div className="brick-aim-scale"><span>چپ</span><span>مستقیم</span><span>راست</span></div>
        <p className="game-help">
          {status === "playing"
            ? "۱۰ توپ در حال حرکت‌اند..."
            : "خط نقطه‌چین مسیر و محل برخورد احتمالی را نشان می‌دهد؛ زاویه را تنظیم و رها کن تا ۱۰ توپ شلیک شوند."}
        </p>
        <button
          type="button"
          className="game-primary brick-launch-button"
          onClick={launchVolley}
          disabled={status !== "ready"}
        >
          پرتاب ۱۰ توپ
        </button>
      </div>

      <GameStartOverlay
        visible={!started || status === "won" || status === "lost"}
        title={!started ? "آماده‌ای؟" : status === "won" ? "تبریک! همه آجرها را شکستی!" : "بازی تمام شد"}
        description={status === "won" ? `امتیاز نهایی: ${score}` : !started ? "زاویه پرتاب را بعد از شروع تنظیم کن." : "برای تلاش دوباره آماده‌ای؟"}
        buttonLabel={!started ? "شروع بازی" : "شروع دوباره"}
        onStart={begin}
      />
    </GameFrame>
  );
}
