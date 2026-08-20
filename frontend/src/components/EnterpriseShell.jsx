import { useEffect, useState } from "react";
import {
  BookOpen, Boxes, CircleHelp, DatabaseZap, FileClock, FileSearch, Gauge, History,
  Menu, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, PlugZap, ScanLine,
  Settings, ShieldCheck, SunMoon, X
} from "lucide-react";

const navigation = [
  { id: "dashboard", label: "Command Center", code: "00", icon: Gauge },
  { id: "scan", label: "Initialize Scan", code: "01", icon: ScanLine, accent: true },
  { id: "history", label: "Operation Log", code: "02", icon: History },
  { id: "assets", label: "Surface Map", code: "03", icon: Boxes },
  { id: "findings", label: "Exposures", code: "04", icon: FileSearch },
  { id: "cves", label: "CVE Intel", code: "05", icon: DatabaseZap },
  { id: "reports", label: "Report Vault", code: "06", icon: FileClock },
  { id: "integrations", label: "Data Uplinks", code: "07", icon: PlugZap },
  { id: "settings", label: "Console Config", code: "08", icon: Settings },
  { id: "help", label: "Field Manual", code: "09", icon: CircleHelp }
];

export default function EnterpriseShell({ activeView, children, loading, mobileOpen, onMobileOpenChange, onNavigate, onToggleSidebar, onToggleTheme, result, sidebarCollapsed }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function navigate(id) {
    onNavigate(id);
    onMobileOpenChange(false);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by browser or device policy.
    }
  }

  return <div className={`app-frame ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <div className="console-grid" aria-hidden="true" />
    <div className="console-grain" aria-hidden="true" />
    <a className="skip-link" href="#dashboard">Skip to command center</a>
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} />}
    <aside className={`app-sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
      <div className="brand-row"><BrandMark /><button className="icon-button desktop-only" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button><button className="icon-button mobile-only" onClick={() => onMobileOpenChange(false)} aria-label="Close navigation"><X /></button></div>
      <div className="rail-label">OPERATION MODULES</div>
      <nav className="sidebar-nav" aria-label="Workspace sections">{navigation.map(({ accent, code, icon: Icon, id, label }) => <button className={`${activeView === id ? "nav-item-active" : ""} ${accent ? "nav-item-accent" : ""}`} key={id} onClick={() => navigate(id)} title={label}><Icon /><small>{code}</small><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><div className="workspace-health"><span className={`status-dot ${loading ? "status-running" : "status-good"}`} /><span><strong>{loading ? "ENGINE // ACTIVE" : "ENGINE // ONLINE"}</strong><small>passive mode // free intel</small></span></div><div className="rail-signature">LS-2.0 // OPEN DEFENSE</div></div>
    </aside>

    <div className="app-workspace">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-only" onClick={() => onMobileOpenChange(true)} aria-label="Open navigation"><Menu /></button><div className="workspace-switcher"><span className="workspace-avatar">#</span><span><strong>root@leakshield</strong><small>:~/ops/{activeView}</small></span></div></div>
        <div className="topbar-center"><span>PUBLIC DEFENSE NODE</span><i /> <b>{result?.source_name || "NO TARGET LOCKED"}</b></div>
        <div className="topbar-actions"><div className={`system-status ${loading ? "status-running" : ""}`}><span />{loading ? "OPERATION ACTIVE" : "NODE 01 // SECURE"}</div><button className="icon-button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{isFullscreen ? <Minimize2 /> : <Maximize2 />}</button><button className="icon-button" onClick={() => navigate("help")} aria-label="Open field manual"><BookOpen /></button><button className="icon-button" onClick={onToggleTheme} aria-label="Switch color profile"><SunMoon /></button></div>
      </header>
      <main className="workspace-main" id="main-content">{children}<footer className="site-footer"><span>LEAK//SHIELD PRO 2.0</span><p>Enterprise-quality cybersecurity for everyone, completely free.</p><b>END OF OPERATIONS WALL // 10 MODULES ONLINE</b></footer></main>
    </div>
  </div>;
}

export function BrandMark() {
  return <a className="brand" href="#dashboard" aria-label="LeakShield Pro command center"><span className="brand-shield"><ShieldCheck /></span><span><strong>LEAK//SHIELD</strong><small>PRO 2.0</small></span></a>;
}
