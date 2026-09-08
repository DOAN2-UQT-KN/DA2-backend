/**
 * Outbox event types. Reward-bound values match reward-service job-type strings
 * so the relay can forward `eventType` straight through. `REPORT_SUBMITTED` is
 * routed to the AI analysis queue instead (see SqsOutboxPublisher).
 */
export const OutboxEventType = {
  REPORT_COMPLETION_GREEN_POINTS: "REPORT_COMPLETION_GREEN_POINTS",
  CAMPAIGN_COMPLETION_GREEN_POINTS: "CAMPAIGN_COMPLETION_GREEN_POINTS",
  REPORT_VOTE_MILESTONE_GREEN_POINTS: "REPORT_VOTE_MILESTONE_GREEN_POINTS",
  CAMPAIGN_FACEBOOK_RECOGNITION: "CAMPAIGN_FACEBOOK_RECOGNITION",
  /** Domain: ReportSubmitted — consumed by ai-service verification pipeline. */
  REPORT_SUBMITTED: "REPORT_SUBMITTED",
} as const;

export type OutboxEventType =
  (typeof OutboxEventType)[keyof typeof OutboxEventType];
