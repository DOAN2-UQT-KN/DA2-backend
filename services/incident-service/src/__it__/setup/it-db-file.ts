import { join } from "node:path";
import { tmpdir } from "node:os";

/** Temp file the parent process uses to hand the test DB URL to Jest workers. */
export const IT_DB_FILE = join(tmpdir(), "incident-service-it-db.json");
