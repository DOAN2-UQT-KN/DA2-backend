# 8. Flow Diagram

`POST /api/v1/reports` — Client → Controller → Validation → Service → Database / External → Response.

**Tuần tự (phụ thuộc bước trước):** auth → validate → transaction (`report` → `media` → `report_media_files` → commit).

**Song song sau commit (không `await` queue):** kick-off `ANALYZE_REPORT` và `TRANSLATE_TEXT` rồi chạy `attachVotesToReports`. HTTP **không** đợi SQS / worker. Trong `attachVotesToReports`, votes và saved chạy `Promise.all`; profile identity chạy sau khi hai query đó xong.

```mermaid
flowchart TD
  A[Client POST /api/v1/reports] --> B[camelCaseRequestBody]
  B --> C{authenticate JWT}
  C -->|no token| E1[401 TOKEN_MISSING]
  C -->|invalid| E2[401 TOKEN_INVALID]
  C -->|ok| D[express-validator bodies]
  D --> V{validationResult}
  V -->|errors| E3[400 VALIDATION_ERROR]
  V -->|ok| U{req.user.userId?}
  U -->|no| E4[401 UNAUTHORIZED]
  U -->|yes| S[ReportService.createReport]
  S --> T[prisma.$transaction]
  T --> T1[report.create PENDING]
  T1 --> T2[media.createMany]
  T2 --> T3[reportMediaFile.createMany]
  T3 --> CMT{commit}
  CMT -->|fail| E5[500 INTERNAL]
  CMT -->|ok| FORK[Sau commit: kick-off song song]

  FORK --> J1[enqueue ANALYZE_REPORT không await]
  FORK --> TR[enqueueReportTranslationJob không await]
  FORK --> EN[await toReportResponse + attachVotesToReports]

  J1 -->|fail| L1[log only]
  J1 --> W1[Worker AI queue riêng - ngoài HTTP]
  L1 --> W1

  TR --> TRF{cleaned translations?}
  TRF -->|empty| SKIP[không enqueue TRANSLATE]
  TRF -->|có field cần dịch| J2[enqueue TRANSLATE_TEXT]
  J2 -->|fail SQS/store| L2[log only - không rollback]
  J2 --> W2[Worker dịch queue riêng - ngoài HTTP]
  L2 --> W2

  EN --> PAR[Promise.all]
  PAR --> VOTES[votes]
  PAR --> SAVED[saved]
  VOTES --> PROF[attachReporterProfilesToReports]
  SAVED --> PROF
  PROF -->|throw| E6[500 nhưng report/media đã commit]
  PROF -->|ok| R[201 CREATED + report]
```
