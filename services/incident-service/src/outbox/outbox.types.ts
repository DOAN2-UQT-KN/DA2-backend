/**
 * Outbox event types. The string values intentionally match the downstream
 * (reward-service) job-type strings so the relay can forward `eventType`
 * straight through to the reward enqueue endpoints.
 */
export const OutboxEventType = {
  REPORT_COMPLETION_GREEN_POINTS: "REPORT_COMPLETION_GREEN_POINTS",
  CAMPAIGN_COMPLETION_GREEN_POINTS: "CAMPAIGN_COMPLETION_GREEN_POINTS",
  REPORT_VOTE_MILESTONE_GREEN_POINTS: "REPORT_VOTE_MILESTONE_GREEN_POINTS",
  CAMPAIGN_FACEBOOK_RECOGNITION: "CAMPAIGN_FACEBOOK_RECOGNITION",
} as const;

export type OutboxEventType =
  (typeof OutboxEventType)[keyof typeof OutboxEventType];
