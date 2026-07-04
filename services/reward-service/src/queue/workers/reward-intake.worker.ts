import { QueueWorker } from "@da2/queue";
import type {
  BackgroundJobEnvelope,
  BackgroundJobQueue,
  QueueThresholdConfig,
} from "@da2/queue";
import { FACEBOOK_RECOGNITION_JOB_TYPE } from "../../modules/facebook-recognition/facebook-recognition.types";
import { facebookRecognitionService } from "../../modules/facebook-recognition/facebook-recognition.service";
import { greenPointService } from "../../modules/green-point/green-point.instances";
import { KNOWN_GREEN_POINT_JOB_TYPES } from "../../modules/green-point/green-point.types";

/** Log label only; intake envelopes carry concrete strategy jobType strings. */
const REWARD_INTAKE_LABEL = "REWARD_INTAKE";

/**
 * Consumes the shared reward intake queue that other services publish to via
 * their transactional outbox (replaces the old internal HTTP `/enqueue`
 * endpoints). Routes each message by `jobType` and applies it directly:
 * green-point credits run in an idempotent Serializable transaction, Facebook
 * recognition posts to the social pipeline. Idempotency lives in the reward
 * ledger, so duplicate (at-least-once) deliveries are safe.
 */
export class RewardIntakeWorker extends QueueWorker {
  protected readonly jobType = REWARD_INTAKE_LABEL;

  constructor(
    queue: BackgroundJobQueue,
    store: ConstructorParameters<typeof QueueWorker>[1],
    threshold: QueueThresholdConfig,
  ) {
    super(queue, store, threshold);
  }

  protected jobTypeMatches(messageJobType: string): boolean {
    return (
      (KNOWN_GREEN_POINT_JOB_TYPES as readonly string[]).includes(
        messageJobType,
      ) || messageJobType === FACEBOOK_RECOGNITION_JOB_TYPE
    );
  }

  protected async process(body: string, _jobId: string): Promise<void> {
    const envelope = JSON.parse(body) as BackgroundJobEnvelope<unknown>;
    if (!envelope?.jobType || typeof envelope.jobType !== "string") {
      throw new Error("Invalid reward intake envelope");
    }

    if (envelope.jobType === FACEBOOK_RECOGNITION_JOB_TYPE) {
      await facebookRecognitionService.applyQueuedJob(envelope.payload);
      return;
    }

    await greenPointService.applyQueuedJob({
      jobType: envelope.jobType,
      payload: envelope.payload,
    });
  }
}
