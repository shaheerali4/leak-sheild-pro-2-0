import {
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
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
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "scan", label: "New Scan", icon: ScanLine, accent: true },
  { id: "history", label: "Scan History", icon: History },
  { id: "assets", label: "Assets", icon: Boxes },
  { id: "findings", label: "Vulnerabilities", icon: FileSearch },
  { id: "cves", label: "CVE Database", icon: DatabaseZap },
  { id: "reports", label: "Reports", icon: FileClock }
];

const secondaryNavigation = [
  { id: "integrations", label: "Integrations", icon: PlugZap },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help & Docs", icon: CircleHelp }
];

const viewTitles = {
  dashboard: ["Security Dashboard", "A clear view of your current application risk."],
  scan: ["New Security Scan", "Configure and run a safe assessment."],
  history: ["Scan History", "Review previous assessments and compare progress."],
  assets: ["Asset Inventory", "Explore the public surface discovered by LeakShield."],
  findings: ["Vulnerabilities", "Prioritize findings and inspect exact evidence."],
  cves: ["CVE Database", "Review official matches for detected software versions."],
  reports: ["Reports", "Export assessment data for technical and executive teams."],
  integrations: ["Integrations", "See the free public sources used by the scanner."],
  settings: ["Settings", "Personalize your workspace and scan defaults."],
  help: ["Help & Documentation", "Learn how findings are detected and remediated."]
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
  const [title, description] = viewTitles[activeView] || viewTitles.dashboard;

  function navigate(view) {
    onNavigate(view);
    onMobileOpenChange(false);
  }

  return (
    <div className={`app-frame ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
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
            <span><strong>Scanner operational</strong><small>Free public sources</small></span>
          </div>
          <a className="admin-link" href="/admin"><ShieldCheck /> <span>Admin dashboard</span></a>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-only" onClick={() => onMobileOpenChange(true)} aria-label="Open navigation"><Menu /></button>
            <button className="workspace-switcher" type="button">
              <span className="workspace-avatar">LS</span>
              <span><strong>LeakShield Workspace</strong><small>Security operations</small></span>
              <ChevronDown />
            </button>
          </div>
          <div className="topbar-actions">
            <div className={`system-status ${loading ? "status-running" : ""}`}>
              <span />{loading ? "Scan running" : "Systems operational"}
            </div>
            <button className="icon-button" onClick={() => navigate("help")} aria-label="Open help"><BookOpen /></button>
            <button className="icon-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><SunMoon /></button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell /><span /></button>
            <div className="user-avatar" aria-label="LeakShield administrator">LA</div>
          </div>
        </header>

        <main className="workspace-main" id="main-content">
          <header className="page-heading">
            <div><p>LeakShield Pro</p><h1>{title}</h1><span>{description}</span></div>
            {activeView !== "scan" && (
              <button className="primary-button" onClick={() => navigate("scan")}><Plus /> New scan</button>
            )}
          </header>
          {result && activeView !== "scan" && (
            <div className="active-assessment" role="status">
              <span className="status-dot status-good" />
              <strong>Active assessment</strong>
              <span>{result.source_name}</span>
              <small>{result.finding_count} finding{result.finding_count === 1 ? "" : "s"}</small>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItems({ activeView, items, onNavigate }) {
  return items.map(({ accent, icon: Icon, id, label }) => (
    <button
      className={`${activeView === id ? "nav-item-active" : ""} ${accent ? "nav-item-accent" : ""}`}
      key={id}
      onClick={() => onNavigate(id)}
      title={label}
      type="button"
    >
      <Icon />
      <span>{label}</span>
    </button>
  ));
}

export function BrandMark() {
  return (
    <a className="brand" href="/" aria-label="LeakShield Pro home">
      <span className="brand-shield"><ShieldCheck /></span>
      <span><strong>LeakShield</strong><small>PRO</small></span>
    </a>
  );
}
