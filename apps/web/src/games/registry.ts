import type { GameDefinition } from "../types/game";

/** Metadata only; each game implementation is split into its own lazy-loaded chunk. */
export const gameRegistry: readonly GameDefinition[] = [
  { id: "brick-breaker", title: "شکستن آجرها", description: "۱۰ توپ را مثل تیرکمان پرتاب کن و آجرها را بشکن.", category: "arcade", cover: "/WARGO/games/brick-breaker.svg", load: () => import("./brick-breaker/Game") },
  { id: "chess", title: "شطرنج", description: "با ربات بازی کن و سطح سختی را انتخاب کن.", category: "logic", cover: "/WARGO/games/chess.svg", load: () => import("./chess/Game") },
  { id: "rock-paper-scissors", title: "سنگ، کاغذ، قیچی", description: "یک رقابت سریع و سه‌مرحله‌ای با ربات.", category: "casual", cover: "/WARGO/games/1000025222.webp", load: () => import("./rock-paper-scissors/Game") },
  { id: "snake-apple", title: "مار و سیب", description: "مار را هدایت کن، سیب بخور و رکوردت را ثبت کن.", category: "arcade", cover: "/WARGO/games/snake-apple.svg", load: () => import("./snake-apple/Game") },
];
