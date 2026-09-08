import {
  resolveOutboxQueueUrl,
} from "../outbox-publisher";
import { OutboxEventType } from "../outbox.types";

describe("resolveOutboxQueueUrl", () => {
  const prevAi = process.env.SQS_AI_ANALYSIS_QUEUE_URL;
  const prevReward = process.env.SQS_REWARD_INTAKE_QUEUE_URL;

  beforeEach(() => {
    process.env.SQS_AI_ANALYSIS_QUEUE_URL =
      "http://localhost:4566/000000000000/ai-analysis-job";
    process.env.SQS_REWARD_INTAKE_QUEUE_URL =
      "http://localhost:4566/000000000000/reward-intake";
  });

  afterAll(() => {
    if (prevAi === undefined) delete process.env.SQS_AI_ANALYSIS_QUEUE_URL;
    else process.env.SQS_AI_ANALYSIS_QUEUE_URL = prevAi;
    if (prevReward === undefined) delete process.env.SQS_REWARD_INTAKE_QUEUE_URL;
    else process.env.SQS_REWARD_INTAKE_QUEUE_URL = prevReward;
  });

  it("routes REPORT_SUBMITTED to AI analysis queue", () => {
    expect(resolveOutboxQueueUrl(OutboxEventType.REPORT_SUBMITTED)).toBe(
      process.env.SQS_AI_ANALYSIS_QUEUE_URL,
    );
  });

  it("routes green-point events to reward intake", () => {
    expect(
      resolveOutboxQueueUrl(OutboxEventType.REPORT_COMPLETION_GREEN_POINTS),
    ).toBe(process.env.SQS_REWARD_INTAKE_QUEUE_URL);
    expect(
      resolveOutboxQueueUrl(OutboxEventType.CAMPAIGN_COMPLETION_GREEN_POINTS),
    ).toBe(process.env.SQS_REWARD_INTAKE_QUEUE_URL);
    expect(
      resolveOutboxQueueUrl(OutboxEventType.REPORT_VOTE_MILESTONE_GREEN_POINTS),
    ).toBe(process.env.SQS_REWARD_INTAKE_QUEUE_URL);
  });

  it("throws when AI queue URL missing for REPORT_SUBMITTED", () => {
    delete process.env.SQS_AI_ANALYSIS_QUEUE_URL;
    expect(() =>
      resolveOutboxQueueUrl(OutboxEventType.REPORT_SUBMITTED),
    ).toThrow(/SQS_AI_ANALYSIS_QUEUE_URL/);
  });
});
