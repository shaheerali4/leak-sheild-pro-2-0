import { useEffect } from "react";
import {
  BookOpen, Boxes, ChevronDown, DatabaseZap, FileClock, FileSearch, Gauge,
  History, Menu, Moon, PlugZap, ScanLine, Settings, ShieldCheck, Sun, X
} from "lucide-react";

const primaryNavigation = [
  { id: "scan", label: "Assessment", icon: ScanLine },
  { id: "dashboard", label: "Overview", icon: Gauge },
  { id: "findings", label: "Findings", icon: FileSearch },
  { id: "assets", label: "Assets", icon: Boxes },
  { id: "history", label: "History", icon: History },
  { id: "reports", label: "Reports", icon: FileClock },
  { id: "help", label: "Knowledge", icon: BookOpen }
];

const secondaryNavigation = [
  { id: "cves", label: "CVE intelligence", icon: DatabaseZap },
  { id: "integrations", label: "Data sources", icon: PlugZap },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function EnterpriseShell({
  activeView,
  children,
  loading,
  mobileOpen,
  onMobileOpenChange,
  onNavigate,
  onToggleTheme,
  result,
  theme
}) {
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onMobileOpenChange(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onMobileOpenChange]);

  function navigate(id) {
    onNavigate(id);
    onMobileOpenChange(false);
  }

  const allNavigation = [...primaryNavigation, ...secondaryNavigation];

  return <div className="app-frame">
    <a className="skip-link" href="#scan">Skip to assessment</a>
    <header className="topbar">
      <BrandMark onNavigate={() => navigate("scan")} />
      <nav className="top-navigation" aria-label="Primary navigation">
        {primaryNavigation.map(({ id, label }) => (
          <button className={activeView === id ? "active" : ""} key={id} onClick={() => navigate(id)}>{label}</button>
        ))}
        <details className="more-navigation">
          <summary>More <ChevronDown /></summary>
          <div>
            {secondaryNavigation.map(({ icon: Icon, id, label }) => (
              <button key={id} onClick={() => navigate(id)}><Icon />{label}</button>
            ))}
          </div>
        </details>
      </nav>
      <div className="topbar-actions">
        <span className={`system-status ${loading ? "status-running" : ""}`}><span />{loading ? "Scanning" : "Engine ready"}</span>
        <button className="theme-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
        <button className="mobile-nav-toggle" onClick={() => onMobileOpenChange(true)} aria-label="Open navigation"><Menu /></button>
      </div>
    </header>

    {mobileOpen && <div className="mobile-navigation-layer">
      <button className="mobile-navigation-scrim" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} />
      <aside className="mobile-navigation" aria-label="Mobile navigation">
        <header><BrandMark onNavigate={() => navigate("scan")} /><button className="icon-button" onClick={() => onMobileOpenChange(false)} aria-label="Close navigation"><X /></button></header>
        <nav>
          {allNavigation.map(({ icon: Icon, id, label }) => (
            <button className={activeView === id ? "active" : ""} key={id} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>
          ))}
        </nav>
        <div className="mobile-nav-status"><ShieldCheck /><span><strong>Passive assessment engine</strong><small>Free, public intelligence only</small></span></div>
      </aside>
    </div>}

    <div className="app-workspace">
      <main className="workspace-main" id="main-content">
        {children}
        <footer className="site-footer">
          <BrandMark onNavigate={() => navigate("scan")} />
          <p>Enterprise-quality cybersecurity for everyone, completely free.</p>
          <span>{result?.source_name ? `Active assessment: ${result.source_name}` : "Ready for your first assessment"}</span>
        </footer>
      </main>
    </div>
  </div>;
}

export function BrandMark({ onNavigate }) {
  return <button className="brand" onClick={onNavigate} aria-label="LeakShield Pro assessment">
    <span className="brand-shield"><ShieldCheck /></span>
    <span><strong>LeakShield Pro</strong><small>Open security platform</small></span>
  </button>;
}
