// Emergency password reset (e.g. the only admin forgot their password).
// Usage:   node scripts/reset-password.mjs <email> <new-password>
// Docker:  docker compose exec app node scripts/reset-password.mjs <email> <new-password>
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import path from "node:path";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Usage: node scripts/reset-password.mjs <email> <new-password (8+ characters)>");
  process.exit(1);
}

const file = process.env.DATABASE_FILE || path.join(path.resolve(process.env.DATA_DIR || "data"), "app.db");
const db = new Database(file, { fileMustExist: true });

// Same format as lib/auth/password.ts: scrypt$N$r$p$salt$key
const N = 2 ** 17;
const r = 8;
const p = 1;
const salt = randomBytes(16);
const key = scryptSync(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 256 * 1024 * 1024 });
const hash = ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");

const user = db.prepare("SELECT id, name FROM users WHERE email = ? COLLATE NOCASE").get(email.trim());
if (!user) {
  console.error(`No account with email ${email}`);
  process.exit(1);
}
db.prepare("UPDATE users SET password_hash = ?, active = 1 WHERE id = ?").run(hash, user.id);
db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
console.log(`Password updated for ${user.name} (${email}). They can log in now.`);
