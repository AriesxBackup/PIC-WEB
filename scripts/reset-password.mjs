// Emergency password reset (e.g. the only admin forgot their password).
// Usage:    npm run reset-password -- <email> <new-password>       (local board — stop the site first)
// Railway:  set DATABASE_PUBLIC_URL (from the Postgres service's Variables tab) and run the same command.
import { hashPassword } from "../lib/auth/password.ts";
import { openMigratedDatabase } from "../lib/db/core.ts";
import { databaseTarget } from "./db-target.mjs";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Usage: npm run reset-password -- <email> <new-password (8+ characters)>");
  process.exit(1);
}

const target = databaseTarget();
const db = await openMigratedDatabase(target);
try {
  const [user] = await db.query("SELECT id, name FROM users WHERE lower(email) = lower($1)", [email.trim()]);
  if (!user) {
    console.error(`No account with email ${email} in ${target.label}`);
    process.exitCode = 1;
  } else {
    await db.query("UPDATE users SET password_hash = $1, active = TRUE WHERE id = $2", [await hashPassword(password), user.id]);
    await db.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
    console.log(`Password updated for ${user.name} (${email}). They can log in now.`);
  }
} finally {
  await db.close();
}
