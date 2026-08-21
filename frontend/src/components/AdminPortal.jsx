import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, Loader2, LockKeyhole, LogOut, RefreshCw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { adminLogin, adminLogout, adminToken, clearAdminAudit, fetchAdminAudit } from "../api";

export default function AdminPortal() {
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
      if (/authentication/i.test(auditError.message)) {
        adminLogout();
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (token) loadAudit(token); }, [loadAudit, token]);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await adminLogin(email, password);
      setToken(session.token);
      setPassword("");
    } catch (loginError) {
      setError(loginError.message);
      setLoading(false);
    }
  }

  async function clearRecords() {
    if (!window.confirm("Permanently clear all redacted audit records?")) return;
    try {
      await clearAdminAudit(token);
      setRecords([]);
      setUsers([]);
      setSelectedUserId("");
    } catch (clearError) { setError(clearError.message); }
  }

  function logout() {
    adminLogout();
    setToken("");
    setRecords([]);
    setUsers([]);
  }

  if (!token) {
    return <main className="auth-shell">
      <div className="auth-noise" aria-hidden="true" />
      <form className="auth-card" onSubmit={login}>
        <header><span className="brand-shield"><ShieldCheck /></span><div><strong>LeakShield Pro</strong><small>Administrator portal</small></div></header>
        <div className="auth-clearance"><LockKeyhole /><span>Secure administrator access</span></div>
        <h1>Admin sign in</h1>
        <p>This page is separate from the public workspace and is available only to authorized administrators.</p>
        <label className="form-field"><span>Email address</span><input required autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="form-field"><span>Password</span><input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="alert alert-error"><AlertTriangle /><span>{error}</span></div>}
        <button className="primary-button primary-button-large" disabled={loading} type="submit">{loading ? <Loader2 className="spin" /> : <LockKeyhole />} Sign in securely</button>
        <a className="text-button auth-return" href="/">Return to public workspace</a>
      </form>
    </main>;
  }

  const stats = [
    ["Users", users.length],
    ["Scan records", records.length],
    ["Findings", records.reduce((sum, record) => sum + (record.result_shown_to_user?.finding_count || 0), 0)],
    ["Critical findings", records.filter((record) => record.result_shown_to_user?.overall_level === "CRITICAL").length]
  ];

  return <main className="admin-console">
    <header className="admin-topbar">
      <div><span className="brand-shield"><ShieldCheck /></span><span><strong>LeakShield Pro</strong><small>Administrator portal</small></span></div>
      <nav><button className="secondary-button" onClick={() => loadAudit(token)}><RefreshCw /> Refresh</button><button className="secondary-button danger-button" onClick={clearRecords}><Trash2 /> Clear records</button><button className="secondary-button" onClick={logout}><LogOut /> Sign out</button></nav>
    </header>
    <div className="admin-canvas">
      <header className="admin-heading"><p>Privacy-safe audit storage</p><h1>Administration overview</h1><span>Review redacted user sessions and the assessment results returned to each browser.</span></header>
      {error && <div className="alert alert-error"><AlertTriangle /><span>{error}</span></div>}
      <section className="admin-stat-grid">{stats.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
      <section className="admin-layout">
        <aside className="panel admin-users"><header><UserRound /><span><strong>User sessions</strong><small>{storage?.provider || "storage unavailable"}</small></span></header><div>{users.map((user) => <button className={selectedUser?.id === user.id ? "active" : ""} key={user.id} onClick={() => setSelectedUserId(user.id)}><span><strong>{user.id}</strong><small>{user.scan_count} scans / {user.finding_count} findings</small></span><b>{user.latest_risk || "LOW"}</b></button>)}{!users.length && <p className="admin-empty">{loading ? "Loading the protected index..." : "No audit records yet."}</p>}</div></aside>
        <section className="panel admin-record-view">
          <header><Database /><span><strong>{selectedUser?.id || "No session selected"}</strong><small>{selectedUser ? `${selectedUser.scan_count} stored assessment(s)` : "Choose a user session"}</small></span></header>
          <div className="admin-record-list">{(selectedUser?.records || []).map((record) => { const scan = record.result_shown_to_user || {}; return <details key={record.id}><summary><span><strong>{record.submitted_input?.source_name || "Assessment"}</strong><small>{new Date(record.created_at).toLocaleString()}</small></span><b>{scan.overall_level || "LOW"}</b></summary><pre>{JSON.stringify({ record_id: record.id, submitted_input: record.submitted_input, result_shown_to_user: scan }, null, 2)}</pre></details>; })}</div>
        </section>
      </section>
    </div>
  </main>;
}
