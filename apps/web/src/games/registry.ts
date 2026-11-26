import type { GameDefinition } from "../types/game";

/** Metadata only; each game implementation is split into its own lazy-loaded chunk. */
export const gameRegistry: readonly GameDefinition[] = [
  { id: "brick-breaker", title: "شکستن آجرها", description: "توپ را کنترل کن و همه آجرها را بشکن.", category: "arcade", cover: "/WARGO/games/brick-breaker.svg", load: () => import("./brick-breaker/Game") },
  { id: "chess", title: "شطرنج", description: "با ربات بازی کن و سطح سختی را انتخاب کن.", category: "logic", cover: "/WARGO/games/chess.svg", load: () => import("./chess/Game") },
  { id: "rock-paper-scissors", title: "سنگ، کاغذ، قیچی", description: "یک رقابت سریع و سه‌مرحله‌ای با ربات.", category: "casual", cover: "/WARGO/games/rock-paper-scissors.svg", load: () => import("./rock-paper-scissors/Game") },
  { id: "snakes-ladders", title: "مار و پله", description: "تاس بینداز، از نردبان بالا برو و مراقب مارها باش.", category: "casual", cover: "/WARGO/games/snakes-ladders.svg", load: () => import("./snakes-ladders/Game") },
];
