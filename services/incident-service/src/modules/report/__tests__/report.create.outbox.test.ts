/**
 * Producer-side outbox tests for `createReport` → REPORT_SUBMITTED.
 */

const txFake = {
  report: {
    create: jest.fn(),
  },
  media: {
    createMany: jest.fn(),
  },
  reportMediaFile: {
    createMany: jest.fn(),
  },
};
const transactionMock = jest.fn(
  async (cb: (tx: typeof txFake) => unknown) => cb(txFake),
);
const enqueueMock = jest.fn().mockResolvedValue(undefined);
const emitOutboxMock = jest.fn().mockResolvedValue(undefined);

jest.mock("../../../queue/register", () => ({
  backgroundJobDispatcher: { enqueue: enqueueMock },
}));

jest.mock("../../../config/prisma.client", () => ({
  __esModule: true,
  default: { $transaction: transactionMock },
}));

jest.mock("../../../outbox/outbox.writer", () => ({
  emitOutbox: (...args: unknown[]) => emitOutboxMock(...args),
}));

jest.mock("../report.entity", () => ({
  toReportResponse: (r: unknown) => r,
}));

jest.mock("../../organization/identity-user.client", () => ({
  fetchOrganizationOwnersByUserIds: jest.fn().mockResolvedValue(new Map()),
  isIdentityCallableUserId: () => false,
  getUserProfile: jest.fn(),
}));

jest.mock("../../vote/vote.service", () => ({
  voteService: {
    getVoteSummariesForResources: jest.fn().mockResolvedValue(new Map()),
  },
}));

jest.mock("../../saved_resource/saved_resource.repository", () => ({
  savedResourceRepository: {
    findActiveSavedResourceIdsForUser: jest.fn().mockResolvedValue(new Set()),
  },
}));

import { reportService } from "../report.service";
import { OutboxEventType } from "../../../outbox/outbox.types";

describe("createReport (outbox producer)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enqueueMock.mockResolvedValue(undefined);
    emitOutboxMock.mockResolvedValue(undefined);
    txFake.report.create.mockResolvedValue({
      id: "report-new",
      userId: "user-1",
      title: "Trash nearby",
    });
    txFake.media.createMany.mockResolvedValue({ count: 1 });
    txFake.reportMediaFile.createMany.mockResolvedValue({ count: 1 });
  });

  it("emit REPORT_SUBMITTED đúng payload + dedupKey trong cùng transaction", async () => {
    await reportService.createReport("user-1", {
      title: "Trash nearby",
      latitude: 1,
      longitude: 2,
      imageUrls: ["https://cdn.example/a.jpg"],
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(emitOutboxMock).toHaveBeenCalledTimes(1);
    const [tx, event] = emitOutboxMock.mock.calls[0];
    expect(tx).toBe(txFake);
    expect(event.aggregateType).toBe("report");
    expect(event.aggregateId).toBe("report-new");
    expect(event.eventType).toBe(OutboxEventType.REPORT_SUBMITTED);
    expect(event.dedupKey).toBe("REPORT_SUBMITTED:report-new");
    expect(event.payload).toMatchObject({
      reportId: "report-new",
      userId: "user-1",
    });
    expect(Array.isArray(event.payload.reportMediaFileIds)).toBe(true);
    expect(event.payload.reportMediaFileIds).toHaveLength(1);
  });

  it("vẫn enqueue ANALYZE_REPORT sau commit (path song song không bị gỡ)", async () => {
    await reportService.createReport("user-1", {
      title: "Trash nearby",
      latitude: 1,
      longitude: 2,
      imageUrls: ["https://cdn.example/a.jpg"],
    });
    expect(enqueueMock).toHaveBeenCalled();
  });
});
