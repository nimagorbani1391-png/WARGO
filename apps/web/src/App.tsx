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
  const [loadError, setLoadError] = useState<string | null>(null);\n  const [contestOpen, setContestOpen] = useState(false);\n  const [contestEmail, setContestEmail] = useState("");\n  const [contestPreview, setContestPreview] = useState(false);

  const games = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fa");
    return gameRegistry.filter((game) => {
      const matchesQuery = !normalizedQuery || `${game.title} ${game.description}`.toLocaleLowerCase("fa").includes(normalizedQuery);
      return matchesQuery && (activeCategory === "all" || game.category === activeCategory);
    });
  }, [query, activeCategory]);

  async function launchGame(game: GameDefinition) {
    if (loadingId) return;
    setLoadError(null);
    setLoadingId(game.id);
    try {
      const module = await game.load();
      setOpened({ game, View: module.default });
      try {
        const previous = JSON.parse(localStorage.getItem("wargo:recent") || "[]") as string[];
        localStorage.setItem("wargo:recent", JSON.stringify([game.id, ...previous.filter((id) => id !== game.id)].slice(0, 5)));
      } catch { /* Storage is optional; games remain playable without it. */ }
    } catch (error) {
      console.error(`WARGO: failed to load game "${game.id}"`, error);
      setLoadError("بارگذاری بازی ناموفق بود. اتصال اینترنت را بررسی کن و دوباره تلاش کن.");
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

      <section className="contest-section" aria-labelledby="contest-title">
        <div className="contest-card">
          <div className="contest-copy">
            <div className="contest-kicker"><span className="contest-live-dot" /> رقابت ویژه WARGO</div>
            <h2 id="contest-title">۱۰ روز فرصت داری؛<br /><span>برای یک جایزه واقعی بجنگ!</span></h2>
            <p className="contest-lead">بازی کن، امتیاز جمع کن و خودت رو به صدر برسون. اولین نفری که به هدف یک‌میلیونی برسه، برنده مسابقه‌ست.</p>
            <div className="contest-facts">
              <div><span className="contest-fact-icon">◷</span><span><b>۱۰ روز</b><small>مدت رقابت</small></span></div>
              <div><span className="contest-fact-icon">♛</span><span><b>فقط ۱ نفر</b><small>برنده نهایی</small></span></div>
              <div><span className="contest-fact-icon">▤</span><span><b>اینترنت هدیه</b><small>جایزه مسابقه</small></span></div>
            </div>
            <button className="contest-cta" type="button" onClick={() => { setContestPreview(false); setContestOpen(true); }}>
              ورود به مسابقه <span aria-hidden="true">←</span>
            </button>
            <div className="contest-note">قوانین و شرایط پیش از شروع رسمی نمایش داده می‌شوند.</div>
          </div>
          <div className="contest-visual" aria-hidden="true">
            <div className="contest-orbit contest-orbit-a" /><div className="contest-orbit contest-orbit-b" />
            <div className="contest-trophy">♛</div>
            <div className="contest-target"><small>هدف مسابقه</small><strong>۱,۰۰۰,۰۰۰</strong><span>امتیاز</span></div>
            <div className="contest-spark spark-a">✦</div><div className="contest-spark spark-b">✧</div><div className="contest-spark spark-c">✦</div>
          </div>
        </div>
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
        {loadError && <div className="game-load-error" role="alert">{loadError}</div>}
        {games.length === 0 ? <div className="empty-state"><div className="empty-icon" aria-hidden="true">◇</div><h3>{query ? "بازی‌ای پیدا نشد" : "بازی‌ای در این دسته نیست"}</h3><p>{query ? "عبارت دیگری را جست‌وجو کن." : "دسته‌بندی دیگری را انتخاب کن."}</p></div> :
          <div className="game-grid">{games.map((game) => <button className="game-card" key={game.id} type="button" onClick={() => void launchGame(game)} disabled={!!loadingId}>
            <img src={game.cover} alt="" loading="lazy" /><div><h3>{game.title}</h3><p>{loadingId === game.id ? "در حال آماده‌سازی..." : game.description}</p></div>
          </button>)}</div>}
      </section>
      <footer className="footer"><span>WARGO</span></footer>

      {contestOpen && <div className="contest-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setContestOpen(false); }}>
        <section className="contest-modal" role="dialog" aria-modal="true" aria-labelledby="contest-modal-title" dir="rtl">
          <button className="contest-modal-close" type="button" onClick={() => setContestOpen(false)} aria-label="بستن">×</button>
          {!contestPreview ? <>
            <div className="contest-modal-emblem">♛</div>
            <span className="contest-modal-kicker">یک قدم تا شروع رقابت</span>
            <h2 id="contest-modal-title">آماده‌ای وارد رقابت بشی؟</h2>
            <p>برای ادامه، ایمیلت رو وارد کن. ثبت‌نام نهایی بعد از فعال‌شدن زیرساخت مسابقه انجام می‌شه.</p>
            <form className="contest-email-form" onSubmit={(event) => { event.preventDefault(); setContestPreview(true); }}>
              <label htmlFor="contest-email">آدرس ایمیل</label>
              <input id="contest-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={contestEmail} onChange={(event) => setContestEmail(event.target.value)} required />
              <button className="contest-cta" type="submit">ادامه <span aria-hidden="true">←</span></button>
            </form>
            <small className="contest-privacy">فعلاً این فرم نمایشی است؛ ایمیل ذخیره یا ارسال نمی‌شود.</small>
          </> : <>
            <div className="contest-modal-emblem">✓</div>
            <span className="contest-modal-kicker">پیش‌نمایش فرم</span>
            <h2 id="contest-modal-title">ظاهر ثبت‌نام آماده‌ست!</h2>
            <p>اتصال ثبت‌نام واقعی به سرور هنوز انجام نشده؛ ایمیل <bdi>{contestEmail}</bdi> در جایی ذخیره نشده است.</p>
            <button className="contest-cta" type="button" onClick={() => { setContestOpen(false); setContestEmail(""); }}>متوجه شدم</button>
          </>}
        </section>
      </div>}
\n      {opened && ActiveGame && <div className="game-overlay" role="dialog" aria-modal="true" aria-label={opened.game.title}>
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
