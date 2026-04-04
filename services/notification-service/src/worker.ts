import dotenv from "dotenv";
import { prisma } from "./lib/prisma";
import { NotificationJobOrchestratorWorker } from "./modules/notification-queue/worker/notification-job-orchestrator.worker";
import { notificationSendJobHandler } from "./modules/notification-queue/worker/notification-send-job.handler";

dotenv.config();

const worker = new NotificationJobOrchestratorWorker([notificationSendJobHandler]);

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[Notification worker] received ${signal}, shutting down`);
  await worker.stop();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

worker.start();
