# LeakShield Pro - Complete Project Documentation

**Project type:** Free and open-source cybersecurity assessment platform

**Live application:** https://leak-shield-pro-2-0.vercel.app/

**Source code:** https://github.com/shaheerali4/leak-sheild-pro-2-0

**Documentation date:** 22 August 2026

---

## 1. Project in One Sentence

LeakShield Pro safely checks an authorized public website, pasted text, or project folder for security weaknesses, shows the exact evidence it found, explains the risk in simple words, and tells the developer how to fix it.

## 2. The Problem

Many developers and small organizations face three problems:

1. Professional security tools can be expensive.
2. Scanner reports often use difficult technical language.
3. A warning without exact evidence does not help a developer prove or fix the problem.

LeakShield Pro solves these problems by combining security assessment, exact evidence, risk prioritization, education, and remediation guidance in one free platform.

## 3. The Solution

The user gives LeakShield Pro one of these inputs:

- A public website URL, such as `https://example.com`
- Pasted source code, configuration, or CI log text
- An authorized project folder

LeakShield Pro then:

1. Validates the input.
2. Runs safe and bounded security checks.
3. Collects evidence from the target or supplied files.
4. Removes duplicate or weak results.
5. Calculates severity, confidence, and risk.
6. Shows the exact affected URL, file, line, component, or header.
7. Explains why the issue matters.
8. Provides a practical fix and trusted references.
9. Stores the result in the current browser session's history.

The platform is designed for defensive and authorized security work. It does not attack a website, guess passwords, upload dangerous files, or attempt to bypass access controls.

## 4. Who Can Use It

- Developers who want to check a website before release
- Students learning practical cybersecurity
- Startups that cannot afford commercial scanners
- Small businesses checking their public security posture
- Teachers demonstrating secure development
- Security teams performing an initial authorized assessment

## 5. Main Project Goals

- Make security testing understandable
- Show evidence instead of unsupported claims
- Reduce false positives (warnings that are not actually valid)
- Help developers fix issues, not only find them
- Keep every required feature free to use
- Protect scanned data and sensitive values
- Work on desktop, tablet, and mobile devices
- Remain deployable on Vercel and with Docker

## 6. Complete User Workflow

```text
Open LeakShield Pro
        |
        v
Shield unlock introduction
        |
        v
Console overview
        |
        v
Open Scan and choose an input mode
        |
        v
Enter a public URL, paste text, or select a project folder
        |
        v
LeakShield validates and safely scans the input
        |
        v
Results are scored, grouped, and explained
        |
        v
Open Findings to inspect exact evidence and fixes
        |
        v
Review roadmap, learning guidance, or export the report
        |
        v
Return to scan history or clear the current session's history
```

### Step 1: Opening the application

The shield animation gives the platform a security-focused identity. After the shield unlocks, the main console appears.

### Step 2: Starting a scan

The user opens the **Scan** page and provides an authorized input. Website mode accepts public `http://` or `https://` targets. Private, local, reserved, and internal network addresses are blocked to prevent SSRF (making the server access a private system on somebody else's behalf).

### Step 3: Running assessment phases

For a website, the platform can examine:

- Public pages and discovered routes
- `robots.txt` and `sitemap.xml`
- HTTP security headers
- Cookies and cross-origin rules
- TLS certificate and encryption details
- DNS and email security records
- Public subdomains from free sources
- Detected technologies and exact versions when available
- Public JavaScript files and source maps
- Potentially exposed secrets, backups, configuration, or Git files
- Public login, admin, form, upload, and API surfaces
- Bounded common service ports
- Known CVEs only when an exact software version can be matched

### Step 4: Processing the evidence

Each result passes through detection, risk, and explanation modules. The platform records what was observed, where it was observed, what secure behavior was expected, and how the result can be verified.

### Step 5: Reading findings

Similar findings are grouped under expandable sections. Opening a section shows only its own contents. A finding can include:

- Vulnerability name
- Severity: Critical, High, Medium, Low, or Informational
- Confidence percentage
- Risk score
- Exact affected URL or file
- Line and column when available
- Affected component or HTTP header
- Redacted evidence
- Detection method
- Verification status
- Business impact
- Recommended fix
- OWASP, CWE, CAPEC, CVE, or official documentation links

### Step 6: Fixing the problem

Learning Mode explains the weakness for beginners and experienced developers. The Developer Fix Assistant can provide safe fixes for Apache, Nginx, Express.js, Next.js, React, Laravel, Node.js, Spring Boot, and generic frameworks when relevant.

### Step 7: History and reports

Completed scans appear in Mission Archive. A user can reopen a previous scan, compare available results, print or save a report as PDF, and clear their own scan history. Clearing normal history does not erase the protected admin audit log.

## 7. What LeakShield Pro Checks

### 7.1 Website discovery

The bounded crawler follows a limited number of safe public links from the same website. It also reads public discovery files and JavaScript references. Bounded means the scanner has strict limits, so it does not crawl forever or overload the target.

It can discover:

- Homepage and same-origin pages
- Login, admin, dashboard, reset, upload, API, documentation, staging, and development routes
- Routes listed in `robots.txt`
- URLs listed in `sitemap.xml`
- Links and API-like paths referenced by public JavaScript

Finding a route does not automatically mean that route is vulnerable. LeakShield reports whether it is simply discovered, publicly reachable, or supported by stronger evidence.

### 7.2 Security headers

The platform checks the presence and configuration of:

- Content-Security-Policy (rules that control which browser resources may load)
- Strict-Transport-Security (a rule that forces future browser visits to use HTTPS)
- X-Frame-Options (protection against unwanted page framing)
- X-Content-Type-Options (prevents unsafe file-type guessing)
- Referrer-Policy (controls address information sent to another site)
- Permissions-Policy (controls browser features such as camera or location)
- COOP, COEP, and CORP (browser isolation and cross-origin protection headers)

### 7.3 TLS and certificates

TLS (the encryption used by HTTPS) checks can include:

- Certificate issuer and hostname
- Expiry date and remaining days
- Negotiated TLS version
- Cipher suite (the encryption method selected by client and server)
- Weak or outdated configuration indicators

### 7.4 DNS and email security

DNS (the system that converts a domain name into network information) checks can include:

- A and AAAA addresses
- MX mail servers
- TXT records
- SPF sender rules
- DMARC email protection policy
- DKIM public signing information when discoverable
- CAA certificate authority rules
- NS name servers
- CNAME aliases
- DNSSEC indicators

### 7.5 Subdomain discovery

LeakShield combines free Certificate Transparency data from `crt.sh` with DNS resolution. Results are normalized and duplicates are removed. It can show whether a discovered host resolves, responds over HTTP, presents TLS, and exposes a server or technology signal.

### 7.6 Technology detection

Wappalyzer-style technology fingerprinting uses public response headers, HTML, scripts, cookies, and known patterns to identify likely technologies. Examples include:

- React, Next.js, Vue, and Angular
- Express and Node.js
- Laravel, Django, and Spring Boot
- WordPress, Drupal, and Joomla
- Apache, Nginx, and Microsoft IIS
- Cloudflare, Bootstrap, and Tailwind CSS

Technology detection is evidence-based but not perfect. A CVE is correlated only when an explicit version is available, which helps prevent unsupported vulnerability claims.

### 7.7 Secrets and public exposure

LeakShield looks for patterns that may represent:

- AWS credentials
- Google API keys
- GitHub tokens
- JWTs and bearer tokens
- Database connection strings
- Private keys
- Firebase configuration
- Generic API credential assignments

The report shows the exact public resource and location while redacting the sensitive value. For example, the user may see `AIza...50Us` instead of the complete key. This proves where the potential exposure exists without spreading the secret further.

Every secret-like finding requires human verification. Some public keys are intentionally visible but must still have correct service, API, referrer, IP, or application restrictions.

### 7.8 Web application indicators

The platform performs passive or low-impact checks for:

- SQL error messages that may indicate unsafe database handling
- Reflected or DOM-XSS indicators visible in public content
- Forms that may lack visible CSRF protection
- File upload surfaces
- Public login and admin routes
- Directory listing pages
- Public `.git`, `.env`, backup, SQL, archive, and configuration files
- Debug pages, stack traces, server versions, and information leakage
- Open redirect indicators
- Weak cookies
- CORS misconfiguration
- Clickjacking protection

LeakShield does not claim SQL injection, XSS, access-control bypass, default credentials, dangerous upload execution, or directory traversal as confirmed unless safe direct evidence supports the result. Exploit-based confirmation belongs in a separately authorized professional test.

### 7.9 Ports and network information

The application can perform a small, bounded check of common public TCP ports and retrieve free RDAP network ownership information. It does not perform a broad or aggressive port scan.

### 7.10 CVE intelligence

CVE (a public identifier for a known software vulnerability) correlation uses the free NIST National Vulnerability Database. A match requires detected product and exact version evidence. If the version is missing or uncertain, the platform avoids presenting a CVE as confirmed.

## 8. How Findings Stay Understandable

### Exact evidence

A professional result must answer four questions:

1. **What happened?** The detected security condition.
2. **Where did it happen?** Exact URL, file, line, column, header, cookie, or component.
3. **What proves it?** Redacted observed evidence and the detection method.
4. **How can it be fixed?** A direct remediation path and trusted reference.

### Verification labels

Findings distinguish between:

- **Confirmed:** direct public evidence supports the result.
- **Potential:** a security pattern was detected but needs manual verification.
- **Informational:** useful attack-surface or configuration information, not a proven vulnerability.
- **Authorization required:** active confirmation would require explicit permission and is intentionally not attempted.

### Severity and confidence

Severity describes possible damage. Confidence describes how strongly the available evidence supports the result. These values are different. A potentially critical issue can still have low confidence and should not be treated as proven until verified.

## 9. Security Score and Roadmap

After a scan, LeakShield calculates a score from `0` to `100` and presents a grade. The risk engine considers severity, confidence, evidence quality, public exposure, and context.

The remediation roadmap groups work into:

- Priority 1: Critical
- Priority 2: High
- Priority 3: Medium
- Priority 4: Low

Each roadmap item can include:

- Why the issue matters
- Suggested owner or technical area
- Effort: Easy, Medium, or Advanced
- Estimated remediation time
- Recommended action

## 10. Learning Mode and Knowledge Base

Learning Mode can explain:

- What the vulnerability is
- Why it is dangerous
- How attackers generally abuse it, without exploit instructions
- A generalized real-world scenario
- Business impact
- Common developer mistakes
- Step-by-step remediation
- Secure coding recommendations
- Prevention checklist
- Official references

The searchable knowledge base covers headers, TLS, DNS, OWASP, CWE, subdomains, secrets, API security, certificates, cookies, authentication, authorization, and CORS.

References are limited to trusted sources such as OWASP, MDN, RFCs, MITRE, NIST, and official vendor documentation.

## 11. User Interface

### Shield introduction

The opening animation represents a protected console being unlocked. It is visual only and does not delay or change scan logic after it completes.

### Console

The Console gives a quick system overview, last security score, grade, important metrics, and the main scan action.

### Scan

The Scan page contains the input controls and Mission Archive. Mission Archive is the current session's scan history. The **Clear history** button deletes that session's saved browser and server history after confirmation.

### Findings

The Findings page groups similar results in expandable sections. Supporting information such as attack surface, CVE intelligence, reports, and the security field guide is kept inside collapsible drawers so the page remains compact.

### Theme and devices

The interface supports dark and light themes, keyboard access, responsive layouts, and readable states for desktop, tablet, and mobile screens.

## 12. Admin Portal

The admin portal is intentionally not shown as a normal navigation button. It is opened through:

```text
https://your-domain.example/admin=true
```

Admin accounts are configured through secure environment variables. Credentials are not stored in source code or documentation. Successful login creates a signed session, and protected audit information is available only to an authenticated admin.

Important environment variables:

- `ADMIN_ACCOUNTS_JSON`: allowed admin account records
- `ADMIN_SESSION_SECRET`: a strong secret of at least 32 characters used to sign sessions

## 13. Privacy and Security Controls

LeakShield protects users and scan targets through:

- Public HTTP(S)-only website scanning
- Blocking of loopback, private, reserved, and local addresses
- DNS rebinding and redirect revalidation
- Request, response, file, project, crawl, and timeout limits
- Input validation through typed schemas
- Rate limiting on important routes
- Session-scoped scan ownership
- Sensitive-value redaction
- Signed admin sessions
- CORS and trusted-host controls
- No credential guessing
- No exploit payload submission
- No access-control bypass attempts
- No mandatory paid API or AI dependency

The frontend creates a random browser session identifier and sends it in the `X-LeakShield-Session` header. The backend hashes that identifier and uses the hash as the scan owner. One browser session cannot normally list, open, or clear another session's scan records.

## 14. Free Data Sources

LeakShield does **not** use Shodan and does not need a Shodan API key.

It uses free and public mechanisms:

- Direct public HTTP and HTTPS requests
- DNS lookups
- TLS certificate inspection
- `robots.txt` and `sitemap.xml`
- Certificate Transparency through `crt.sh`
- RDAP public registration data
- NIST NVD for exact-version CVE correlation
- Local deterministic detection and explanation rules

The core platform does not require a paid AI model. Its advisor and educational explanations work with deterministic local rules. Any future optional AI integration must remain replaceable and must not be required for normal operation.

## 15. Technical Architecture

```text
User's browser
      |
      v
React + Vite frontend
      |
      v
FastAPI REST API
      |
      v
Scan Service orchestrator
      |
      +--> Website Assessment Engine
      +--> Secret and Code Detection Engine
      +--> Risk Engine
      +--> Explanation and Education Engine
      |
      +--> PostgreSQL or local SQLite storage
      +--> Redis cache when configured
      |
      v
Structured JSON response
      |
      v
Grouped dashboard findings and reports
```

### Frontend

- React: builds interactive user-interface components
- Vite: develops and bundles the frontend quickly
- Tailwind CSS and project CSS: control layout, colors, responsiveness, and themes
- Lucide React: supplies consistent interface icons

### Backend

- Python 3.11: backend programming language
- FastAPI: validates and serves API requests
- Pydantic: checks request and response data shapes
- SQLAlchemy Async: communicates with the database without blocking requests
- HTTPX: performs controlled public HTTP requests
- dnspython: resolves DNS records

### Data layer

- PostgreSQL: production database for scans and findings
- SQLite: simple local-development fallback
- Redis: optional cache for repeated results
- Vercel Blob: optional private admin audit persistence when configured

## 16. Main Folder Structure

```text
LeakShield-Pro/
|-- api/                 Legacy Vercel API compatibility files
|-- backend/             Main FastAPI backend and security engines
|   |-- app/
|   |   |-- api/         Scan and admin HTTP routes
|   |   |-- engines/     Website, detection, risk, and education logic
|   |   |-- services/    Complete scan workflow orchestration
|   |   |-- config.py    Environment and limit settings
|   |   |-- models.py    Database records
|   |   |-- schemas.py   Validated API data structures
|   |   `-- security.py  Session and request security helpers
|   `-- tests/           Backend unit and security tests
|-- docs/                Architecture, audit, report, and project guides
|-- frontend/
|   |-- src/
|   |   |-- components/  Dashboard, admin, knowledge, and animation UI
|   |   |-- data/        Knowledge-base article content
|   |   |-- App.jsx      Main application workflow
|   |   |-- api.js       Browser-to-backend API client
|   |   `-- *.css        Dark, light, responsive, and visual styles
|   `-- vite.config.js   Frontend build and local proxy settings
|-- samples/             Safe example inputs and example output
|-- scripts/             Project report generation utilities
|-- tests/               Legacy/compatibility API tests
|-- .github/workflows/   Automated quality and security checks
|-- docker-compose.yml   Local multi-service deployment
|-- vercel.json          Vercel production deployment configuration
|-- SECURITY.md          Security policy
`-- README.md            Project introduction and quick start
```

## 17. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Confirms that the API is available |
| `POST` | `/api/scans` | Starts a text, project-folder, or website scan |
| `GET` | `/api/scans` | Lists scans owned by the current browser session |
| `DELETE` | `/api/scans` | Clears history owned by the current browser session |
| `GET` | `/api/scans/{id}` | Loads one owned scan and its findings |
| `POST` | `/api/admin` | Signs an allowed administrator in |
| `GET` | `/api/admin` | Loads protected admin audit information |
| `DELETE` | `/api/admin` | Clears protected admin audit information |

Example safe text scan:

```bash
curl -X POST http://localhost:8000/api/scans \
  -H "Content-Type: application/json" \
  -H "X-LeakShield-Session: 2d6ecf0c-6497-4c7f-a96f-a14f02422346" \
  -d '{"mode":"text","content":"Authorization: Bearer example_redacted_value","source_name":"example.log"}'
```

## 18. Local Installation

### Requirements

- Git
- Node.js 20 or newer
- Python 3.11 or newer
- Docker Desktop, if using the Docker method

### Option A: Docker

From the project root:

```bash
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- API documentation: `http://localhost:8000/docs`

### Option B: Run services manually

Backend on Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend in a second terminal:

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://localhost:5173`.

## 19. Environment Configuration

Use `.env.example` and `backend/.env.example` as templates. Never commit the real `.env` file.

Common settings include:

- `DATABASE_URL`: database connection address
- `REDIS_URL`: optional cache connection address
- `CORS_ORIGINS`: browser origins allowed to call the API
- `ALLOWED_HOSTS`: hostnames accepted by the backend
- `ADMIN_ACCOUNTS_JSON`: admin allowlist
- `ADMIN_SESSION_SECRET`: admin session signing secret

Production secrets must be stored in the hosting platform's encrypted environment settings, not inside JavaScript, Python, JSON, Git history, screenshots, or documentation.

## 20. Testing and Quality Checks

Root API compatibility tests:

```bash
npm ci
npm test
```

Frontend checks:

```bash
cd frontend
npm ci
npm audit --audit-level=high
npm run build
```

Backend checks:

```bash
cd backend
pip install -e ".[dev]"
ruff check app tests
bandit -r app
pip-audit
pytest
pip check
```

GitHub Actions runs automated dependency, lint, security, test, and build checks on project updates.

## 21. Vercel Deployment

The production deployment uses the repository's `vercel.json` configuration and shared FastAPI backend.

Typical workflow:

1. Push a tested commit to the GitHub repository.
2. Vercel detects the update from the connected repository.
3. Vercel builds the frontend and backend services.
4. Quality checks and deployment status are reviewed.
5. The live application receives the update.

Manual CLI deployment, when needed:

```bash
npx vercel --prod
```

Environment variables must be configured in Vercel before features that depend on them are used.

## 22. Demonstration Scenario

For an exhibition demonstration:

1. Open the live application and let the shield unlock.
2. Show the clean Console and current security score.
3. Open Scan and enter a website you own or are authorized to assess.
4. Start the exposure sweep.
5. Explain the live assessment phases.
6. Open Findings and expand one grouped category.
7. Point to the exact affected address, observed evidence, confidence, and verification label.
8. Open Learning Mode and show the recommended fix.
9. Show the roadmap or report export.
10. Explain that the platform uses free sources and does not require Shodan or a paid AI service.

Never use an unauthorized website for a live active-security demonstration. A deliberately vulnerable local lab or a website owned by the team is the safest choice.

## 23. Current Limitations

Transparent limitations make the project more trustworthy:

- The Vercel runtime cannot run every large native security binary.
- Website checks are intentionally bounded to protect targets and hosting resources.
- Passive evidence cannot confirm every SQL injection, XSS, authentication, authorization, upload, or business-logic vulnerability.
- Some DNS, TLS, Certificate Transparency, and NVD services may be temporarily slow or unavailable.
- Technology fingerprinting can be hidden or modified by proxies and CDNs.
- Secret-pattern detection can find intentionally public identifiers, so human verification is required.
- Browser-session history is not a replacement for a complete multi-user account system.

The application displays evidence and verification state so these limitations do not become misleading claims.

## 24. Future Scope

Future versions can add:

- Authenticated scans with explicit proof of target ownership
- Team workspaces and role-based access control
- GitHub pull-request and CI/CD security checks
- Scheduled daily, weekly, and monthly monitoring
- Notifications when a new critical finding appears
- Self-hosted adapters for Katana, Subfinder, Nuclei, OWASP ZAP, and other free tools
- Safer container-based dynamic analysis in an isolated environment
- Expanded API and GraphQL assessment modules
- Better scan comparison and trend charts
- More language and framework-specific remediation
- Multilingual educational explanations
- Signed report verification for exhibition and audit use
- Community-contributed detection and knowledge rules

All core functionality should remain open source and usable without a mandatory paid service.

## 25. Project Philosophy

> Enterprise-quality cybersecurity for everyone, completely free.

LeakShield Pro is not only a scanner. It is a security learning and remediation platform. Its purpose is to help people discover risk responsibly, understand the evidence, fix the root cause, and build safer software.

## 26. Simple Technical Dictionary

| Term | Easy meaning |
|---|---|
| API | A controlled way for two software systems to communicate |
| Backend | The server-side code that performs scanning and stores results |
| Frontend | The visible website interface used in the browser |
| Vulnerability | A weakness that may allow damage or unauthorized behavior |
| Finding | One security result produced by the scanner |
| Evidence | The exact observed information supporting a finding |
| False positive | A warning that looks dangerous but is not actually a valid issue |
| Severity | How much damage an issue could cause |
| Confidence | How sure the scanner is about its evidence |
| Remediation | The steps used to fix a security issue |
| HTTP header | Extra security or behavior information sent with a web response |
| TLS/SSL | Encryption that protects HTTPS traffic |
| DNS | The system that connects domain names to network information |
| CORS | Browser rules controlling which other websites can read a response |
| CSP | Browser rules controlling which scripts and resources can load |
| CVE | A public identifier for a known software vulnerability |
| CWE | A category describing a type of software weakness |
| OWASP | A global open community that publishes web-security guidance |
| SSRF | A weakness that tricks a server into requesting a protected address |
| Redaction | Hiding the sensitive middle part of a secret value |
| Cache | Temporary saved data used to make repeated work faster |
| CI/CD | Automated testing and deployment after code changes |
| Open source | Software whose source code can be inspected and improved |
