// Adds the 20 sample reels (real public Instagram reels, each with an example idea + tags) to your
// board as new ideas, shared by the first admin — or by --as <email>. Reels already on the board are
// skipped, so it's safe to run twice. Remove any of them from the site with "Delete".
//
//   npm run sample-reels                      (local board — stop the site first)
//   npm run sample-reels -- --as you@team.com
//   Railway: set DATABASE_PUBLIC_URL (from the Postgres service) and run the same command.
import { openMigratedDatabase } from "../lib/db/core.ts";
import { databaseTarget } from "./db-target.mjs";
import { REELS } from "./sample-reels.mjs";

const args = process.argv.slice(2);
const asEmail = args.includes("--as") ? args[args.indexOf("--as") + 1] : null;
const target = databaseTarget();

const db = await openMigratedDatabase(target);
try {
  const [user] = asEmail
    ? await db.query("SELECT id, name FROM users WHERE lower(email) = lower($1) AND active", [asEmail])
    : await db.query("SELECT id, name FROM users WHERE role = 'admin' AND active ORDER BY id LIMIT 1");
  if (!user) {
    console.error(asEmail ? `No active account with email ${asEmail}.` : "No admin account yet — create it on the site first.");
    process.exitCode = 1;
  } else {
    const now = Date.now();
    const added = await db.transaction(async (tx) => {
      let count = 0;
      for (const [index, reel] of REELS.entries()) {
        // A minute apart, so the feed shows them in a stable order (first in the list = newest).
        const createdAt = now - index * 60_000;
        const [row] = await tx.query(
          `INSERT INTO reels (shortcode, kind, idea, status, created_by, created_at, updated_at)
           VALUES ($1, 'reel', $2, 'new', $3, $4, $4) ON CONFLICT (shortcode) DO NOTHING RETURNING id`,
          [reel.code, reel.idea, user.id, createdAt],
        );
        if (!row) continue;
        for (const tag of reel.tags) {
          await tx.query("INSERT INTO reel_tags (reel_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING", [row.id, tag]);
        }
        count++;
      }
      return count;
    });
    console.log(
      added
        ? `Added ${added} sample reels to ${target.label} as ${user.name}. Refresh the site to see them.`
        : "All sample reels are already on the board.",
    );
  }
} finally {
  await db.close();
}
