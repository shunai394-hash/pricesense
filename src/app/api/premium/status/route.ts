import { NextResponse } from "next/server";
import {
  isPremiumFromSubscription,
  normalizePremiumEmail,
} from "@/lib/server/premium";
import { getPremiumSubscriptionByEmail } from "@/lib/server/supabase";
import { isSupabaseConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ isPremium: false });
  }

  const { searchParams } = new URL(request.url);
  const email = normalizePremiumEmail(searchParams.get("email") ?? "");

  if (!email) {
    return NextResponse.json({ isPremium: false });
  }

  try {
    const subscription = await getPremiumSubscriptionByEmail(email);

    if (!subscription) {
      return NextResponse.json({ isPremium: false });
    }

    const isPremium = isPremiumFromSubscription(
      subscription.status,
      subscription.current_period_end
    );

    return NextResponse.json({
      isPremium,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch {
    return NextResponse.json({ isPremium: false });
  }
}
