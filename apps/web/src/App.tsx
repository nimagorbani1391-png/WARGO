import { Suspense, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { gameRegistry } from "./games/registry";
import type { GameCategory, GameDefinition } from "./types/game";

const categories: { id: GameCategory | "all"; label: string; icon: string }[] = [
  { id: "all", label: "همه", icon: "✦" },
  { id: "puzzle", label: "معمایی", icon: "◇" },
  { id: "arcade", label: "آرکید", icon: "▣" },
  { id: "logic", label: "فکری", icon: "⌘" },
  { id: "casual", label: "سرگرمی", icon: "☼" },
];

export default function App() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GameCategory | "all">("all");
  const [opened, setOpened] = useState<{ game: GameDefinition; View: ComponentType<{ onExit: () => void }> } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const games = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fa");
    return gameRegistry.filter((game) => {
      const matchesQuery = !normalizedQuery || `${game.title} ${game.description}`.toLocaleLowerCase("fa").includes(normalizedQuery);
      return matchesQuery && (activeCategory === "all" || game.category === activeCategory);
    });
  }, [query, activeCategory]);

  async function launchGame(game: GameDefinition) {
    if (loadingId) return;
    setLoadingId(game.id);
    try {
      const module = await game.load();
      setOpened({ game, View: module.default });
      try {
        const previous = JSON.parse(localStorage.getItem("wargo:recent") || "[]") as string[];
        localStorage.setItem("wargo:recent", JSON.stringify([game.id, ...previous.filter((id) => id !== game.id)].slice(0, 5)));
      } catch { /* Storage is optional; games remain playable without it. */ }
    } finally {
      setLoadingId(null);
    }
  }

  function openRandomGame() {
    if (games.length) void launchGame(games[Math.floor(Math.random() * games.length)]);
  }

  const ActiveGame = opened?.View;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/WARGO/" aria-label="صفحه اصلی WARGO"><span>WARGO</span></a>
      </header>

      <section className="mobile-home" aria-label="پیدا کردن بازی">
        <div className="mobile-welcome"><h1>چه بازی‌ای <span>انجام بدیم؟</span></h1></div>
        <label className="search-box mobile-search">
          <span aria-hidden="true">⌕</span><span className="sr-only">جست‌وجوی بازی</span>
          <input type="search" placeholder="اسم بازی رو جست‌وجو کن..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="random-button mobile-random" type="button" onClick={openRandomGame} disabled={!games.length || !!loadingId}>
          <span aria-hidden="true">✦</span> بازی تصادفی
        </button>
      </section>

      <section className="hero desktop-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">بازی کن؛ هر وقت، هر جا</span>
          <h1 id="hero-title">حوصله‌ات سر رفته؟<br /><span>یه بازی انتخاب کن.</span></h1>
          <p>مجموعه‌ای از بازی‌های سبک و تک‌نفره؛ بدون دانلود جداگانه برای هر بازی.</p>
          <button className="random-button" type="button" onClick={openRandomGame} disabled={!games.length || !!loadingId}><span aria-hidden="true">✦</span> بازی تصادفی</button>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="game-tile tile-one">✳</div><div className="game-tile tile-two">◈</div><div className="game-tile tile-three">⌘</div><div className="hero-core">W</div></div>
      </section>

      <section className="recent-section mobile-section" aria-labelledby="recent-title">
        <div className="mobile-section-heading"><div><h2 id="recent-title">بازی‌های اخیر تو</h2></div></div>
        <RecentGames key={opened?.game.id || "closed"} onOpen={(id) => { const game = gameRegistry.find((item) => item.id === id); if (game) void launchGame(game); }} />
      </section>

      <section className="category-section mobile-section" aria-labelledby="category-title">
        <div className="mobile-section-heading"><div><h2 id="category-title">دسته‌بندی بازی‌ها</h2></div></div>
        <div className="category-list" role="group" aria-label="فیلتر دسته‌بندی بازی‌ها">
          {categories.map((category) => <button className={`category-chip ${activeCategory === category.id ? "is-active" : ""}`} type="button" key={category.id} aria-pressed={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}><span aria-hidden="true">{category.icon}</span>{category.label}</button>)}
        </div>
      </section>

      <section className="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div><h2 id="library-title">همه بازی‌ها</h2></div>
          <label className="search-box desktop-search"><span className="sr-only">جست‌وجوی بازی</span><span aria-hidden="true">⌕</span><input type="search" placeholder="اسم بازی رو جست‌وجو کن..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        {games.length === 0 ? <div className="empty-state"><div className="empty-icon" aria-hidden="true">◇</div><h3>{query ? "بازی‌ای پیدا نشد" : "بازی‌ای در این دسته نیست"}</h3><p>{query ? "عبارت دیگری را جست‌وجو کن." : "دسته‌بندی دیگری را انتخاب کن."}</p></div> :
          <div className="game-grid">{games.map((game) => <button className="game-card" key={game.id} type="button" onClick={() => void launchGame(game)} disabled={!!loadingId}>
            <img src={game.cover} alt="" loading="lazy" /><div><h3>{game.title}</h3><p>{loadingId === game.id ? "در حال آماده‌سازی..." : game.description}</p></div>
          </button>)}</div>}
      </section>
      <footer className="footer"><span>WARGO</span></footer>

      {opened && ActiveGame && <div className="game-overlay" role="dialog" aria-modal="true" aria-label={opened.game.title}>
        <Suspense fallback={<div className="game-loading">در حال بارگذاری بازی…</div>}>
          <ActiveGame onExit={() => setOpened(null)} />
        </Suspense>
      </div>}
    </main>
  );
}

function RecentGames({ onOpen }: { onOpen: (id: string) => void }) {
  const [ids] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("wargo:recent") || "[]"); } catch { return []; } });
  const recent = ids.map((id) => gameRegistry.find((game) => game.id === id)).filter((game): game is GameDefinition => !!game).slice(0, 3);
  if (!recent.length) return <div className="recent-empty"><span className="recent-empty-icon" aria-hidden="true">◷</span><div><strong>هنوز بازی‌ای انجام ندادی</strong><p>بعد از اولین بازی، اینجا پیداش می‌کنی.</p></div></div>;
  return <div className="recent-list">{recent.map((game) => <button type="button" className="recent-game" key={game.id} onClick={() => onOpen(game.id)}><img src={game.cover} alt="" /><span>{game.title}</span><b>›</b></button>)}</div>;
}
