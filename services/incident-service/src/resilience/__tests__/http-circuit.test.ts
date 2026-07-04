import {
  CircuitOpenError,
  getHttpCircuit,
  isCircuitOpenError,
  resetHttpCircuitsForTests,
} from "../http-circuit";

describe("getHttpCircuit (HTTP sync)", () => {
  beforeEach(() => {
    resetHttpCircuitsForTests();
  });

  it("runs the function and stays CLOSED on success", async () => {
    const circuit = getHttpCircuit("test-http", {
      failureThreshold: 3,
      openDurationMs: 1000,
      successThreshold: 2,
    });
    const fn = jest.fn().mockResolvedValue(42);

    await expect(circuit.run(fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(circuit.getState()).toBe("CLOSED");
  });

  it("opens after consecutive failures and short-circuits without calling fn", async () => {
    const circuit = getHttpCircuit("test-http-open", {
      failureThreshold: 3,
      openDurationMs: 30_000,
      successThreshold: 2,
    });
    const fn = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(circuit.run(fn)).rejects.toThrow("ECONNREFUSED");
    await expect(circuit.run(fn)).rejects.toThrow("ECONNREFUSED");
    await expect(circuit.run(fn)).rejects.toThrow("ECONNREFUSED");
    expect(circuit.getState()).toBe("OPEN");
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(circuit.run(fn)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("isCircuitOpenError identifies open-circuit errors", async () => {
    const circuit = getHttpCircuit("test-http-open-err", {
      failureThreshold: 1,
      openDurationMs: 30_000,
      successThreshold: 1,
    });
    await expect(
      circuit.run(async () => {
        throw new Error("down");
      }),
    ).rejects.toThrow("down");

    try {
      await circuit.run(async () => "ok");
      fail("expected CircuitOpenError");
    } catch (e) {
      expect(isCircuitOpenError(e)).toBe(true);
      expect((e as CircuitOpenError).circuitName).toBe("test-http-open-err");
    }
  });

  it("reuses the same circuit instance for the same name", () => {
    const a = getHttpCircuit("shared-name");
    const b = getHttpCircuit("shared-name");
    expect(a).toBe(b);
  });

  it("moves to HALF_OPEN after cooldown and closes on success", async () => {
    const now = { t: 0 };
    const circuit = getHttpCircuit(
      "test-http-half",
      { failureThreshold: 1, openDurationMs: 100, successThreshold: 1 },
      () => now.t,
    );

    await expect(
      circuit.run(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    expect(circuit.getState()).toBe("OPEN");

    now.t = 100;
    const fn = jest.fn().mockResolvedValue("ok");
    await expect(circuit.run(fn)).resolves.toBe("ok");
    expect(circuit.getState()).toBe("CLOSED");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
