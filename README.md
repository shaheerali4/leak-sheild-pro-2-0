# LeakShield Pro

LeakShield Pro is a free and open-source cybersecurity assessment platform for public websites, project folders, pasted code, configuration, and CI logs. It combines bounded passive crawling, attack-surface discovery, DNS/TLS/header intelligence, technology and JavaScript analysis, redacted secret detection, context-aware risk scoring, educational guidance, PostgreSQL persistence, Redis caching, and a modern React dashboard.

## Architecture

```text
User
  -> React/Tailwind Dashboard
  -> FastAPI REST API
  -> Scan Service
  -> Detection Engine
  -> Risk Engine
  -> Explanation Engine
  -> PostgreSQL + Redis
  -> JSON API Response
  -> Dashboard Results
```

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy Async, asyncpg
- Frontend: React, Vite, Tailwind CSS
- Database: PostgreSQL 16
- Cache: Redis 7
- Deployment: Docker Compose

Vercel and Docker now share the same FastAPI API for text, project-folder, website, history, comparison, and admin audit workflows. The old `api/` implementation remains for backward compatibility but is not part of the Vercel Services build.

## Free Assessment Modules

- Public same-origin crawl with robots.txt, sitemap.xml, common security paths, redirects, and JavaScript-discovered links
- Certificate Transparency and DNS-based subdomain enumeration with alive/status/TLS/server evidence
- HTTP security headers, clickjacking, cookies, CORS, certificate/TLS, DNS/SPF/DMARC/DKIM/CAA/DNSSEC, and RDAP network intelligence
- Wappalyzer-style technology and explicit-version fingerprinting for common servers, languages, CMS products, frameworks, CDNs, and JavaScript libraries
- Static forms/CSRF/file-upload surface analysis, passive SQL error and DOM-XSS indicators, public admin/login routes, directory indexes, public Git/config/backup checks, source maps, and redacted secret patterns
- Bounded TCP port checks and exact-version CVE correlation through the free public NIST NVD API
- Security grade, risk score, OWASP/CWE/CAPEC mapping, deterministic Security Advisor, remediation roadmap, scan comparison, and print-to-PDF reports
- Expandable Learning Mode, framework-specific defensive snippets, and a searchable official-reference knowledge base

Website assessment is defensive and low impact: only public HTTP(S) targets are accepted, private/reserved IP ranges are blocked, redirects are revalidated, response sizes and crawl breadth are bounded, and findings distinguish detected evidence from potential indicators and checks requiring authorization. LeakShield does not submit SQLi/XSS/traversal payloads, upload files, guess default credentials, or attempt authorization bypasses. Those issues require an explicitly authorized authenticated assessment before they can be confirmed.

LeakShield does **not** use Shodan and requires no Shodan API key. Website intelligence comes from direct public HTTP/DNS/TLS checks, Certificate Transparency through crt.sh, RDAP, and exact-version NIST NVD queries. These sources are free and no paid API or AI model is required.

The admin API accepts only accounts listed in `ADMIN_ACCOUNTS_JSON`. A separate high-entropy `ADMIN_SESSION_SECRET` of at least 32 characters is required for session signing. Real credentials belong only in local or deployment environment variables and must never be committed. Private audit persistence additionally uses Vercel Blob when its storage variables are available.

## Run With Docker

```bash
cd leakshield-pro
docker compose up --build
```

Open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

Folder, website, and admin modes are hidden in Docker because they are implemented by the Vercel serverless API.

## Local Backend

```bash
cd leakshield-pro/backend
python -m venv .venv
. .venv/Scripts/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload
```

## Local Frontend

```bash
cd leakshield-pro/frontend
npm install
npm run dev
```

## API Example

```bash
curl -X POST http://localhost:8000/api/scans \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"api_key='prod_live_ci_token_9f2b7c4a6d8e1f0a2b3c4d5e'\\npassword='ProdRootPass2026!'\",\"source_name\":\"deployment.env\"}"
```

## Sample Files

- `samples/sample_leak.txt`
- `samples/sample_response.json`
- `docs/report.md`
- `docs/architecture.md`
