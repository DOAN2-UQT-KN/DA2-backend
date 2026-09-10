"""Service-to-service HTTP calls to incident-service (internal API key)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger("ai-service.clients.incident_internal")

PATCH_TIMEOUT_S = 15.0


def patch_duplicate_verification_sync(
    report_id: str, payload: dict[str, Any]
) -> None:
    """
    Persist DuplicateReportResult onto the incident Report row.
    Payload must not include report_id (the path already identifies the report).
    """
    base = settings.incident_api_base_url.rstrip("/")
    key = (settings.internal_ai_api_key or "").strip()
    if not key:
        raise RuntimeError("INTERNAL_AI_API_KEY is not configured")
    url = f"{base}/internal/v1/reports/{report_id}/duplicate-verification"
    with httpx.Client(timeout=PATCH_TIMEOUT_S) as client:
        response = client.patch(
            url,
            json=payload,
            headers={"x-internal-api-key": key},
        )
        response.raise_for_status()
