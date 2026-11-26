import type { ReactNode } from "react";

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  buttonLabel: string;
  onStart: () => void;
  children?: ReactNode;
};

export default function GameStartOverlay({ visible, title, description, buttonLabel, onStart, children }: Props) {
  if (!visible) return null;
  return (
    <div className="game-start-overlay">
      <div className="game-start-card" role="dialog" aria-modal="true" aria-label={title}>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
        {children}
        <button type="button" className="game-primary" onClick={onStart}>{buttonLabel}</button>
      </div>
    </div>
  );
}
