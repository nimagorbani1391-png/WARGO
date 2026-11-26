import type { GameDefinition } from "../types/game";

/**
 * The central catalogue contains metadata and lazy loaders only.
 * Keep game implementation code in separate modules so the initial
 * application bundle never includes every game.
 *
 * Add a game here when its module is ready. Example:
 * {
 *   id: "sample-game",
 *   title: "Sample Game",
 *   description: "A short description",
 *   category: "puzzle",
 *   cover: "/games/sample-game/cover.webp",
 *   load: () => import("../../../../games/sample-game/src/Game"),
 * }
 */
export const gameRegistry: readonly GameDefinition[] = [];
