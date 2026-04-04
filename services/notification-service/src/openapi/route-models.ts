import type { OpenapiRouteModels } from "@da2/express-swagger";

export const OPENAPI_ROUTE_MODELS: OpenapiRouteModels = {
  "POST /api/v1/notifications/jobs": {
    requestBody: "EnqueueNotificationJobRequest",
    responseData: "EnqueueNotificationJobResponseData",
  },
  "GET /api/v1/notifications/my": {
    responseData: "NotificationListEnvelopeData",
  },
  "PATCH /api/v1/notifications/:id/read": {
    responseData: "NotificationItemData",
  },
};
