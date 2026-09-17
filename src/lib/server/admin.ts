import { timingSafeEqual } from "node:crypto";
import { getAdminToken, getCronSecret } from "@/lib/server/env";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

function presentedAdminToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(\S+)/i)?.[1]?.trim();
  if (bearer) return bearer;

  const headerToken = request.headers.get("x-admin-token")?.trim();
  if (headerToken) return headerToken;

  return null;
}

/** True only when ADMIN_TOKEN is set and the request presents the same value. */
export function isAdminRequest(request: Request): boolean {
  const expected = getAdminToken();
  if (!expected) return false;

  const presented = presentedAdminToken(request);
  if (!presented) return false;

  return safeEqual(presented, expected);
}

/** Admin token or cron secret. Used by scheduled new-business discovery. */
export function isOpsRequest(request: Request): boolean {
  if (isAdminRequest(request)) return true;
  const cronSecret = getCronSecret();
  if (!cronSecret) return false;
  const presented = presentedAdminToken(request);
  if (!presented) return false;
  return safeEqual(presented, cronSecret);
}
