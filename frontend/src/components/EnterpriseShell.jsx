import { useEffect } from "react";
import {
  Activity, BookOpen, Boxes, ChevronDown, DatabaseZap, FileClock, FileSearch,
  Fingerprint, Gauge, History, Menu, Moon, PlugZap, ScanLine, Settings,
  ShieldAlert, ShieldCheck, Sun, X
} from "lucide-react";

const primaryNavigation = [
  { id: "dashboard", label: "Console", icon: Gauge },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "findings", label: "Findings", icon: FileSearch },
  { id: "assets", label: "Surface", icon: Boxes },
  { id: "reports", label: "Reports", icon: FileClock },
  { id: "help", label: "Intel", icon: BookOpen }
];

const secondaryNavigation = [
  { id: "history", label: "Mission archive", icon: History },
  { id: "cves", label: "CVE intelligence", icon: DatabaseZap },
  { id: "integrations", label: "Data uplinks", icon: PlugZap },
  { id: "settings", label: "Console settings", icon: Settings }
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

  return <div className="app-frame orbital-console">
    <div className="orbital-grid" aria-hidden="true" />
    <div className="global-scanline" aria-hidden="true" />
    <a className="skip-link" href="#dashboard">Skip to security console</a>

    <header className="topbar mission-topbar">
      <BrandMark onNavigate={() => navigate("dashboard")} />
      <nav className="top-navigation" aria-label="Console modules">
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
        <span className="telemetry-pill telemetry-engine"><Activity /><span>Engine</span><strong>{loading ? "ACTIVE" : "ARMED"}</strong></span>
        <span className="telemetry-pill telemetry-risk"><ShieldAlert /><span>Risk</span><strong>{result?.overall_level || "STANDBY"}</strong></span>
        <button className="theme-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
        <button className="mobile-nav-toggle" onClick={() => onMobileOpenChange(true)} aria-label="Open navigation"><Menu /></button>
      </div>
    </header>

    {mobileOpen && <div className="mobile-navigation-layer">
      <button className="mobile-navigation-scrim" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} />
      <aside className="mobile-navigation" aria-label="Mobile navigation">
        <header><BrandMark onNavigate={() => navigate("dashboard")} /><button className="icon-button" onClick={() => onMobileOpenChange(false)} aria-label="Close navigation"><X /></button></header>
        <nav>
          {allNavigation.map(({ icon: Icon, id, label }) => (
            <button className={activeView === id ? "active" : ""} key={id} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>
          ))}
        </nav>
        <div className="mobile-nav-status"><ShieldCheck /><span><strong>Passive defense protocol</strong><small>No exploit payloads or paid intelligence</small></span></div>
      </aside>
    </div>}

    <div className="app-workspace">
      <main className="workspace-main" id="main-content">
        {children}
        <footer className="site-footer">
          <BrandMark onNavigate={() => navigate("dashboard")} />
          <p>Enterprise-quality cybersecurity for everyone, completely free.</p>
          <span>{result?.source_name ? `TARGET // ${result.source_name}` : "SYSTEM // AWAITING TARGET"}</span>
        </footer>
      </main>
    </div>
  </div>;
}

export function BrandMark({ onNavigate }) {
  return <button className="brand" onClick={onNavigate} aria-label="LeakShield Pro security console">
    <span className="brand-shield"><Fingerprint /></span>
    <span><small>LEAKSHIELD PRO // PUBLIC EXPOSURE AI</small><strong>Orbital Security Console</strong></span>
  </button>;
}
