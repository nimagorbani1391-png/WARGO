import type { ReactNode } from "react";

export default function GameFrame({ title, onExit, children }: { title: string; onExit: () => void; children: ReactNode }) {
  return <section className="game-frame" dir="rtl">
    <header className="game-frame-header">
      <button className="game-back" type="button" onClick={onExit} aria-label="بازگشت به کتابخانه">← بازگشت</button>
      <strong>{title}</strong>
      <span className="game-frame-brand">WARGO</span>
    </header>
    <div className="game-frame-content">{children}</div>
  </section>;
}
