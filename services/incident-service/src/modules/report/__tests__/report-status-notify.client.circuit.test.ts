import axios from "axios";
import { enqueueReportStatusWebsiteNotification } from "../report-status-notify.client";
import {
  getHttpCircuit,
  HTTP_CIRCUIT_NOTIFICATION,
  resetHttpCircuitsForTests,
} from "../../../resilience/http-circuit";

jest.mock("axios");
jest.mock("../../organization/identity-user.client", () => ({
  filterUserIdsForNotificationKind: jest.fn(async ({ userIds }: { userIds: string[] }) => userIds),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("report-status-notify.client HTTP circuit breaker", () => {
  const post = jest.fn();

  beforeEach(() => {
    resetHttpCircuitsForTests();
    jest.clearAllMocks();
    process.env.NOTIFICATION_SERVICE_URL = "http://notification.test";
    process.env.INTERNAL_NOTIFICATION_API_KEY = "test-key";
    process.env.HTTP_BREAKER_FAILURE_THRESHOLD = "3";
    process.env.HTTP_BREAKER_OPEN_MS = "30000";
    process.env.HTTP_BREAKER_SUCCESS_THRESHOLD = "2";
    process.env.NODE_ENV = "test";

    mockedAxios.create.mockReturnValue({ post } as never);
  });

  const params = {
    userId: "550e8400-e29b-41d4-a716-446655440000",
    reportId: "660e8400-e29b-41d4-a716-446655440000",
    reportTitle: "Trash",
    status: "COMPLETED",
  };

  it("opens circuit after consecutive notification failures", async () => {
    post.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(enqueueReportStatusWebsiteNotification(params)).rejects.toThrow(
      "ECONNREFUSED",
    );
    await expect(enqueueReportStatusWebsiteNotification(params)).rejects.toThrow(
      "ECONNREFUSED",
    );
    await expect(enqueueReportStatusWebsiteNotification(params)).rejects.toThrow(
      "ECONNREFUSED",
    );
    expect(getHttpCircuit(HTTP_CIRCUIT_NOTIFICATION).getState()).toBe("OPEN");
    expect(post).toHaveBeenCalledTimes(3);

    await expect(enqueueReportStatusWebsiteNotification(params)).rejects.toThrow(
      /Circuit breaker open/,
    );
    expect(post).toHaveBeenCalledTimes(3);
  });

  it("stays CLOSED on successful enqueue", async () => {
    post.mockResolvedValue({ data: { success: true, data: { accepted: true } } });

    await enqueueReportStatusWebsiteNotification(params);
    expect(getHttpCircuit(HTTP_CIRCUIT_NOTIFICATION).getState()).toBe("CLOSED");
    expect(post).toHaveBeenCalledTimes(1);
  });
});
