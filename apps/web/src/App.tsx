import { useMemo, useState } from "react";
import { gameRegistry } from "./games/registry";

export default function App() {
  const [query, setQuery] = useState("");

  const games = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fa");
    if (!normalizedQuery) return gameRegistry;

    return gameRegistry.filter((game) =>
      `${game.title} ${game.description}`
        .toLocaleLowerCase("fa")
        .includes(normalizedQuery),
    );
  }, [query]);

  function openRandomGame() {
    if (games.length === 0) return;
    const selected = games[Math.floor(Math.random() * games.length)];
    // Game launching is intentionally added with the first playable game.
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

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">بازی کن؛ هر وقت، هر جا</span>
          <h1 id="hero-title">حوصله‌ات سر رفته؟<br /><span>یه بازی انتخاب کن.</span></h1>
          <p>مجموعه‌ای از بازی‌های سبک و تک‌نفره؛ بدون دانلود جداگانه برای هر بازی.</p>
          <button
            className="random-button"
            type="button"
            onClick={openRandomGame}
            disabled={games.length === 0}
          >
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

      <section className="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">کتابخانه WARGO</span>
            <h2 id="library-title">همه بازی‌ها</h2>
          </div>
          <label className="search-box">
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
            <h3>{query ? "بازی‌ای پیدا نشد" : "کتابخانه در حال آماده‌سازی است"}</h3>
            <p>
              {query
                ? "عبارت دیگری را جست‌وجو کن."
                : "ساختار فنی آماده است؛ اولین بازی‌ها در مرحله بعد به کتابخانه اضافه می‌شوند."}
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
        <span>بازی‌های سبک؛ تجربه‌ای روان</span>
      </footer>
    </main>
  );
}
