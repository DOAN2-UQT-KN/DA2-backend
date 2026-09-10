"""Handler for REPORT_SUBMITTED outbox events."""

from __future__ import annotations

import logging

from app.queue.envelope import BackgroundJobEnvelope
from app.repositories.media_content_hash import upsert_computed_hashes_sync
from app.verification.contracts import ReportSubmittedPayload
from app.verification.duplicate import CONTEXT_MEDIA_HASHES
from app.verification.pipeline import VerificationPipeline

logger = logging.getLogger("ai-service.queue.report_submitted")

REPORT_SUBMITTED_JOB_TYPE = "REPORT_SUBMITTED"

_pipeline = VerificationPipeline()


def handle_report_submitted(envelope: BackgroundJobEnvelope) -> None:
    if envelope.job_type != REPORT_SUBMITTED_JOB_TYPE:
        raise ValueError(f"Unexpected jobType: {envelope.job_type}")

    payload = ReportSubmittedPayload.from_dict(envelope.payload)
    context: dict = {}
    result = _pipeline.run(
        payload, context=context, job_id=envelope.job_id
    )

    records = context.get(CONTEXT_MEDIA_HASHES) or []
    if records:
        try:
            upsert_computed_hashes_sync(
                report_id=payload.report_id,
                user_id=payload.user_id,
                records=records,
            )
        except Exception:  # noqa: BLE001
            logger.exception(
                "Failed to upsert media content hashes report_id=%s",
                payload.report_id,
            )
            raise

    logger.info(
        "Handled REPORT_SUBMITTED report_id=%s job_id=%s result=%s",
        payload.report_id,
        envelope.job_id,
        result.to_dict(),
    )
