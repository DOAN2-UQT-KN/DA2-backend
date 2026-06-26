import prisma from "../config/prisma.client";
import { OutboxRelay } from "./outbox-relay";

let relay: OutboxRelay | null = null;

export function startOutboxRelay(): void {
  if (process.env.OUTBOX_RELAY_ENABLED === "false") {
    console.log("[OutboxRelay] disabled via OUTBOX_RELAY_ENABLED=false");
    return;
  }
  if (relay) return;
  relay = new OutboxRelay(prisma);
  relay.start();
}

export async function stopOutboxRelay(): Promise<void> {
  if (!relay) return;
  await relay.stop();
  relay = null;
}
