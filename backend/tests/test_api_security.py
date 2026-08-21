from fastapi.testclient import TestClient

from app.main import app
from app.security import _rate_requests


SESSION_A = "98a89f3c-b1ee-4b53-93ee-ff0cd7660c54"
SESSION_B = "6e1e72a3-825e-479c-ab05-f46b7d6af742"


def test_scan_history_is_isolated_between_browser_sessions() -> None:
    _rate_requests.clear()
    with TestClient(app) as client:
        created = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": SESSION_A},
            json={
                "mode": "text",
                "source_name": "ownership-test.env",
                "content": "password='UniqueProductionOwnershipPassword2026!'",
            },
        )
        assert created.status_code == 201
        scan_id = created.json()["id"]
        finding = created.json()["findings"][0]

        own_history = client.get("/api/scans", headers={"X-LeakShield-Session": SESSION_A})
        other_history = client.get("/api/scans", headers={"X-LeakShield-Session": SESSION_B})
        other_detail = client.get(f"/api/scans/{scan_id}", headers={"X-LeakShield-Session": SESSION_B})

    assert any(item["id"] == scan_id for item in own_history.json())
    assert all(item["id"] != scan_id for item in other_history.json())
    assert other_detail.status_code == 404
    assert finding["file_path"] == "ownership-test.env"
    assert finding["location_type"] == "pasted_text"
    assert finding["line_number"] == 1
    assert finding["column_start"] == 1
    assert finding["affected_component"] == "Pasted input: ownership-test.env"
    assert "Redacted preview" in finding["observed_evidence"]
    assert finding["value_preview"] not in finding["context_snippet"]


def test_clear_scan_history_deletes_only_the_current_browser_session() -> None:
    _rate_requests.clear()
    with TestClient(app) as client:
        scan_a = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": SESSION_A},
            json={"mode": "text", "source_name": "clear-a.env", "content": "safe=true"},
        )
        scan_b = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": SESSION_B},
            json={"mode": "text", "source_name": "keep-b.env", "content": "safe=true"},
        )
        cleared = client.delete("/api/scans", headers={"X-LeakShield-Session": SESSION_A})
        history_a = client.get("/api/scans", headers={"X-LeakShield-Session": SESSION_A})
        history_b = client.get("/api/scans", headers={"X-LeakShield-Session": SESSION_B})

    assert scan_a.status_code == 201
    assert scan_b.status_code == 201
    assert cleared.status_code == 200
    assert cleared.json()["deleted"] >= 1
    assert all(item["id"] != scan_a.json()["id"] for item in history_a.json())
    assert any(item["id"] == scan_b.json()["id"] for item in history_b.json())


def test_project_scan_reports_file_relative_location_and_evidence() -> None:
    _rate_requests.clear()
    with TestClient(app) as client:
        response = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": SESSION_B},
            json={
                "mode": "project-folder",
                "source_name": "uploaded-project",
                "files": [
                    {"path": "src/safe.js", "content": "const ready = true;\nconst port = 443;"},
                    {
                        "path": "config/production.env",
                        "content": "APP_ENV=production\npassword='SecondFileProductionPassword2026!'",
                    },
                ],
            },
        )

    assert response.status_code == 201
    finding = response.json()["findings"][0]
    assert finding["file_path"] == "config/production.env"
    assert finding["location_type"] == "project_file"
    assert finding["line_number"] == 2
    assert finding["column_start"] == 1
    assert finding["affected_component"] == "Project file: config/production.env"
    assert "line 2" in finding["observed_evidence"]
    assert finding["value_preview"] not in finding["context_snippet"]


def test_api_key_result_names_provider_and_exact_location() -> None:
    _rate_requests.clear()
    google_key = "AIza" + ("Ab3_" * 8) + "XYZ"
    with TestClient(app) as client:
        response = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": SESSION_A},
            json={
                "mode": "text",
                "source_name": "src/public-config.js",
                "content": f'const apiKey = "{google_key}";',
            },
        )

    assert response.status_code == 201
    findings = response.json()["findings"]
    assert len(findings) == 1
    finding = findings[0]
    assert finding["rule_id"] == "google-api-key"
    assert finding["credential_provider"] == "Google Cloud / Google Maps Platform"
    assert finding["credential_kind"] == "Google API Key"
    assert finding["verification_status"] == "potential"
    assert finding["file_path"] == "src/public-config.js"
    assert finding["line_number"] == 1
    assert finding["column_start"] > 1
    assert google_key not in finding["context_snippet"]


def test_scan_requires_a_canonical_session_identifier() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": "not-a-session"},
            json={"mode": "text", "content": "safe text"},
        )

    assert response.status_code == 400


def test_request_body_limit_rejects_oversized_payloads() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/scans",
            headers={"X-LeakShield-Session": SESSION_A},
            content=b"x" * 2_000_001,
        )

    assert response.status_code == 413
