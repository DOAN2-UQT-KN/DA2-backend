# Outbox flows — incident-service

Mỗi luồng dùng **Transactional Outbox** được vẽ thành **1 sơ đồ end-to-end** đầy đủ:
producer → transaction → `outbox_events` → relay → reward-service (consumer), kèm
**tên event** và các nhánh **success / retry / failed**.

> Quy ước chung cho cả 3 luồng:
> - `incident-service` ghi business data **+** `emitOutbox()` trong **cùng 1 transaction** (atomic, không dual-write).
> - `OutboxRelay` (worker của incident) đọc `outbox_events`, **đẩy HTTP** sang `reward-service`. Giao **at-least-once**.
> - `reward-service` nhận → đẩy **SQS** → worker cộng điểm **idempotent** (gửi trùng không cộng dồn).

**Ảnh render sẵn (`images/`):**
[01 toàn cảnh](images/01-overview.png) ·
[02 report done](images/02-flow-report-done.png) ·
[03 vote milestone](images/03-flow-vote-milestone.png) ·
[04 campaign completion](images/04-flow-campaign-completion.png) ·
[05 state machine](images/05-state-machine.png)

> Tái tạo ảnh nét cao sau khi sửa sơ đồ:
> `npx -y @mermaid-js/mermaid-cli -i outbox-flows.md -o images/r.md -e png -t neutral -b white -s 3`
> (xoá `images/r.md`, đổi tên `images/r-*.png` cho khớp).

---

## Toàn cảnh: service nào nói chuyện với service nào

![Overview](images/01-overview.png)

```mermaid
flowchart LR
  subgraph IS["incident-service"]
    direction TB
    P["Producers<br/>report.service / vote.service / campaign.service"]
    DB[("incident DB<br/>+ outbox_events")]
    RELAY["OutboxRelay<br/>(worker, poll ~2s)"]
    P -- "1 transaction:<br/>business write + emitOutbox()" --> DB
    RELAY -- "claimBatch() FOR UPDATE SKIP LOCKED" --> DB
  end
  subgraph RS["reward-service"]
    direction TB
    API["Internal API<br/>/internal/v1/green-points/enqueue<br/>/internal/v1/facebook-recognition/enqueue"]
    SQS[["SQS"]]
    W["green-point worker<br/>(idempotent credit)"]
    L[("reward DB<br/>ledger + balance")]
    API --> SQS --> W --> L
  end
  RELAY == "HTTP POST + x-internal-api-key<br/>(at-least-once)" ==> API

  classDef ob fill:#fde68a,stroke:#b45309,color:#000;
  classDef rl fill:#bfdbfe,stroke:#1d4ed8,color:#000;
  classDef cs fill:#bbf7d0,stroke:#15803d,color:#000;
  class DB ob;
  class RELAY rl;
  class API,SQS,W cs;
```

---

## Flow 1 — Mark report done

| | |
|---|---|
| **Producer** | `report.service.adminMarkReportDone()` |
| **Event** | `REPORT_COMPLETION_GREEN_POINTS` |
| **dedupKey** | `REPORT_COMPLETION_GREEN_POINTS:<reportId>` |
| **Endpoint reward** | `POST /internal/v1/green-points/enqueue` |

![Flow report done](images/02-flow-report-done.png)

```mermaid
sequenceDiagram
  autonumber
  actor A as Admin
  participant S as incident: report.service
  participant DB as incident DB + outbox
  participant R as OutboxRelay
  participant RW as reward-service<br/>(API → SQS → worker → ledger)

  Note over A,RW: EVENT = REPORT_COMPLETION_GREEN_POINTS
  A->>S: adminMarkReportDone(reportId)
  rect rgb(253,230,138)
  Note over S,DB: 1 transaction (atomic)
  S->>DB: report = COMPLETED + emitOutbox(...) [PENDING]<br/>payload {reportId, userId, points}
  end
  S-->>A: 200 OK
  R->>DB: claim (FOR UPDATE SKIP LOCKED) → INPROCESS
  R->>RW: POST /green-points/enqueue {type, payload}
  RW-->>R: 202 → cộng điểm idempotent, event = COMPLETED
  Note over R,RW: fail/timeout → PENDING + backoff (retry) · quá maxAttempts → FAILED
```

---

## Flow 2 — Upvote đạt mốc → thưởng người tạo report

| | |
|---|---|
| **Producer** | `vote.service.upvote()` → `emitReportVoteMilestoneIfNeeded()` |
| **Event** | `REPORT_VOTE_MILESTONE_GREEN_POINTS` |
| **dedupKey** | `REPORT_VOTE_MILESTONE_GREEN_POINTS:<reportId>:<voteCount>` (mỗi mốc vote là 1 event) |
| **Endpoint reward** | `POST /internal/v1/green-points/enqueue` |

![Flow vote milestone](images/03-flow-vote-milestone.png)

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant S as incident: vote.service
  participant DB as incident DB + outbox
  participant R as OutboxRelay
  participant RW as reward-service<br/>(API → SQS → worker → ledger)

  Note over U,RW: EVENT = REPORT_VOTE_MILESTONE_GREEN_POINTS
  U->>S: upvote(reportId)
  rect rgb(253,230,138)
  Note over S,DB: 1 transaction (atomic)
  S->>DB: upsert vote + count upvotes + emitOutbox(...) [PENDING]<br/>payload {reportId, reportCreatorUserId, voteCount}
  end
  S-->>U: 200 OK
  R->>DB: claim (FOR UPDATE SKIP LOCKED) → INPROCESS
  R->>RW: POST /green-points/enqueue {type, payload}
  RW-->>R: 202 → cộng điểm NẾU chạm mốc (idempotent theo report+threshold), event = COMPLETED
  Note over R,RW: fail/timeout → PENDING + backoff (retry) · quá maxAttempts → FAILED
```

---

## Flow 3 — Hoàn tất campaign → cộng điểm volunteer đã check-in

| | |
|---|---|
| **Producer** | `campaign.service.adminFinalizeCampaignCompletion()` |
| **Event** | `CAMPAIGN_COMPLETION_GREEN_POINTS` |
| **dedupKey** | `CAMPAIGN_COMPLETION_GREEN_POINTS:<campaignId>` |
| **Endpoint reward** | `POST /internal/v1/green-points/enqueue` |
| **Ghi chú** | `CAMPAIGN_FACEBOOK_RECOGNITION` đang TODO; khi bật sẽ đẩy sang `/internal/v1/facebook-recognition/enqueue` |

![Flow campaign completion](images/04-flow-campaign-completion.png)

```mermaid
sequenceDiagram
  autonumber
  actor A as Admin
  participant S as incident: campaign.service
  participant DB as incident DB + outbox
  participant R as OutboxRelay
  participant RW as reward-service<br/>(API → SQS → worker → ledger)

  Note over A,RW: EVENT = CAMPAIGN_COMPLETION_GREEN_POINTS
  A->>S: adminFinalizeCampaignCompletion(campaignId)
  rect rgb(253,230,138)
  Note over S,DB: 1 transaction (atomic)
  S->>DB: campaign + reports + sos = COMPLETED + emitOutbox(...) [PENDING]<br/>payload {campaignId, credits:[{userId, points}]}
  end
  S-->>A: 200 OK
  R->>DB: claim (FOR UPDATE SKIP LOCKED) → INPROCESS
  R->>RW: POST /green-points/enqueue {type, payload}
  RW-->>R: 202 → cộng điểm từng credit (idempotent theo campaign+user), event = COMPLETED
  Note over R,RW: fail/timeout → PENDING + backoff (retry) · quá maxAttempts → FAILED
```

---

## Trạng thái của 1 outbox event

![State machine](images/05-state-machine.png)

```mermaid
stateDiagram-v2
  [*] --> PENDING: emitOutbox() (trong transaction)
  PENDING --> INPROCESS: claimBatch() (FOR UPDATE SKIP LOCKED)
  INPROCESS --> COMPLETED: reward trả 2xx
  INPROCESS --> PENDING: lỗi tạm thời (attempts++ , backoff)
  INPROCESS --> FAILED: vượt maxAttempts (quarantine)
  FAILED --> PENDING: replay thủ công (set lại PENDING)
  COMPLETED --> [*]
```

> `FAILED` không tự xử lý — sửa nguyên nhân rồi đưa event về `PENDING` để relay giao lại.
> Dữ liệu event vẫn còn nguyên (payload đủ userId/points) nên **không mất điểm**.
