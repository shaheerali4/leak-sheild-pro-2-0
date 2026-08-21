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
const SECTION_IDS = ["scan", "dashboard", "findings", "assets", "history", "cves", "reports", "integrations", "settings", "help"];

export default function App() {
  const redirectedAdminEntry = new URLSearchParams(window.location.search).get("_ls_admin_entry") === "1";
  const isAdminEntry = window.location.pathname === "/admin=true" || redirectedAdminEntry;
  if (redirectedAdminEntry) window.history.replaceState(null, "", "/admin=true");
  return isAdminEntry ? <AdminPortal /> : <Workspace />;
}

function Workspace() {
  const [showBoot, setShowBoot] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("leakshield.theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const [activeSection, setActiveSection] = useState("scan");
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
      <WorkspaceSection id="scan" code="Assessment" title="Start a security assessment" summary="Review a public website, configuration, or project folder using safe and non-invasive checks.">
        <ScanView content={content} error={error} handleFolderUpload={handleFolderUpload} loading={loading}
          onScan={runScan} projectFiles={projectFiles} scanMode={scanMode} setContent={setContent}
          setScanMode={setScanMode} setSourceName={setSourceName} setWebsiteUrl={setWebsiteUrl}
          sourceName={sourceName} websiteUrl={websiteUrl} />
      </WorkspaceSection>
      <WorkspaceSection id="dashboard" code="Overview" title="Security posture" summary="A clear summary of verified evidence, coverage, and the next remediation priorities.">
        <DashboardView history={history} onLoadScan={loadScan} onNavigate={navigate} result={result} />
      </WorkspaceSection>
      <WorkspaceSection id="findings" code="Findings" title="Verified findings" summary="Related issues are grouped together, with exact evidence and practical fixes shown beside them."><FindingsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="assets" code="Assets" title="Public attack surface" summary="Review discovered endpoints, technologies, subdomains, certificates, and network signals."><AssetsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="history" code="History" title="Assessment history" summary="Reopen previous assessments and compare security posture over time.">
        <HistoryView history={history} loadScan={loadScan} query={historyQuery} riskFilter={historySeverity}
          setQuery={setHistoryQuery} setRiskFilter={setHistorySeverity} onNavigate={navigate} />
      </WorkspaceSection>
      <WorkspaceSection id="cves" code="Intelligence" title="CVE intelligence" summary="Official NVD correlations are shown only when an exact software version is observable."><CveView result={result} /></WorkspaceSection>
      <WorkspaceSection id="reports" code="Reports" title="Export reports" summary="Create executive and technical reports without exposing secret values."><ReportsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="integrations" code="Sources" title="Free data sources" summary="Transparent public and open-source intelligence powering every assessment."><IntegrationsView result={result} /></WorkspaceSection>
      <WorkspaceSection id="settings" code="Preferences" title="Workspace settings" summary="Choose your appearance and local assessment defaults."><SettingsView theme={theme} onToggleTheme={toggleTheme} /></WorkspaceSection>
      <WorkspaceSection id="help" code="Knowledge" title="Security knowledge base" summary="Beginner-friendly guidance grounded in official security references."><HelpView /></WorkspaceSection>
    </EnterpriseShell>
    </>
  );
}

function WorkspaceSection({ children, code, id, summary, title }) {
  return <section className="workspace-section" id={id}>
    <header className="section-heading"><p>{code}</p><h2>{title}</h2><small>{summary}</small></header>
    {children}
  </section>;
}
