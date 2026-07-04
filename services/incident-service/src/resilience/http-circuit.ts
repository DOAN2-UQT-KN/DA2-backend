import {
  CircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitState,
} from "./circuit-breaker";

export class CircuitOpenError extends Error {
  readonly circuitName: string;

  constructor(circuitName: string) {
    super(`Circuit breaker open: ${circuitName}`);
    this.name = "CircuitOpenError";
    this.circuitName = circuitName;
  }
}

export function isCircuitOpenError(err: unknown): err is CircuitOpenError {
  return err instanceof CircuitOpenError;
}

export interface HttpCircuit {
  readonly name: string;
  getState(): CircuitState;
  /** Run `fn` only when the circuit allows; records success/failure. */
  run<T>(fn: () => Promise<T>): Promise<T>;
}

function defaultHttpConfig(): CircuitBreakerConfig {
  return {
    failureThreshold: Number(process.env.HTTP_BREAKER_FAILURE_THRESHOLD ?? 5),
    openDurationMs: Number(process.env.HTTP_BREAKER_OPEN_MS ?? 30_000),
    successThreshold: Number(process.env.HTTP_BREAKER_SUCCESS_THRESHOLD ?? 2),
  };
}

const registry = new Map<string, HttpCircuit>();

/**
 * Shared circuit per dependency name (e.g. `http->identity`). All clients that
 * talk to the same service should use the same name so one OPEN protects all.
 */
export function getHttpCircuit(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
  now?: () => number,
): HttpCircuit {
  const existing = registry.get(name);
  if (existing && !config && !now) {
    return existing;
  }

  const breaker = new CircuitBreaker(
    { ...defaultHttpConfig(), ...config },
    now,
    name,
  );

  const circuit: HttpCircuit = {
    name,
    getState: () => breaker.getState(),
    async run<T>(fn: () => Promise<T>): Promise<T> {
      if (!breaker.canRequest()) {
        throw new CircuitOpenError(name);
      }
      try {
        const result = await fn();
        breaker.onSuccess();
        return result;
      } catch (err) {
        breaker.onFailure();
        throw err;
      }
    },
  };

  // Only cache the default (env-config) instance so tests can pass custom config.
  if (!config && !now) {
    registry.set(name, circuit);
  }
  return circuit;
}

/** Clears shared circuits — unit tests only. */
export function resetHttpCircuitsForTests(): void {
  registry.clear();
}

export const HTTP_CIRCUIT_IDENTITY = "http->identity";
export const HTTP_CIRCUIT_REWARD = "http->reward";
export const HTTP_CIRCUIT_NOTIFICATION = "http->notification";
