import { useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import PillNav from "./components/PillNav.jsx";
import { BriefPage } from "./pages/BriefPage.jsx";
import { ConversationPage } from "./pages/ConversationPage.jsx";
import { ConversationsPage } from "./pages/ConversationsPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { DataPage } from "./pages/DataPage.jsx";
import { useHideOnScroll } from "./hooks/useHideOnScroll.js";
import { useAppStore } from "./store/AppStore.jsx";
import styles from "./App.module.css";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "Conversations", href: "/conversations" },
  { label: "Manager brief", href: "/brief" },
  { label: "Data & export", href: "/data" },
];

// PillNav's colours mapped to the design tokens; its own shadows and gradients are switched off.
const PILL_NAV_TOKENS = {
  "--pn-surface": "var(--surface)",
  "--pn-solid": "var(--surface)",
  "--pn-edge": "var(--line-soft)",
  "--pn-rim": "transparent",
  "--pn-shadow": "none",
  "--pn-blur": "none",
  "--pn-text": "var(--ink-muted)",
  "--pn-strong": "var(--ink)",
  "--pn-pill": "var(--accent)",
  "--pn-pill-ink": "var(--accent-ink)",
  "--pn-pill-shadow": "none",
  "--pn-dot": "var(--accent)",
  "--pn-ring": "var(--focus)",
  "--pn-row-hover": "var(--surface-2)",
  "--pn-tile": "var(--surface)",
  "--pn-tile-rim": "inset 0 0 0 1px var(--line-soft)",
};

// PillNav renders links with an href; route them through React Router so pages don't reload.
function RouterLink({ href, ...props }) {
  return <Link to={href} {...props} />;
}

// The nav item for the current page: exact match for the dashboard, prefix match for the rest
// (so a conversation's detail page keeps "Conversations" active).
function activeNavHref(pathname) {
  if (pathname === "/") return "/";
  return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.href;
}

// Light/dark toggle; the choice is remembered (DESIGN.md §2).
function ModeToggle() {
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.mode === "dark");

  const toggle = () => {
    const next = !isDark;
    if (next) document.documentElement.dataset.mode = "dark";
    else delete document.documentElement.dataset.mode;
    try {
      localStorage.setItem("revenue-inbox/mode", next ? "dark" : "light");
    } catch {
      // storage blocked: the toggle still works for this visit
    }
    setIsDark(next);
  };

  // Phones show the words; desktop shows a round sun/moon button (the words stay for screen readers).
  return (
    <button type="button" className={`btn btn-ghost btn-sm ${styles.modeToggle}`} aria-pressed={isDark} onClick={toggle}>
      <svg className={styles.modeIcon} viewBox="0 0 24 24" aria-hidden="true">
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
      <span className={styles.modeText}>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export function App() {
  const { workspace } = useAppStore();
  const { pathname } = useLocation();
  const [navHidden, setNavHidden, scrolled] = useHideOnScroll(80);
  const withText = workspace.records.filter((record) => record.hasUsableText).length;

  return (
    <>
      <a href="#main" className={`btn btn-secondary btn-sm ${styles.skipLink}`}>
        Skip to content
      </a>
      <header
        className={`nav ${styles.nav} ${navHidden ? styles.navHidden : ""}`}
        onFocus={() => setNavHidden(false)} // keyboard users always see where focus is
      >
        {/* Desktop has no bar behind the nav, so the brand fades out once the page scrolls under it. */}
        <Link className={`nav-brand ${scrolled ? styles.brandAway : ""}`} to="/">
          RevenueForce
        </Link>
        <div className={styles.pillNavSlot}>
          <PillNav
            items={NAV_ITEMS}
            activeHref={activeNavHref(pathname)}
            linkComponent={RouterLink}
            itemStyle="pill"
            hoverEffect="fill"
            indicator="dot"
            surface="solid"
            ariaLabel="Main"
            style={PILL_NAV_TOKENS}
          />
        </div>
        <div className={`row ${styles.statusRow}`}>
          <span className={`small muted ${styles.recordCount}`}>
            {workspace.records.length ? `${workspace.records.length} records · ${withText} with text` : "No data imported"}
          </span>
          <ModeToggle />
        </div>
      </header>

      <main id="main" className={`container ${styles.main}`}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/conversations/:sourceType/:sourceId" element={<ConversationPage />} />
          <Route path="/brief" element={<BriefPage />} />
          <Route path="/data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
