import { Suspense, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { gameRegistry } from "./games/registry";
import type { GameCategory, GameDefinition } from "./types/game";

const API_URL = "https://wargo-api.nimagorbani1391.workers.dev";
type WargoUser = { id: string; email: string; displayName: string; avatarUrl: string | null; avatarId: string | null; joinedAt: string; totalScore: number; gamesPlayed: number };

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState("بازیکن WARGO");
  const [nameDraft, setNameDraft] = useState("بازیکن WARGO");
  const [editingName, setEditingName] = useState(false);
  const [user, setUser] = useState<WargoUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    const offlinePage = `${base}offline.html`;
    const redirectToOfflineGame = () => {
      if (!window.location.pathname.endsWith("/offline.html")) {
        window.location.replace(offlinePage);
      }
    };

    window.addEventListener("offline", redirectToOfflineGame);
    if (!navigator.onLine) redirectToOfflineGame();

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
        .catch((error: unknown) => console.warn("WARGO: offline support could not be enabled", error));
    }

    return () => window.removeEventListener("offline", redirectToOfflineGame);
  }, []);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("auth") === "success") {
      currentUrl.searchParams.delete("auth");
      window.history.replaceState({}, "", currentUrl.toString());
      window.location.reload();
      return;
    }
    let active = true;
    fetch(`${API_URL}/api/me`, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("auth")))
      .then((data: { user: WargoUser | null }) => { if (active) { setUser(data.user); if (data.user?.displayName) { setDisplayName(data.user.displayName); setNameDraft(data.user.displayName); } } })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveProfile(nextName = displayName) {
    if (!user) return;
    const response = await fetch(`${API_URL}/api/profile`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: nextName.trim() }) });
    if (!response.ok) throw new Error("ذخیره پروفایل ناموفق بود");
    setUser((current) => current ? { ...current, displayName: nextName.trim() } : current);
  }

  function startGoogleLogin() { window.location.href = `${API_URL}/auth/google/start`; }
  async function logout() {
    try { await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }); } finally { setUser(null); setDisplayName("بازیکن WARGO"); setNameDraft("بازیکن WARGO"); }
  }

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
        <button className="profile-trigger" type="button" onClick={() => setProfileOpen(true)} aria-haspopup="dialog" aria-label="نمایش پروفایل کاربر">
          <span className="profile-trigger-avatar profile-trigger-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.15 0-7.5 2.12-7.5 4.75V21h15v-2.25C19.5 16.12 16.15 14 12 14Z" /></svg></span><span>پروفایل</span>
        </button>
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
        {loadError && <div className="game-load-error" role="alert">{loadError}</div>}
        {games.length === 0 ? <div className="empty-state"><div className="empty-icon" aria-hidden="true">◇</div><h3>{query ? "بازی‌ای پیدا نشد" : "بازی‌ای در این دسته نیست"}</h3><p>{query ? "عبارت دیگری را جست‌وجو کن." : "دسته‌بندی دیگری را انتخاب کن."}</p></div> :
          <div className="game-grid">{games.map((game) => <button className="game-card" key={game.id} type="button" onClick={() => void launchGame(game)} disabled={!!loadingId}>
            <img src={game.cover} alt="" loading="lazy" /><div><h3>{game.title}</h3><p>{loadingId === game.id ? "در حال آماده‌سازی..." : game.description}</p></div>
          </button>)}</div>}
      </section>
      <footer className="footer"><span>WARGO</span></footer>

      {profileOpen && <div className="profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
        <section className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title" dir="rtl">
          <button className="profile-close" type="button" onClick={() => setProfileOpen(false)} aria-label="بستن پروفایل">×</button>
          <div className="profile-panel-heading profile-simple-heading">
            <h2 id="profile-title">اطلاعات حساب</h2>
          </div>
          <div className="profile-info-list">
            <div className="profile-info-row">
              <span>نام</span>
              <div className="profile-name-row">
                {editingName ? <form className="profile-name-form" onSubmit={(event) => { event.preventDefault(); const nextName = nameDraft.trim(); if (nextName) { setDisplayName(nextName); if (user) void saveProfile(nextName).catch(() => setDisplayName(user.displayName)); setEditingName(false); } }}>
                  <input aria-label="نام نمایشی" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={24} autoFocus required />
                  <button type="submit" aria-label="ذخیره نام">✓</button>
                  <button type="button" aria-label="لغو تغییر نام" onClick={() => { setNameDraft(displayName); setEditingName(false); }}>×</button>
                </form> : <><strong>{displayName}</strong><button className="profile-name-edit" type="button" aria-label="تغییر نام کاربر" title="تغییر نام" onClick={() => { setNameDraft(displayName); setEditingName(true); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25Zm17.71-10.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66Z"/></svg></button></>}
              </div>
            </div>
            <div className="profile-info-row"><span>ایمیل</span><strong>{authLoading ? "در حال بررسی حساب..." : user ? user.email : "وارد حساب نشده‌ای"}</strong></div>
            <div className="profile-info-row"><span>تاریخ عضویت</span><strong>{user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString("fa-IR") : "—"}</strong></div>
          </div>
          {user ? <button className="profile-login-button" type="button" onClick={() => void logout()}>خروج از حساب</button> : <button className="profile-login-button" type="button" onClick={startGoogleLogin}>ورود با حساب Google</button>}
        </section>
      </div>}

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
