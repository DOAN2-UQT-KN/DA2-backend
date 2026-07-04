export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  /** Consecutive failures (while CLOSED) that trip the circuit OPEN. */
  failureThreshold: number;
  /** How long to stay OPEN before allowing a trial request (HALF_OPEN). */
  openDurationMs: number;
  /** Consecutive successes (while HALF_OPEN) required to close again. */
  successThreshold: number;
}

/**
 * Minimal, dependency-free circuit breaker.
 *
 * CLOSED   → requests flow; N consecutive failures trip it OPEN.
 * OPEN     → requests are short-circuited until `openDurationMs` elapses, then
 *            the next `canRequest()` moves it to HALF_OPEN (one trial allowed).
 * HALF_OPEN→ a success advances toward closing; any failure re-opens it.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private halfOpenSuccesses = 0;
  private openedAt = 0;

  constructor(
    private readonly config: CircuitBreakerConfig,
    private readonly now: () => number = () => Date.now(),
    private readonly name = "default",
  ) {}

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Whether a request may proceed now. Side effect: when OPEN and the cooldown
   * has elapsed, transitions to HALF_OPEN and allows a single trial.
   */
  canRequest(): boolean {
    if (this.state === "OPEN") {
      if (this.now() - this.openedAt >= this.config.openDurationMs) {
        this.toHalfOpen();
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.close();
      }
      return;
    }
    this.consecutiveFailures = 0;
  }

  onFailure(): void {
    if (this.state === "HALF_OPEN") {
      this.open();
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = "OPEN";
    this.openedAt = this.now();
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
    console.warn(
      `[CircuitBreaker:${this.name}] OPEN for ${this.config.openDurationMs}ms`,
    );
  }

  private toHalfOpen(): void {
    this.state = "HALF_OPEN";
    this.halfOpenSuccesses = 0;
    console.log(`[CircuitBreaker:${this.name}] HALF_OPEN (trial)`);
  }

  private close(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
    console.log(`[CircuitBreaker:${this.name}] CLOSED`);
  }
}
