import json

from fastapi.testclient import TestClient

from app.api.admin import _authenticated_admin, _group_users
from app.main import app


def _configure_admins(monkeypatch) -> list[dict[str, str]]:
    accounts = [
        {"email": "shaheer-owner@example.test", "password": "first-correct-password"},
        {"email": "admin@example.test", "password": "second-correct-password"},
    ]
    monkeypatch.setenv("ADMIN_ACCOUNTS_JSON", json.dumps(accounts))
    monkeypatch.setenv("ADMIN_SESSION_SECRET", "test-session-secret-with-32-characters")
    return accounts


def test_admin_login_creates_a_verifiable_session(monkeypatch) -> None:
    accounts = _configure_admins(monkeypatch)

    response = TestClient(app).post(
        "/api/admin",
        json=accounts[0],
    )

    assert response.status_code == 200
    assert _authenticated_admin(f"Bearer {response.json()['token']}") == accounts[0]["email"]


def test_admin_login_is_mounted_at_api_route(monkeypatch) -> None:
    accounts = _configure_admins(monkeypatch)

    response = TestClient(app).post(
        "/api/admin",
        json=accounts[1],
    )

    assert response.status_code == 200
    assert response.json()["token"]


def test_admin_login_rejects_accounts_outside_allowlist(monkeypatch) -> None:
    _configure_admins(monkeypatch)

    response = TestClient(app).post(
        "/api/admin",
        json={"email": "removed-admin@example.test", "password": "otherwise-valid-password"},
    )

    assert response.status_code == 401


def test_audit_records_are_grouped_by_redacted_user_id() -> None:
    records = [
        {
            "user_id": "usr_one",
            "session_id": "browser-session",
            "created_at": "2026-07-19T12:00:00+00:00",
            "result_shown_to_user": {"finding_count": 2, "overall_level": "CRITICAL"},
        },
        {
            "user_id": "usr_one",
            "session_id": "browser-session",
            "created_at": "2026-07-19T11:00:00+00:00",
            "result_shown_to_user": {"finding_count": 1, "overall_level": "LOW"},
        },
    ]

    users = _group_users(records)

    assert users[0]["scan_count"] == 2
    assert users[0]["finding_count"] == 3
    assert users[0]["critical_count"] == 1
