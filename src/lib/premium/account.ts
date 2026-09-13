export interface PremiumAccountResponse {
  isPremium: boolean;
  plan: "free" | "premium";
  status?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  hasCustomerId?: boolean;
}

export async function fetchPremiumAccount(
  email: string
): Promise<PremiumAccountResponse> {
  try {
    const response = await fetch(
      `/api/premium/account?email=${encodeURIComponent(email)}`
    );

    if (!response.ok) {
      return { isPremium: false, plan: "free", hasCustomerId: false };
    }

    return (await response.json()) as PremiumAccountResponse;
  } catch {
    return { isPremium: false, plan: "free", hasCustomerId: false };
  }
}
