// App logger (pino). dd-trace logInjection (enabled in tracer.ts) automatically
// adds dd.trace_id / dd.span_id so these logs correlate with APM traces.
//
// Locally the services run on the host (npm run dev) while the Datadog Agent runs
// in a container, so the Agent cannot read host stdout. When DD_API_KEY is set we
// ship logs straight to Datadog over HTTPS. In Kubernetes the Agent collects
// container stdout, so leave DD_API_KEY unset there and logs flow via the Agent.
import pino, { LoggerOptions } from "pino";

const ddApiKey = process.env.DD_API_KEY;
const service = process.env.DD_SERVICE || "identity-service";
const env = process.env.DD_ENV || "local";

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  base: { service, env },
};

const transport = ddApiKey
  ? pino.transport({
      target: "pino-datadog-transport",
      options: {
        ddClientConf: { authMethods: { apiKeyAuth: ddApiKey } },
        ddServerConf: { site: process.env.DD_SITE || "datadoghq.com" },
        service,
        ddsource: "nodejs",
        ddtags: `env:${env}`,
      },
    })
  : undefined;

const logger = transport ? pino(options, transport) : pino(options);

export default logger;
