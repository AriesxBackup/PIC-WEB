import { DATABASE_LABEL } from "@/lib/config";
import { sql } from "@/lib/db";

// Used by Railway's and Docker's health checks: answers only once the right database is reachable,
// so a deploy without a working database is rejected and the previous version keeps running.
export async function GET() {
  try {
    await sql("SELECT 1");
    return Response.json({ ok: true, database: DATABASE_LABEL.startsWith("PostgreSQL") ? "postgresql" : "built-in" });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[health] database not ready: ${reason}`);
    return Response.json({ ok: false, error: reason }, { status: 503 });
  }
}
