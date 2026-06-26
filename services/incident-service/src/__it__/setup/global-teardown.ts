import { rmSync } from "node:fs";
import { IT_DB_FILE } from "./it-db-file";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

export default async function globalTeardown(): Promise<void> {
  const container = (
    globalThis as unknown as { __PG_CONTAINER__?: StartedPostgreSqlContainer }
  ).__PG_CONTAINER__;
  if (container) {
    await container.stop();
    console.log("[it] Postgres container stopped");
  }
  try {
    rmSync(IT_DB_FILE, { force: true });
  } catch {
    // best-effort cleanup
  }
}
