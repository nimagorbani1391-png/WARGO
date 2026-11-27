import type { GameDefinition } from "../types/game";

/** Metadata only; each game implementation is split into its own lazy-loaded chunk. */
export const gameRegistry: readonly GameDefinition[] = [
  { id: "game-2048", title: "۲۰۴۸", description: "عددهای برابر را ترکیب کن و به ۲۰۴۸ برس.", category: "puzzle", cover: "/WARGO/games/2048.svg", load: () => import("./game-2048/Game") },
  { id: "tetris", title: "تتریس", description: "قطعه‌ها را بچرخان و ردیف‌های کامل بساز.", category: "puzzle", cover: "/WARGO/games/tetris.svg", load: () => import("./tetris/Game") },
  { id: "dinosaur-runner", title: "دایناسور دونده", description: "از موانع بپر و رکوردت را ثبت کن.", category: "arcade", cover: "/WARGO/games/dinosaur-runner.svg", load: () => import("./dinosaur-runner/Game") },
  { id: "tic-tac-toe", title: "دوز", description: "مقابل ربات یا یک بازیکن دیگر بازی کن.", category: "logic", cover: "/WARGO/games/tic-tac-toe.svg", load: () => import("./tic-tac-toe/Game") },
  { id: "brick-breaker", title: "شکستن آجرها", description: "۱۰ توپ را مثل تیرکمان پرتاب کن و آجرها را بشکن.", category: "arcade", cover: "/WARGO/games/1000025228.webp", load: () => import("./brick-breaker/Game") },
  { id: "chess", title: "شطرنج", description: "با ربات بازی کن و سطح سختی را انتخاب کن.", category: "logic", cover: "/WARGO/games/1000025224.webp", load: () => import("./chess/Game") },
  { id: "rock-paper-scissors", title: "سنگ، کاغذ، قیچی", description: "یک رقابت سریع و سه‌مرحله‌ای با ربات.", category: "casual", cover: "/WARGO/games/1000025222.webp", load: () => import("./rock-paper-scissors/Game") },
  { id: "snake-apple", title: "مار و سیب", description: "مار را هدایت کن، سیب بخور و رکوردت را ثبت کن.", category: "arcade", cover: "/WARGO/games/snake-apple.svg", load: () => import("./snake-apple/Game") },
  { id: "reaction-test", title: "تست سرعت واکنش", description: "سرعت واکنشت را بسنج و رکورد میلی‌ثانیه‌ای ثبت کن.", category: "casual", cover: "/WARGO/games/reaction-test.svg", load: () => import("./reaction-test/Game") },
  { id: "flappy-bird", title: "پرنده پرشی", description: "با ضربه‌های دقیق از لوله‌ها عبور کن و رکورد بزن.", category: "arcade", cover: "/WARGO/games/flappy-bird.svg", load: () => import("./flappy-bird/Game") },
  { id: "memory-match", title: "بازی حافظه", description: "جفت کارت‌ها را پیدا کن؛ هر مرحله با چیدمان تصادفی تازه.", category: "puzzle", cover: "/WARGO/games/memory-match.svg", load: () => import("./memory-match/Game") },
];