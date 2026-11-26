import type { ComponentType } from "react";

export type GameCategory =
  | "puzzle"
  | "arcade"
  | "logic"
  | "casual"
  | "other";

export interface GameModule {
  default: ComponentType;
}

export interface GameDefinition {
  /** Stable, URL-safe identifier. Never reuse an ID for a different game. */
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  /** Path or URL to an optimized cover image. */
  cover: string;
  /** Loaded only after the user opens this game. */
  load: () => Promise<GameModule>;
}
