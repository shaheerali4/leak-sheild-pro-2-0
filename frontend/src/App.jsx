import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Database, Loader2, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import {
  adminLogin,
  adminLogout,
  adminToken,
  clearAdminAudit,
  clientSessionId,
  createScan,
  fetchAdminAudit,
  getScan,
  listScans
} from "./api";
import EnterpriseShell, { BrandMark } from "./components/EnterpriseShell";
import {
  AssetsView,
  CveView,
  DashboardView,
  FindingsView,
  HelpView,
  HistoryView,
  IntegrationsView,
  ReportsView,
  ScanView,
  SettingsView,
  SeverityBadge
} from "./components/PlatformViews";

const defaultInput = `# Paste code, configuration, logs, or public URLs here.
# LeakShield flags exposed credentials, risky connection strings,
# public tokens, and deployment weaknesses without revealing secret values.

service_name=public-demo
environment=review
scan_target=https://example.com`;
const MAX_FOLDER_FILE_BYTES = 300_000;
const MAX_FOLDER_TOTAL_BYTES = 1_200_000;
const views = new Set(["dashboard", "scan", "history", "assets", "findings", "cves", "reports", "integrations", "settings", "help"]);
const SERVERLESS_FEATURES_ENABLED =
  import.meta.env.VITE_SERVERLESS_FEATURES === "true" ||
  (import.meta.env.VITE_SERVERLESS_FEATURES !== "false" && typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname));

function initialView() {
  const value = window.location.hash.replace("#", "");
  return views.has(value) ? value : "dashboard";
}

export default function App() {
  const redirectedAdminEntry = new URLSearchParams(window.location.search).get("_ls_admin_entry") === "1";
  const isAdminPath = window.location.pathname === "/admin=true" || redirectedAdminEntry;
  if (redirectedAdminEntry) window.history.replaceState(null, "", "/admin=true");
  if (isAdminPath) return SERVERLESS_FEATURES_ENABLED ? <AdminDashboard /> : <UnavailableAdmin />;
  return <SecurityWorkspace />;
}

function SecurityWorkspace() {
  const [activeView, setActiveView] = useState(initialView);
  const [content, setContent] = useState(defaultInput);
  const [sourceName, setSourceName] = useState("deployment.env");
  const [scanMode, setScanMode] = useState(() => localStorage.getItem("leakshield.defaultMode") || "website");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [projectFiles, setProjectFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("leakshield.consoleTheme") || "dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("leakshield.sidebarCollapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientSession] = useState(clientSessionId);
  const deferredQuery = useDeferredValue(query);
  const deferredRiskFilter = useDeferredValue(riskFilter);
  const scanStateRef = useRef({ content, projectFiles, scanMode, sourceName, websiteUrl });

  useEffect(() => {
    scanStateRef.current = { content, projectFiles, scanMode, sourceName, websiteUrl };
  }, [content, projectFiles, scanMode, sourceName, websiteUrl]);

  const refreshHistory = useCallback(async () => {
    setHistory(await listScans({ q: deferredQuery, riskLevel: deferredRiskFilter }));
  }, [deferredQuery, deferredRiskFilter]);

  useEffect(() => { refreshHistory().catch(() => {}); }, [refreshHistory]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("leakshield.consoleTheme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.density = localStorage.getItem("leakshield.denseTables") === "true" ? "compact" : "comfortable";
  }, []);
  useEffect(() => {
    const onHashChange = () => setActiveView(initialView());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((view) => {
    const safeView = views.has(view) ? view : "dashboard";
    setActiveView(safeView);
    window.history.replaceState(null, "", `#${safeView}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((current) => {
      localStorage.setItem("leakshield.sidebarCollapsed", String(!current));
      return !current;
    });
  }, []);

  const toggleTheme = useCallback(() => setTheme((current) => current === "light" ? "dark" : "light"), []);

  const scan = useCallback(async (scanOptions = {}) => {
    setLoading(true);
    setError("");
    try {
      const { content: currentContent, projectFiles: currentFiles, scanMode: currentMode, sourceName: currentName, websiteUrl: currentUrl } = scanStateRef.current;
      const metadata = {
        client_session_id: clientSession,
        submitted_at: new Date().toISOString(),
        assessment_profile: scanOptions.profile || "complete",
        request_rate: scanOptions.rate || "safe",
        schedule: scanOptions.schedule || "now"
      };
      const payload = currentMode === "website"
        ? { mode: "website", website_url: currentUrl, source_name: currentUrl || "website-scan", metadata: { ...metadata, entrypoint: "website-url" } }
        : currentMode === "project-folder"
          ? { mode: "project-folder", files: currentFiles, source_name: currentName || "uploaded-project", metadata: { ...metadata, entrypoint: "folder-upload" } }
          : { mode: "text", content: currentContent, source_name: currentName, metadata: { ...metadata, entrypoint: "dashboard" } };
      const data = await createScan(payload);
      setResult(data);
      await refreshHistory();
      navigate("dashboard");
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setLoading(false);
    }
  }, [clientSession, navigate, refreshHistory]);

  const handleFolderUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    setError("");
    let selectedBytes = 0;
    const readableFiles = files
      .filter((file) => !file.name.match(/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|exe|dll|woff2?|ttf|mp4|mp3)$/i))
      .slice(0, 80)
      .filter((file) => {
        if (file.size > MAX_FOLDER_FILE_BYTES || selectedBytes + file.size > MAX_FOLDER_TOTAL_BYTES) return false;
        selectedBytes += file.size;
        return true;
      });
    if (readableFiles.length < files.length) setError("Some binary or oversized files were skipped to keep the scan within safe resource limits.");
    const loaded = await Promise.all(readableFiles.map(async (file) => ({ path: file.webkitRelativePath || file.name, size: file.size, content: await file.text() })));
    setProjectFiles(loaded);
    setSourceName(files[0]?.webkitRelativePath?.split("/")[0] || "uploaded-project");
    setContent(loaded.slice(0, 12).map((file) => `// ${file.path}\n${file.content.slice(0, 700)}`).join("\n\n"));
  }, []);

  const loadScan = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try { setResult(await getScan(id)); }
    catch (scanError) { setError(scanError.message); }
    finally { setLoading(false); }
  }, []);

  const view = useMemo(() => {
    const sharedScanProps = { content, error, handleFolderUpload, loading, onScan: scan, projectFiles, scanMode, setContent, setScanMode, setSourceName, setWebsiteUrl, sourceName, websiteUrl };
    switch (activeView) {
      case "scan": return <ScanView {...sharedScanProps} />;
      case "history": return <HistoryView history={history} loadScan={loadScan} query={query} riskFilter={riskFilter} setQuery={setQuery} setRiskFilter={setRiskFilter} onNavigate={navigate} />;
      case "assets": return <AssetsView result={result} />;
      case "findings": return <FindingsView result={result} />;
      case "cves": return <CveView result={result} />;
      case "reports": return <ReportsView result={result} />;
      case "integrations": return <IntegrationsView result={result} />;
      case "settings": return <SettingsView theme={theme} onToggleTheme={toggleTheme} />;
      case "help": return <HelpView />;
      default: return <DashboardView history={history} onLoadScan={loadScan} onNavigate={navigate} result={result} />;
    }
  }, [activeView, content, error, handleFolderUpload, history, loadScan, loading, navigate, projectFiles, query, result, riskFilter, scan, scanMode, sourceName, theme, toggleTheme, websiteUrl]);

  return (
    <EnterpriseShell
      activeView={activeView}
      loading={loading}
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      onNavigate={navigate}
      onToggleSidebar={toggleSidebar}
      onToggleTheme={toggleTheme}
      result={result}
      sidebarCollapsed={sidebarCollapsed}
      theme={theme}
    >
      {error && activeView !== "scan" && <div className="alert alert-error global-alert"><AlertTriangle /><span><strong>Action could not complete</strong>{error}</span></div>}
      {view}
    </EnterpriseShell>
  );
}

function UnavailableAdmin() {
  return (
    <main className="auth-page">
      <section className="auth-card panel"><BrandMark /><div className="auth-icon"><LockKeyhole /></div><h1>Admin tools unavailable</h1><p>This deployment does not include the serverless audit store. The public scanner remains available.</p><a className="primary-button" href="/">Return to scanner</a></section>
    </main>
  );
}

function AdminDashboard() {
  const [token, setToken] = useState(adminToken());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [storage, setStorage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedUser = users.find((user) => user.id === selectedUserId) || users[0];

  const loadAudit = useCallback(async (activeToken) => {
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminAudit(activeToken);
      setRecords(data.records || []);
      setUsers(data.users || []);
      setStorage(data.storage || null);
      setSelectedUserId((current) => current || data.users?.[0]?.id || "");
    } catch (auditError) { setError(auditError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) loadAudit(token); }, [loadAudit, token]);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try { const session = await adminLogin(email, password); setToken(session.token); }
    catch (loginError) { setError(loginError.message); setLoading(false); }
  }
  async function clearRecords() {
    if (!window.confirm("Clear all saved admin audit records? This cannot be undone.")) return;
    try { await clearAdminAudit(token); setRecords([]); setUsers([]); setSelectedUserId(""); }
    catch (clearError) { setError(clearError.message); }
  }
  function logout() { adminLogout(); setToken(""); setRecords([]); setUsers([]); }

  if (!token) return (
    <main className="auth-page">
      <form className="auth-card panel" onSubmit={login}>
        <BrandMark /><div className="auth-icon"><LockKeyhole /></div><span className="eyebrow">RESTRICTED // ROOT CHANNEL</span><h1>Operator authentication</h1><p>Authenticate to inspect redacted operation logs and workspace audit records.</p>
        <label className="form-field"><span>Email address</span><input required autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="form-field"><span>Password</span><input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="alert alert-error"><AlertTriangle /><span>{error}</span></div>}
        <button className="primary-button primary-button-large" disabled={loading}>{loading ? <Loader2 className="spin" /> : <LockKeyhole />} OPEN ROOT CHANNEL</button>
        <a className="text-button" href="/">Return to public scanner</a>
      </form>
    </main>
  );

  const stats = {
    users: users.length,
    scans: records.length,
    findings: records.reduce((sum, record) => sum + (record.result_shown_to_user?.finding_count || 0), 0),
    critical: records.filter((record) => record.result_shown_to_user?.overall_level === "CRITICAL").length
  };
  return (
    <main className="admin-page">
      <header className="admin-topbar"><BrandMark /><div><button className="secondary-button" onClick={() => loadAudit(token)}><RefreshCw /> Refresh</button><button className="danger-button" onClick={clearRecords}><Trash2 /> Clear audit</button><button className="secondary-button" onClick={logout}>Sign out</button></div></header>
      <div className="admin-content">
        <header className="page-heading"><div><p>ROOT_CHANNEL // AUDIT_NODE</p><h1>Operator Audit Console</h1><span>Redacted user activity and assessment audit records.</span></div></header>
        <section className="metric-grid"><AdminMetric label="Users" value={stats.users} /><AdminMetric label="Scans" value={stats.scans} /><AdminMetric label="Findings" value={stats.findings} /><AdminMetric label="Critical scans" value={stats.critical} /></section>
        {storage && <div className="notice"><Database /><div><strong>{storage.provider === "vercel_blob_private" ? "Private Vercel Blob audit store" : "Memory audit store"}</strong><p>{storage.grouping}</p></div></div>}
        {error && <div className="alert alert-error"><AlertTriangle /><span>{error}</span></div>}
        <section className="admin-grid">
          <aside className="panel admin-users"><h2>User audit boxes</h2>{users.map((user) => <button className={selectedUser?.id === user.id ? "active" : ""} key={user.id} onClick={() => setSelectedUserId(user.id)}><span><strong>{user.id}</strong><small>{user.scan_count} scans · {user.finding_count} findings</small></span><SeverityBadge level={user.latest_risk || "LOW"} /></button>)}{!users.length && <p>{loading ? "Loading user records..." : "No audit records are available."}</p>}</aside>
          <AuditUserDetails user={selectedUser} />
        </section>
      </div>
    </main>
  );
}

function AdminMetric({ label, value }) { return <article className="metric-card metric-blue"><div className="metric-icon"><ShieldCheck /></div><div><span>{label}</span><strong>{value}</strong><small>Redacted audit data</small></div></article>; }

function AuditUserDetails({ user }) {
  if (!user) return <section className="panel admin-detail-empty"><ShieldCheck /><h2>Select a user audit box</h2><p>Review saved, redacted request and result summaries.</p></section>;
  return (
    <section className="panel admin-detail">
      <header><span className="eyebrow">User data box</span><h2>{user.id}</h2><p>{user.session_id}</p></header>
      <dl className="admin-user-stats"><div><dt>Scans</dt><dd>{user.scan_count}</dd></div><div><dt>Findings</dt><dd>{user.finding_count}</dd></div><div><dt>Critical</dt><dd>{user.critical_count}</dd></div><div><dt>Latest risk</dt><dd><SeverityBadge level={user.latest_risk || "LOW"} /></dd></div></dl>
      <h3>Saved scan activity</h3>
      <div className="audit-records">{(user.records || []).map((record) => { const result = record.result_shown_to_user || {}; return <details key={record.id}><summary><span><strong>{record.submitted_input?.source_name || record.submitted_input?.website_url || "Scan"}</strong><small>{new Date(record.created_at).toLocaleString()}</small></span><SeverityBadge level={result.overall_level || "LOW"} /></summary><pre>{JSON.stringify({ record_id: record.id, request_context: record.request_context, submitted_input: record.submitted_input, result_shown_to_user: result }, null, 2)}</pre></details>; })}</div>
    </section>
  );
}
