const SECRET_HINT =
  /service_role|SUPABASE_SERVICE_ROLE|ADMIN_TOKEN|Bearer\s+\S+|sk_live|sk_test|api[_-]?key/i;

const INTERNAL_HINT =
  /Failed to save lead|Failed to create Supabase|postgres|PGRST|relation |column |hint:|details:/i;

/** Public API error text. Never echo secrets or database internals. */
export function publicErrorText(
  message: string | undefined,
  fallback: string
): string {
  if (!message?.trim()) return fallback;
  if (SECRET_HINT.test(message) || INTERNAL_HINT.test(message)) return fallback;
  return message.slice(0, 300);
}

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  return publicErrorText(error.message, fallback);
}
