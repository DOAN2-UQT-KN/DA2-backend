"""Handler for REPORT_SUBMITTED outbox events."""

from __future__ import annotations

import logging

from app.queue.envelope import BackgroundJobEnvelope
from app.verification.contracts import ReportSubmittedPayload
from app.verification.pipeline import VerificationPipeline

logger = logging.getLogger("ai-service.queue.report_submitted")

REPORT_SUBMITTED_JOB_TYPE = "REPORT_SUBMITTED"

_pipeline = VerificationPipeline()


def handle_report_submitted(envelope: BackgroundJobEnvelope) -> None:
    if envelope.job_type != REPORT_SUBMITTED_JOB_TYPE:
        raise ValueError(f"Unexpected jobType: {envelope.job_type}")

    payload = ReportSubmittedPayload.from_dict(envelope.payload)
    assessment = _pipeline.run(payload, job_id=envelope.job_id)
    logger.info(
        "Handled REPORT_SUBMITTED report_id=%s job_id=%s assessment=%s",
        payload.report_id,
        envelope.job_id,
        assessment.to_dict(),
    )
