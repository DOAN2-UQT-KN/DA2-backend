import type { OpenapiRouteModels } from "@da2/express-swagger";

export const OPENAPI_ROUTE_MODELS: OpenapiRouteModels = {
  "GET /api/v1/difficulties": {
    responseData: "DifficultiesListEnvelopeData",
  },
  "PUT /api/v1/difficulties/:id": {
    requestBody: "UpdateDifficultyBody",
    responseData: "DifficultyOneEnvelopeData",
  },
};
