import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import reportRoutes from "./modules/report/report.routes";
import campaignRoutes from "./modules/campaign/campaign.routes";
import { errorHandler } from "./middleware/error.middleware";
import {
  camelCaseRequestBody,
  snakeCaseResponseBody,
} from "./middleware/case-transform.middleware";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(camelCaseRequestBody);
app.use(snakeCaseResponseBody);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "incident-service" });
});

// Routes
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/campaigns", campaignRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Incident service running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
