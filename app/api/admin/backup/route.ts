import { getCurrentUser } from "@/lib/auth/dal";
import { sql } from "@/lib/db";

// Admin-only download of the whole board as JSON (restore with: npm run import -- <file>).
// Preview images are left out — they're fetched from Instagram again automatically.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("Not found", { status: 404 });

  const backup = {
    format: "reel-board-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    users: await sql("SELECT id, email, name, password_hash, role, active, created_at FROM users ORDER BY id"),
    reels: await sql(
      `SELECT id, shortcode, kind, idea, status, assignee_id, due_date, created_by, created_at, updated_at,
              ig_author, ig_caption FROM reels ORDER BY id`,
    ),
    reel_tags: await sql("SELECT reel_id, tag FROM reel_tags ORDER BY reel_id, tag"),
    votes: await sql("SELECT reel_id, user_id, created_at FROM votes ORDER BY reel_id, user_id"),
    comments: await sql("SELECT id, reel_id, author_id, kind, body, created_at FROM comments ORDER BY id"),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="reel-board-backup-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
