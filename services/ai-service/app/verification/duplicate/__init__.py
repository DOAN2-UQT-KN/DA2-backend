"""Duplicate detection cascade — empty method stubs (algorithms deferred)."""

from __future__ import annotations

from typing import Any, Optional

from app.verification.contracts import ReportDuplicate, ReportSubmittedPayload


def exact_hash(
    payload: ReportSubmittedPayload,
    context: Optional[dict[str, Any]] = None,
) -> Optional[ReportDuplicate]:
    """Exact content-hash duplicate check. Not implemented yet."""
    _ = (payload, context)
    return None


def embedding_similarity(
    payload: ReportSubmittedPayload,
    context: Optional[dict[str, Any]] = None,
) -> Optional[ReportDuplicate]:
    """Embedding-based near-duplicate check. Not implemented yet."""
    _ = (payload, context)
    return None


def feature_matching(
    payload: ReportSubmittedPayload,
    context: Optional[dict[str, Any]] = None,
) -> Optional[ReportDuplicate]:
    """Feature-matching duplicate check. Not implemented yet."""
    _ = (payload, context)
    return None


def run_duplicate_cascade(
    payload: ReportSubmittedPayload,
    context: Optional[dict[str, Any]] = None,
) -> Optional[ReportDuplicate]:
    """
    Cascade wiring (hash → embedding → feature). Each step is empty for now;
    returns the first non-None result when methods are filled in later.
    """
    for step in (exact_hash, embedding_similarity, feature_matching):
        result = step(payload, context)
        if result is not None:
            return result
    return None
