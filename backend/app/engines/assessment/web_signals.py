import asyncio
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

import httpx

CSRF_NAMES = re.compile(r"(?i)(csrf|xsrf|authenticity[_-]?token|request[_-]?token)")
SQL_ERRORS = (
    re.compile(r"(?i)you have an error in your sql syntax"),
    re.compile(r"(?i)warning:\s*mysql"),
    re.compile(r"(?i)pg::(?:syntax|undefined|unique)"),
    re.compile(r"(?i)unclosed quotation mark after the character string"),
    re.compile(r"(?i)ora-\d{5}"),
    re.compile(r"(?i)sqlite3?\.(?:operational|database)error"),
)
STACK_ERRORS = (
    re.compile(r"(?i)traceback \(most recent call last\)"),
    re.compile(r"(?i)(?:fatal error|uncaught exception).{0,120}\bon line\b"),
    re.compile(r"(?i)exception in thread \""),
    re.compile(r"(?i)at [a-z0-9_.$]+\([^)]*:\d+:\d+\)"),
    re.compile(r"(?i)django\.core\.exceptions"),
)
DOM_SOURCES = re.compile(
    r"(?i)(location\.(?:search|hash|href)|document\.(?:url|referrer)|window\.name|postmessage)"
)
DOM_SINKS = re.compile(
    r"(?i)(\.innerhtml\s*=|\.outerhtml\s*=|document\.write\s*\(|eval\s*\(|new\s+function\s*\()"
)
REDIRECT_NAMES = {"redirect", "redirect_uri", "return", "returnurl", "next", "url", "continue"}
SENSITIVE_PORTS = {
    21: ("FTP", "MEDIUM"),
    22: ("SSH", "LOW"),
    25: ("SMTP", "LOW"),
    80: ("HTTP", "LOW"),
    443: ("HTTPS", "LOW"),
    8080: ("Alternate HTTP", "LOW"),
    8443: ("Alternate HTTPS", "LOW"),
    3306: ("MySQL", "HIGH"),
    5432: ("PostgreSQL", "HIGH"),
    6379: ("Redis", "CRITICAL"),
    9200: ("Elasticsearch", "HIGH"),
    27017: ("MongoDB", "HIGH"),
}


@dataclass(frozen=True)
class WebSignal:
    rule_id: str
    title: str
    severity: str
    category: str
    summary: str
    remediation: str
    address: str
    location_type: str
    affected_component: str
    observed_evidence: str
    expected_value: str
    detection_method: str
    line_number: int = 0
    column_start: int = 0
    column_end: int = 0
    confidence: float = 0.85
    status: str = "potential"


def _line_column(text: str, offset: int) -> tuple[int, int]:
    line = text.count("\n", 0, offset) + 1
    previous = text.rfind("\n", 0, offset)
    return line, offset + 1 if previous < 0 else offset - previous


def _attributes(tag: str) -> dict[str, str]:
    return {
        key.lower(): value
        for key, _quote, value in re.findall(
            r"([:\w-]+)\s*=\s*([\"'])(.*?)\2",
            tag,
            flags=re.DOTALL,
        )
    }


def analyze_html(url: str, status: int, text: str) -> tuple[list[WebSignal], list[dict[str, Any]]]:
    signals: list[WebSignal] = []
    forms: list[dict[str, Any]] = []
    path = urlparse(url).path or "/"
    if status == 200 and re.search(r"(?is)<title>\s*index of\s+|<h1>\s*index of\s+|parent directory", text):
        signals.append(
            WebSignal(
                "directory-listing",
                "Directory listing enabled",
                "MEDIUM",
                "exposure",
                "The public response appears to expose a generated directory index.",
                "Disable directory auto-indexing and publish only explicitly intended files.",
                url,
                "public_url",
                f"Directory response: {path}",
                f"GET {url} returned HTTP 200 with an 'Index of' or 'Parent Directory' marker.",
                "A normal application route or HTTP 403/404 response instead of a file index.",
                "Inspected the public response body for common Apache, Nginx, and IIS directory-index markers.",
                confidence=0.92,
                status="detected",
            )
        )

    for pattern in SQL_ERRORS:
        match = pattern.search(text)
        if match:
            line, column = _line_column(text, match.start())
            signals.append(
                WebSignal(
                    "sql-error-disclosure",
                    "Database error disclosed",
                    "HIGH",
                    "exposure",
                    "A public response contains a database-specific error signature. This does not by itself prove SQL injection.",
                    "Return generic errors, disable production debug output, parameterize queries, and review the affected request path.",
                    url,
                    "response_body",
                    "Public response body",
                    f"Database error marker '{match.group(0)[:80]}' appeared at line {line}, column {column}.",
                    "No database engine errors, queries, table names, or stack details in public responses.",
                    "Passively inspected the fetched response; no injection payload was submitted.",
                    line,
                    column,
                    column + len(match.group(0)),
                    0.9,
                    "detected",
                )
            )
            break

    for pattern in STACK_ERRORS:
        match = pattern.search(text)
        if match:
            line, column = _line_column(text, match.start())
            signals.append(
                WebSignal(
                    "debug-stack-trace",
                    "Debug stack trace exposed",
                    "MEDIUM",
                    "exposure",
                    "A public response exposes a framework or runtime stack-trace marker.",
                    "Disable debug mode in production and map internal exceptions to generic public error responses.",
                    url,
                    "response_body",
                    "Public error response",
                    f"Stack-trace marker '{match.group(0)[:80]}' appeared at line {line}, column {column}.",
                    "A generic error identifier with detailed diagnostics retained only in protected server logs.",
                    "Passively searched the fetched response for runtime-specific exception signatures.",
                    line,
                    column,
                    column + len(match.group(0)),
                    0.86,
                    "detected",
                )
            )
            break

    for form_match in re.finditer(r"(?is)<form\b([^>]*)>(.*?)</form\s*>", text):
        form_tag, body = form_match.group(1), form_match.group(2)
        attrs = _attributes(form_tag)
        method = attrs.get("method", "get").lower()
        action = urljoin(url, attrs.get("action", url))
        inputs = [_attributes(match.group(0)) for match in re.finditer(r"(?is)<input\b[^>]*>", body)]
        names = {item.get("name", "") for item in inputs}
        has_csrf = any(CSRF_NAMES.search(name) for name in names)
        file_inputs = [item for item in inputs if item.get("type", "").lower() == "file"]
        password_input = any(item.get("type", "").lower() == "password" for item in inputs)
        forms.append(
            {
                "action": action,
                "method": method.upper(),
                "has_csrf_token": has_csrf,
                "has_file_input": bool(file_inputs),
                "has_password_input": password_input,
            }
        )
        line, column = _line_column(text, form_match.start())
        if method in {"post", "put", "patch", "delete"} and not has_csrf:
            signals.append(
                WebSignal(
                    f"potential-csrf-{line}-{column}",
                    "Potential missing CSRF protection",
                    "MEDIUM",
                    "exposure",
                    "A state-changing HTML form contains no recognizable anti-CSRF field in the static response.",
                    "Use framework CSRF middleware, validate a per-session token, and enforce SameSite cookies and Origin checks.",
                    url,
                    "html_form",
                    f"{method.upper()} form",
                    f"Form at {url}:{line}:{column} submits to {action} without a recognizable CSRF token field.",
                    "A server-validated anti-CSRF token or an equally strong documented request-origin control.",
                    "Parsed the static form method, action, and input names; JavaScript-added tokens require manual verification.",
                    line,
                    column,
                    column + len(form_match.group(0).split(">", 1)[0]),
                    0.72,
                )
            )
        if password_input and urlparse(url).scheme != "https":
            signals.append(
                WebSignal(
                    "password-form-over-http",
                    "Password form served without HTTPS",
                    "CRITICAL",
                    "tls",
                    "A password input is delivered over an unencrypted HTTP page.",
                    "Redirect to HTTPS before rendering authentication forms and enable HSTS after migration.",
                    url,
                    "html_form",
                    "Authentication form transport",
                    f"Password input detected at {url}:{line}:{column} over HTTP.",
                    "Authentication pages and submissions must use HTTPS exclusively.",
                    "Parsed password fields from the fetched public HTML and checked the page scheme.",
                    line,
                    column,
                    column + 1,
                    0.98,
                    "detected",
                )
            )
        for file_input in file_inputs:
            accept = file_input.get("accept", "")
            signals.append(
                WebSignal(
                    f"file-upload-surface-{line}-{column}",
                    "Public file-upload surface",
                    "MEDIUM" if not accept else "LOW",
                    "exposure",
                    "A public form accepts files. Safe handling cannot be proven without an authorized upload test.",
                    "Allowlist file types server-side, verify content signatures, rename uploads, store outside the web root, and scan files.",
                    url,
                    "html_form",
                    "File upload input",
                    f"File input at {url}:{line}:{column}; declared accept policy: {accept or 'none'}.",
                    "A strict server-side allowlist, size limits, malware scanning, isolated storage, and non-executable delivery.",
                    "Parsed the public form only; LeakShield did not upload a file.",
                    line,
                    column,
                    column + 1,
                    0.88,
                )
            )

    for link_match in re.finditer(r"(?is)(?:href|action)\s*=\s*([\"'])(.*?)\1", text):
        candidate = urljoin(url, link_match.group(2))
        parsed = urlparse(candidate)
        query = parse_qs(parsed.query)
        for name, values in query.items():
            if name.lower() not in REDIRECT_NAMES:
                continue
            external = next(
                (
                    value
                    for value in values
                    if urlparse(value).scheme in {"http", "https"}
                    and urlparse(value).hostname != urlparse(url).hostname
                ),
                None,
            )
            if external:
                line, column = _line_column(text, link_match.start())
                signals.append(
                    WebSignal(
                        f"potential-open-redirect-{line}-{column}",
                        "Potential open-redirect parameter",
                        "MEDIUM",
                        "exposure",
                        "A public link supplies an external URL to a redirect-like parameter. Server validation must be verified.",
                        "Allowlist trusted relative destinations and reject absolute or protocol-relative redirect targets.",
                        url,
                        "response_body",
                        f"Redirect parameter: {name}",
                        f"Parameter '{name}' contains external destination {external} at {url}:{line}:{column}.",
                        "Only validated same-origin relative destinations should be accepted.",
                        "Passively inspected links and form actions; no redirect request was followed.",
                        line,
                        column,
                        column + len(link_match.group(0)),
                        0.65,
                    )
                )
                return signals, forms
    return signals, forms


def analyze_javascript(url: str, text: str) -> list[WebSignal]:
    source_matches = list(DOM_SOURCES.finditer(text))
    if not source_matches:
        return []
    for sink in DOM_SINKS.finditer(text):
        nearby = next((source for source in source_matches if abs(source.start() - sink.start()) <= 900), None)
        if not nearby:
            continue
        line, column = _line_column(text, sink.start())
        return [
            WebSignal(
                "potential-dom-xss-data-flow",
                "Potential DOM XSS data flow",
                "HIGH",
                "exposure",
                "Untrusted browser-controlled data appears near a dangerous DOM execution or HTML sink.",
                "Trace the data flow, use textContent or safe DOM APIs, sanitize unavoidable HTML, and enforce a restrictive CSP.",
                url,
                "response_body",
                "Public JavaScript bundle",
                f"Source '{nearby.group(0)}' appears within 900 characters of sink '{sink.group(0)}' at line {line}, column {column}.",
                "No untrusted URL, message, or document data should reach an HTML or code-execution sink without contextual sanitization.",
                "Performed static proximity analysis only; no XSS payload was submitted or executed.",
                line,
                column,
                column + len(sink.group(0)),
                0.62,
            )
        ]
    return []


def analyze_headers(
    url: str,
    status: int,
    headers: dict[str, str],
    set_cookies: list[str],
    cors_probe_headers: dict[str, str],
) -> list[WebSignal]:
    signals: list[WebSignal] = []
    normalized = {key.lower(): value for key, value in headers.items()}
    server_disclosures = [
        (name, normalized.get(name))
        for name in ("server", "x-powered-by", "x-aspnet-version")
        if normalized.get(name) and re.search(r"\d", normalized[name])
    ]
    for name, value in server_disclosures:
        signals.append(
            WebSignal(
                f"version-disclosure-{name}",
                "Server version disclosed",
                "LOW",
                "headers",
                f"The {name} response header exposes a software version.",
                "Remove unnecessary product versions from public headers and keep the underlying software patched.",
                url,
                "http_response_header",
                f"HTTP response header: {name}",
                f"GET {url} returned HTTP {status} with {name}: {value}.",
                f"A minimized header without a precise software version, or no {name} header where unnecessary.",
                "Inspected the public HTTP response headers.",
                confidence=0.99,
                status="detected",
            )
        )

    csp = normalized.get("content-security-policy", "").lower()
    if not normalized.get("x-frame-options") and "frame-ancestors" not in csp:
        signals.append(
            WebSignal(
                "clickjacking-protection-missing",
                "Clickjacking protection missing",
                "MEDIUM",
                "headers",
                "Neither X-Frame-Options nor CSP frame-ancestors protects the page from framing.",
                "Set CSP frame-ancestors 'none' or an explicit allowlist, with X-Frame-Options as legacy defense in depth.",
                url,
                "http_response_header",
                "Framing policy",
                "The response contained neither X-Frame-Options nor a CSP frame-ancestors directive.",
                "Content-Security-Policy: frame-ancestors 'none' (or an explicit trusted allowlist).",
                "Inspected both modern CSP and legacy framing controls on the homepage response.",
                confidence=0.98,
                status="detected",
            )
        )

    weak_csp = [
        directive
        for directive in ("'unsafe-inline'", "'unsafe-eval'", "script-src *", "default-src *")
        if directive in csp
    ]
    if weak_csp:
        signals.append(
            WebSignal(
                "weak-csp-policy",
                "Content Security Policy contains unsafe allowances",
                "HIGH" if "'unsafe-eval'" in weak_csp or "script-src *" in weak_csp else "MEDIUM",
                "headers",
                "The CSP is present but permits script behavior or sources that weaken XSS protection.",
                "Remove unsafe-eval and broad wildcards, replace inline scripts with nonces or hashes, and test a restrictive policy in report-only mode first.",
                url,
                "http_response_header",
                "HTTP response header: Content-Security-Policy",
                f"Content-Security-Policy contains: {', '.join(weak_csp)}.",
                "A restrictive policy without unsafe-eval or broad script/default source wildcards.",
                "Parsed security-relevant CSP source expressions from the public homepage response.",
                confidence=0.98,
                status="detected",
            )
        )

    hsts = normalized.get("strict-transport-security", "")
    if hsts:
        max_age = re.search(r"(?i)(?:^|;)\s*max-age\s*=\s*(\d+)", hsts)
        if not max_age or int(max_age.group(1)) < 15_552_000:
            signals.append(
                WebSignal(
                    "weak-hsts-policy",
                    "HSTS policy is too short or malformed",
                    "MEDIUM",
                    "headers",
                    "The HSTS header does not provide a valid max-age of at least 180 days.",
                    "Set a tested max-age of at least 15552000 seconds, then consider one year and includeSubDomains.",
                    url,
                    "http_response_header",
                    "HTTP response header: Strict-Transport-Security",
                    f"Strict-Transport-Security: {hsts}",
                    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
                    "Parsed max-age from the public HSTS response header.",
                    confidence=0.99,
                    status="detected",
                )
            )

    content_type_options = normalized.get("x-content-type-options")
    if content_type_options and content_type_options.strip().lower() != "nosniff":
        signals.append(
            WebSignal(
                "weak-security-header-x-content-type-options",
                "X-Content-Type-Options has an ineffective value",
                "MEDIUM",
                "headers",
                "The header is present but browsers only recognize the nosniff value.",
                "Set X-Content-Type-Options: nosniff.",
                url,
                "http_response_header",
                "HTTP response header: X-Content-Type-Options",
                f"X-Content-Type-Options: {content_type_options}",
                "X-Content-Type-Options: nosniff",
                "Compared the normalized public header value with the browser-supported value.",
                confidence=0.99,
                status="detected",
            )
        )

    frame_options = normalized.get("x-frame-options")
    if frame_options and frame_options.strip().upper() not in {"DENY", "SAMEORIGIN"}:
        signals.append(
            WebSignal(
                "weak-security-header-x-frame-options",
                "X-Frame-Options has an ineffective value",
                "MEDIUM",
                "headers",
                "The framing header uses a value that modern browsers do not reliably enforce.",
                "Use CSP frame-ancestors with an explicit policy and set X-Frame-Options to DENY or SAMEORIGIN for legacy coverage.",
                url,
                "http_response_header",
                "HTTP response header: X-Frame-Options",
                f"X-Frame-Options: {frame_options}",
                "X-Frame-Options: DENY (or SAMEORIGIN when framing is required).",
                "Compared the normalized public header value with supported framing directives.",
                confidence=0.98,
                status="detected",
            )
        )

    origin = "https://leakshield.invalid"
    cors = {key.lower(): value for key, value in cors_probe_headers.items()}
    allow_origin = cors.get("access-control-allow-origin", "")
    credentials = cors.get("access-control-allow-credentials", "").lower() == "true"
    if allow_origin == origin:
        signals.append(
            WebSignal(
                "cors-origin-reflection",
                "CORS reflects an untrusted origin",
                "HIGH" if credentials else "MEDIUM",
                "headers",
                "The application reflected a synthetic external Origin in Access-Control-Allow-Origin.",
                "Use an exact server-side allowlist and never reflect arbitrary Origin values.",
                url,
                "http_response_header",
                "CORS policy",
                f"Request Origin {origin} received Access-Control-Allow-Origin: {allow_origin}; credentials={credentials}.",
                "Only explicitly trusted origins should receive CORS access.",
                "Sent one benign GET request with a synthetic Origin header and inspected the CORS response headers.",
                confidence=0.96,
                status="detected",
            )
        )
    elif allow_origin == "*":
        signals.append(
            WebSignal(
                "cors-wildcard-origin",
                "CORS allows every origin",
                "MEDIUM",
                "headers",
                "The response permits cross-origin reads from any website.",
                "Replace the wildcard with a minimal origin allowlist unless the resource is intentionally public and non-sensitive.",
                url,
                "http_response_header",
                "CORS policy",
                f"Access-Control-Allow-Origin: *; credentials={credentials}.",
                "An explicit allowlist for sensitive or user-specific resources.",
                "Sent one benign cross-origin GET and inspected Access-Control-Allow-Origin.",
                confidence=0.95,
                status="detected",
            )
        )

    for index, cookie in enumerate(set_cookies[:20], start=1):
        parts = [part.strip() for part in cookie.split(";")]
        name = parts[0].split("=", 1)[0] or f"cookie-{index}"
        attributes = {part.split("=", 1)[0].lower() for part in parts[1:]}
        missing = [item for item in ("secure", "httponly", "samesite") if item not in attributes]
        if not missing:
            continue
        signals.append(
            WebSignal(
                f"weak-cookie-{re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or index}",
                "Cookie security attributes missing",
                "MEDIUM",
                "headers",
                f"Cookie {name} is missing {', '.join(missing)}.",
                "Set Secure, HttpOnly, and an appropriate SameSite policy on session and authentication cookies.",
                url,
                "http_response_header",
                f"Set-Cookie: {name}",
                f"Cookie {name} was set without these attributes: {', '.join(missing)}. The value remains redacted.",
                f"Set-Cookie: {name}=[REDACTED]; Secure; HttpOnly; SameSite=Lax (or Strict/None when justified).",
                "Parsed every Set-Cookie header without storing or displaying cookie values.",
                confidence=0.95,
                status="detected",
            )
        )
    return signals


async def scan_ports(addresses: tuple[str, ...]) -> list[dict[str, Any]]:
    if not addresses:
        return []
    address = addresses[0]
    semaphore = asyncio.Semaphore(6)

    async def inspect(port: int) -> dict[str, Any]:
        async with semaphore:
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(address, port),
                    timeout=0.75,
                )
                writer.close()
                await writer.wait_closed()
                del reader
                return {
                    "port": port,
                    "service": SENSITIVE_PORTS[port][0],
                    "severity": SENSITIVE_PORTS[port][1],
                    "open": True,
                }
            except (TimeoutError, OSError):
                return {
                    "port": port,
                    "service": SENSITIVE_PORTS[port][0],
                    "severity": SENSITIVE_PORTS[port][1],
                    "open": False,
                }

    return await asyncio.gather(*(inspect(port) for port in SENSITIVE_PORTS))


def port_signals(hostname: str, ports: list[dict[str, Any]]) -> list[WebSignal]:
    signals = []
    for item in ports:
        if not item["open"] or item["port"] in {80, 443}:
            continue
        signals.append(
            WebSignal(
                f"exposed-port-{item['port']}",
                f"Public {item['service']} port exposed",
                item["severity"],
                "exposure",
                f"TCP port {item['port']} accepted a public connection. Exposure alone does not prove a vulnerable service.",
                "Confirm business need, restrict source networks, require strong authentication, and keep the service patched.",
                f"{hostname}:{item['port']}",
                "network_port",
                f"TCP {item['port']} ({item['service']})",
                f"A bounded TCP connect check succeeded for {hostname}:{item['port']}; no banner or credentials were requested.",
                "Only required services should be Internet-accessible, preferably behind an allowlist or private network.",
                "Completed a TCP handshake only, then immediately closed the connection.",
                confidence=0.98,
                status="detected",
            )
        )
    return signals


def detect_technologies(
    text: str,
    headers: dict[str, str],
    generators: list[str],
    set_cookies: list[str],
) -> list[dict[str, Any]]:
    blob = f"{text[:400_000]} {' '.join(generators)} {' '.join(set_cookies)}"
    lower = blob.lower()
    normalized = {key.lower(): value for key, value in headers.items()}
    detected: dict[str, dict[str, Any]] = {}

    def add(
        name: str,
        evidence: str,
        category: str,
        version: str | None = None,
        confidence: str = "high",
        cpe: tuple[str, str] | None = None,
    ) -> None:
        current = detected.get(name)
        if current and current.get("version") and not version:
            return
        detected[name] = {
            "name": name,
            "version": version,
            "confidence": confidence,
            "category": category,
            "evidence": evidence[:180],
            "cpe_vendor": cpe[0] if cpe else None,
            "cpe_product": cpe[1] if cpe else None,
        }

    server = normalized.get("server", "")
    powered = normalized.get("x-powered-by", "")
    for pattern, name, category, cpe in (
        (r"(?i)apache(?:/([0-9][\w.-]+))?", "Apache HTTP Server", "Web server", ("apache", "http_server")),
        (r"(?i)nginx(?:/([0-9][\w.-]+))?", "Nginx", "Web server", ("f5", "nginx")),
        (r"(?i)microsoft-iis(?:/([0-9][\w.-]+))?", "Microsoft IIS", "Web server", ("microsoft", "internet_information_services")),
        (r"(?i)apache[- ]tomcat(?:/([0-9][\w.-]+))?", "Apache Tomcat", "Application server", ("apache", "tomcat")),
        (r"(?i)(?:open)?litespeed(?:/([0-9][\w.-]+))?", "LiteSpeed", "Web server", None),
    ):
        match = re.search(pattern, server)
        if match:
            add(name, f"Server: {server}", category, match.group(1), cpe=cpe)
    php = re.search(r"(?i)php/?([0-9][\w.-]+)?", powered)
    if php:
        add("PHP", f"X-Powered-By: {powered}", "Programming language", php.group(1), cpe=("php", "php"))
    if "express" in powered.lower():
        add("Express.js", f"X-Powered-By: {powered}", "Web framework")
    openssl = re.search(r"(?i)openssl/?([0-9][\w.-]+)?", f"{server} {powered}")
    if openssl:
        add(
            "OpenSSL",
            f"Public server fingerprint: {openssl.group(0)}",
            "Cryptography library",
            openssl.group(1),
            cpe=("openssl", "openssl"),
        )
    if normalized.get("cf-ray") or "cloudflare" in server.lower():
        add("Cloudflare", "Cloudflare response headers", "CDN")

    generator_blob = " ".join(generators)
    for pattern, name, category, cpe in (
        (r"(?i)wordpress\s*([0-9][\w.-]+)?", "WordPress", "CMS", ("wordpress", "wordpress")),
        (r"(?i)drupal\s*([0-9][\w.-]+)?", "Drupal", "CMS", ("drupal", "drupal")),
        (r"(?i)joomla!?\s*([0-9][\w.-]+)?", "Joomla", "CMS", ("joomla", "joomla")),
    ):
        match = re.search(pattern, generator_blob)
        if match:
            add(name, f"meta generator: {match.group(0)}", category, match.group(1), cpe=cpe)

    signatures = (
        ("React", ("data-reactroot", "__react", "react.production.min.js"), "JavaScript framework"),
        ("Next.js", ("__next_data__", "/_next/"), "Web framework"),
        ("Nuxt", ("__nuxt__", "/_nuxt/"), "Web framework"),
        ("Vue", ("data-v-", "__vue__", "vue.runtime"), "JavaScript framework"),
        ("Angular", ("ng-version", "ng-app", "angular.min.js"), "JavaScript framework"),
        ("Svelte", ("svelte-", "__svelte"), "JavaScript framework"),
        ("Gatsby", ("___gatsby", "gatsby-focus-wrapper"), "Web framework"),
        ("Laravel", ("laravel_session", "laravel"), "Web framework"),
        ("Django", ("csrftoken", "django"), "Web framework"),
        ("ASP.NET", ("asp.net_sessionid", "__viewstate"), "Web framework"),
        ("WordPress", ("wp-content", "wp-includes"), "CMS"),
        ("Drupal", ("drupal-settings-json", "/sites/default/files/"), "CMS"),
        ("Joomla", ("/media/system/js/", "joomla!"), "CMS"),
        ("WooCommerce", ("woocommerce", "wc-blocks"), "Ecommerce"),
        ("Shopify", ("cdn.shopify.com", "shopify.theme"), "Ecommerce"),
        ("Magento", ("mage/cookies", "magento_"), "Ecommerce"),
        ("Bootstrap", ("bootstrap.min.css", "bootstrap.min.js"), "UI framework"),
        ("Tailwind CSS", ("--tw-", "tailwind"), "UI framework"),
    )
    for name, markers, category in signatures:
        present = [marker for marker in markers if marker in lower]
        if present:
            add(name, f"Matched: {', '.join(present[:3])}", category, confidence="high" if len(present) > 1 else "medium")

    angular = re.search(r"(?i)ng-version=[\"']([0-9][\w.-]+)", text)
    if angular:
        add("Angular", f"ng-version={angular.group(1)}", "JavaScript framework", angular.group(1))
    jquery = re.search(r"(?i)jquery(?:-|\.min\.)?([0-9]+\.[0-9]+(?:\.[0-9]+)?)", text)
    if jquery:
        add("jQuery", jquery.group(0), "JavaScript library", jquery.group(1), cpe=("jquery", "jquery"))
    return sorted(detected.values(), key=lambda item: item["name"])


async def lookup_nvd_cves(
    client: httpx.AsyncClient,
    technologies: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    exact = [item for item in technologies if item.get("version") and item.get("cpe_vendor")][:3]
    results: list[dict[str, Any]] = []
    for technology in exact:
        cpe = (
            f"cpe:2.3:a:{technology['cpe_vendor']}:{technology['cpe_product']}:"
            f"{technology['version']}:*:*:*:*:*:*:*"
        )
        try:
            response = await client.get(
                "https://services.nvd.nist.gov/rest/json/cves/2.0",
                params={"cpeName": cpe, "isVulnerable": "", "resultsPerPage": 10},
                timeout=4.0,
                headers={"User-Agent": "LeakShield-Pro/2.0 defensive version correlation"},
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError):
            results.append(
                {
                    "technology": technology["name"],
                    "version": technology["version"],
                    "status": "lookup-unavailable",
                    "cpe": cpe,
                    "cves": [],
                }
            )
            continue
        cves = []
        for wrapper in payload.get("vulnerabilities", [])[:10]:
            cve = wrapper.get("cve", {})
            metrics = cve.get("metrics", {})
            metric = next(
                iter(
                    metrics.get("cvssMetricV40", [])
                    or metrics.get("cvssMetricV31", [])
                    or metrics.get("cvssMetricV30", [])
                    or metrics.get("cvssMetricV2", [])
                    or []
                ),
                {},
            )
            cvss = metric.get("cvssData", {})
            description = next(
                (item.get("value") for item in cve.get("descriptions", []) if item.get("lang") == "en"),
                "",
            )
            cves.append(
                {
                    "id": cve.get("id"),
                    "severity": cvss.get("baseSeverity") or metric.get("baseSeverity") or "UNKNOWN",
                    "score": cvss.get("baseScore"),
                    "description": description[:300],
                    "known_exploited": bool(cve.get("cisaExploitAdd")),
                    "url": f"https://nvd.nist.gov/vuln/detail/{cve.get('id')}",
                }
            )
        results.append(
            {
                "technology": technology["name"],
                "version": technology["version"],
                "status": "matched" if cves else "no-matches",
                "cpe": cpe,
                "cves": cves,
            }
        )
    return results


def coverage_matrix(
    findings: list[dict[str, Any]],
    forms: list[dict[str, Any]],
    ports: list[dict[str, Any]],
    cve_matches: list[dict[str, Any]] | None = None,
) -> list[dict[str, str]]:
    rules = {item["rule_id"] for item in findings}
    cve_matches = cve_matches or []

    def status(*rule_ids: str) -> str:
        return "Detected" if rules.intersection(rule_ids) else "Not found"

    def prefix_status(*prefixes: str) -> str:
        return "Detected" if any(rule.startswith(prefixes) for rule in rules) else "Not found"

    return [
        {
            "name": "SQL Injection",
            "status": status("sql-error-disclosure"),
            "method": "Passive database-error evidence; active injection is not performed.",
        },
        {
            "name": "Cross-Site Scripting",
            "status": status("potential-dom-xss-data-flow"),
            "method": "Static DOM source/sink analysis; payload execution is not performed.",
        },
        {
            "name": "CSRF",
            "status": prefix_status("potential-csrf-"),
            "method": "Static state-changing form and anti-CSRF token inspection.",
        },
        {
            "name": "Broken Authentication",
            "status": "Requires authenticated testing",
            "method": "Login surfaces, TLS, cookies, and exposed credentials are checked without login attempts.",
        },
        {
            "name": "Broken Access Control",
            "status": "Requires authenticated testing",
            "method": "Public admin/API surfaces are mapped; role or object authorization bypass is not attempted.",
        },
        {
            "name": "Directory Listing",
            "status": status("directory-listing"),
            "method": "Public directory-index marker inspection.",
        },
        {
            "name": "Exposed Admin / Login",
            "status": prefix_status("public-surface-login", "public-surface-admin", "public-surface-dashboard"),
            "method": "Bounded route discovery with homepage fingerprint comparison.",
        },
        {
            "name": "Missing Security Headers",
            "status": (
                "Detected"
                if prefix_status("missing-", "weak-csp-", "weak-hsts-", "weak-security-header-")
                == "Detected"
                else "Not found"
            ),
            "method": "Homepage response-header presence and policy-quality inspection.",
        },
        {
            "name": "SSL / TLS",
            "status": status("weak-transport-security", "certificate-expiring-soon"),
            "method": "Certificate-validating TLS handshake and negotiated protocol inspection.",
        },
        {
            "name": "Open Redirect",
            "status": prefix_status("potential-open-redirect-"),
            "method": "Static redirect-like parameter inspection; redirects are not manipulated.",
        },
        {
            "name": "File Upload",
            "status": "Potential surface" if any(form.get("has_file_input") for form in forms) else "Not found",
            "method": "Static form inspection; no file is uploaded.",
        },
        {
            "name": "Information Disclosure",
            "status": (
                "Detected"
                if "debug-stack-trace" in rules or prefix_status("version-disclosure-") == "Detected"
                else "Not found"
            ),
            "method": "Stack-trace, runtime error, and version-bearing response-header inspection.",
        },
        {
            "name": "Directory Traversal",
            "status": "Not actively tested",
            "method": "Traversal payloads are intentionally excluded from a public passive assessment.",
        },
        {
            "name": "Clickjacking",
            "status": status("clickjacking-protection-missing"),
            "method": "X-Frame-Options and CSP frame-ancestors inspection.",
        },
        {
            "name": "Weak Cookies",
            "status": prefix_status("weak-cookie-"),
            "method": "Set-Cookie attribute analysis with all values redacted.",
        },
        {
            "name": "CORS",
            "status": status("cors-origin-reflection", "cors-wildcard-origin"),
            "method": "One benign synthetic-Origin request.",
        },
        {
            "name": "Default Credentials",
            "status": "Not tested",
            "method": "Credential guessing is intentionally never automated.",
        },
        {
            "name": "Exposed Backup Files",
            "status": prefix_status("public-exposure-backup", "public-exposure-site-zip", "public-exposure-index-php-bak"),
            "method": "Bounded known-path checks with response fingerprint comparison.",
        },
        {
            "name": "Sensitive Files",
            "status": prefix_status("public-exposure-env", "public-exposure-git", "public-exposure-database", "public-exposure-config"),
            "method": "Bounded known-path checks; sensitive bodies are never displayed.",
        },
        {
            "name": "Open Ports",
            "status": "Detected"
            if any(item["open"] and item["port"] not in {80, 443} for item in ports)
            else "No additional checked ports",
            "method": "Bounded TCP handshake only; no banner grabbing.",
        },
        {
            "name": "Known CVEs",
            "status": (
                "Detected"
                if prefix_status("nvd-") == "Detected"
                else "Lookup unavailable"
                if any(item["status"] == "lookup-unavailable" for item in cve_matches)
                else "No exact-version match"
                if cve_matches
                else "No exact version detected"
            ),
            "method": "Free NVD lookup only when an exact public software version is detected.",
        },
    ]
