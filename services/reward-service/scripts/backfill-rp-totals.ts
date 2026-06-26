import { backfillRankingPointsFromGreenLedger } from "../src/modules/gamification/rp-credit.util";

backfillRankingPointsFromGreenLedger()
  .then((result) => {
    console.log("Backfill complete:", result);
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
