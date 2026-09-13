const SECRET_HINT =
  /service_role|SUPABASE_SERVICE_ROLE|ADMIN_TOKEN|Bearer\s+\S+|sk_live|sk_test|api[_-]?key/i;

/** Public API error text. Never echo secrets. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  if (SECRET_HINT.test(error.message)) return fallback;
  return error.message.slice(0, 300);
}
