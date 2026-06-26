"""HTTP tools against incident-service report APIs (user JWT forwarded)."""

from __future__ import annotations

import json
import re
import uuid
from typing import Any, Optional

from app.repositories.chat import ChatRepository
from app.repositories.chat_media import list_chat_media_for_user_ids
from app.tools.definitions import RegisteredTool, ToolContext
from app.tools.incident_client import incident_request_json

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_MAX_IMAGE_MEDIA_IDS = 20
_DEFAULT_LATITUDE = 1.0
_DEFAULT_LONGITUDE = 1.0
_DEFAULT_TITLE = "Báo cáo sự cố môi trường"
_DEFAULT_DESCRIPTION = "Báo cáo được gửi qua trợ lý EcoLink."


async def _resolve_chat_media_urls(
    ctx: ToolContext,
    raw_media_ids: list[Any],
) -> tuple[list[str], Optional[str]]:
    ids: list[uuid.UUID] = []
    seen: set[str] = set()
    for x in raw_media_ids:
        if not isinstance(x, str):
            return [], json.dumps({"error": "Each image_media_ids entry must be a string UUID"})
        s = x.strip()
        if not _UUID_RE.match(s):
            return [], json.dumps({"error": f"Invalid UUID: {s!r}"})
        if s not in seen:
            seen.add(s)
            try:
                ids.append(uuid.UUID(s))
            except ValueError:
                return [], json.dumps({"error": f"Invalid UUID: {s!r}"})

    if len(ids) > _MAX_IMAGE_MEDIA_IDS:
        return [], json.dumps({"error": f"At most {_MAX_IMAGE_MEDIA_IDS} image_media_ids allowed"})

    repo = ctx.get("chat_repo")
    uid_raw = ctx.get("user_id")
    if not isinstance(repo, ChatRepository) or not isinstance(uid_raw, str):
        return [], json.dumps({"error": "Missing chat context for image_media_ids resolution"})

    try:
        uid = uuid.UUID(uid_raw)
    except ValueError:
        return [], json.dumps({"error": "Invalid user in context"})

    rows = await list_chat_media_for_user_ids(repo.session, uid, ids)
    by_id = {str(r.id): r.url.strip() for r in rows if r.url.strip()}
    urls: list[str] = []
    for mid in ids:
        u = by_id.get(str(mid))
        if not u:
            return [], json.dumps({"error": f"Chat media not found or not owned by user: {mid}"})
        if not u.startswith(("http://", "https://")):
            return [], json.dumps({"error": f"Chat media URL is not HTTP(S): {mid}"})
        urls.append(u)
    return urls, None


async def _create_report(args: dict[str, Any], ctx: ToolContext) -> str:
    title = (args.get("title") or "").strip() or _DEFAULT_TITLE

    lat_raw = args.get("latitude")
    lng_raw = args.get("longitude")
    try:
        latitude = float(lat_raw) if lat_raw is not None else _DEFAULT_LATITUDE
        longitude = float(lng_raw) if lng_raw is not None else _DEFAULT_LONGITUDE
    except (TypeError, ValueError):
        return json.dumps({"error": "latitude and longitude must be numbers"})
    if not (-90 <= latitude <= 90):
        return json.dumps({"error": "latitude must be between -90 and 90"})
    if not (-180 <= longitude <= 180):
        return json.dumps({"error": "longitude must be between -180 and 180"})

    image_urls: list[str] = []
    raw_urls = args.get("image_urls")
    if isinstance(raw_urls, list):
        for u in raw_urls:
            if isinstance(u, str) and u.strip():
                s = u.strip()
                if s.startswith(("http://", "https://")):
                    image_urls.append(s)

    raw_media_ids = args.get("image_media_ids")
    if isinstance(raw_media_ids, list) and len(raw_media_ids) > 0:
        resolved, err = await _resolve_chat_media_urls(ctx, raw_media_ids)
        if err:
            return err
        image_urls.extend(resolved)

    seen: set[str] = set()
    unique_urls: list[str] = []
    for u in image_urls:
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)
    image_urls = unique_urls

    if not image_urls:
        return json.dumps(
            {
                "error": (
                    "At least one image is required via image_urls (HTTPS URLs) "
                    "or image_media_ids (ai_chat_media UUIDs from chat attachments)"
                )
            }
        )

    payload: dict[str, Any] = {
        "title": title,
        "latitude": latitude,
        "longitude": longitude,
        "imageUrls": image_urls,
    }

    description = (args.get("description") or "").strip() or _DEFAULT_DESCRIPTION
    payload["description"] = description
    if args.get("waste_type") is not None and str(args["waste_type"]).strip():
        payload["wasteType"] = str(args["waste_type"]).strip()
    if args.get("severity_level") is not None:
        try:
            sev = int(args["severity_level"])
        except (TypeError, ValueError):
            return json.dumps({"error": "severity_level must be an integer between 1 and 2"})
        if not 1 <= sev <= 2:
            return json.dumps({"error": "severity_level must be between 1 and 2"})
        payload["severityLevel"] = sev
    if args.get("detail_address") is not None and str(args["detail_address"]).strip():
        payload["detailAddress"] = str(args["detail_address"]).strip()

    return await incident_request_json(
        "POST",
        "/api/v1/reports",
        ctx,
        json_body=payload,
    )


create_report_tool = RegisteredTool(
    name="create_report",
    description=(
        "Creates an environmental incident report for the authenticated user. "
        "Requires at least one image via image_urls (HTTPS URLs) and/or image_media_ids "
        "(ai_chat_media UUIDs from chat attachments). "
        "Provide a suggested title and description inferred from images/context; "
        "latitude and longitude default to 1 if omitted. "
        "Optional: waste_type, severity_level (1–2), detail_address."
    ),
    parameters={
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Short report title inferred from images/context (fallback if omitted)",
            },
            "description": {
                "type": "string",
                "description": "Report description inferred from images/context (fallback if omitted)",
            },
            "latitude": {
                "type": "number",
                "description": "Defaults to 1 if omitted; do not ask the user for coordinates",
            },
            "longitude": {
                "type": "number",
                "description": "Defaults to 1 if omitted; do not ask the user for coordinates",
            },
            "detail_address": {
                "type": "string",
                "description": "Optional human-readable address for the location",
            },
            "waste_type": {
                "type": "string",
                "description": "Optional waste type label (e.g. plastic, organic)",
            },
            "severity_level": {
                "type": "integer",
                "minimum": 1,
                "maximum": 2,
                "description": "Severity from 1 (low) to 2 (high)",
            },
            "image_urls": {
                "type": "array",
                "items": {"type": "string"},
                "description": "HTTPS image URLs for the report (at least one image required in total)",
            },
            "image_media_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Optional ai_chat_media UUIDs from user chat attachments; "
                    "resolved to URLs before calling the report API"
                ),
                "maxItems": 20,
            },
        },
        "required": [],
    },
    handler=_create_report,
)
