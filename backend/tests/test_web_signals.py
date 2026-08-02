import asyncio

import httpx

from app.engines.assessment.web_signals import (
    analyze_headers,
    analyze_html,
    analyze_javascript,
    coverage_matrix,
    detect_technologies,
    lookup_nvd_cves,
    port_signals,
)


def test_html_analysis_reports_precise_passive_evidence() -> None:
    html = """<html><title>Index of /files</title>
    <form method="post" action="/account"><input name="email"></form>
    Warning: mysql query failed
    </html>"""

    signals, forms = analyze_html("https://example.com/files", 200, html)
    rules = {signal.rule_id for signal in signals}

    assert "directory-listing" in rules
    assert "sql-error-disclosure" in rules
    assert any(rule.startswith("potential-csrf-") for rule in rules)
    sql = next(signal for signal in signals if signal.rule_id == "sql-error-disclosure")
    assert sql.line_number == 3
    assert sql.column_start > 0
    assert "no injection payload" in sql.detection_method.lower()
    assert forms == [
        {
            "action": "https://example.com/account",
            "method": "POST",
            "has_csrf_token": False,
            "has_file_input": False,
            "has_password_input": False,
        }
    ]


def test_form_analysis_never_claims_upload_exploitation() -> None:
    html = """<form method="post" action="/upload">
    <input type="hidden" name="csrf_token" value="redacted">
    <input type="file" name="document" accept="image/png">
    </form>"""

    signals, forms = analyze_html("https://example.com/profile", 200, html)

    assert not any(signal.rule_id.startswith("potential-csrf-") for signal in signals)
    upload = next(signal for signal in signals if signal.rule_id.startswith("file-upload-surface-"))
    assert "did not upload" in upload.detection_method
    assert forms[0]["has_file_input"] is True


def test_cookie_values_are_redacted_and_cors_reflection_is_detected() -> None:
    signals = analyze_headers(
        "https://example.com/",
        200,
        {},
        ["session=super-secret-value; Path=/"],
        {
            "Access-Control-Allow-Origin": "https://leakshield.invalid",
            "Access-Control-Allow-Credentials": "true",
        },
    )

    cors = next(signal for signal in signals if signal.rule_id == "cors-origin-reflection")
    cookie = next(signal for signal in signals if signal.rule_id == "weak-cookie-session")
    assert cors.severity == "HIGH"
    assert "super-secret-value" not in cookie.observed_evidence
    assert "redacted" in cookie.observed_evidence.lower()


def test_present_but_weak_security_headers_are_reported() -> None:
    signals = analyze_headers(
        "https://example.com/",
        200,
        {
            "Content-Security-Policy": "default-src *; script-src 'unsafe-eval'",
            "Strict-Transport-Security": "max-age=300",
            "X-Content-Type-Options": "off",
            "X-Frame-Options": "ALLOW-FROM https://frame.example",
        },
        [],
        {},
    )
    rules = {signal.rule_id for signal in signals}

    assert "weak-csp-policy" in rules
    assert "weak-hsts-policy" in rules
    assert "weak-security-header-x-content-type-options" in rules
    assert "weak-security-header-x-frame-options" in rules


def test_dom_xss_signal_is_static_and_marked_potential() -> None:
    script = "const input = location.search; document.querySelector('#out').innerHTML = input;"

    signals = analyze_javascript("https://example.com/app.js", script)

    assert len(signals) == 1
    assert signals[0].rule_id == "potential-dom-xss-data-flow"
    assert signals[0].status == "potential"
    assert "no XSS payload" in signals[0].detection_method


def test_technology_detection_includes_version_evidence_and_cpe() -> None:
    technologies = detect_technologies(
        '<meta name="generator" content="WordPress 6.4.2"><main ng-version="17.1.0"></main>',
        {"Server": "Apache/2.4.58", "X-Powered-By": "PHP/8.2.12"},
        ["WordPress 6.4.2"],
        [],
    )
    by_name = {item["name"]: item for item in technologies}

    assert by_name["Apache HTTP Server"]["version"] == "2.4.58"
    assert by_name["Apache HTTP Server"]["cpe_product"] == "http_server"
    assert by_name["PHP"]["version"] == "8.2.12"
    assert by_name["WordPress"]["version"] == "6.4.2"
    assert by_name["Angular"]["version"] == "17.1.0"


def test_nvd_lookup_uses_exact_cpe_and_parses_cvss() -> None:
    requested_query = ""

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal requested_query
        requested_query = request.url.query.decode()
        return httpx.Response(
            200,
            json={
                "vulnerabilities": [
                    {
                        "cve": {
                            "id": "CVE-2026-0001",
                            "descriptions": [{"lang": "en", "value": "Example advisory."}],
                            "metrics": {
                                "cvssMetricV31": [
                                    {"cvssData": {"baseSeverity": "HIGH", "baseScore": 8.1}}
                                ]
                            },
                        }
                    }
                ]
            },
        )

    async def run() -> list[dict]:
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            return await lookup_nvd_cves(
                client,
                [
                    {
                        "name": "Apache HTTP Server",
                        "version": "2.4.58",
                        "cpe_vendor": "apache",
                        "cpe_product": "http_server",
                    }
                ],
            )

    matches = asyncio.run(run())
    assert "cpeName=cpe%3A2.3%3Aa%3Aapache%3Ahttp_server%3A2.4.58" in requested_query
    assert "isVulnerable=" in requested_query
    assert matches[0]["cves"][0]["id"] == "CVE-2026-0001"
    assert matches[0]["cves"][0]["score"] == 8.1


def test_port_and_coverage_results_explain_safe_limits() -> None:
    ports = [
        {"port": 443, "service": "HTTPS", "severity": "LOW", "open": True},
        {"port": 6379, "service": "Redis", "severity": "CRITICAL", "open": True},
    ]
    signals = port_signals("example.com", ports)
    findings = [{"rule_id": signal.rule_id} for signal in signals]
    coverage = {item["name"]: item for item in coverage_matrix(findings, [], ports)}

    assert signals[0].rule_id == "exposed-port-6379"
    assert "no banner or credentials" in signals[0].observed_evidence
    assert coverage["Open Ports"]["status"] == "Detected"
    assert coverage["Default Credentials"]["status"] == "Not tested"
