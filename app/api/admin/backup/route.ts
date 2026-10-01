import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth/dal";
import { getDb } from "@/lib/db";

// Admin-only download of a consistent copy of the SQLite database.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("Not found", { status: 404 });

  const file = path.join(os.tmpdir(), `reel-board-backup-${process.pid}-${Date.now()}.db`);
  try {
    await getDb().backup(file);
    const data = await fs.readFile(file);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(data, {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="reel-board-backup-${date}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await fs.rm(file, { force: true });
  }
}
