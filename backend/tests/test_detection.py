from app.engines.detection import DetectionEngine
from app.engines.detection.rules import SECRET_RULES
from app.engines.risk import RiskEngine


def test_detects_password_and_scores_high() -> None:
    secret = "ProdRootPass2026!"
    content = f"ENV=production\npassword='{secret}'\n"
    findings = DetectionEngine().scan(content)
    assert findings
    assert secret not in findings[0].context_snippet
    assert "[REDACTED]" in findings[0].context_snippet
    risk = RiskEngine().score_finding(findings[0], content, {})
    assert risk.level in {"HIGH", "CRITICAL"}


def test_finding_limit_prevents_unbounded_detection_work() -> None:
    content = "\n".join(f"password='UniqueProductionPassword{i:04d}!'" for i in range(400))
    findings = DetectionEngine().scan(content)

    assert len(findings) == 250


def test_production_detector_keeps_specialized_credential_coverage() -> None:
    rule_ids = {rule.rule_id for rule in SECRET_RULES}

    assert {
        "github-token",
        "openai-api-key",
        "google-api-key",
        "stripe-secret-key",
        "slack-token",
        "sendgrid-key",
        "basic-auth-url",
    }.issubset(rule_ids)


def test_google_and_named_api_credentials_are_detected_with_redacted_context() -> None:
    google_key = "AIza" + ("Ab3_" * 8) + "XYZ"
    oauth_secret = "GOCS" + ("K7m_" * 7)
    content = f'client_secret="{oauth_secret}";apiKey="{google_key}"'

    findings = DetectionEngine().scan(content)
    google_findings = [item for item in findings if item.rule.rule_id == "google-api-key"]
    generic_values = {
        item.secret_value for item in findings if item.rule.rule_id == "generic-api-key"
    }

    assert len(google_findings) == 1
    assert google_findings[0].secret_value == google_key
    assert oauth_secret in generic_values
    assert google_key in generic_values
    assert all("[REDACTED]" in item.context_snippet for item in findings)
    assert all(item.secret_value not in item.context_snippet for item in findings)


def test_low_entropy_generic_assignments_are_ignored() -> None:
    findings = DetectionEngine().scan("api_key='aaaaaaaaaaaaaaaaaaaaaaaa'")

    assert findings == []

