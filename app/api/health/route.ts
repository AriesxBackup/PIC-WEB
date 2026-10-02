import { sql } from "@/lib/db";

// Used by Railway's and Docker's health checks: answers only once the database is reachable.
export async function GET() {
  try {
    await sql("SELECT 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "database unavailable" }, { status: 503 });
  }
}
