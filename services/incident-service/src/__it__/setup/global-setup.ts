import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { IT_DB_FILE } from "./it-db-file";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

/**
 * Jest globalSetup (runs once in the parent process). Boots a throwaway
 * Postgres+PostGIS container, applies all Prisma migrations (incl. the
 * outbox_events table + uuid-ossp/postgis extensions), and hands the
 * connection string to the workers via a temp file. The container instance is
 * stashed on globalThis so globalTeardown can stop it.
 */
export default async function globalSetup(): Promise<void> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgis/postgis:17-3.5",
  )
    .withDatabase("incident_it")
    .withUsername("it")
    .withPassword("it")
    .start();

  const databaseUrl = container.getConnectionUri();

  // Apply migrations against the fresh DB.
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  writeFileSync(IT_DB_FILE, JSON.stringify({ databaseUrl }), "utf8");

  (globalThis as unknown as { __PG_CONTAINER__: StartedPostgreSqlContainer }).__PG_CONTAINER__ =
    container;

  console.log(`[it] Postgres ready at ${databaseUrl}`);
}
