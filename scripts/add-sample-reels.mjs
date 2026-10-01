// Adds the 20 sample reels (real public Instagram reels, each with an example idea + tags) to your
// board as new ideas, shared by the first admin — or by --as <email>. Reels already on the board are
// skipped, so it's safe to run twice. Remove any of them from the site with "Delete".
//
//   npm run sample-reels                      (board in ./data)
//   npm run sample-reels -- --as you@team.com
//   Docker: docker compose exec app node scripts/add-sample-reels.mjs
import Database from "better-sqlite3";
import path from "node:path";
import { REELS } from "./sample-reels.mjs";

const args = process.argv.slice(2);
const asEmail = args.includes("--as") ? args[args.indexOf("--as") + 1] : null;

const file = process.env.DATABASE_FILE || path.join(path.resolve(process.env.DATA_DIR || "data"), "app.db");
let db;
try {
  db = new Database(file, { fileMustExist: true });
} catch {
  console.error(`No board found at ${file}. Start the site and create the admin account first.`);
  process.exit(1);
}
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

const user = asEmail
  ? db.prepare("SELECT id, name FROM users WHERE email = ? COLLATE NOCASE AND active = 1").get(asEmail)
  : db.prepare("SELECT id, name FROM users WHERE role = 'admin' AND active = 1 ORDER BY id LIMIT 1").get();
if (!user) {
  console.error(asEmail ? `No active account with email ${asEmail}.` : "No admin account yet — create it on the site first.");
  process.exit(1);
}

const exists = db.prepare("SELECT 1 FROM reels WHERE shortcode = ?");
const insertReel = db.prepare(
  `INSERT INTO reels (shortcode, kind, idea, status, created_by, created_at, updated_at)
   VALUES (?, 'reel', ?, 'new', ?, ?, ?)`,
);
const insertTag = db.prepare("INSERT OR IGNORE INTO reel_tags (reel_id, tag) VALUES (?, ?)");

const now = Date.now();
const added = db.transaction(() => {
  let count = 0;
  REELS.forEach((reel, index) => {
    if (exists.get(reel.code)) return;
    // A minute apart, so the feed shows them in a stable order (first in the list = newest).
    const createdAt = now - index * 60_000;
    const id = Number(insertReel.run(reel.code, reel.idea, user.id, createdAt, createdAt).lastInsertRowid);
    for (const tag of reel.tags) insertTag.run(id, tag);
    count++;
  });
  return count;
})();
db.close();

console.log(
  added
    ? `Added ${added} sample reels to the board as ${user.name}. Refresh the site to see them.`
    : "All sample reels are already on the board.",
);
