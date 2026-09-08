"""Verification pipeline contracts (DTO shapes / reason codes / flag bands).

Algorithms are deferred; these types document the production contract.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class RiskFlag(str, Enum):
    ACCEPT = "ACCEPT"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


# Contract bands (for when Risk Engine is implemented):
# 0.00 ─── 0.30 ─── 0.70 ─── 1.00
#    ACCEPT      REVIEW      REJECT
RISK_FLAG_ACCEPT_MAX = 0.30
RISK_FLAG_REVIEW_MAX = 0.70


class ReasonCode(str, Enum):
    HIGH_IMAGE_SIMILARITY = "HIGH_IMAGE_SIMILARITY"
    NEARBY_EXISTING_REPORT = "NEARBY_EXISTING_REPORT"
    EXIF_TIME_MISMATCH = "EXIF_TIME_MISMATCH"
    LIVE_CAMERA_PRESENT = "LIVE_CAMERA_PRESENT"
    EXACT_HASH_MATCH = "EXACT_HASH_MATCH"


@dataclass
class ReportSubmittedPayload:
    report_id: str
    user_id: str
    report_media_file_ids: list[str]

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "ReportSubmittedPayload":
        report_id = raw.get("reportId")
        user_id = raw.get("userId")
        media_ids = raw.get("reportMediaFileIds")
        if not isinstance(report_id, str) or not report_id:
            raise ValueError("Invalid REPORT_SUBMITTED payload: reportId")
        if not isinstance(user_id, str) or not user_id:
            raise ValueError("Invalid REPORT_SUBMITTED payload: userId")
        if not isinstance(media_ids, list):
            raise ValueError("Invalid REPORT_SUBMITTED payload: reportMediaFileIds")
        cleaned = [m for m in media_ids if isinstance(m, str) and m]
        return cls(
            report_id=report_id,
            user_id=user_id,
            report_media_file_ids=cleaned,
        )


@dataclass
class ReportDuplicate:
    matched_report_id: Optional[str] = None
    matched_user_id: Optional[str] = None
    image_similarity: Optional[float] = None
    location_similarity: Optional[float] = None
    time_similarity: Optional[float] = None
    category_similarity: Optional[float] = None
    duplicate_score: Optional[float] = None
    duplicate_reason: Optional[str] = None


@dataclass
class AuthenticityResult:
    camera_score: Optional[float] = None
    exif_score: Optional[float] = None
    internet_score: Optional[float] = None
    authenticity_score: Optional[float] = None
    reasons: list[str] = field(default_factory=list)


@dataclass
class RiskAssessmentDetails:
    duplicate_score: Optional[float] = None
    authenticity_score: Optional[float] = None
    behavior_score: Optional[float] = None
    context_score: Optional[float] = None


@dataclass
class RiskAssessment:
    """Standardized verification output contract."""

    risk_score: Optional[float] = None
    flag: Optional[RiskFlag] = None
    details: RiskAssessmentDetails = field(default_factory=RiskAssessmentDetails)
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "flag": self.flag.value if self.flag else None,
            "details": {
                "duplicate_score": self.details.duplicate_score,
                "authenticity_score": self.details.authenticity_score,
                "behavior_score": self.details.behavior_score,
                "context_score": self.details.context_score,
            },
            "reasons": list(self.reasons),
        }
