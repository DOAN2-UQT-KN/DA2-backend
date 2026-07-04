// Datadog APM tracer. MUST be imported before any other module (express, the
// http proxy, http clients) so dd-trace auto-instrumentation can patch them.
// dotenv is loaded first so DD_* values from .env are available at init time.
//
// Locally the agent defaults to localhost:8126 (the datadog-agent container in
// docker-compose). In Kubernetes, DD_AGENT_HOST is injected from the node IP.
import "dotenv/config";
import tracer from "dd-trace";

tracer.init({
  service: "api-gateway",
  env: process.env.DD_ENV || "local",
  version: process.env.DD_VERSION || "dev",
  logInjection: true,
});

export default tracer;
