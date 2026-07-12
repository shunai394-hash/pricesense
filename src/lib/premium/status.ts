export interface PremiumStatusResponse {
  isPremium: boolean;
  status?: string;
  currentPeriodEnd?: string | null;
}

export async function fetchPremiumStatus(
  email: string
): Promise<PremiumStatusResponse> {
  try {
    const response = await fetch(
      `/api/premium/status?email=${encodeURIComponent(email)}`
    );

    if (!response.ok) {
      return { isPremium: false };
    }

    return (await response.json()) as PremiumStatusResponse;
  } catch {
    return { isPremium: false };
  }
}
