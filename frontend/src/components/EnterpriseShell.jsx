import {
  BookOpen,
  Boxes,
  CircleHelp,
  DatabaseZap,
  FileClock,
  FileSearch,
  Gauge,
  History,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  Plus,
  ScanLine,
  Settings,
  ShieldCheck,
  SunMoon,
  X
} from "lucide-react";

const primaryNavigation = [
  { id: "dashboard", label: "Command Center", code: "00", icon: Gauge },
  { id: "scan", label: "Initialize Scan", code: "01", icon: ScanLine, accent: true },
  { id: "history", label: "Operation Log", code: "02", icon: History },
  { id: "assets", label: "Surface Map", code: "03", icon: Boxes },
  { id: "findings", label: "Exposures", code: "04", icon: FileSearch },
  { id: "cves", label: "CVE Intel", code: "05", icon: DatabaseZap },
  { id: "reports", label: "Report Vault", code: "06", icon: FileClock }
];

const secondaryNavigation = [
  { id: "integrations", label: "Data Uplinks", code: "07", icon: PlugZap },
  { id: "settings", label: "Console Config", code: "08", icon: Settings },
  { id: "help", label: "Field Manual", code: "09", icon: CircleHelp }
];

const viewTitles = {
  dashboard: ["00", "Command Center", "Live posture and attack-surface telemetry."],
  scan: ["01", "Initialize Scan", "Configure a bounded reconnaissance operation."],
  history: ["02", "Operation Log", "Replay previous assessments and risk changes."],
  assets: ["03", "Surface Map", "Inspect every public route, host and technology signal."],
  findings: ["04", "Exposure Registry", "Exact evidence, impact and remediation intelligence."],
  cves: ["05", "CVE Intelligence", "Official correlations for observed software versions."],
  reports: ["06", "Report Vault", "Package assessment evidence for technical and executive review."],
  integrations: ["07", "Data Uplinks", "Free public intelligence sources connected to the engine."],
  settings: ["08", "Console Configuration", "Tune the local operator workspace."],
  help: ["09", "Field Manual", "Learn the weakness, the impact and the defensive response."]
};

export default function EnterpriseShell({
  activeView,
  children,
  loading,
  mobileOpen,
  onMobileOpenChange,
  onNavigate,
  onToggleSidebar,
  onToggleTheme,
  result,
  sidebarCollapsed,
  theme
}) {
  const [moduleCode, title, description] = viewTitles[activeView] || viewTitles.dashboard;

  function navigate(view) {
    onNavigate(view);
    onMobileOpenChange(false);
  }

  return (
    <div className={`app-frame ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="console-grid" aria-hidden="true" />
      <div className="console-grain" aria-hidden="true" />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} />}
      <aside className={`app-sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="brand-row">
          <BrandMark />
          <button className="icon-button desktop-only" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button className="icon-button mobile-only" onClick={() => onMobileOpenChange(false)} aria-label="Close navigation"><X /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <NavItems items={primaryNavigation} activeView={activeView} onNavigate={navigate} />
          <div className="nav-divider" />
          <NavItems items={secondaryNavigation} activeView={activeView} onNavigate={navigate} />
        </nav>

        <div className="sidebar-foot">
          <div className="workspace-health">
            <span className="status-dot status-good" />
            <span><strong>ENGINE // ONLINE</strong><small>passive mode · no paid APIs</small></span>
          </div>
          <a className="admin-link" href="/admin"><ShieldCheck /> <span>ROOT ACCESS</span></a>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => onMobileOpenChange(true)} aria-label="Open navigation"><Menu /></button>
            <div className="workspace-switcher">
              <span className="workspace-avatar">#</span>
              <span><strong>root@leakshield</strong><small>:~/blacksite/{activeView}</small></span>
            </div>
          </div>
          <div className="topbar-actions">
            <div className={`system-status ${loading ? "status-running" : ""}`}>
              <span />{loading ? "OPERATION ACTIVE" : "NODE 01 // SECURE"}
            </div>
            <button className="icon-button" onClick={() => navigate("help")} aria-label="Open help"><BookOpen /></button>
            <button className="icon-button" onClick={onToggleTheme} aria-label="Switch console phosphor profile"><SunMoon /></button>
            <div className="user-avatar" aria-label="LeakShield operator">OP</div>
          </div>
        </header>

        <main className="workspace-main" id="main-content">
          <header className="page-heading">
            <div><p>MODULE_{moduleCode} // LEAKSHIELD_BLACKSITE</p><h1>{title}</h1><span>{description}</span></div>
            {activeView !== "scan" && (
              <button className="primary-button" onClick={() => navigate("scan")}><Plus /> EXECUTE SCAN</button>
            )}
          </header>
          {result && activeView !== "scan" && (
            <div className="active-assessment" role="status">
              <span className="status-dot status-good" />
              <strong>ACTIVE_TARGET</strong>
              <span>{result.source_name}</span>
              <small>[ {result.finding_count} FINDING{result.finding_count === 1 ? "" : "S"} ]</small>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItems({ activeView, items, onNavigate }) {
  return items.map(({ accent, code, icon: Icon, id, label }) => (
    <button
      className={`${activeView === id ? "nav-item-active" : ""} ${accent ? "nav-item-accent" : ""}`}
      key={id}
      onClick={() => onNavigate(id)}
      title={label}
      type="button"
    >
      <Icon />
      <small>{code}</small>
      <span>{label}</span>
    </button>
  ));
}

export function BrandMark() {
  return (
    <a className="brand" href="/" aria-label="LeakShield Pro home">
      <span className="brand-shield"><ShieldCheck /></span>
      <span><strong>LEAK//SHIELD</strong><small>BLACKSITE</small></span>
    </a>
  );
}
