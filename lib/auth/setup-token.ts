import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { SETUP_TOKEN } from "@/lib/config";

/** True when no SETUP_TOKEN is configured, or `token` matches it. */
export function isSetupAllowed(token: unknown): boolean {
  if (!SETUP_TOKEN) return true;
  if (typeof token !== "string") return false;
  // Compare fixed-length digests so the check doesn't leak the token through timing.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(SETUP_TOKEN));
}
