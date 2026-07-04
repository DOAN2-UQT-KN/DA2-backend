import axios from "axios";
import {
  fetchOrganizationOwnersByUserIds,
  getIdentityHttpCircuitState,
} from "../identity-user.client";
import { resetHttpCircuitsForTests } from "../../../resilience/http-circuit";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

/** Valid RFC4122 UUID accepted by identity client filter. */
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("identity-user.client HTTP circuit breaker", () => {
  const post = jest.fn();

  beforeEach(() => {
    resetHttpCircuitsForTests();
    jest.clearAllMocks();
    process.env.IDENTITY_SERVICE_URL = "http://identity.test";
    process.env.INTERNAL_IDENTITY_API_KEY = "test-key";
    process.env.HTTP_BREAKER_FAILURE_THRESHOLD = "3";
    process.env.HTTP_BREAKER_OPEN_MS = "30000";
    process.env.HTTP_BREAKER_SUCCESS_THRESHOLD = "2";

    mockedAxios.create.mockReturnValue({ post } as never);
  });

  it("opens circuit after consecutive failures and stops calling identity", async () => {
    post.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await fetchOrganizationOwnersByUserIds([USER_ID]);
    await fetchOrganizationOwnersByUserIds([USER_ID]);
    await fetchOrganizationOwnersByUserIds([USER_ID]);
    expect(getIdentityHttpCircuitState()).toBe("OPEN");
    expect(post).toHaveBeenCalledTimes(3);

    const map = await fetchOrganizationOwnersByUserIds([USER_ID]);
    expect(map.size).toBe(0);
    expect(post).toHaveBeenCalledTimes(3);
  });

  it("stays CLOSED and returns profiles on success", async () => {
    post.mockResolvedValue({
      data: {
        success: true,
        data: {
          users: [
            {
              id: USER_ID,
              name: "Alice",
              avatar: null,
              bio: null,
            },
          ],
        },
      },
    });

    const map = await fetchOrganizationOwnersByUserIds([USER_ID]);
    expect(map.get(USER_ID.toLowerCase())?.name).toBe("Alice");
    expect(getIdentityHttpCircuitState()).toBe("CLOSED");
  });
});
