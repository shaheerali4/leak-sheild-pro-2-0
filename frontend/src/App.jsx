import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  FileCode2,
  FileText,
  Globe2,
  Loader2,
  LockKeyhole,
  MoonStar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Upload,
  Wifi
} from "lucide-react";
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

const DEFAULT_INPUT = `# Paste code, configuration, logs, or public URLs here.
# LeakShield flags exposed credentials, risky connection strings,
# public tokens, and deployment weaknesses without revealing secret values.

service_name=public-demo
environment=review
scan_target=https://example.com`;

const MAX_FOLDER_FILE_BYTES = 300_000;
const MAX_FOLDER_TOTAL_BYTES = 1_200_000;
const SCAN_STEPS = ["Input validation", "Surface inspection", "Secret detection", "Vulnerability analysis", "Risk correlation"];
const MODES = [
  { id: "text", label: "Text", icon: FileCode2 },
  { id: "project-folder", label: "Folder", icon: FileText },
  { id: "website", label: "Website", icon: Globe2 }
];
const SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function App() {
  const redirectedAdminEntry = new URLSearchParams(window.location.search).get("_ls_admin_entry") === "1";
  const isAdminPath = window.location.pathname === "/admin=true" || redirectedAdminEntry;

  if (redirectedAdminEntry) window.history.replaceState(null, "", "/admin=true");
  return isAdminPath ? <AdminPage /> : <MainPage />;
}

function MainPage() {
  const [theme, setTheme] = useState(() => localStorage.getItem("leakshield.theme") || "dark");
  const [scanMode, setScanMode] = useState(() => localStorage.getItem("leakshield.defaultMode") || "text");
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
  const [scanDuration, setScanDuration] = useState(0);
  const [clientSession] = useState(clientSessionId);
  const scanStartRef = useRef(0);
  const scanStateRef = useRef({ content, projectFiles, scanMode, sourceName, websiteUrl });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("leakshield.theme", theme);
  }, [theme]);

  useEffect(() => {
    scanStateRef.current = { content, projectFiles, scanMode, sourceName, websiteUrl };
  }, [content, projectFiles, scanMode, sourceName, websiteUrl]);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await listScans({ q: historyQuery, riskLevel: historySeverity }));
    } catch {
      setHistory([]);
    }
  }, [historyQuery, historySeverity]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const findings = result?.findings || [];
  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const finding of findings) {
      const level = String(finding.risk_level || finding.severity || "LOW").toUpperCase();
      counts[level] = (counts[level] || 0) + 1;
    }
    return counts;
  }, [findings]);

  const analysisSteps = useMemo(() => {
    if (loading) {
      return SCAN_STEPS.map((label, index) => ({
        label,
        state: index < 2 ? "complete" : index === 2 ? "running" : "queued"
      }));
    }
    if (result) return SCAN_STEPS.map((label) => ({ label, state: "complete" }));
    return SCAN_STEPS.map((label) => ({ label, state: label === "Input validation" ? "idle" : "queued" }));
  }, [loading, result]);

  const scan = useCallback(async () => {
    setLoading(true);
    setError("");
    scanStartRef.current = performance.now();
    try {
      const {
        content: currentContent,
        projectFiles: currentFiles,
        scanMode: currentMode,
        sourceName: currentName,
        websiteUrl: currentUrl
      } = scanStateRef.current;

      const metadata = {
        client_session_id: clientSession,
        submitted_at: new Date().toISOString(),
        assessment_profile: "complete",
        request_rate: "safe",
        schedule: "now"
      };

      const payload =
        currentMode === "website"
          ? { mode: "website", website_url: currentUrl, source_name: currentUrl || "website-scan", metadata: { ...metadata, entrypoint: "website-url" } }
          : currentMode === "project-folder"
            ? { mode: "project-folder", files: currentFiles, source_name: currentName || "uploaded-project", metadata: { ...metadata, entrypoint: "folder-upload" } }
            : { mode: "text", content: currentContent, source_name: currentName, metadata: { ...metadata, entrypoint: "text-input" } };

      const data = await createScan(payload);
      setResult(data);
      setScanDuration(performance.now() - scanStartRef.current);
      await refreshHistory();
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setLoading(false);
    }
  }, [clientSession, refreshHistory]);

  const loadScan = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try {
      setResult(await getScan(id));
      setScanDuration(0);
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

    if (readableFiles.length < files.length) {
      setError("Some binary or oversized files were skipped to keep the scan within safe resource limits.");
    }

    const loaded = await Promise.all(
      readableFiles.map(async (file) => ({
        path: file.webkitRelativePath || file.name,
        size: file.size,
        content: await file.text()
      }))
    );

    setProjectFiles(loaded);
    setSourceName(files[0]?.webkitRelativePath?.split("/")[0] || "uploaded-project");
    setContent(loaded.slice(0, 12).map((file) => `// ${file.path}\n${file.content.slice(0, 700)}`).join("\n\n"));
  }, []);

  const statusLabel = loading ? "ANALYSIS IN PROGRESS" : result ? "ANALYSIS COMPLETE" : "SYSTEM READY";
  const currentMode = MODES.find((mode) => mode.id === scanMode) || MODES[0];
  const heroEngineState = loading ? "ARMED" : result ? "ACTIVE" : "STANDBY";
  const heroRiskState = result?.overall_level || "STANDBY";
  const heroExposureCount = result ? `${result.finding_count ?? findings.length} exposure signal(s)` : "Awaiting scan vector";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-title">LEAK SHEILD / 2.0</span>
          <span className="status-chip">
            <span className={`status-dot ${loading ? "busy" : "ready"}`} />
            {statusLabel}
          </span>
        </div>
        <div className="topbar-actions">
          <a className="ghost-button" href="/admin=true">Admin Login</a>
          <button className="ghost-button" type="button" onClick={() => document.getElementById("scan-panel")?.scrollIntoView({ behavior: "smooth" })}>Documentation</button>
          <span className="system-pill compact">
            <Wifi />
            Engine {heroEngineState}
          </span>
          <span className={`system-pill compact risk-${String(heroRiskState).toLowerCase()}`}>
            <ShieldCheck />
            Risk {heroRiskState}
          </span>
          <button className="icon-button" type="button" onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))} aria-label="Toggle theme">
            {theme === "dark" ? <SunMedium /> : <MoonStar />}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="hero-shell">
          <div className="hero-copy">
            <span className="hero-badge">
              <LockKeyhole />
              CLASSIFIED-GRADE DEVSECOPS ANALYSIS
            </span>
            <div className="hero-copy-inner">
              <p className="hero-kicker">LEAKSHIELD PRO // PUBLIC EXPOSURE AI</p>
              <h1>Expose every leak before launch.</h1>
              <p className="hero-description">
                Upload a project, inspect a public website, or paste sensitive code. LeakShield maps exposed secrets to
                exact file and URL addresses, scores operational risk, and returns a mission-ready remediation plan.
              </p>
              <div className="hero-actions">
                <button className="primary-button hero-primary" type="button" onClick={() => document.getElementById("scan-panel")?.scrollIntoView({ behavior: "smooth" })}>
                  <Sparkles />
                  Initiate Exposure Sweep
                </button>
                <button className="ghost-button hero-secondary" type="button" onClick={refreshHistory}>
                  <RefreshCw />
                  Sync Console
                </button>
              </div>
              <div className="hero-stats">
                <HeroStat label="Mode" value={currentMode.label.toUpperCase()} />
                <HeroStat label="Session" value={clientSession.slice(0, 8).toUpperCase()} />
                <HeroStat label="Archive" value={`${history.length} scans`} />
                <HeroStat label="Exposure" value={heroExposureCount} wide />
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-radar">
              <div className="hero-radar-core" />
              <span className="hero-ring hero-ring-1" />
              <span className="hero-ring hero-ring-2" />
              <span className="hero-ring hero-ring-3" />
              <span className="hero-pulse hero-pulse-1" />
              <span className="hero-pulse hero-pulse-2" />
              <span className="hero-pulse hero-pulse-3" />
            </div>
            <div className="hero-float hero-float-top">
              <span className="panel-label">Active scan</span>
              <strong>{result?.source_name || "No target locked"}</strong>
              <p>{result ? `${result.finding_count ?? findings.length} finding(s) isolated` : "Awaiting scan vector"}</p>
            </div>
            <div className="hero-float hero-float-bottom">
              <span className="panel-label">Verdict</span>
              <strong>{result ? `${Math.round(result.overall_score || 0)}/100 ${heroRiskState}` : "0/100 STANDBY"}</strong>
              <p>{result ? `${result.finding_count ?? findings.length} exposure signal(s) isolated` : "0 exposure signal(s) isolated"}</p>
            </div>
          </div>
        </section>

        <section className="mission-grid">
          <article className="panel mission-panel" id="scan-panel">
            <header className="mission-head">
              <div className="mission-kicker">
                <span className="mission-icon"><ShieldCheck /></span>
                <div>
                  <span className="eyebrow">INPUT - 01</span>
                  <h1>Threat Acquisition</h1>
                </div>
              </div>
            </header>

            <div className="mode-tabs compact" role="tablist" aria-label="Scan modes">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={scanMode === id ? "mode-tab active" : "mode-tab"}
                  onClick={() => {
                    setScanMode(id);
                    localStorage.setItem("leakshield.defaultMode", id);
                  }}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>

            <label className="field target-field">
              <span>TARGET NAME</span>
              <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="deployment.env" />
            </label>

            <div className="acquisition-body">
              {scanMode === "website" && (
                <div className="url-mode">
                  <label className="field">
                    <span>Website URL</span>
                    <input
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="https://example.com"
                      inputMode="url"
                    />
                  </label>
                  <button className="primary-button run-button" type="button" disabled={loading} onClick={scan}>
                    {loading ? <Loader2 className="spin" /> : <ShieldCheck />}
                    RUN ANALYSIS
                  </button>
                </div>
              )}

              {scanMode === "text" && (
                <CodeEditor
                  value={content}
                  onChange={setContent}
                  sourceName={sourceName}
                  onSourceNameChange={setSourceName}
                  loading={loading}
                  onRun={scan}
                />
              )}

              {scanMode === "project-folder" && (
                <FileDropZone
                  files={projectFiles}
                  loading={loading}
                  onRun={scan}
                  onUpload={handleFolderUpload}
                />
              )}
            </div>

            <div className="mission-footer">
              <div className="scan-meta">
                <MetaPill label="SCAN ID" value={result?.id || "LS-2048-A17"} mono />
                <MetaPill label="ENGINE" value="2.0" mono />
                <MetaPill label="DURATION" value={scanDuration ? formatDuration(scanDuration) : "—"} mono />
                <MetaPill label="STATUS" value={statusLabel.replaceAll(" ", "_")} mono tone={loading ? "amber" : result ? "green" : "neutral"} />
              </div>
              {error && (
                <div className="alert">
                  <AlertTriangle />
                  <span>{error}</span>
                </div>
              )}
              <button className="primary-button mission-run" type="button" disabled={loading} onClick={scan}>
                {loading ? <Loader2 className="spin" /> : <ShieldCheck />}
                RUN ANALYSIS
              </button>
            </div>

            <div className="analysis-strip">
              <span className="notes-title">Analysis</span>
              <div className="analysis-strip-steps">
                {analysisSteps.map((step, index) => (
                  <span className={`strip-step ${step.state}`} key={step.label}>
                    {String(index + 1).padStart(2, "0")} {step.label}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <aside className="panel archive-panel" id="archive">
            <header className="archive-head">
              <div className="mission-kicker archive-kicker">
                <span className="mission-icon"><Clock3 /></span>
                <div>
                  <span className="eyebrow">HIST - 07</span>
                  <h1>Mission Archive</h1>
                </div>
              </div>
            </header>

            <div className="archive-toolbar">
              <label className="mini-field archive-search">
                <Search />
                <input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search source" />
              </label>
              <select value={historySeverity} onChange={(event) => setHistorySeverity(event.target.value)}>
                <option value="">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="archive-list">
              {history.slice(0, 6).map((item) => (
                <button className="archive-row" type="button" key={item.id} onClick={() => loadScan(item.id)}>
                  <span className="archive-main">
                    <strong>{item.source_name}</strong>
                    <small>{item.finding_count} finding(s)</small>
                  </span>
                  <span className={`severity-tag ${riskTone(item.overall_level)}`}>{item.overall_level || "LOW"}</span>
                  <span className="archive-time">{formatDate(item.created_at)}</span>
                </button>
              ))}
              {!history.length && <EmptyState text="No scan history yet." />}
            </div>
          </aside>
        </section>

        <section className="report-shell" id="report">
          <div className="report-header compact">
            <div>
              <span className="eyebrow">Security Report</span>
              <h2>Executive summary and findings</h2>
            </div>
            <div className="report-toolbar compact">
              <button className="ghost-button" type="button" onClick={refreshHistory}>
                <RefreshCw />
                Refresh archive
              </button>
            </div>
          </div>

          {result ? (
            <div className="results-grid">
              <article className="summary-panel">
                <div className="score-ring" aria-label={`Risk score ${Math.round(result.overall_score || 0)} out of 100`}>
                  <span>RISK SCORE</span>
                  <strong>{Math.round(result.overall_score || 0)}</strong>
                  <small>/ 100</small>
                </div>
                <div className="summary-copy">
                  <span className={`risk-chip ${riskTone(result.overall_level)}`}>{result.overall_level || "LOW"} RISK</span>
                  <p className="summary-source">{result.source_name}</p>
                  <div className="summary-metrics">
                    <Metric label="Critical" value={severityCounts.CRITICAL || 0} />
                    <Metric label="High" value={severityCounts.HIGH || 0} />
                    <Metric label="Medium" value={severityCounts.MEDIUM || 0} />
                    <Metric label="Low" value={severityCounts.LOW || 0} />
                  </div>
                  <div className="summary-foot">
                    <MetaPill label="CONFIRMED" value={result.confirmed_finding_count ?? 0} />
                    <MetaPill label="POTENTIAL" value={result.potential_finding_count ?? 0} />
                    <MetaPill label="ADVISORY" value={result.advisory_count ?? 0} />
                    <MetaPill label="FINDINGS" value={result.finding_count ?? findings.length} />
                  </div>
                </div>
              </article>

              <aside className="snapshot-panel">
                <div className="snapshot-head">
                  <span className="panel-label">Telemetry</span>
                  <strong>SCAN ID {result.id ? String(result.id).slice(0, 8).toUpperCase() : "LOCAL"}</strong>
                </div>
                <dl className="snapshot-grid">
                  <div><dt>Mode</dt><dd>{result.mode || scanMode}</dd></div>
                  <div><dt>Score</dt><dd>{result.security_score ?? Math.max(0, 100 - (result.overall_score || 0))}</dd></div>
                  <div><dt>Files</dt><dd>{result.scanned_files ?? 1}</dd></div>
                  <div><dt>Cached</dt><dd>{result.cache_hit ? "Yes" : "No"}</dd></div>
                </dl>
                <div className="snapshot-list">
                  <div><span>Detected tech</span><strong>{topTechnology(result) || "Unavailable"}</strong></div>
                  <div><span>Generated</span><strong>{formatDate(result.created_at)}</strong></div>
                  <div><span>Duration</span><strong>{scanDuration ? formatDuration(scanDuration) : "—"}</strong></div>
                </div>
              </aside>

              <article className="findings-panel">
                <div className="panel-head">
                  <span className="panel-label">Findings</span>
                  <strong>{findings.length} findings</strong>
                </div>
                <div className="finding-list">
                  {findings.length ? findings
                    .slice()
                    .sort((a, b) => (SEVERITY_ORDER[String(b.risk_level || b.severity || "LOW").toUpperCase()] || 0) - (SEVERITY_ORDER[String(a.risk_level || a.severity || "LOW").toUpperCase()] || 0))
                    .map((finding, index) => <FindingItem finding={finding} key={findingKey(finding, index)} />)
                    : <EmptyState text="No findings were returned for this analysis." />}
                </div>
              </article>
            </div>
          ) : (
            <EmptyState text="Run an analysis to reveal the security report." />
          )}
        </section>
      </main>
    </div>
  );
}

function CodeEditor({ value, onChange, sourceName, onSourceNameChange, loading, onRun }) {
  const language = detectLanguage(value);
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const gutterRef = useRef(null);
  const lines = useMemo(() => value.split("\n"), [value]);

  const syncScroll = useCallback(() => {
    if (!textareaRef.current || !mirrorRef.current || !gutterRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    mirrorRef.current.scrollTop = scrollTop;
    mirrorRef.current.scrollLeft = scrollLeft;
    gutterRef.current.scrollTop = scrollTop;
  }, []);

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <span className="editor-title">RAW INPUT</span>
        <div className="editor-meta">
          <span className="mono-chip">Detected {language}</span>
          <span className="mono-chip">{value.length} chars</span>
        </div>
      </div>
      <label className="field source-field">
        <span>Source name</span>
        <input value={sourceName} onChange={(event) => onSourceNameChange(event.target.value)} placeholder="deployment.env" />
      </label>
      <div className="editor-frame">
        <div className="gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, index) => <span key={index}>{index + 1}</span>)}
        </div>
        <div className="editor-body">
          <pre className="editor-highlight" ref={mirrorRef} aria-hidden="true">
            <code dangerouslySetInnerHTML={{ __html: highlightCode(value, language) }} />
          </pre>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={syncScroll}
            spellCheck="false"
            aria-label="Source code input"
          />
        </div>
      </div>
      <div className="editor-footer">
        <button className="primary-button run-button" type="button" disabled={loading} onClick={onRun}>
          {loading ? <Loader2 className="spin" /> : <ShieldCheck />}
          RUN ANALYSIS
        </button>
      </div>
    </div>
  );
}

function FileDropZone({ files, loading, onRun, onUpload }) {
  const [dragActive, setDragActive] = useState(false);

  return (
    <div
      className={`dropzone ${dragActive ? "active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        onUpload({ target: { files: event.dataTransfer.files } });
      }}
    >
      <Upload />
      <strong>Drop a file for security analysis</strong>
      <p>or select from device</p>
      <div className="dropzone-foot">
        <span>{files.length ? `${files.length} readable file(s) loaded` : "Supported: text, code, config, logs"}</span>
        <label className="secondary-button file-button">
          Select file
          <input type="file" multiple onChange={onUpload} />
        </label>
        <button className="primary-button run-button" type="button" disabled={loading || !files.length} onClick={onRun}>
          {loading ? <Loader2 className="spin" /> : <ShieldCheck />}
          RUN ANALYSIS
        </button>
      </div>
    </div>
  );
}

function FindingItem({ finding }) {
  const [copied, setCopied] = useState(false);
  const explanation = finding.explanation || {};
  const developerFixes = explanation.developer_fixes || {};
  const snippets = developerFixes.snippets || {};
  const status = statusLabelForFinding(finding);
  const location = findingLocation(finding);
  const confidence = confidenceLabel(finding);
  const title = finding.secret_type || finding.rule_id || "Finding";
  const category = finding.credential_kind || finding.affected_component || categoryLabelForFinding(finding);
  const evidence = finding.observed_evidence || explanation.summary || finding.context_snippet;
  const remediation = explanation.remediation || developerFixes.generic || "Review the exposed material and move secrets to a protected secret store.";

  async function copyEvidence() {
    try {
      await navigator.clipboard.writeText(evidence || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className={`finding-item severity-${riskTone(finding.risk_level || finding.severity)}`} open={finding.risk_level === "CRITICAL"}>
      <summary>
        <span className="finding-summary-main">
          <span className={`finding-severity severity-${riskTone(finding.risk_level || finding.severity)}`}>{finding.risk_level || finding.severity || "LOW"}</span>
          <span>
            <strong>{title}</strong>
            <small>{category}</small>
          </span>
        </span>
        <span className="finding-summary-meta">
          <span>{location}</span>
          <span>{confidence}</span>
          <span className={`status-pill ${status.tone}`}>{status.label}</span>
        </span>
        <ChevronDown />
      </summary>
      <div className="finding-body">
        <div className="finding-grid">
          <div>
            <span className="subhead">Overview</span>
            <p>{explanation.summary || "A security issue was identified in the submitted material."}</p>
          </div>
          <div>
            <span className="subhead">Evidence</span>
            <div className="copy-line">
              <code>{evidence}</code>
              <button className="icon-button tiny" type="button" onClick={copyEvidence} aria-label="Copy evidence">
                {copied ? <Check /> : <Copy />}
              </button>
            </div>
          </div>
          <div>
            <span className="subhead">Impact</span>
            <p>{explanation.attacker_impact || explanation.real_world_consequence || "The issue may expose sensitive material or weaken security posture."}</p>
          </div>
          <div>
            <span className="subhead">Affected location</span>
            <p>{location}</p>
          </div>
          <div className="remediation-block">
            <span className="subhead">Recommended remediation</span>
            <p>{remediation}</p>
          </div>
        </div>

        {(snippets.current || snippets.recommended || snippets.Current || snippets.Recommended) ? (
          <div className="snippet-grid">
            <Snippet title="Current" code={snippets.current || snippets.Current} />
            <Snippet title="Recommended" code={snippets.recommended || snippets.Recommended} />
          </div>
        ) : (
          <div className="snippet-grid">
            <Snippet title="Current" code={finding.context_snippet || "No snippet available."} />
            <Snippet title="Recommended" code={remediation} />
          </div>
        )}
      </div>
    </details>
  );
}

function AdminPage() {
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
    } catch (auditError) {
      setError(auditError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAudit(token);
  }, [loadAudit, token]);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await adminLogin(email, password);
      setToken(session.token);
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  }

  async function clearRecords() {
    if (!window.confirm("Clear all saved admin audit records? This cannot be undone.")) return;
    try {
      await clearAdminAudit(token);
      setRecords([]);
      setUsers([]);
      setSelectedUserId("");
    } catch (clearError) {
      setError(clearError.message);
    }
  }

  function logout() {
    adminLogout();
    setToken("");
    setRecords([]);
    setUsers([]);
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={login}>
          <div className="auth-topline">
            <span className="brand-title">LEAK SHEILD / 2.0</span>
            <span className="status-chip"><span className="status-dot ready" />ADMIN ACCESS</span>
          </div>
          <div className="auth-icon"><LockKeyhole /></div>
          <h1>Operator login</h1>
          <p>Authenticate with the allowlisted admin account configured in your deployment environment.</p>
          <label className="field">
            <span>Email address</span>
            <input required autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Password</span>
            <input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error && <div className="alert"><AlertTriangle /><span>{error}</span></div>}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? <Loader2 className="spin" /> : <LockKeyhole />}
            OPEN DASHBOARD
          </button>
          <a className="text-link" href="/">Back to scanner</a>
        </form>
      </main>
    );
  }

  const stats = {
    users: users.length,
    scans: records.length,
    findings: records.reduce((sum, record) => sum + (record.result_shown_to_user?.finding_count || 0), 0),
    critical: records.filter((record) => record.result_shown_to_user?.overall_level === "CRITICAL").length
  };

  return (
    <main className="admin-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-title">LEAK SHEILD / 2.0</span>
          <span className="status-chip"><span className="status-dot ready" />ADMIN AUDIT</span>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={() => loadAudit(token)}><RefreshCw /> Refresh</button>
          <button className="ghost-button danger" type="button" onClick={clearRecords}>Clear</button>
          <button className="ghost-button" type="button" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="workspace admin-workspace">
        <section className="report-shell">
          <div className="report-header compact">
            <div>
              <span className="eyebrow">Operator audit</span>
              <h2>Redacted activity and saved scan records</h2>
            </div>
          </div>
          <div className="results-grid admin-grid">
            <article className="summary-panel">
              <div className="summary-copy">
                <span className="risk-chip neutral">AUDIT STATE</span>
                <p className="summary-source">{storage?.provider || "storage unavailable"}</p>
                <div className="summary-metrics">
                  <Metric label="Users" value={stats.users} />
                  <Metric label="Scans" value={stats.scans} />
                  <Metric label="Findings" value={stats.findings} />
                  <Metric label="Critical" value={stats.critical} />
                </div>
              </div>
            </article>

            <aside className="snapshot-panel">
              <div className="snapshot-head">
                <span className="panel-label">Audit store</span>
                <strong>{storage?.grouping || "No store detected"}</strong>
              </div>
              {error && <div className="alert"><AlertTriangle /><span>{error}</span></div>}
              <div className="snapshot-list">
                <div><span>Records</span><strong>{records.length}</strong></div>
                <div><span>Users</span><strong>{users.length}</strong></div>
                <div><span>Loading</span><strong>{loading ? "Yes" : "No"}</strong></div>
              </div>
            </aside>

            <article className="findings-panel">
              <div className="panel-head">
                <span className="panel-label">Users</span>
                <strong>Session groups</strong>
              </div>
              <div className="recent-list">
                {users.map((user) => (
                  <button className={`recent-row ${selectedUser?.id === user.id ? "active" : ""}`} type="button" key={user.id} onClick={() => setSelectedUserId(user.id)}>
                    <span>
                      <strong>{user.id}</strong>
                      <small>{user.scan_count} scans · {user.finding_count} findings</small>
                    </span>
                    <span className={`severity-tag ${riskTone(user.latest_risk)}`}>{user.latest_risk || "LOW"}</span>
                  </button>
                ))}
                {!users.length && <EmptyState text={loading ? "Loading user records..." : "No audit records yet."} />}
              </div>
            </article>

            <article className="history-panel">
              {selectedUser ? (
                <>
                  <div className="panel-head">
                    <span className="panel-label">Selected user</span>
                    <strong>{selectedUser.id}</strong>
                  </div>
                  <div className="snapshot-list">
                    <div><span>Scans</span><strong>{selectedUser.scan_count}</strong></div>
                    <div><span>Findings</span><strong>{selectedUser.finding_count}</strong></div>
                    <div><span>Critical</span><strong>{selectedUser.critical_count}</strong></div>
                  </div>
                  <div className="admin-records">
                    {(selectedUser.records || []).map((record) => {
                      const result = record.result_shown_to_user || {};
                      return (
                        <details key={record.id}>
                          <summary>
                            <span>
                              <strong>{record.submitted_input?.source_name || record.submitted_input?.website_url || "Scan"}</strong>
                              <small>{formatDate(record.created_at)}</small>
                            </span>
                            <span className={`severity-tag ${riskTone(result.overall_level)}`}>{result.overall_level || "LOW"}</span>
                          </summary>
                          <pre>{JSON.stringify({ record_id: record.id, submitted_input: record.submitted_input, result_shown_to_user: result }, null, 2)}</pre>
                        </details>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState text="Select a user to inspect their redacted activity." />
              )}
            </article>
          </div>
        </section>
      </main>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HeroStat({ label, value, wide = false }) {
  return (
    <div className={`hero-stat ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetaPill({ label, value, mono = false, tone = "neutral" }) {
  return (
    <span className={`meta-pill ${tone} ${mono ? "mono" : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function Snippet({ title, code }) {
  return (
    <div className="snippet">
      <span className="subhead">{title}</span>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function formatDate(value) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString();
}

function formatDuration(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function topTechnology(result) {
  const tech = result?.assessment?.technologies || [];
  const first = tech[0];
  return first ? `${first.name}${first.version ? ` ${first.version}` : ""}` : "";
}

function riskTone(level) {
  const value = String(level || "LOW").toUpperCase();
  if (value === "CRITICAL") return "critical";
  if (value === "HIGH") return "high";
  if (value === "MEDIUM") return "medium";
  if (value === "LOW") return "low";
  return "neutral";
}

function confidenceLabel(finding) {
  const value = finding.confidence;
  if (typeof value !== "number") return "Confidence n/a";
  return `Confidence ${Math.round(value * 100)}%`;
}

function statusLabelForFinding(finding) {
  const value = String(finding.verification_status || "").toLowerCase();
  if (value === "detected") return { label: "VERIFIED", tone: "good" };
  if (value === "potential") return { label: "OPEN", tone: "warn" };
  return { label: "ADVISORY", tone: "muted" };
}

function categoryLabelForFinding(finding) {
  const rule = String(finding.rule_id || "").toLowerCase();
  if (rule.includes("secret") || finding.credential_kind) return "Secrets Exposure";
  if (rule.includes("header") || rule.includes("csp") || rule.includes("hsts")) return "Security Headers";
  if (rule.includes("cookie") || rule.includes("cors")) return "Session & CORS";
  if (rule.includes("cve") || finding.cve) return "Dependency Risk";
  if (finding.location_type === "project_file") return "Source Code";
  if (finding.location_type === "public_url") return "Public Surface";
  return "Security Finding";
}

function findingLocation(finding, fallback = "Unknown source") {
  const address = finding.file_path || finding.source_address || fallback;
  return finding.file_path || ["response_body", "html_form", "project_file", "pasted_text"].includes(finding.location_type)
    ? `${address} : ${finding.line_number || 1}`
    : address;
}

function findingKey(finding, index) {
  return [finding.rule_id, finding.line_number, finding.column_start, finding.file_path || finding.source_address, index].join("-");
}

function highlightCode(code, language) {
  const escaped = escapeHtml(code);
  const patterns = {
    javascript: [
      /\b(const|let|var|function|return|if|else|import|from|export|default|class|new|await|async|try|catch)\b/g,
      /\b(true|false|null|undefined|NaN|Infinity)\b/g,
      /(".*?"|'.*?'|`.*?`)/gs,
      /(\/\/.*?$|\/\*[\s\S]*?\*\/)/gm,
      /\b(\d+(\.\d+)?)\b/g
    ],
    python: [
      /\b(def|class|return|if|elif|else|import|from|as|try|except|with|yield|async|await|pass|raise)\b/g,
      /\b(True|False|None)\b/g,
      /(".*?"|'.*?')/gs,
      /(#.*?$)/gm,
      /\b(\d+(\.\d+)?)\b/g
    ],
    json: [
      /("(?:\\.|[^"])*")(?=\s*:)/g,
      /("(?:\\.|[^"])*")/g,
      /\b(true|false|null)\b/g,
      /\b(\d+(\.\d+)?)\b/g
    ],
    yaml: [
      /^([A-Za-z0-9_.-]+)(?=:)/gm,
      /(".*?"|'.*?')/g,
      /(#.*?$)/gm
    ],
    shell: [
      /^\s*(#!\/bin\/|export|echo|cd|npm|pnpm|yarn|pip|uvicorn|docker|git)\b/gm,
      /(\$[A-Za-z_][A-Za-z0-9_]*|\$\{[A-Za-z_][A-Za-z0-9_]*\})/g,
      /(#.*?$)/gm,
      /(".*?"|'.*?')/g
    ]
  };

  const selected = patterns[language] || patterns.shell;
  let result = escaped;
  for (const pattern of selected) {
    result = result.replace(pattern, (match) => {
      let className = "token-default";
      if (String(match).startsWith("#") || String(match).startsWith("//") || String(match).startsWith("/*")) className = "token-comment";
      else if (String(match).startsWith('"') || String(match).startsWith("'") || String(match).startsWith("`")) className = "token-string";
      else if (/^\d/.test(String(match))) className = "token-number";
      else if (pattern === selected[0] || pattern === patterns.json[0]) className = "token-keyword";
      return `<span class="${className}">${match}</span>`;
    });
  }
  return result;
}

function detectLanguage(code) {
  const text = code.trim();
  if (!text) return "Text";
  if (/^\s*[{[]/.test(text) && /["{:\]]/.test(text)) return "JSON";
  if (/^\s*(---|\w+:\s)/m.test(text) && !/\b(function|const|let|var)\b/.test(text)) return "YAML";
  if (/\b(def|class|import\s+\w+|from\s+\w+\s+import)\b/.test(text)) return "Python";
  if (/\b(const|let|var|function|import\s+|export\s+|=>)\b/.test(text)) return "JavaScript";
  if (/^\s*(#!\/bin\/|export\s|echo\s|sudo\s|npm\s|git\s|docker\s)/m.test(text)) return "Shell";
  return "Text";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
