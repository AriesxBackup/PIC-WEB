// Fills a SEPARATE demo database with a sample team and 20 real public Instagram reels, so you can
// see the board in action. Your real board (data/) is never touched.
//
//   npm run demo     → seeds demo-data/ (first run only) and starts the site on http://localhost:3000
//
// Demo logins — every demo account uses DEMO_PASSWORD below:
//   aria@demo.team (admin) · dev@demo.team · mia@demo.team · leo@demo.team · zara@demo.team
// Start over: stop the server and delete the demo-data folder.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../lib/auth/password.ts";
import { openMigratedDatabase } from "../lib/db/core.ts";
import { REELS } from "./sample-reels.mjs";

export const DEMO_PASSWORD = "demo-board-2026";

export const DEMO_USERS = [
  { key: "aria", name: "Aria K.", email: "aria@demo.team", role: "admin" },
  { key: "dev", name: "Dev P.", email: "dev@demo.team", role: "member" },
  { key: "mia", name: "Mia R.", email: "mia@demo.team", role: "member" },
  { key: "leo", name: "Leo S.", email: "leo@demo.team", role: "member" },
  { key: "zara", name: "Zara M.", email: "zara@demo.team", role: "member" },
];

const STATUS_LABEL = {
  approved: "Approved ✅",
  in_production: "In production 🎬",
  posted: "Posted 🚀",
  skipped: "Skipped ⏭️",
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function localDate(offsetDays) {
  const d = new Date(Date.now() + offsetDays * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDue(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export async function seedDemo(dataDir = path.resolve(process.env.DATA_DIR || "demo-data")) {
  const db = await openMigratedDatabase({ dir: path.join(dataDir, "pglite") });
  try {
    const [{ n }] = await db.query("SELECT COUNT(*)::int AS n FROM users");
    if (n > 0) return { created: false, dataDir };

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const now = Date.now();

    await db.transaction(async (tx) => {
      const ids = {};
      const names = {};
      for (const user of DEMO_USERS) {
        const [row] = await tx.query(
          "INSERT INTO users (email, name, password_hash, role, active, created_at) VALUES ($1, $2, $3, $4, TRUE, $5) RETURNING id",
          [user.email, user.name, passwordHash, user.role, now - 30 * DAY],
        );
        ids[user.key] = row.id;
        names[user.key] = user.name;
      }
      const comment = (reelId, authorKey, kind, body, at) =>
        tx.query("INSERT INTO comments (reel_id, author_id, kind, body, created_at) VALUES ($1, $2, $3, $4, $5)", [
          reelId,
          ids[authorKey],
          kind,
          body,
          at,
        ]);

      for (const reel of REELS) {
        const createdAt = Math.round(now - reel.ago * DAY);
        const span = Math.max(now - createdAt, HOUR); // later activity happens between sharing and now
        const at = (fraction) => Math.round(createdAt + span * fraction);
        const dueDate = reel.due === undefined ? null : localDate(reel.due);

        const [{ id }] = await tx.query(
          `INSERT INTO reels (shortcode, kind, idea, status, assignee_id, due_date, created_by, created_at, updated_at)
           VALUES ($1, 'reel', $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [reel.code, reel.idea, reel.status, reel.assignee ? ids[reel.assignee] : null, dueDate, ids[reel.by], createdAt,
            reel.status === "new" ? createdAt : at(0.8)],
        );
        for (const tag of reel.tags) {
          await tx.query("INSERT INTO reel_tags (reel_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, tag]);
        }
        for (const [i, key] of reel.votes.entries()) {
          await tx.query("INSERT INTO votes (reel_id, user_id, created_at) VALUES ($1, $2, $3)", [id, ids[key], at(0.1 + i * 0.05)]);
        }

        // Automatic activity notes, like the app writes when the admin approves/assigns and work moves on.
        if (reel.status !== "new") {
          await comment(id, "aria", "event", `moved this to ${reel.status === "skipped" ? STATUS_LABEL.skipped : STATUS_LABEL.approved}`, at(0.2));
        }
        if (reel.assignee) {
          await comment(id, "aria", "event", `assigned this to ${names[reel.assignee]} · due ${formatDue(dueDate)}`, at(0.25));
        }
        if (reel.status === "in_production" || reel.status === "posted") {
          await comment(id, reel.assignee, "event", `moved this to ${STATUS_LABEL.in_production}`, at(0.45));
        }
        if (reel.status === "posted") {
          await comment(id, reel.assignee, "event", `moved this to ${STATUS_LABEL.posted}`, at(0.75));
        }
        for (const [i, [key, body]] of reel.comments.entries()) await comment(id, key, "comment", body, at(0.3 + i * 0.25));
      }
    });
    return { created: true, dataDir };
  } finally {
    await db.close();
  }
}

export function printDemoLogins() {
  console.log(`\nDemo logins (password for all: ${DEMO_PASSWORD})`);
  for (const user of DEMO_USERS) console.log(`  ${user.email.padEnd(16)} ${user.role === "admin" ? "admin" : "member"} · ${user.name}`);
  console.log("");
}

// Run directly: node scripts/seed-demo.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { created, dataDir } = await seedDemo();
  console.log(created ? `Demo board created in ${dataDir}` : `Demo board already exists in ${dataDir} (delete it to start over)`);
  printDemoLogins();
}
