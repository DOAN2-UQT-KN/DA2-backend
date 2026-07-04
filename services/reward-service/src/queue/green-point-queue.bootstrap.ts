import { BackgroundJobDispatcher } from "@da2/queue";
import { FACEBOOK_RECOGNITION_JOB_TYPE } from "../modules/facebook-recognition/facebook-recognition.types";
import { KNOWN_GREEN_POINT_JOB_TYPES } from "../modules/green-point/green-point.types";
import { TRANSLATE_TEXT_JOB_TYPE } from "../modules/translation/translation.types";
import { NoopBackgroundJobStore } from "./noop-background-job-store";
import { RewardBackgroundJobStore } from "./reward-background-job-store";
import { RewardSqsQueueFactory } from "./reward-sqs-queue-factory";

const backgroundJobStore = new RewardBackgroundJobStore();
/** Intake messages are owned (durably) by the producer's outbox; no local job row. */
const intakeJobStore = new NoopBackgroundJobStore();
const sqsFactory = new RewardSqsQueueFactory({});

const greenPointQueue = sqsFactory.createQueue(
  "SQS_GREEN_POINT_QUEUE_URL",
  backgroundJobStore,
);
const facebookRecognitionQueue = sqsFactory.createQueue(
  "SQS_FACEBOOK_RECOGNITION_QUEUE_URL",
  backgroundJobStore,
);
const translationQueue = sqsFactory.createQueue(
  "SQS_REWARD_TRANSLATION_QUEUE_URL",
  backgroundJobStore,
);
/** Cross-service intake: incident-service publishes outbox events here. */
const rewardIntakeQueue = sqsFactory.createQueue(
  "SQS_REWARD_INTAKE_QUEUE_URL",
  intakeJobStore,
);

export const backgroundJobDispatcher = new BackgroundJobDispatcher();
for (const jobType of KNOWN_GREEN_POINT_JOB_TYPES) {
  backgroundJobDispatcher.register(jobType, greenPointQueue);
}
backgroundJobDispatcher.register(
  FACEBOOK_RECOGNITION_JOB_TYPE,
  facebookRecognitionQueue,
);
backgroundJobDispatcher.register(TRANSLATE_TEXT_JOB_TYPE, translationQueue);

export {
  backgroundJobStore,
  facebookRecognitionQueue,
  greenPointQueue,
  intakeJobStore,
  rewardIntakeQueue,
  translationQueue,
};
