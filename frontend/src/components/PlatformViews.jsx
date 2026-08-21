import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  BarChart3,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Clock3,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  FileJson,
  FileSearch,
  Filter,
  Fingerprint,
  Globe2,
  History,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  Network,
  Play,
  Radar,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  ShieldQuestion,
  SlidersHorizontal,
  UploadCloud,
  Waypoints,
  X
} from "lucide-react";
import KnowledgeBase from "./KnowledgeBase";

const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const scanPhases = ["DNS", "TLS", "Headers", "Crawl", "Technologies", "Analysis", "Report"];
const findingGroups = [
  { id: "application", label: "Application Security", description: "Injection, forms, redirects, authentication and upload surfaces" },
  { id: "headers", label: "Security Headers", description: "Browser protections and information-bearing response headers" },
  { id: "browser", label: "Cookies & CORS", description: "Session cookie attributes and cross-origin policy" },
  { id: "transport", label: "SSL / TLS", description: "Certificate, protocol and cipher configuration" },
  { id: "network", label: "Network & DNS", description: "Public services, records and email-domain protection" },
  { id: "exposure", label: "Public Exposure", description: "Sensitive files, backups, diagnostics and admin routes" },
  { id: "cves", label: "Known CVEs", description: "Official NVD matches for explicit software versions" },
  { id: "secrets", label: "Secrets & Credentials", description: "Potential API keys, tokens and connection strings" },
  { id: "other", label: "Other Findings", description: "Additional security evidence" }
];

export function DashboardView({ history, onLoadScan, onNavigate, result }) {
  const findings = result?.findings || [];
  const assessment = result?.assessment || {};
  const securityScore = securityScoreFor(result);
  const grade = result?.grade || (result ? gradeForScore(securityScore) : "-");
  const confirmed = verificationCount(result, "detected");
  const gradeLabel = !result ? "Not assessed" : securityScore >= 90 ? "Excellent" : securityScore >= 80 ? "Good" : securityScore >= 70 ? "Fair" : securityScore >= 55 ? "Needs attention" : "Critical";

  return (
    <div className="view-stack view-enter">
      <section className="assessment-summary panel" aria-label="Assessment summary">
        <div className="score-summary">
          <span>Security score</span>
          <div className="score-ring" style={{ "--score": securityScore }}>
            <strong>{Math.round(securityScore)}</strong><small>/100</small>
          </div>
        </div>
        <div className="summary-stat">
          <span>Grade</span><strong className="grade-label">{gradeLabel}</strong><small>{result ? `Grade ${grade} from observed evidence` : "Run an assessment to establish a baseline"}</small>
        </div>
        <div className="summary-stat">
          <span>Verified findings</span><strong>{confirmed}</strong><small>{findings.length} total reviewable signals</small>
        </div>
        <div className="summary-stat summary-metadata">
          <span>Scan metadata</span>
          <dl>
            <div><dt>Target</dt><dd>{result?.source_name || "No target selected"}</dd></div>
            <div><dt>Completed</dt><dd>{result?.created_at ? new Date(result.created_at).toLocaleString() : "Not available"}</dd></div>
            <div><dt>Mode</dt><dd>{result?.mode === "website" ? "Public website assessment" : result?.mode || "Passive assessment"}</dd></div>
          </dl>
        </div>
        <div className="summary-stat summary-metadata">
          <span>Crawl summary</span>
          <dl>
            <div><dt>Pages and files</dt><dd>{result?.scanned_files || 0}</dd></div>
            <div><dt>Endpoints</dt><dd>{assessment.endpoints?.length || 0}</dd></div>
            <div><dt>Technologies</dt><dd>{assessment.technologies?.length || 0}</dd></div>
          </dl>
        </div>
      </section>

      {result ? <>
        <section className="assessment-context panel">
          <div><span className="eyebrow">Executive summary</span><h3>{result.source_name}</h3><p>{result.advisor?.executive_summary || "The assessment is complete. Review verified findings and remediation priorities below."}</p></div>
          <button className="secondary-button" onClick={() => onNavigate("findings")}>Review findings <ArrowUpRight /></button>
        </section>
        <section className="dashboard-lower-grid">
          <RoadmapPreview roadmap={result.roadmap || []} onNavigate={onNavigate} />
          <CoveragePreview assessment={assessment} />
        </section>
      </> : <section className="panel empty-overview">
        <ShieldCheck />
        <div><h3>Your security baseline will appear here</h3><p>Start with a website URL above. LeakShield will show only observable evidence and clearly separate confirmed findings from items that need manual verification.</p></div>
        <button className="primary-button" onClick={() => onNavigate("scan")}><Play /> Start assessment</button>
      </section>}
      <RecentScans history={history} onLoadScan={onLoadScan} onNavigate={onNavigate} />
    </div>
  );
}

function MetricCard({ detail, icon: Icon, label, tone, value }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon"><Icon /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function RiskDistribution({ findings, score }) {
  const counts = severities.map((severity) => ({ severity, count: findings.filter((item) => item.risk_level === severity).length }));
  const total = Math.max(1, findings.length);
  return (
    <article className="panel risk-chart-card">
      <PanelTitle icon={BarChart3} title="Risk distribution" subtitle="Findings by current severity" />
      <div className="risk-visual">
        <div className="risk-ring" style={{ "--risk-angle": `${Math.min(100, score) * 3.6}deg` }}>
          <span><strong>{Math.round(score)}</strong><small>risk score</small></span>
        </div>
        <div className="severity-bars">
          {counts.map((item) => (
            <div key={item.severity}>
              <span>{item.severity}</span>
              <i><b className={`bar-${item.severity.toLowerCase()}`} style={{ width: `${Math.max(item.count ? 8 : 0, item.count / total * 100)}%` }} /></i>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function SecurityOverview({ onNavigate, result }) {
  const score = securityScoreFor(result);
  return (
    <article className="panel security-overview-card">
      <PanelTitle icon={ShieldCheck} title="Security overview" subtitle={result?.source_name || "No active target"} />
      <div className="grade-display">
        <span className="grade-mark">{result ? result.grade || gradeForScore(score) : "-"}</span>
        <div><strong>{score}/100</strong><small>Security score</small></div>
      </div>
      <div className="grade-progress"><span style={{ width: `${score}%` }} /></div>
      <dl className="overview-stats">
        <div><dt>Scanned pages</dt><dd>{result?.scanned_files || 0}</dd></div>
        <div><dt>Public exposures</dt><dd>{result?.public_exposure_count || 0}</dd></div>
        <div><dt>Technologies</dt><dd>{result?.assessment?.technologies?.length || 0}</dd></div>
      </dl>
      <button className="text-button" onClick={() => onNavigate("assets")}>Open asset details <ArrowUpRight /></button>
    </article>
  );
}

function RecentScans({ history, onLoadScan, onNavigate }) {
  return (
    <article className="panel recent-scans-card">
      <PanelTitle icon={History} title="Recent scans" subtitle="Latest workspace activity" action={<button className="text-button" onClick={() => onNavigate("history")}>View all</button>} />
      <div className="compact-list">
        {history.slice(0, 5).map((item) => (
          <button key={item.id} onClick={() => { onLoadScan(item.id); onNavigate("dashboard"); }}>
            <span className="asset-favicon"><Globe2 /></span>
            <span><strong>{item.source_name}</strong><small>{new Date(item.created_at).toLocaleString()}</small></span>
            <SeverityBadge level={item.overall_level} />
          </button>
        ))}
        {!history.length && <EmptyState title="No scans yet" text="Run an assessment to create your workspace baseline." />}
      </div>
    </article>
  );
}

function RoadmapPreview({ onNavigate, roadmap }) {
  return (
    <article className="panel roadmap-preview">
      <PanelTitle icon={Waypoints} title="Remediation roadmap" subtitle="Highest priorities generated from the active scan" />
      <div className="roadmap-list">
        {roadmap.slice(0, 4).map((item) => (
          <div key={item.severity}>
            <span className={`priority-index priority-${item.priority}`}>P{item.priority}</span>
            <span><strong>{item.title}</strong><small>{item.effort} effort · {item.estimated_time}</small></span>
            <SeverityBadge level={item.severity} />
          </div>
        ))}
        {!roadmap.length && <EmptyState title="No roadmap available" text="A completed website scan will produce prioritized remediation work." />}
      </div>
      {roadmap.length > 0 && <button className="text-button" onClick={() => onNavigate("findings")}>Review vulnerabilities <ArrowUpRight /></button>}
    </article>
  );
}

function CoveragePreview({ assessment }) {
  const coverage = assessment.coverage || [];
  return (
    <article className="panel coverage-preview">
      <PanelTitle icon={Radar} title="Assessment coverage" subtitle="What the latest scan safely evaluated" />
      <div className="coverage-list">
        {coverage.slice(0, 6).map((item) => (
          <div key={item.name}><CheckCircle2 /><span><strong>{item.name}</strong><small>{item.status}</small></span></div>
        ))}
        {!coverage.length && <EmptyState title="Coverage pending" text="Start a website scan to populate the control coverage matrix." />}
      </div>
    </article>
  );
}

export function ScanView({
  content,
  error,
  handleFolderUpload,
  loading,
  onScan,
  projectFiles,
  scanMode,
  setContent,
  setScanMode,
  setSourceName,
  setWebsiteUrl,
  sourceName,
  websiteUrl
}) {
  const [profile, setProfile] = useState("complete");
  const [rate, setRate] = useState("safe");
  const [schedule, setSchedule] = useState("now");
  const modules = ["Crawler", "Headers", "TLS", "DNS", "Technology", "Secrets", "CVE correlation"];
  const missingInput = scanMode === "website" ? !websiteUrl.trim() : scanMode === "project-folder" ? projectFiles.length === 0 : !content.trim();

  function submitAssessment(event) {
    event.preventDefault();
    if (!loading && !missingInput) onScan({ profile, rate, schedule });
  }

  return (
    <div className="view-stack view-enter">
      <form className="panel scan-config-panel" onSubmit={submitAssessment}>
        <div className="scan-panel-heading">
          <div><span className="panel-title-icon"><ShieldCheck /></span><span><strong>Choose what you want to assess</strong><small>Safe, low-impact checks for targets you are authorized to review</small></span></div>
          <span className="safe-scan-badge"><LockKeyhole /> Passive checks only</span>
        </div>
        <div className="mode-selector" role="tablist" aria-label="Scan type">
          <button type="button" className={scanMode === "website" ? "selected" : ""} onClick={() => setScanMode("website")}><Globe2 /> Website</button>
          <button type="button" className={scanMode === "text" ? "selected" : ""} onClick={() => setScanMode("text")}><FileCode2 /> Text or config</button>
          <button type="button" className={scanMode === "project-folder" ? "selected" : ""} onClick={() => setScanMode("project-folder")}><UploadCloud /> Project folder</button>
        </div>

        {scanMode === "website" && (
          <div className="website-scan-row">
            <label className="form-field form-field-large"><span className="sr-only">Target URL</span><div><Link2 /><input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" inputMode="url" autoComplete="url" /></div></label>
            <button className="primary-button start-scan-button" disabled={loading || missingInput} type="submit">
              {loading ? <Loader2 className="spin" /> : <Play />} {loading ? "Scanning..." : "Start scan"}
            </button>
          </div>
        )}
        {scanMode === "text" && (
          <><label className="form-field"><span>Source name</span><input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="deployment.env" /></label><label className="form-field"><span>Code, configuration, or logs</span><textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck="false" /></label></>
        )}
        {scanMode === "project-folder" && (
          <div className="folder-picker"><UploadCloud /><strong>{projectFiles.length ? `${projectFiles.length} readable files selected` : "Choose a project folder"}</strong><span>Binary and oversized files are skipped automatically.</span><label className="secondary-button">Select folder<input type="file" multiple webkitdirectory="" directory="" onChange={handleFolderUpload} /></label></div>
        )}

        <details className="advanced-scan-options">
          <summary><Settings2 /> Assessment options <ChevronDown /></summary>
          <div className="configuration-grid">
            <label className="form-field"><span>Assessment profile</span><select value={profile} onChange={(event) => setProfile(event.target.value)}><option value="complete">Complete public assessment</option></select><small>All safe modules stay enabled so important evidence is not missed.</small></label>
            <label className="form-field"><span>Authentication</span><select disabled><option>Public / logged-out scan</option></select><small>LeakShield never stores target credentials.</small></label>
            <label className="form-field"><span>Request rate</span><select value={rate} onChange={(event) => setRate(event.target.value)}><option value="safe">Safe and courteous</option></select><small>Bounded automatically by the passive assessment engine.</small></label>
            <label className="form-field"><span>Schedule</span><select value={schedule} onChange={(event) => setSchedule(event.target.value)}><option value="now">Run now</option></select><small>Scans run immediately on the free serverless deployment.</small></label>
          </div>
          <div className="module-selector">
            <span>Included modules</span>
            <div>{modules.map((module) => <span key={module}><Check /> {module}</span>)}</div>
          </div>
        </details>
        {error && <div className="alert alert-error"><AlertTriangle /> <span><strong>Scan could not complete</strong>{error}</span></div>}
        {scanMode !== "website" && <button className="primary-button primary-button-large run-scan-button" disabled={loading || missingInput} type="submit">
          {loading ? <Loader2 className="spin" /> : <Play />} {loading ? "Scanning..." : "Start assessment"}
        </button>}
        <p className="authorization-note">Only assess websites and files you own or have permission to test. LeakShield does not attempt credential guessing or invasive exploitation.</p>
      </form>

      {loading && <LiveScanProgress />}
    </div>
  );
}

function LiveScanProgress() {
  return (
    <section className="panel live-scan-card" aria-live="polite">
      <div className="live-scan-head"><span className="scan-spinner"><Radar /></span><div><strong>Recon process active</strong><small>Collecting public evidence. Keep this console open until the report is assembled.</small></div></div>
      <div className="phase-track">{scanPhases.map((phase, index) => <div key={phase} style={{ "--phase-delay": `${index * .55}s` }}><span><Check /></span><small>{phase}</small></div>)}</div>
      <div className="indeterminate-progress"><span /></div>
    </section>
  );
}

export function HistoryView({ history, loadScan, query, riskFilter, setQuery, setRiskFilter, onNavigate }) {
  return (
    <section className="panel view-enter">
      <div className="table-toolbar">
        <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search targets" /></label>
        <label className="filter-select"><Filter /><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option value="">All severities</option>{severities.map((severity) => <option key={severity}>{severity}</option>)}</select></label>
        <button className="secondary-button" onClick={() => window.location.reload()}><RefreshCw /> Refresh</button>
      </div>
      <div className="data-table history-table">
        <div className="table-head"><span>Target</span><span>Severity</span><span>Findings</span><span>Score</span><span>Scanned</span><span /></div>
        {history.map((item) => (
          <button className="table-row" key={item.id} onClick={() => { loadScan(item.id); onNavigate("dashboard"); }}>
            <span className="table-primary"><Globe2 /><span><strong>{item.source_name}</strong><small>{item.id.slice(0, 8)}</small></span></span>
            <span><SeverityBadge level={item.overall_level} /></span><span>{item.finding_count}</span><span>{item.overall_score}/100</span><span>{new Date(item.created_at).toLocaleString()}</span><span><ArrowUpRight /></span>
          </button>
        ))}
        {!history.length && <EmptyState title="No matching scans" text="Adjust the filters or run a new assessment." />}
      </div>
    </section>
  );
}

export function FindingsView({ result }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [openGroup, setOpenGroup] = useState(null);
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const findings = useMemo(() => {
    const rows = (result?.findings || []).filter((item) => {
      const haystack = [item.secret_type, item.credential_provider, item.credential_kind, item.matched_identifier, item.rule_id, item.source_address, item.file_path, item.observed_evidence, item.affected_component].join(" ").toLowerCase();
      return (!deferredQuery || haystack.includes(deferredQuery)) && (!severity || item.risk_level === severity);
    });
    return [...rows].sort((a, b) => (severityOrder[b.risk_level] - severityOrder[a.risk_level]) * (sortDirection === "desc" ? 1 : -1));
  }, [deferredQuery, result, severity, sortDirection]);
  const groups = findingGroups.map((group) => ({ ...group, findings: findings.filter((item) => findingGroupId(item) === group.id) })).filter((group) => group.findings.length);

  useEffect(() => {
    setOpenGroup(groups[0]?.id || null);
    setSelectedFinding((current) => {
      if (current && findings.some((item) => findingKey(item) === findingKey(current))) return current;
      return groups[0]?.findings[0] || null;
    });
  }, [result?.id, severity, deferredQuery]);

  if (!result) return <PanelEmpty icon={FileSearch} title="No assessment selected" text="Run a scan or open one from history to review vulnerabilities." />;
  return (
    <div className="view-stack view-enter">
      <section className="finding-summary-grid">
        <article><StatusBadge status="Confirmed" /><strong>{verificationCount(result, "detected")}</strong><span>directly evidenced</span></article>
        <article><StatusBadge status="Needs verification" /><strong>{verificationCount(result, "potential")}</strong><span>not claimed as fact</span></article>
        <article><StatusBadge status="Advisory" /><strong>{verificationCount(result, "advisory")}</strong><span>defense-in-depth</span></article>
        <article><StatusBadge status="Total signals" /><strong>{result.findings.length}</strong><span>reviewable evidence</span></article>
      </section>
      <section className="panel findings-panel">
        <div className="table-toolbar">
          <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search finding, asset, rule, or evidence" /></label>
          <label className="filter-select"><Filter /><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">All severities</option>{severities.map((level) => <option key={level}>{level}</option>)}</select></label>
          <button className="secondary-button" onClick={() => setSortDirection((value) => value === "desc" ? "asc" : "desc")}><ArrowDown /> Severity {sortDirection === "desc" ? "high first" : "low first"}</button>
        </div>
        <div className="findings-workspace">
          <div className="finding-categories">
            {groups.map((group) => {
              const expanded = openGroup === group.id;
              const highest = group.findings.reduce((level, item) => severityOrder[item.risk_level] > severityOrder[level] ? item.risk_level : level, "LOW");
              return (
                <section className="finding-category" key={group.id}>
                  <button className="category-banner" aria-expanded={expanded} onClick={() => setOpenGroup(expanded ? null : group.id)}>
                    <span className="category-icon"><ShieldCheck /></span><span><strong>{group.label}</strong><small>{group.description}</small></span><span className="category-count">{group.findings.length}</span><SeverityBadge level={highest} /><ChevronDown />
                  </button>
                  {expanded && <FindingTable findings={group.findings} onSelect={setSelectedFinding} result={result} selectedFinding={selectedFinding} />}
                </section>
              );
            })}
            {!groups.length && <EmptyState title="No matching findings" text="Try another keyword or severity filter." />}
          </div>
          {selectedFinding
            ? <FindingInspector finding={selectedFinding} result={result} />
            : <div className="finding-inspector inspector-empty"><FileSearch /><strong>Select a finding</strong><p>Exact public evidence and remediation guidance will appear here.</p></div>}
        </div>
      </section>
    </div>
  );
}

function FindingTable({ findings, onSelect, result, selectedFinding }) {
  return (
    <div className="data-table finding-table">
      <div className="table-head"><span>Finding</span><span>Severity</span><span>Asset</span><span>Evidence</span><span>First seen</span><span>Status</span></div>
      {findings.map((finding) => (
        <button className={`table-row ${findingKey(finding) === findingKey(selectedFinding || {}) ? "selected" : ""}`} key={findingKey(finding)} onClick={() => onSelect(finding)}>
          <span className="table-primary"><span className="finding-type-icon"><Fingerprint /></span><span><strong>{finding.secret_type}</strong><small>{finding.credential_provider ? `${finding.credential_provider} // ${finding.rule_id}` : finding.rule_id}</small></span></span>
          <span><SeverityBadge level={finding.risk_level} /></span>
          <span className="truncate-cell">{finding.file_path || finding.source_address || result.source_name}</span>
          <span className="truncate-cell">{finding.observed_evidence || finding.context_snippet || finding.explanation?.summary}</span>
          <span>{result.created_at ? new Date(result.created_at).toLocaleDateString() : "Current scan"}</span>
          <span><StatusBadge status={verificationLabel(finding.verification_status)} /></span>
        </button>
      ))}
    </div>
  );
}

function FindingInspector({ finding, result }) {
  const explanation = finding.explanation || {};
  const learning = explanation.learning || {};
  const fixes = explanation.developer_fixes || {};
  const exactLocation = findingLocation(finding, result.source_name);
  return (
      <aside className="finding-inspector" aria-label={`${finding.secret_type} details`}>
        <header><div><span className="eyebrow">{finding.rule_id}</span><h2>{finding.secret_type}</h2></div><StatusBadge status={verificationLabel(finding.verification_status)} /></header>
        <div className="drawer-badges"><SeverityBadge level={finding.risk_level} /><StatusBadge status={verificationLabel(finding.verification_status)} />{finding.confidence > 0 && <span className="confidence-badge">{Math.round(finding.confidence * 100)}% evidence confidence</span>}</div>
        {finding.credential_provider && <section className="drawer-section api-identity-panel"><h3>API credential identity</h3><dl><div><dt>Provider</dt><dd><strong>{finding.credential_provider}</strong></dd></div><div><dt>Credential type</dt><dd>{finding.credential_kind || finding.secret_type}</dd></div>{finding.matched_identifier && <div><dt>Matched assignment</dt><dd><code>{finding.matched_identifier}</code></dd></div>}<div><dt>Redacted fingerprint</dt><dd><code>{finding.value_preview}</code></dd></div><div className="api-scope-note"><dt>What this proves</dt><dd>{finding.provider_scope || "The credential family was identified from its format; permissions and validity require authorized provider-side verification."}</dd></div></dl></section>}
        <section className="drawer-section evidence-summary"><h3>Evidence and scope</h3><dl><div><dt>Affected location</dt><dd><code>{exactLocation}</code></dd></div><div><dt>Affected component</dt><dd>{finding.affected_component || finding.secret_type}</dd></div><div><dt>Observed</dt><dd>{finding.observed_evidence || finding.context_snippet || explanation.summary}</dd></div><div><dt>Conclusion</dt><dd>{verificationExplanation(finding.verification_status)}</dd></div><div><dt>Expected secure state</dt><dd>{finding.expected_value || explanation.remediation}</dd></div><div><dt>Detection method</dt><dd>{finding.detection_method || "Pattern and context analysis"}</dd></div></dl></section>
        {finding.source_address && <a className="secondary-button evidence-source-link" href={safeHttpUrl(finding.source_address)} target="_blank" rel="noreferrer">Open public evidence source <ExternalLink /></a>}
        <section className="drawer-section"><h3>Impact</h3><p>{explanation.attacker_impact}</p><p>{explanation.business_impact}</p></section>
        <section className="drawer-section"><h3>Recommended remediation</h3><p>{explanation.remediation}</p></section>
        <div className="mapping-row">{[finding.owasp, finding.cwe, finding.capec, finding.cve].filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div>

        {Object.keys(learning).length > 0 && <details className="drawer-accordion" open><summary><ShieldQuestion /> Learning Mode <ChevronDown /></summary><div className="learning-content"><LearningText title="What is this security signal?" text={learning.definition} /><LearningText title="When can it become dangerous?" text={learning.why_dangerous} /><LearningText title="How attackers may use it" text={learning.attacker_method} /><LearningText title="Generalized example" text={learning.real_world_example} /><LearningText title="Potential business impact" text={learning.business_impact} /><LearningList title="Common mistakes" items={learning.common_mistakes} /><LearningList title="Step-by-step remediation" items={learning.remediation_steps} ordered /><LearningList title="Prevention checklist" items={learning.prevention_checklist} /></div></details>}
        {Object.keys(fixes).length > 0 && <details className="drawer-accordion"><summary><Code2 /> Developer Fix Assistant <ChevronDown /></summary><div className="learning-content"><p>{fixes.generic}</p>{Object.entries(fixes.snippets || {}).map(([framework, snippet]) => <CodeSnippet framework={framework} snippet={snippet} key={framework} />)}</div></details>}
        {(learning.references || []).length > 0 && <section className="drawer-section"><h3>Official references</h3><div className="reference-list">{learning.references.map((reference) => <a href={safeHttpUrl(reference.url)} target="_blank" rel="noreferrer" key={reference.url}>{reference.title}<ExternalLink /></a>)}</div></section>}
      </aside>
  );
}

function LearningText({ text, title }) { return text ? <div><h4>{title}</h4><p>{text}</p></div> : null; }
function LearningList({ items = [], ordered = false, title }) { const Tag = ordered ? "ol" : "ul"; return items.length ? <div><h4>{title}</h4><Tag>{items.map((item) => <li key={item}>{item}</li>)}</Tag></div> : null; }

function CodeSnippet({ framework, snippet }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(snippet); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return <div className="code-snippet"><div><strong>{framework}</strong><button onClick={copy}>{copied ? <Check /> : <Clipboard />}{copied ? "Copied" : "Copy"}</button></div><pre>{snippet}</pre></div>;
}

export function AssetsView({ result }) {
  const [tab, setTab] = useState("overview");
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const assessment = result?.assessment;
  if (!assessment) return <PanelEmpty icon={BoxesIcon} title="No website asset data" text="Run or open a website scan to explore endpoints, technologies, headers, DNS, TLS, and subdomains." />;
  const tabs = ["overview", "endpoints", "technologies", "headers", "infrastructure", "subdomains"];
  return (
    <div className="view-stack view-enter">
      <section className="asset-hero panel"><div><span className="asset-large-icon"><Globe2 /></span><div><span className="eyebrow">Primary asset</span><h2>{result.source_name}</h2><p>{assessment.endpoints?.length || 0} endpoints · {assessment.technologies?.length || 0} technologies · {assessment.subdomains?.length || 0} subdomains</p></div></div><div className="asset-score"><strong>{result.security_score}</strong><span>Security score</span></div></section>
      <nav className="tab-bar" aria-label="Asset views">{tabs.map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
      {tab === "overview" && <AssetOverview result={result} assessment={assessment} />}
      {tab === "endpoints" && <EndpointInventory endpoints={assessment.endpoints || []} selected={selectedEndpoint} onSelect={setSelectedEndpoint} />}
      {tab === "technologies" && <TechnologyInventory technologies={assessment.technologies || []} />}
      {tab === "headers" && <HeaderInventory headers={assessment.headers || []} cookies={assessment.cookies || []} cors={assessment.cors || {}} />}
      {tab === "infrastructure" && <InfrastructureInventory assessment={assessment} />}
      {tab === "subdomains" && <SubdomainInventory subdomains={assessment.subdomains || []} />}
    </div>
  );
}

function AssetOverview({ assessment, result }) {
  const advisor = result.advisor || {};
  return <div className="asset-overview-grid"><article className="panel advisor-panel"><PanelTitle icon={ShieldQuestion} title="Security advisor" subtitle={`Likelihood: ${advisor.likelihood || "Unavailable"}`} /><p className="lead-copy">{advisor.executive_summary}</p><dl><div><dt>Technical summary</dt><dd>{advisor.technical_summary}</dd></div><div><dt>Business impact</dt><dd>{advisor.business_impact}</dd></div><div><dt>Estimated fix window</dt><dd>{advisor.estimated_fix_time}</dd></div></dl></article><article className="panel"><PanelTitle icon={Activity} title="Scan comparison" subtitle="Change from the previous assessment" />{result.comparison?.has_previous ? <div className="comparison-display"><strong>{result.comparison.risk_change > 0 ? "+" : ""}{result.comparison.risk_change}</strong><p>risk score change</p><span>{result.comparison.new_findings.length} new · {result.comparison.fixed_findings.length} fixed</span></div> : <EmptyState title="Baseline assessment" text="Re-scan this target to track new and fixed findings." />}</article><article className="panel"><PanelTitle icon={Waypoints} title="Completed phases" subtitle="Modules completed in this assessment" /><div className="phase-list">{(assessment.phases || []).map((phase) => <span key={phase.name}><CheckCircle2 />{phase.name}<small>{phase.status}</small></span>)}</div></article></div>;
}

function EndpointInventory({ endpoints, onSelect, selected }) {
  const [query, setQuery] = useState("");
  const filtered = endpoints.filter((item) => `${item.url} ${item.type} ${item.source}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel"><div className="table-toolbar"><label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search endpoints" /></label><span className="result-count">{filtered.length} endpoints</span></div><div className="split-inventory"><div className="endpoint-list">{filtered.map((endpoint) => <button className={selected?.url === endpoint.url ? "selected" : ""} key={`${endpoint.url}-${endpoint.type}`} onClick={() => onSelect(endpoint)}><StatusCode status={endpoint.status} /><span><strong>{endpoint.path}</strong><small>{endpoint.type} · {endpoint.source}</small></span><ArrowUpRight /></button>)}</div><aside>{selected ? <><span className="eyebrow">Endpoint details</span><h3>{selected.path}</h3><dl><div><dt>Full address</dt><dd><code>{selected.url}</code></dd></div><div><dt>HTTP status</dt><dd>{selected.status}</dd></div><div><dt>Type</dt><dd>{selected.type}</dd></div><div><dt>Discovered from</dt><dd>{selected.source}</dd></div></dl><a className="secondary-button" href={safeHttpUrl(selected.url)} target="_blank" rel="noreferrer">Open endpoint <ExternalLink /></a></> : <EmptyState title="Select an endpoint" text="Choose a discovered route to inspect its evidence." />}</aside></div></section>;
}

function TechnologyInventory({ technologies }) { return <section className="technology-grid">{technologies.map((item) => <article className="panel" key={`${item.name}-${item.version}`}><span className="technology-icon"><Braces /></span><div><span className="eyebrow">{item.category || "Technology"}</span><h3>{item.name} {item.version && <b>{item.version}</b>}</h3><p>{item.evidence || "Detected from a public response fingerprint."}</p><span className="confidence-badge">{item.confidence || "Observed"}</span></div></article>)}{!technologies.length && <PanelEmpty icon={Code2} title="No reliable technology signatures" text="The target did not expose a sufficiently strong fingerprint." />}</section>; }

function HeaderInventory({ cookies, cors, headers }) { return <div className="asset-overview-grid"><article className="panel header-inventory"><PanelTitle icon={ShieldCheck} title="Security headers" subtitle={`${headers.filter((item) => item.present).length} of ${headers.length} present`} />{headers.map((header) => <div key={header.name}><span className={`status-dot ${header.present ? "status-good" : "status-danger"}`} /><span><strong>{header.name}</strong><small>{header.value || header.recommendation}</small></span><b>{header.present ? "Present" : header.risk}</b></div>)}</article><article className="panel"><PanelTitle icon={KeyRound} title="Cookies" subtitle={`${cookies.length} observed`} /><div className="data-list">{cookies.map((cookie) => <DataRow key={cookie.name} label={cookie.name} value={`${cookie.secure ? "Secure" : "No Secure"} / ${cookie.http_only ? "HttpOnly" : "No HttpOnly"} / SameSite ${cookie.same_site || "missing"}`} />)}{!cookies.length && <EmptyState title="No cookies observed" text="The public response did not set a cookie." />}</div></article><article className="panel"><PanelTitle icon={Network} title="CORS policy" subtitle="Cross-origin response" /><div className="data-list"><DataRow label="Allowed origin" value={cors.allow_origin || "Not granted"} /><DataRow label="Credentials" value={cors.allow_credentials || "Not granted"} /><DataRow label="Probe origin" value={cors.request_origin || "Not tested"} /></div></article></div>; }

function InfrastructureInventory({ assessment }) { const ssl = assessment.ssl || {}; const dns = assessment.dns || {}; const threat = assessment.threat_intelligence || {}; return <div className="infrastructure-grid"><article className="panel"><PanelTitle icon={LockKeyhole} title="SSL / TLS" subtitle={ssl.valid ? "Certificate valid" : "Needs attention"} /><div className="data-list"><DataRow label="Issuer" value={ssl.issuer} /><DataRow label="TLS version" value={ssl.tls_version} /><DataRow label="Cipher" value={ssl.cipher} /><DataRow label="Expires" value={ssl.expires_at} /><DataRow label="Days remaining" value={ssl.days_remaining} /></div></article><article className="panel"><PanelTitle icon={Network} title="DNS posture" subtitle={dns.dnssec ? "DNSSEC detected" : "DNSSEC not detected"} /><div className="data-list">{Object.entries(dns.records || {}).map(([type, values]) => <DataRow label={type} value={values?.length ? values.slice(0, 3).join(" · ") : "Not found"} key={type} />)}</div></article><article className="panel"><PanelTitle icon={Server} title="Public network" subtitle="Free RDAP and DNS intelligence" /><div className="data-list"><DataRow label="IP address" value={threat.ip} /><DataRow label="Reverse DNS" value={threat.reverse_dns} /><DataRow label="Network" value={threat.asn_name || threat.handle} /><DataRow label="Country" value={threat.country} /><DataRow label="Range" value={threat.network} /></div></article></div>; }

function SubdomainInventory({ subdomains }) { return <section className="panel"><PanelTitle icon={Server} title="Subdomains" subtitle={`${subdomains.filter((item) => item.alive).length} responding of ${subdomains.length} discovered`} /><div className="subdomain-table">{subdomains.map((item) => <div key={item.hostname}><span className={`status-dot ${item.alive ? "status-good" : "status-muted"}`} /><span><strong>{item.hostname}</strong><small>{item.ips?.join(", ") || "No public address resolved"}</small></span><span>{item.status || "No response"}</span><span>{item.technology || "Unknown"}</span><span>{item.ssl ? "TLS" : "No TLS"}</span></div>)}</div></section>; }

export function CveView({ result }) {
  const cves = result?.assessment?.cve_matches || [];
  return <section className="panel view-enter"><div className="notice"><Database /><div><strong>Exact-version correlation only</strong><p>LeakShield queries the free NIST NVD API only when a public response exposes an explicit version. Matches still require administrator confirmation.</p></div></div><div className="cve-list-enterprise">{cves.map((cve) => <article key={`${cve.id}-${cve.technology}`}><span className="cve-id">{cve.id}</span><div><h3>{cve.technology} {cve.version}</h3><p>{cve.description || "Official NVD match for the observed software version."}</p><small>Source: NIST National Vulnerability Database</small></div><SeverityBadge level={cve.severity || "MEDIUM"} /><strong>{cve.score || "-"}</strong><a className="icon-button" href={safeHttpUrl(cve.url)} target="_blank" rel="noreferrer" aria-label={`Open ${cve.id}`}><ExternalLink /></a></article>)}{!cves.length && <EmptyState title="No exact-version CVE matches" text="No verified version match was returned. This does not prove the software is vulnerability-free." />}</div></section>;
}

export function ReportsView({ result }) {
  const reports = [
    { type: "PDF", icon: Download, text: "Print-ready executive and technical report", action: () => window.print() },
    { type: "HTML", icon: FileCode2, text: "Standalone browser report", action: () => exportHtml(result) },
    { type: "JSON", icon: FileJson, text: "Complete machine-readable scan result", action: () => downloadFile(`${reportName(result)}.json`, JSON.stringify(result, null, 2), "application/json") },
    { type: "CSV", icon: Database, text: "Finding inventory for spreadsheets", action: () => exportCsv(result) }
  ];
  if (!result) return <PanelEmpty icon={Download} title="No report available" text="Run or open a scan before exporting a report." />;
  return <div className="view-stack view-enter"><section className="report-hero panel"><div><span className="eyebrow">Latest assessment</span><h2>{result.source_name}</h2><p>{verificationCount(result, "detected")} confirmed · {verificationCount(result, "potential")} need verification · {verificationCount(result, "advisory")} advisory · Grade {result.grade || "-"} · Generated {new Date(result.created_at).toLocaleString()}</p></div><div className="report-grade"><strong>{result.grade || "-"}</strong><span>{result.security_score ?? 0}/100</span></div></section><section className="report-grid">{reports.map(({ action, icon: Icon, text, type }) => <article className="panel" key={type}><span className="report-icon"><Icon /></span><div><h3>{type} report</h3><p>{text}</p></div><button className="secondary-button" onClick={action}><Download /> Export {type}</button></article>)}</section><section className="notice"><ShieldCheck /><div><strong>Privacy-first exports</strong><p>Exports are generated inside your browser from the active scan result. Secret values remain redacted.</p></div></section></div>;
}

export function IntegrationsView({ result }) {
  const sources = result?.assessment?.data_sources || ["Direct public HTTP/DNS/TLS checks", "Certificate Transparency (crt.sh)", "RDAP", "NIST NVD CVE API"];
  const descriptions = { "Direct public HTTP/DNS/TLS checks": "Headers, certificates, DNS records and public responses", "Certificate Transparency (crt.sh)": "Free public certificate logs for subdomain discovery", RDAP: "Free registration and network ownership information", "NIST NVD CVE API": "Official public CVE data for exact software versions" };
  return <div className="view-stack view-enter"><section className="notice"><PlugIcon /><div><strong>No paid security service required</strong><p>Every source below is free, public, or open. Shodan is not used and no Shodan API key is required.</p></div></section><section className="integration-grid">{sources.map((source) => <article className="panel" key={source}><span className="integration-mark">{source.slice(0, 2).toUpperCase()}</span><div><h3>{source}</h3><p>{descriptions[source] || "Free public security intelligence source."}</p><span className="connected-state"><span className="status-dot status-good" /> Connected</span></div></article>)}</section></div>;
}

export function SettingsView({ theme, onToggleTheme }) {
  const [defaultMode, setDefaultMode] = useState(() => localStorage.getItem("leakshield.defaultMode") || "website");
  const [denseTables, setDenseTables] = useState(() => localStorage.getItem("leakshield.denseTables") === "true");
  function updateMode(event) { setDefaultMode(event.target.value); localStorage.setItem("leakshield.defaultMode", event.target.value); }
  function updateDensity(event) { setDenseTables(event.target.checked); localStorage.setItem("leakshield.denseTables", String(event.target.checked)); document.documentElement.dataset.density = event.target.checked ? "compact" : "comfortable"; }
  return <div className="settings-stack view-enter"><section className="panel settings-section"><PanelTitle icon={Settings2} title="Appearance" subtitle="Saved locally in this browser" /><div className="setting-row"><div><strong>Color theme</strong><p>Use the polished light theme or the low-glare dark theme.</p></div><button className="secondary-button" onClick={onToggleTheme}>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</button></div><label className="setting-row"><div><strong>Compact tables</strong><p>Reduce row height when reviewing a large amount of evidence.</p></div><input type="checkbox" className="switch" checked={denseTables} onChange={updateDensity} /></label></section><section className="panel settings-section"><PanelTitle icon={ScanLineIcon} title="Assessment defaults" subtitle="Saved only in this browser" /><label className="setting-row"><div><strong>Default input type</strong><p>Choose which assessment input opens first.</p></div><select value={defaultMode} onChange={updateMode}><option value="website">Website</option><option value="text">Text or config</option><option value="project-folder">Project folder</option></select></label></section><section className="panel settings-section"><PanelTitle icon={LockKeyhole} title="Safety boundaries" subtitle="Built into every assessment" /><div className="data-list"><DataRow label="Target credentials" value="Never stored" /><DataRow label="Finding values" value="Redacted in reports" /><DataRow label="Paid APIs" value="None required" /><DataRow label="Assessment model" value="Passive and low impact" /></div></section></div>;
}

export function HelpView() { return <div className="view-enter"><KnowledgeBase /></div>; }

export function PanelTitle({ action, icon: Icon, subtitle, title }) { return <header className="panel-title"><div className="panel-title-icon"><Icon /></div><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <span className="panel-title-action">{action}</span>}</header>; }
export function SeverityBadge({ level = "LOW" }) { return <span className={`severity-badge severity-${level.toLowerCase()}`}><span />{level}</span>; }
function StatusBadge({ status }) { return <span className="status-badge"><span />{status}</span>; }
function verificationLabel(status) { return status === "detected" ? "Confirmed" : status === "potential" ? "Needs verification" : "Advisory"; }
function verificationExplanation(status) { return status === "detected" ? "The scanner directly observed enough specific evidence to confirm this condition." : status === "potential" ? "The scanner observed an indicator, but cannot prove exploitability or business context without authorized manual verification." : "This is a defense-in-depth recommendation and is not being claimed as an exploitable vulnerability."; }
function verificationCount(result, status) { const key = status === "detected" ? "confirmed_finding_count" : status === "potential" ? "potential_finding_count" : "advisory_count"; return result?.[key] ?? (result?.findings || []).filter((item) => item.verification_status === status).length; }
function StatusCode({ status }) { const tone = status >= 200 && status < 300 ? "good" : status >= 300 && status < 400 ? "warn" : "danger"; return <span className={`status-code status-code-${tone}`}>{status || "-"}</span>; }
function DataRow({ label, value }) { return <div><dt>{label}</dt><dd>{value ?? "Unavailable"}</dd></div>; }
function EmptyState({ text, title }) { return <div className="empty-state"><FileSearch /><strong>{title}</strong><p>{text}</p></div>; }
function PanelEmpty({ icon: Icon, text, title }) { return <section className="panel panel-empty view-enter"><Icon /><h2>{title}</h2><p>{text}</p></section>; }

function findingGroupId(finding) {
  const rule = (finding.rule_id || "").toLowerCase();
  const location = finding.location_type || "";
  if (rule.startsWith("nvd-")) return "cves";
  if (rule.startsWith("weak-cookie-") || rule.startsWith("cors-")) return "browser";
  if (location.startsWith("tls_") || rule.includes("transport-security") || rule.includes("certificate")) return "transport";
  if (location === "dns_record" || rule === "missing-dmarc" || rule.startsWith("exposed-port-")) return "network";
  if (["sql-", "xss", "csrf", "redirect", "file-upload", "password-form"].some((value) => rule.includes(value))) return "application";
  if (location === "http_response_header" || rule.startsWith("missing-") || rule.startsWith("weak-csp-") || rule.startsWith("weak-hsts-") || rule.includes("clickjacking") || rule.startsWith("version-disclosure-")) return "headers";
  if (location === "public_url" || rule.startsWith("public-") || rule === "directory-listing" || rule === "debug-stack-trace") return "exposure";
  if (["project_file", "pasted_text", "response_body"].includes(location) || finding.secret_type?.toLowerCase().includes("potential")) return "secrets";
  return "other";
}

function findingKey(finding) { return [finding.rule_id, finding.line_number, finding.column_start, finding.file_path || finding.source_address].join("-"); }
function findingLocation(finding, fallback = "Unknown source") { const address = finding.file_path || finding.source_address || fallback; return finding.file_path || ["response_body", "html_form", "project_file", "pasted_text"].includes(finding.location_type) ? `${address}:${finding.line_number || 1}:${finding.column_start || 1}` : address; }
function formatRelativeDate(value) { const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000); if (hours < 1) return "Just now"; if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return `${days}d ago`; }
function safeHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.toString() : "#"; } catch { return "#"; } }
function reportName(result) { return `leakshield-${(result?.source_name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`; }
function securityScoreFor(result) { return result ? result.security_score ?? Math.max(0, 100 - (result.overall_score || 0)) : 0; }
function gradeForScore(score) { if (score >= 90) return "A"; if (score >= 80) return "B"; if (score >= 70) return "C"; if (score >= 55) return "D"; return "F"; }
function downloadFile(name, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function exportCsv(result) { const header = ["Finding", "Provider", "Credential type", "Rule", "Severity", "Exact location", "Evidence", "Remediation"]; const rows = (result.findings || []).map((item) => [item.secret_type, item.credential_provider || "Not provider-specific", item.credential_kind || "", item.rule_id, item.risk_level, findingLocation(item, result.source_name), item.observed_evidence || item.context_snippet, item.explanation?.remediation]); downloadFile(`${reportName(result)}.csv`, [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv"); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function exportHtml(result) { const findings = (result.findings || []).map((item) => `<article><span>${escapeHtml(item.risk_level)}</span><h2>${escapeHtml(item.secret_type)}</h2>${item.credential_provider ? `<p><strong>Provider:</strong> ${escapeHtml(item.credential_provider)}</p>` : ""}<p><strong>Exact location:</strong> ${escapeHtml(findingLocation(item, result.source_name))}</p><p><strong>Evidence:</strong> ${escapeHtml(item.observed_evidence || item.context_snippet)}</p><p><strong>Remediation:</strong> ${escapeHtml(item.explanation?.remediation)}</p></article>`).join(""); const html = `<!doctype html><html><head><meta charset="utf-8"><title>LeakShield report</title><style>body{font:16px sans-serif;max-width:960px;margin:40px auto;color:#0f172a}header{border-bottom:3px solid #2563eb;padding-bottom:20px}article{border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:16px 0}span{font-weight:700;color:#dc2626}p{line-height:1.6}</style></head><body><header><h1>LeakShield Pro Security Report</h1><p>${escapeHtml(result.source_name)} · Grade ${escapeHtml(result.grade)} · ${escapeHtml(result.finding_count)} findings</p></header>${findings}</body></html>`; downloadFile(`${reportName(result)}.html`, html, "text/html"); }

function BoxesIcon(props) { return <Globe2 {...props} />; }
function PlugIcon(props) { return <Network {...props} />; }
function ScanLineIcon(props) { return <Activity {...props} />; }
