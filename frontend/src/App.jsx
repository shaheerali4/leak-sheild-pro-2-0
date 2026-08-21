import { useCallback, useEffect, useRef, useState } from "react";
import { clientSessionId, createScan, getScan, listScans } from "./api";
import EnterpriseShell from "./components/EnterpriseShell";
import AdminPortal from "./components/AdminPortal";
import ShieldBootSequence from "./components/ShieldBootSequence";
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
const SECTION_IDS = ["dashboard", "scan", "history", "findings", "assets", "cves", "reports", "integrations", "settings", "help"];

export default function App() {
  const redirectedAdminEntry = new URLSearchParams(window.location.search).get("_ls_admin_entry") === "1";
  const isAdminEntry = window.location.pathname === "/admin=true" || redirectedAdminEntry;
  if (redirectedAdminEntry) window.history.replaceState(null, "", "/admin=true");
  return isAdminEntry ? <AdminPortal /> : <Workspace />;
}

function Workspace() {
  const [showBoot, setShowBoot] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("leakshield.theme") || "dark");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const completeBoot = useCallback(() => {
    setShowBoot(false);
  }, []);

  useEffect(() => {
    if (!showBoot) return undefined;
    const handleEscape = (event) => { if (event.key === "Escape") completeBoot(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [completeBoot, showBoot]);

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
    <>
    {showBoot && <ShieldBootSequence onComplete={completeBoot} />}
    <EnterpriseShell activeView={activeSection} loading={loading} mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen} onNavigate={navigate} onToggleTheme={toggleTheme}
      result={result} theme={theme}>
      <WorkspaceSection id="dashboard" hideHeading>
        <DashboardView history={history} onLoadScan={loadScan} onNavigate={navigate} result={result} />
      </WorkspaceSection>
      <WorkspaceSection id="scan" hideHeading>
        <div className="ops-grid-shell">
          <ScanView content={content} error={error} handleFolderUpload={handleFolderUpload} loading={loading}
            onScan={runScan} projectFiles={projectFiles} scanMode={scanMode} setContent={setContent}
            setScanMode={setScanMode} setSourceName={setSourceName} setWebsiteUrl={setWebsiteUrl}
            sourceName={sourceName} websiteUrl={websiteUrl} />
          <div className="embedded-history" id="history">
            <header className="embedded-panel-title"><span>HIST-07</span><h2>Mission Archive</h2><p>Reopen a previous security sweep.</p></header>
            <HistoryView history={history} loadScan={loadScan} query={historyQuery} riskFilter={historySeverity}
              setQuery={setHistoryQuery} setRiskFilter={setHistorySeverity} onNavigate={navigate} />
          </div>
        </div>
      </WorkspaceSection>
      <WorkspaceSection id="findings" code="INTEL-22" title="Exposure Findings" summary="Grouped security signals with exact evidence and mission-ready remediation."><FindingsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="assets" code="SURFACE-09" title="Attack Surface" summary="Discovered endpoints, technologies, subdomains, certificates, and network signals."><AssetsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="cves" code="CVE-11" title="CVE Intelligence" summary="Official NVD correlations shown only when an exact software version is observable."><CveView result={result} /></WorkspaceSection>
      <WorkspaceSection id="reports" code="REPORT-14" title="Report Vault" summary="Export executive and technical evidence without exposing secret values."><ReportsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="integrations" code="UPLINK-04" title="Data Uplinks" summary="Transparent public and open-source intelligence powering every assessment."><IntegrationsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="settings" code="CONFIG-02" title="Console Settings" summary="Tune the display and local assessment defaults."><SettingsView theme={theme} onToggleTheme={toggleTheme} /></WorkspaceSection>
      <WorkspaceSection id="help" code="KNOW-27" title="Field Intelligence" summary="Beginner-friendly guidance grounded in official security references."><HelpView /></WorkspaceSection>
    </EnterpriseShell>
    </>
  );
}

function WorkspaceSection({ children, code, hideHeading = false, id, summary, title }) {
  return <section className="workspace-section" id={id}>
    {!hideHeading && <header className="section-heading"><p>{code}</p><h2>{title}</h2><small>{summary}</small></header>}
    {children}
  </section>;
}
