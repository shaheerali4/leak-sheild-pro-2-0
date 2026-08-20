import { useCallback, useEffect, useRef, useState } from "react";
import { clientSessionId, createScan, getScan, listScans } from "./api";
import EnterpriseShell from "./components/EnterpriseShell";
import AdminPortal from "./components/AdminPortal";
import {
  AssetsView, CveView, DashboardView, FindingsView, HelpView, HistoryView,
  IntegrationsView, ReportsView, ScanView, SettingsView
} from "./components/PlatformViews";

const DEFAULT_INPUT = `# Paste code, configuration, or deployment logs here.
# Sensitive values are redacted in LeakShield reports.

service_name=public-demo
environment=review
scan_target=https://example.com`;
const MAX_FOLDER_FILE_BYTES = 300_000;
const MAX_FOLDER_TOTAL_BYTES = 1_200_000;
const SECTION_IDS = ["dashboard", "scan", "history", "assets", "findings", "cves", "reports", "integrations", "settings", "help"];

export default function App() {
  const redirectedAdminEntry = new URLSearchParams(window.location.search).get("_ls_admin_entry") === "1";
  const isAdminEntry = window.location.pathname === "/admin=true" || redirectedAdminEntry;
  if (redirectedAdminEntry) window.history.replaceState(null, "", "/admin=true");
  return isAdminEntry ? <AdminPortal /> : <Workspace />;
}

function Workspace() {
  const [theme, setTheme] = useState(() => localStorage.getItem("leakshield.theme") || "dark");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scanMode, setScanMode] = useState(() => localStorage.getItem("leakshield.defaultMode") || "website");
  const [content, setContent] = useState(DEFAULT_INPUT);
  const [sourceName, setSourceName] = useState("deployment.env");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySeverity, setHistorySeverity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSession] = useState(clientSessionId);
  const scanStateRef = useRef({ content, projectFiles, scanMode, sourceName, websiteUrl });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("leakshield.theme", theme);
  }, [theme]);

  useEffect(() => {
    scanStateRef.current = { content, projectFiles, scanMode, sourceName, websiteUrl };
    localStorage.setItem("leakshield.defaultMode", scanMode);
  }, [content, projectFiles, scanMode, sourceName, websiteUrl]);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await listScans({ q: historyQuery, riskLevel: historySeverity }));
    } catch {
      setHistory([]);
    }
  }, [historyQuery, historySeverity]);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0.08, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const navigate = useCallback((sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const runScan = useCallback(async (options = {}) => {
    setLoading(true);
    setError("");
    try {
      const current = scanStateRef.current;
      const metadata = {
        client_session_id: clientSession,
        submitted_at: new Date().toISOString(),
        assessment_profile: options.profile || "complete",
        request_rate: options.rate || "safe",
        schedule: options.schedule || "now"
      };
      const payload = current.scanMode === "website"
        ? { mode: "website", website_url: current.websiteUrl, source_name: current.websiteUrl || "website-scan", metadata }
        : current.scanMode === "project-folder"
          ? { mode: "project-folder", files: current.projectFiles, source_name: current.sourceName || "uploaded-project", metadata }
          : { mode: "text", content: current.content, source_name: current.sourceName, metadata };
      const scan = await createScan(payload);
      setResult(scan);
      await refreshHistory();
      window.setTimeout(() => navigate("dashboard"), 120);
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setLoading(false);
    }
  }, [clientSession, navigate, refreshHistory]);

  const loadScan = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try { setResult(await getScan(id)); }
    catch (scanError) { setError(scanError.message); }
    finally { setLoading(false); }
  }, []);

  const handleFolderUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    let selectedBytes = 0;
    const readable = files
      .filter((file) => !file.name.match(/\.(png|jpe?g|gif|webp|ico|pdf|zip|exe|dll|woff2?|ttf|mp4|mp3)$/i))
      .slice(0, 80)
      .filter((file) => {
        if (file.size > MAX_FOLDER_FILE_BYTES || selectedBytes + file.size > MAX_FOLDER_TOTAL_BYTES) return false;
        selectedBytes += file.size;
        return true;
      });
    if (readable.length < files.length) setError("Some binary or oversized files were skipped for safe processing.");
    const loaded = await Promise.all(readable.map(async (file) => ({
      path: file.webkitRelativePath || file.name, size: file.size, content: await file.text()
    })));
    setProjectFiles(loaded);
    setSourceName(files[0]?.webkitRelativePath?.split("/")[0] || "uploaded-project");
  }, []);

  const toggleTheme = () => setTheme((value) => value === "dark" ? "light" : "dark");

  return (
    <EnterpriseShell activeView={activeSection} loading={loading} mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen} onNavigate={navigate}
      onToggleSidebar={() => setSidebarCollapsed((value) => !value)} onToggleTheme={toggleTheme}
      result={result} sidebarCollapsed={sidebarCollapsed} theme={theme}>
      <WorkspaceSection id="dashboard" code="00" title="Command Center" summary="Live posture, verified evidence, and your next defensive move.">
        <DashboardView history={history} onLoadScan={loadScan} onNavigate={navigate} result={result} />
      </WorkspaceSection>
      <WorkspaceSection id="scan" code="01" title="Initialize Scan" summary="Acquire a public target, project, or configuration without invasive payloads.">
        <ScanView content={content} error={error} handleFolderUpload={handleFolderUpload} loading={loading}
          onScan={runScan} projectFiles={projectFiles} scanMode={scanMode} setContent={setContent}
          setScanMode={setScanMode} setSourceName={setSourceName} setWebsiteUrl={setWebsiteUrl}
          sourceName={sourceName} websiteUrl={websiteUrl} />
      </WorkspaceSection>
      <WorkspaceSection id="history" code="02" title="Operation Log" summary="Reopen previous assessments and compare security posture over time.">
        <HistoryView history={history} loadScan={loadScan} query={historyQuery} riskFilter={historySeverity}
          setQuery={setHistoryQuery} setRiskFilter={setHistorySeverity} onNavigate={navigate} />
      </WorkspaceSection>
      <WorkspaceSection id="assets" code="03" title="Surface Map" summary="Every public endpoint, technology, subdomain, certificate, and network signal."><AssetsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="findings" code="04" title="Exposure Registry" summary="Grouped vulnerabilities with exact evidence and developer-ready fixes."><FindingsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="cves" code="05" title="CVE Intelligence" summary="Official NVD correlations shown only when an exact software version is observable."><CveView result={result} /></WorkspaceSection>
      <WorkspaceSection id="reports" code="06" title="Report Vault" summary="Export executive and technical evidence without exposing secret values."><ReportsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="integrations" code="07" title="Data Uplinks" summary="Transparent, free intelligence sources powering the assessment engine."><IntegrationsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="settings" code="08" title="Console Configuration" summary="Tune this local operator display and scan defaults."><SettingsView theme={theme} onToggleTheme={toggleTheme} /></WorkspaceSection>
      <WorkspaceSection id="help" code="09" title="Field Manual" summary="Searchable beginner-friendly security knowledge grounded in official sources."><HelpView /></WorkspaceSection>
    </EnterpriseShell>
  );
}

function WorkspaceSection({ children, code, id, summary, title }) {
  return <section className="workspace-section" id={id} data-module={code}>
    <header className="section-heading"><span>{code}</span><div><p>MODULE_{code}</p><h2>{title}</h2><small>{summary}</small></div></header>
    {children}
  </section>;
}
