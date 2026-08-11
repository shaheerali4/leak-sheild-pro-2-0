const crypto = require("crypto");
const { clearAuditRecords, listAuditRecords, listAuditUsers, storageProvider } = require("./_auditStore");
const { parseJsonBody, rateLimit, safeCredentialEqual, safeStringEqual, setApiSecurityHeaders } = require("./_security");

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET?.length >= 32
    ? process.env.ADMIN_SESSION_SECRET
    : null;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const TOKEN_ISSUER = "leakshield-admin";

function adminCredentials() {
  try {
    const parsed = JSON.parse(process.env.ADMIN_ACCOUNTS_JSON || "[]");
    if (!Array.isArray(parsed)) return [];

    const seenEmails = new Set();
    const credentials = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const email = typeof item.email === "string" ? item.email.trim().toLowerCase() : "";
      const password = typeof item.password === "string" ? item.password : "";
      if (!email || !password || seenEmails.has(email)) continue;
      seenEmails.add(email);
      credentials.push({ email, password });
    }
    return credentials;
  } catch {
    return [];
  }
}

function findAdmin(email, password) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return adminCredentials().find(
    (credential) =>
      safeCredentialEqual(normalizedEmail, credential.email) && safeCredentialEqual(password, credential.password)
  );
}

function json(res, status, body) {
  res.status(status).json(body);
}

function setSecurityHeaders(req, res) {
  setApiSecurityHeaders(req, res, { methods: "GET,POST,DELETE,OPTIONS" });
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  if (!SESSION_SECRET) return null;
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function createToken(email) {
  const now = Date.now();
  const payload = base64Url(
    JSON.stringify({
      email,
      iss: TOKEN_ISSUER,
      iat: now,
      exp: now + SESSION_TTL_MS,
      jti: crypto.randomUUID()
    })
  );
  return `${payload}.${sign(payload)}`;
}

function verifyToken(req) {
  if (!SESSION_SECRET) return null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeStringEqual(sign(payload), signature)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Date.now();
    const validAdmin = adminCredentials().some((credential) => safeCredentialEqual(decoded.email, credential.email));
    if (
      decoded.iss !== TOKEN_ISSUER ||
      !Number.isFinite(decoded.iat) ||
      !Number.isFinite(decoded.exp) ||
      decoded.iat > now + 30_000 ||
      decoded.exp <= now ||
      decoded.exp - decoded.iat > SESSION_TTL_MS ||
      !decoded.jti ||
      !validAdmin
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  setSecurityHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "POST") {
    if (!rateLimit(req, res, "admin-login", { limit: 5, windowMs: 15 * 60 * 1000 })) return;
    const credentials = adminCredentials();
    if (!credentials.length || !SESSION_SECRET || credentials.some(({ password }) => password.length < 12)) {
      return json(res, 503, { detail: "Admin credentials are not configured" });
    }
    let body;
    try {
      body = parseJsonBody(req, 8_192);
    } catch (error) {
      return json(res, error.statusCode || 400, { detail: error.message });
    }
    const email = typeof body.email === "string" ? body.email.slice(0, 320) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 256) : "";
    const admin = findAdmin(email, password);
    if (!admin) {
      return json(res, 401, { detail: "Invalid admin credentials" });
    }
    return json(res, 200, { token: createToken(admin.email), email: admin.email });
  }

  const admin = verifyToken(req);
  if (!admin) return json(res, 401, { detail: "Admin authentication required" });

  if (req.method === "GET") {
    return json(res, 200, {
      admin: admin.email,
      records: await listAuditRecords(),
      users: await listAuditUsers(),
      storage: {
        provider: storageProvider(),
        grouping: "one_user_box_per_browser_session"
      }
    });
  }

  if (req.method === "DELETE") {
    await clearAuditRecords();
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { detail: "Method not allowed" });
};
