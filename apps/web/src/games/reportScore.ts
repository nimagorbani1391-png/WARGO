export function reportGameScore(gameId: string, score: number) {
  if (!Number.isSafeInteger(score) || score < 0) return;
  window.dispatchEvent(new CustomEvent("wargo:game-score", { detail: { gameId, score } }));
}
