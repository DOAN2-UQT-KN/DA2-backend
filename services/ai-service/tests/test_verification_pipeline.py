"""Unit tests for verification pipeline wiring (empty stubs)."""

from __future__ import annotations

from app.queue.envelope import BackgroundJobEnvelope
from app.queue.handlers import dispatch
from app.queue.handlers.report_submitted import handle_report_submitted
from app.verification.contracts import ReportSubmittedPayload, RiskAssessment
from app.verification.duplicate import (
    embedding_similarity,
    exact_hash,
    feature_matching,
    run_duplicate_cascade,
)
from app.verification.authenticity import (
    exif_verification,
    internet_detection,
    live_camera,
    run_authenticity,
)
from app.verification.pipeline import VerificationPipeline
from app.verification.risk import RuleBasedRiskEngine, assess, combine


def test_payload_from_dict() -> None:
    payload = ReportSubmittedPayload.from_dict(
        {
            "reportId": "r1",
            "userId": "u1",
            "reportMediaFileIds": ["m1", "", 3, "m2"],
        }
    )
    assert payload.report_id == "r1"
    assert payload.user_id == "u1"
    assert payload.report_media_file_ids == ["m1", "m2"]


def test_payload_rejects_invalid() -> None:
    try:
        ReportSubmittedPayload.from_dict({"reportId": "r1"})
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_duplicate_stubs_return_none() -> None:
    payload = ReportSubmittedPayload("r1", "u1", ["m1"])
    assert exact_hash(payload) is None
    assert embedding_similarity(payload) is None
    assert feature_matching(payload) is None
    assert run_duplicate_cascade(payload) is None


def test_authenticity_stubs_empty() -> None:
    payload = ReportSubmittedPayload("r1", "u1", [])
    assert live_camera(payload).authenticity_score is None
    assert exif_verification(payload).authenticity_score is None
    assert internet_detection(payload).internet_score is None
    assert run_authenticity(payload).authenticity_score is None


def test_risk_stubs_empty() -> None:
    assert combine(None, None, None, None) is None
    assessment = assess(None, run_authenticity(ReportSubmittedPayload("r", "u", [])))
    assert isinstance(assessment, RiskAssessment)
    assert assessment.risk_score is None
    assert assessment.to_dict()["flag"] is None


def test_pipeline_wires_stubs() -> None:
    result = VerificationPipeline(risk_engine=RuleBasedRiskEngine()).run(
        ReportSubmittedPayload("r1", "u1", ["m1"]),
        job_id="job-1",
    )
    assert result.risk_score is None
    assert result.to_dict()["details"]["duplicate_score"] is None


def test_handle_report_submitted() -> None:
    envelope = BackgroundJobEnvelope(
        job_id="job-1",
        job_type="REPORT_SUBMITTED",
        payload={
            "reportId": "r1",
            "userId": "u1",
            "reportMediaFileIds": [],
        },
    )
    handle_report_submitted(envelope)


def test_dispatch_unknown_job_type() -> None:
    envelope = BackgroundJobEnvelope(
        job_id="job-1",
        job_type="UNKNOWN",
        payload={},
    )
    try:
        dispatch(envelope)
        assert False, "expected ValueError"
    except ValueError as err:
        assert "No handler" in str(err)
