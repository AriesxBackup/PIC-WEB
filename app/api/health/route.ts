import { getDb } from "@/lib/db";

// Used by the Docker healthcheck.
export function GET() {
  getDb().prepare("SELECT 1").get();
  return Response.json({ ok: true });
}
