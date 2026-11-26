import { useMemo, useState } from "react";
import { gameRegistry } from "./games/registry";
import type { GameCategory } from "./types/game";

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

  const games = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fa");
    return gameRegistry.filter((game) => {
      const matchesQuery = !normalizedQuery ||
        `${game.title} ${game.description}`.toLocaleLowerCase("fa").includes(normalizedQuery);
      const matchesCategory = activeCategory === "all" || game.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  function openRandomGame() {
    if (games.length === 0) return;
    const selected = games[Math.floor(Math.random() * games.length)];
    window.dispatchEvent(new CustomEvent("wargo:request-game", {
      detail: { gameId: selected.id },
    }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="صفحه اصلی WARGO">
          <span className="brand-mark">W</span>
          <span>WARGO</span>
        </a>
        <span className="topbar-caption">دنیای بازی‌های کوچک، سرگرمی‌های بزرگ</span>
      </header>

      <section className="mobile-home" aria-label="پیدا کردن بازی">
        <div className="mobile-welcome">
          <h1>چه بازی‌ای <span>انجام بدیم؟</span></h1>
        </div>
        <label className="search-box mobile-search">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">جست‌وجوی بازی</span>
          <input
            type="search"
            placeholder="اسم بازی رو جست‌وجو کن..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="random-button mobile-random" type="button" onClick={openRandomGame} disabled={games.length === 0}>
          <span aria-hidden="true">✦</span>
          بازی تصادفی
        </button>
      </section>

      <section className="hero desktop-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">بازی کن؛ هر وقت، هر جا</span>
          <h1 id="hero-title">حوصله‌ات سر رفته؟<br /><span>یه بازی انتخاب کن.</span></h1>
          <p>مجموعه‌ای از بازی‌های سبک و تک‌نفره؛ بدون دانلود جداگانه برای هر بازی.</p>
          <button className="random-button" type="button" onClick={openRandomGame} disabled={games.length === 0}>
            <span aria-hidden="true">✦</span>
            بازی تصادفی
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="game-tile tile-one">✳</div>
          <div className="game-tile tile-two">◈</div>
          <div className="game-tile tile-three">⌘</div>
          <div className="hero-core">W</div>
        </div>
      </section>

      <section className="recent-section mobile-section" aria-labelledby="recent-title">
        <div className="mobile-section-heading">
          <div>
            <h2 id="recent-title">بازی‌های اخیر تو</h2>
          </div>
        </div>
        <div className="recent-empty">
          <span className="recent-empty-icon" aria-hidden="true">◷</span>
          <div>
            <strong>هنوز بازی‌ای انجام ندادی</strong>
            <p>بعد از اولین بازی، اینجا پیداش می‌کنی.</p>
          </div>
        </div>
      </section>

      <section className="category-section mobile-section" aria-labelledby="category-title">
        <div className="mobile-section-heading">
          <div>
            <h2 id="category-title">دسته‌بندی بازی‌ها</h2>
          </div>
        </div>
        <div className="category-list" role="group" aria-label="فیلتر دسته‌بندی بازی‌ها">
          {categories.map((category) => (
            <button
              className={`category-chip ${activeCategory === category.id ? "is-active" : ""}`}
              type="button"
              key={category.id}
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <h2 id="library-title">همه بازی‌ها</h2>
          </div>
          <label className="search-box desktop-search">
            <span className="sr-only">جست‌وجوی بازی</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="اسم بازی رو جست‌وجو کن..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">◇</div>
            <h3>{query ? "بازی‌ای پیدا نشد" : activeCategory !== "all" ? "هنوز بازی‌ای در این دسته نیست" : "اولین بازی‌ها به‌زودی می‌رسند"}</h3>
            <p>
              {query
                ? "عبارت دیگری را جست‌وجو کن."
                : "کتابخانه هنوز خالی است؛ به‌محض اضافه‌شدن بازی‌ها، از همین‌جا می‌تونی شروع کنی."}
            </p>
          </div>
        ) : (
          <div className="game-grid">
            {games.map((game) => (
              <article className="game-card" key={game.id}>
                <img src={game.cover} alt="" loading="lazy" />
                <div>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <span>WARGO</span>
      </footer>
    </main>
  );
}
