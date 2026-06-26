import express, { type Express } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface CapturedRequest {
  path: string;
  body: unknown;
  apiKey: string | undefined;
}

/**
 * In-process stand-in for reward-service's internal API. Records every request
 * and lets a test flip the next HTTP status (e.g. 500 to simulate "reward is
 * down") so we can prove the relay retries instead of losing the event.
 */
export class RewardMock {
  private server: Server | null = null;
  readonly requests: CapturedRequest[] = [];
  private nextStatus = 202;

  /** Force the status returned by the next N calls (defaults to all calls). */
  setNextStatus(status: number): void {
    this.nextStatus = status;
  }

  reset(): void {
    this.requests.length = 0;
    this.nextStatus = 202;
  }

  private buildApp(): Express {
    const app = express();
    app.use(express.json());
    const handler = (path: string) =>
      (req: express.Request, res: express.Response): void => {
        this.requests.push({
          path,
          body: req.body,
          apiKey: req.header("x-internal-api-key") ?? undefined,
        });
        res.status(this.nextStatus).json({ queued: this.nextStatus < 400 });
      };
    app.post(
      "/internal/v1/green-points/enqueue",
      handler("/internal/v1/green-points/enqueue"),
    );
    app.post(
      "/internal/v1/facebook-recognition/enqueue",
      handler("/internal/v1/facebook-recognition/enqueue"),
    );
    return app;
  }

  async start(): Promise<string> {
    const app = this.buildApp();
    return new Promise((resolve) => {
      this.server = app.listen(0, () => {
        const { port } = this.server!.address() as AddressInfo;
        resolve(`http://127.0.0.1:${port}`);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) =>
      this.server!.close((err) => (err ? reject(err) : resolve())),
    );
    this.server = null;
  }
}
