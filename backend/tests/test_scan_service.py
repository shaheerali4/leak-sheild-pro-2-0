from unittest.mock import AsyncMock

import pytest

from app.cache import cache_client
from app.models import Finding
from app.schemas import ScanRequest
from app.services.scan_service import ScanService


@pytest.mark.asyncio
async def test_cached_scan_sets_cache_hit_without_duplicate_keyword(monkeypatch) -> None:
    cached = {
        "id": "b54bd2de-f465-48c4-9095-0d5e15b22fea",
        "source_name": "cached.env",
        "content_hash": "a" * 64,
        "overall_score": 0,
        "overall_level": "LOW",
        "finding_count": 0,
        "cache_hit": False,
        "created_at": None,
        "findings": [],
    }
    monkeypatch.setattr(cache_client, "get_json", AsyncMock(return_value=cached))

    response = await ScanService(AsyncMock(), "a" * 64).scan(
        ScanRequest(content="safe content", source_name="cached.env")
    )

    assert response.cache_hit is True


def test_website_evidence_metadata_survives_persistence_mapping() -> None:
    explanation = {
        "summary": "The response header is missing.",
        "attacker_impact": "Browser protections are weaker.",
        "real_world_consequence": "Client-side attacks may have greater impact.",
        "remediation": "Add the response header.",
        "business_impact": "Increased application risk.",
        "_finding": {
            "source_address": "https://example.com/",
            "public_accessible": True,
            "location_type": "http_response_header",
            "affected_component": "HTTP response header: Content-Security-Policy",
            "observed_evidence": "The header was absent from the HTTP 200 response.",
            "expected_value": "Content-Security-Policy: default-src 'self'",
            "detection_method": "Inspected the public homepage response headers.",
            "verification_status": "detected",
            "credential_provider": "Google Cloud / Google Maps Platform",
            "credential_kind": "Google API Key",
            "matched_identifier": "api_key",
            "provider_scope": "Enabled APIs require provider-side review.",
            "external_reference": "https://nvd.nist.gov/vuln/detail/CVE-2026-0001",
            "cve": "CVE-2026-0001",
        },
    }
    finding = Finding(
        id="b54bd2de-f465-48c4-9095-0d5e15b22fea",
        scan_id="d26f8ee4-f32d-4cc1-9b0b-5730a8bd5d42",
        rule_id="missing-content-security-policy",
        secret_type="Missing Content-Security-Policy",
        severity="HIGH",
        risk_score=72,
        risk_level="HIGH",
        value_hash="a" * 64,
        value_preview="Verified configuration evidence",
        line_number=0,
        column_start=0,
        column_end=0,
        context_snippet="The header was absent.",
        explanation=explanation,
    )

    response = ScanService._finding_response(finding, explanation)

    assert response.line_number == 0
    assert response.location_type == "http_response_header"
    assert response.affected_component == "HTTP response header: Content-Security-Policy"
    assert response.observed_evidence == "The header was absent from the HTTP 200 response."
    assert response.expected_value == "Content-Security-Policy: default-src 'self'"
    assert response.detection_method == "Inspected the public homepage response headers."
    assert response.verification_status == "detected"
    assert response.credential_provider == "Google Cloud / Google Maps Platform"
    assert response.credential_kind == "Google API Key"
    assert response.matched_identifier == "api_key"
    assert response.provider_scope == "Enabled APIs require provider-side review."
    assert response.cve == "CVE-2026-0001"
    assert response.external_reference.endswith("CVE-2026-0001")


def test_project_hash_binds_finding_locations_to_file_paths() -> None:
    first = ScanRequest(
        mode="project-folder",
        files=[{"path": "config/first.env", "content": "password='SameProductionPassword2026!'"}],
    )
    second = ScanRequest(
        mode="project-folder",
        files=[{"path": "config/second.env", "content": "password='SameProductionPassword2026!'"}],
    )

    first_content, _ = ScanService._scan_content(first)
    second_content, _ = ScanService._scan_content(second)

    assert first_content == second_content
    assert ScanService._content_hash(first, first_content) != ScanService._content_hash(second, second_content)
