import axios from "axios";
import { RewardServiceClient } from "../reward-service.client";
import {
  getHttpCircuit,
  HTTP_CIRCUIT_REWARD,
  resetHttpCircuitsForTests,
} from "../../../resilience/http-circuit";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("RewardServiceClient HTTP circuit breaker", () => {
  const get = jest.fn();

  beforeEach(() => {
    resetHttpCircuitsForTests();
    jest.clearAllMocks();
    process.env.REWARD_SERVICE_URL = "http://reward.test";
    process.env.INTERNAL_REWARD_API_KEY = "test-key";
    process.env.HTTP_BREAKER_FAILURE_THRESHOLD = "3";
    process.env.HTTP_BREAKER_OPEN_MS = "30000";
    process.env.HTTP_BREAKER_SUCCESS_THRESHOLD = "2";
    process.env.NODE_ENV = "test";

    mockedAxios.create.mockReturnValue({ get } as never);
    mockedAxios.isAxiosError.mockReturnValue(false);
  });

  it("opens circuit after consecutive HTTP failures and stops calling axios", async () => {
    get.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const client = new RewardServiceClient(getHttpCircuit(HTTP_CIRCUIT_REWARD));

    expect(await client.getDifficulties()).toEqual([]);
    expect(await client.getDifficulties()).toEqual([]);
    expect(await client.getDifficulties()).toEqual([]);
    expect(client.getCircuitState()).toBe("OPEN");
    expect(get).toHaveBeenCalledTimes(3);

    expect(await client.getDifficulties()).toEqual([]);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("keeps circuit CLOSED when HTTP succeeds", async () => {
    get.mockResolvedValue({
      data: {
        success: true,
        data: {
          difficulties: [
            {
              id: "d1",
              level: 1,
              name: "Easy",
              maxVolunteers: 10,
              greenPoints: 5,
            },
          ],
        },
      },
    });
    const client = new RewardServiceClient(getHttpCircuit(HTTP_CIRCUIT_REWARD));

    const rows = await client.getDifficulties();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Easy");
    expect(client.getCircuitState()).toBe("CLOSED");
  });

  it("getDifficultyByLevel returns null when circuit is open", async () => {
    get.mockRejectedValue(new Error("down"));
    const client = new RewardServiceClient(getHttpCircuit(HTTP_CIRCUIT_REWARD));

    await client.getDifficultyByLevel(1);
    await client.getDifficultyByLevel(1);
    await client.getDifficultyByLevel(1);
    expect(client.getCircuitState()).toBe("OPEN");

    expect(await client.getDifficultyByLevel(2)).toBeNull();
    expect(get).toHaveBeenCalledTimes(3);
  });
});
