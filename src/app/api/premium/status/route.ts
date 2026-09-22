import { NextResponse } from "next/server";
import {
  isPremiumFromSubscription,
  normalizePremiumEmail,
} from "@/lib/server/premium";
import { getPremiumSubscriptionByEmail } from "@/lib/server/supabase";
import { isSupabaseConfigured } from "@/lib/server/env";
import { EMAIL_PROOF_COOKIE_NAME, verifyEmailProof } from "@/lib/server/email-proof";

export const runtime = "nodejs";

function readEmailProofCookie(request: Request): string | undefined {
  return request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${EMAIL_PROOF_COOKIE_NAME}=`))
    ?.slice(EMAIL_PROOF_COOKIE_NAME.length + 1);
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ isPremium: false });
  }

  const { searchParams } = new URL(request.url);
  const email = normalizePremiumEmail(searchParams.get("email") ?? "");

  if (!email) {
    return NextResponse.json({ isPremium: false });
  }

  // Require proof that this browser owns the requested email (set when the
  // email was legitimately established via checkout or the diagnosis form).
  // Without it, respond exactly as if the email were unknown -- this keeps
  // the funnel anonymous while preventing status lookups on arbitrary
  // third-party emails.
  if (!verifyEmailProof(readEmailProofCookie(request), email)) {
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
