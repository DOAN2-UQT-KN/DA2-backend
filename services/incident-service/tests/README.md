# incident-service — chạy tests

Chạy từ thư mục service:

```bash
cd DA2-backend/services/incident-service
```

## Unit tests (toàn bộ)

```bash
npm test
# hoặc
npx jest
```

## Circuit breaker — core

```bash
# State machine (CLOSED / OPEN / HALF_OPEN)
npx jest src/resilience/__tests__/circuit-breaker.test.ts

# HTTP circuit wrapper (short-circuit, recovery, shared instance)
npx jest src/resilience/__tests__/http-circuit.test.ts

# Cả folder resilience
npx jest src/resilience/__tests__
```

## Circuit breaker — HTTP sync clients

```bash
# reward-service (difficulties)
npx jest src/modules/reward/__tests__/reward-service.client.circuit.test.ts

# identity-service (user profiles)
npx jest src/modules/organization/__tests__/identity-user.client.circuit.test.ts

# notification-service (report status notify)
npx jest src/modules/report/__tests__/report-status-notify.client.circuit.test.ts

# Tất cả HTTP circuit tests
npx jest \
  src/modules/reward/__tests__/reward-service.client.circuit.test.ts \
  src/modules/organization/__tests__/identity-user.client.circuit.test.ts \
  src/modules/report/__tests__/report-status-notify.client.circuit.test.ts
```

## Circuit breaker — Outbox relay (SQS)

```bash
npx jest src/outbox/__tests__/outbox-relay.test.ts
```

## Circuit breaker — chạy hết (HTTP + outbox + core)

```bash
npx jest \
  src/resilience/__tests__ \
  src/modules/reward/__tests__/reward-service.client.circuit.test.ts \
  src/modules/organization/__tests__/identity-user.client.circuit.test.ts \
  src/modules/report/__tests__/report-status-notify.client.circuit.test.ts \
  src/outbox/__tests__/outbox-relay.test.ts
```

## Outbox (unit, không cần Docker)

```bash
npx jest src/outbox/__tests__
npx jest src/modules/report/__tests__/report.outbox.test.ts
```

## Integration tests (cần Docker — Testcontainers + Postgres/PostGIS)

```bash
npm run test:it
# hoặc
npx jest --config jest.integration.config.js --runInBand
```

Chỉ outbox integration:

```bash
npx jest --config jest.integration.config.js --runInBand src/__it__/outbox.relay.it.test.ts
npx jest --config jest.integration.config.js --runInBand src/__it__/outbox.atomicity.it.test.ts
```

## Gợi ý

| Cờ | Tác dụng |
|----|----------|
| `--watch` | Chạy lại khi sửa file |
| `--coverage` | Báo cáo coverage |
| `-t "opens circuit"` | Chỉ chạy test khớp tên |

Ví dụ:

```bash
npx jest src/resilience/__tests__ --watch
npx jest src/resilience/__tests__/http-circuit.test.ts -t "short-circuits"
```
