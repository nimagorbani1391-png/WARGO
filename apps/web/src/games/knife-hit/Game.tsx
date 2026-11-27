import { useCallback, useEffect, useRef, useState } from "react";
import GameFrame from "../GameFrame";
import GameStartOverlay from "../GameStartOverlay";
import { reportGameScore } from "../reportScore";

const BEST_KEY = "wargo:knife-hit-best";
const W = 420;
const H = 560;
const CX = W / 2;
const CY = 205;
const R = 82;
const NEED = 20;
const FIXED_STEP = 1 / 120;
const MAX_FRAME_DELTA = 0.05;
const KNIFE_SPEED = 3600;
const FLYING_COLLISION_DISTANCE = 30;
const KNIFE_HALF_WIDTH = 6;
const COLLISION_CLEARANCE = 3;
const COLLISION_RADIUS = R + 5;
const COLLISION_ANGLE = 2 * Math.asin(
  Math.min(0.95, (KNIFE_HALF_WIDTH * 2 + COLLISION_CLEARANCE) / (2 * COLLISION_RADIUS)),
);

type Knife = { angle: number };
type FlyingKnife = { distance: number; speed: number };
type State = {
  angle: number;
  rotationDirection: 1 | -1;
  rotationPause: number;
  rotationChangeIn: number;
  knives: Knife[];
  flying: FlyingKnife[];
  remaining: number;
  score: number;
  last: number;
  accumulator: number;
  raf: number;
  over: boolean;
  won: boolean;
};

function readBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function makeState(): State {
  return {
    angle: 0,
    rotationDirection: 1,
    rotationPause: 0,
    rotationChangeIn: 0.65 + Math.random() * 0.75,
    knives: [],
    flying: [],
    remaining: NEED,
    score: 0,
    last: 0,
    accumulator: 0,
    raf: 0,
    over: false,
    won: false,
  };
}

function normalizeAngle(angle: number) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function angularDistance(a: number, b: number) {
  const difference = normalizeAngle(a - b);
  return Math.min(difference, Math.PI * 2 - difference);
}

/**
 * The incoming knife travels vertically upward, so it reaches the target
 * at the bottom (world angle PI/2). Pinned knives store their rotation
 * relative to the rotating target.
 */
function getImpactAngle(targetAngle: number) {
  return normalizeAngle(Math.PI - targetAngle);
}

function hasCollision(knives: Knife[], impactAngle: number) {
  return knives.some((knife) => angularDistance(knife.angle, impactAngle) <= COLLISION_ANGLE);
}

export default function KnifeHit({ onExit }: { onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<State>(makeState());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [remaining, setRemaining] = useState(NEED);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);

  const start = useCallback(() => {
    game.current = makeState();
    setScore(0);
    setRemaining(NEED);
    setWon(false);
    setOver(false);
    setRunning(true);
  }, []);

  const throwKnife = useCallback(() => {
    const current = game.current;
    if (!running || current.over || current.remaining <= current.flying.length) return;
    // Small speed variation makes a fast-following knife able to catch the one ahead.
    const speed = KNIFE_SPEED * (0.88 + Math.random() * 0.24);
    current.flying.push({ distance: 0, speed });
  }, [running]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d", { alpha: false });
    if (!element || !context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    element.width = W * dpr;
    element.height = H * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const finishRound = (state: State, success: boolean) => {
      state.over = true;
      state.won = success;
      state.flying = [];
      setWon(success);
      setOver(true);
      setRunning(false);
    };

    const update = (state: State, dt: number) => {
      if (state.over) return;

      const rotationSpeed = 1.35 + Math.min(state.score, 30) * 0.035;

      // The target changes direction abruptly at irregular intervals and
      // occasionally pauses briefly, making the timing less predictable.
      if (state.rotationPause > 0) {
        state.rotationPause = Math.max(0, state.rotationPause - dt);
      } else {
        state.rotationChangeIn -= dt;
        if (state.rotationChangeIn <= 0) {
          state.rotationDirection = state.rotationDirection === 1 ? -1 : 1;
          state.rotationPause = 0.12 + Math.random() * 0.28;
          state.rotationChangeIn = 0.55 + Math.random() * 1.05;
        } else {
          state.angle = normalizeAngle(
            state.angle + rotationSpeed * state.rotationDirection * dt,
          );
        }
      }

      if (state.flying.length === 0) return;

      const travelDistance = H - 35 - (CY + R + 18);
      state.flying.forEach((knife) => { knife.distance += knife.speed * dt; });

      // Two knives in the same lane collide when the faster trailing one catches up.
      const ordered = [...state.flying].sort((a, b) => b.distance - a.distance);
      for (let i = 0; i < ordered.length - 1; i += 1) {
        const gap = ordered[i].distance - ordered[i + 1].distance;
        if (gap <= FLYING_COLLISION_DISTANCE) {
          finishRound(state, false);
          return;
        }
      }

      const arrived = state.flying
        .filter((knife) => knife.distance >= travelDistance)
        .sort((a, b) => b.distance - a.distance);
      state.flying = state.flying.filter((knife) => knife.distance < travelDistance);
      for (let i = 0; i < arrived.length; i += 1) {
        const impactAngle = getImpactAngle(state.angle);
        if (hasCollision(state.knives, impactAngle)) {
          finishRound(state, false);
          return;
        }
        state.knives.push({ angle: impactAngle });
        state.remaining -= 1;
        state.score += 1;
        setRemaining(state.remaining);
        setScore(state.score);

        if (state.score > readBest()) {
          try {
            localStorage.setItem(BEST_KEY, String(state.score));
          } catch {
            // Local storage is optional; the current session still works.
          }
          setBest(state.score);
        }
        if (state.remaining === 0) {
          finishRound(state, true);
          return;
        }
      }
    };

    const draw = (state: State) => {
      const ctx = context;
      ctx.fillStyle = "#080d1b";
      ctx.fillRect(0, 0, W, H);

      const background = ctx.createLinearGradient(0, 0, W, H);
      background.addColorStop(0, "#111a35");
      background.addColorStop(1, "#080d1b");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 34; i += 1) {
        const x = (i * 83) % W;
        const y = (i * 137) % H;
        ctx.fillStyle = "rgba(130,190,255,.22)";
        ctx.fillRect(x, y, 2, 2);
      }

      // Rotating wooden target and knives embedded in its surface.
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(state.angle);

      const wood = ctx.createRadialGradient(-22, -25, 8, 0, 0, R);
      wood.addColorStop(0, "#f4bd75");
      wood.addColorStop(0.58, "#b86a3c");
      wood.addColorStop(1, "#713a2e");
      ctx.fillStyle = wood;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,226,176,.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R - 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(74,34,29,.45)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 22 + i * 14, 10 + i * 13, i * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#f8d6a0";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      state.knives.forEach((knife) => {
        ctx.save();
        ctx.rotate(knife.angle);
        ctx.translate(0, -R - 5);
        ctx.rotate(Math.PI);
        drawKnife(ctx, 0, 0);
        ctx.restore();
      });
      ctx.restore();

      state.flying.forEach((knife) => {
        drawKnife(ctx, CX, H - 35 - knife.distance);
      });

      ctx.fillStyle = "#eaf3ff";
      ctx.font = "700 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KNIVES", W / 2, 36);

      ctx.font = "800 30px sans-serif";
      ctx.fillStyle = "#70e1ff";
      ctx.fillText(String(state.remaining), W / 2, 72);

      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.fillRect(30, H - 35, W - 60, 5);
      ctx.fillStyle = "#55d8ff";
      ctx.fillRect(30, H - 35, (W - 60) * (state.score / NEED), 5);
    };

    const frame = (time: number) => {
      const state = game.current;
      if (state.last === 0) state.last = time;
      const elapsed = Math.min(Math.max(0, (time - state.last) / 1000), MAX_FRAME_DELTA);
      state.last = time;

      if (running && !state.over) {
        state.accumulator += elapsed;
        while (state.accumulator >= FIXED_STEP && !state.over) {
          update(state, FIXED_STEP);
          state.accumulator -= FIXED_STEP;
        }
      }

      draw(state);
      if (running && !state.over) {
        state.raf = requestAnimationFrame(frame);
      }
    };

    game.current.last = 0;
    game.current.accumulator = 0;
    game.current.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(game.current.raf);
  }, [running]);

  useEffect(() => { if (over) reportGameScore("knife-hit", score); }, [over]);

  useEffect(() => () => cancelAnimationFrame(game.current.raf), []);

  return (
    <GameFrame title="چاقو به هدف" onExit={onExit}>
      <div className="game-stats">
        <span>امتیاز <b>{score}</b></span>
        <span>رکورد <b>{best}</b></span>
        <span>چاقو <b>{remaining}</b></span>
      </div>
      <button
        type="button"
        className="knife-stage"
        disabled={!running || over || remaining <= 0}
        onPointerDown={(event) => {
          event.preventDefault();
          throwKnife();
        }}
        onClick={(event) => {
          if (event.detail === 0) throwKnife();
        }}
        aria-label="برای پرتاب چاقو ضربه بزن یا کلید فاصله را فشار بده"
        aria-describedby="knife-game-help"
      >
        <canvas ref={canvas} aria-hidden="true" />
        <span className="sr-only">برای پرتاب چاقو روی صفحه ضربه بزن یا کلید فاصله را فشار بده</span>
      </button>
      <GameStartOverlay
        visible={!running}
        title={over ? (won ? "مرحله کامل شد!" : "برخورد کردی!") : "آماده‌ی پرتابی؟"}
        description={
          over
            ? (won ? "همه چاقوها به هدف نشستند. رکورد بعدی را بساز." : "چاقوها به هم برخورد کردند. دوباره امتحان کن.")
            : "چاقوها را با زمان‌بندی دقیق به هدف بچسبان؛ مراقب چاقوهای قبلی باش."
        }
        buttonLabel={over ? "مرحله بعد" : "شروع بازی"}
        onStart={start}
      />
      <p className="game-help" id="knife-game-help">برای پرتاب هر چاقو یک‌بار روی میدان بازی ضربه بزن یا کلید فاصله را فشار بده. چاقوها نباید به یکدیگر یا چاقوهای قبلی برخورد کنند.</p>
    </GameFrame>
  );
}

function drawKnife(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(89,220,255,.45)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#dce8f2";
  ctx.beginPath();
  ctx.moveTo(0, -29);
  ctx.lineTo(7, -7);
  ctx.lineTo(4, 5);
  ctx.lineTo(-4, 5);
  ctx.lineTo(-7, -7);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f4a261";
  ctx.fillRect(-5, 5, 10, 19);
  ctx.fillStyle = "#75452f";
  ctx.fillRect(-7, 21, 14, 5);
  ctx.restore();
}
