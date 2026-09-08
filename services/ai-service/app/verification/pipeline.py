"""Report verification pipeline orchestrator."""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.verification.authenticity import run_authenticity
from app.verification.contracts import (
    ReportSubmittedPayload,
    RiskAssessment,
)
from app.verification.duplicate import run_duplicate_cascade
from app.verification.risk import RuleBasedRiskEngine

logger = logging.getLogger("ai-service.verification")


class VerificationPipeline:
    """
    Orchestrates Duplicate → Authenticity → Risk.

    Detector/engine bodies are empty stubs; this class only wires the call order.
    """

    def __init__(self, risk_engine: Optional[Any] = None) -> None:
        self._risk_engine = risk_engine or RuleBasedRiskEngine()

    def run(
        self,
        payload: ReportSubmittedPayload,
        *,
        context: Optional[dict[str, Any]] = None,
        job_id: Optional[str] = None,
    ) -> RiskAssessment:
        ctx = context or {}
        logger.info(
            "VerificationPipeline start report_id=%s job_id=%s media_count=%s",
            payload.report_id,
            job_id,
            len(payload.report_media_file_ids),
        )

        duplicate = run_duplicate_cascade(payload, ctx)
        authenticity = run_authenticity(payload, ctx)
        assessment = self._risk_engine.assess(duplicate, authenticity)

        logger.info(
            "VerificationPipeline done report_id=%s assessment=%s",
            payload.report_id,
            assessment.to_dict(),
        )
        return assessment
