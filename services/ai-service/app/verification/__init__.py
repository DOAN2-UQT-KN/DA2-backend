"""Report verification package (Duplicate + Authenticity + Risk stubs)."""

from app.verification.contracts import (
    AuthenticityResult,
    ReportDuplicate,
    ReportSubmittedPayload,
    RiskAssessment,
    RiskFlag,
)
from app.verification.pipeline import VerificationPipeline

__all__ = [
    "AuthenticityResult",
    "ReportDuplicate",
    "ReportSubmittedPayload",
    "RiskAssessment",
    "RiskFlag",
    "VerificationPipeline",
]
