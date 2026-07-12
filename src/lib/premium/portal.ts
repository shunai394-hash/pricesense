import { getCachedLeadEmail } from "@/lib/leads";

export interface BillingPortalResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export async function openBillingPortal(
  email?: string
): Promise<BillingPortalResult> {
  const resolvedEmail = (email ?? getCachedLeadEmail()).trim();

  if (!resolvedEmail) {
    return {
      ok: false,
      error: "契約管理にはメールアドレスの登録が必要です。PDF保存時に登録したメールをご利用ください。",
    };
  }

  try {
    const response = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resolvedEmail }),
    });

    const data = (await response.json()) as { url?: string; error?: string };

    if (response.ok && data.url) {
      return { ok: true, url: data.url };
    }

    return {
      ok: false,
      error: data.error ?? "契約管理ページを開けませんでした",
    };
  } catch {
    return {
      ok: false,
      error: "契約管理ページを開けませんでした。時間をおいて再度お試しください。",
    };
  }
}
