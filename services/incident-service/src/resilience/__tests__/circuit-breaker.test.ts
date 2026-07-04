import { CircuitBreaker } from "../circuit-breaker";

function makeBreaker(now: { t: number }) {
  return new CircuitBreaker(
    { failureThreshold: 3, openDurationMs: 1000, successThreshold: 2 },
    () => now.t,
    "test",
  );
}

describe("CircuitBreaker", () => {
  it("starts CLOSED and allows requests", () => {
    const now = { t: 0 };
    const cb = makeBreaker(now);
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("opens after failureThreshold consecutive failures", () => {
    const now = { t: 0 };
    const cb = makeBreaker(now);
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe("CLOSED");
    cb.onFailure();
    expect(cb.getState()).toBe("OPEN");
    expect(cb.canRequest()).toBe(false);
  });

  it("a success resets the consecutive failure counter while CLOSED", () => {
    const now = { t: 0 };
    const cb = makeBreaker(now);
    cb.onFailure();
    cb.onFailure();
    cb.onSuccess();
    cb.onFailure();
    cb.onFailure();
    expect(cb.getState()).toBe("CLOSED");
  });

  it("moves to HALF_OPEN once the cooldown elapses", () => {
    const now = { t: 0 };
    const cb = makeBreaker(now);
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    expect(cb.canRequest()).toBe(false);

    now.t = 999;
    expect(cb.canRequest()).toBe(false);
    expect(cb.getState()).toBe("OPEN");

    now.t = 1000;
    expect(cb.canRequest()).toBe(true);
    expect(cb.getState()).toBe("HALF_OPEN");
  });

  it("closes after successThreshold successes in HALF_OPEN", () => {
    const now = { t: 0 };
    const cb = makeBreaker(now);
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    now.t = 1000;
    cb.canRequest();
    cb.onSuccess();
    expect(cb.getState()).toBe("HALF_OPEN");
    cb.onSuccess();
    expect(cb.getState()).toBe("CLOSED");
  });

  it("re-opens immediately if the HALF_OPEN trial fails", () => {
    const now = { t: 0 };
    const cb = makeBreaker(now);
    cb.onFailure();
    cb.onFailure();
    cb.onFailure();
    now.t = 1000;
    cb.canRequest();
    cb.onFailure();
    expect(cb.getState()).toBe("OPEN");
    expect(cb.canRequest()).toBe(false);
  });
});
