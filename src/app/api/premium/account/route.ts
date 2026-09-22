import { NextResponse } from "next/server";
import {
  getSubscriptionPeriodEnd,
  isPremiumFromSubscription,
  normalizePremiumEmail,
} from "@/lib/server/premium";
import {
  getPremiumSubscriptionByEmail,
  upsertPremiumSubscription,
} from "@/lib/server/supabase";
import { getStripe } from "@/lib/server/stripe";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/server/env";
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
    return NextResponse.json({
      isPremium: false,
      plan: "free",
      hasCustomerId: false,
    });
  }

  const { searchParams } = new URL(request.url);
  const email = normalizePremiumEmail(searchParams.get("email") ?? "");

  if (!email) {
    return NextResponse.json({
      isPremium: false,
      plan: "free",
      hasCustomerId: false,
    });
  }

  // Require proof that this browser owns the requested email before doing
  // any lookup -- this also blocks an unverified caller from forcing the
  // live Stripe refresh + DB upsert below for an email they do not own.
  if (!verifyEmailProof(readEmailProofCookie(request), email)) {
    return NextResponse.json({
      isPremium: false,
      plan: "free",
      hasCustomerId: false,
    });
  }

  try {
    const subscription = await getPremiumSubscriptionByEmail(email);

    if (!subscription) {
      return NextResponse.json({
        isPremium: false,
        plan: "free",
        hasCustomerId: false,
      });
    }

    let status = subscription.status;
    let currentPeriodEnd = subscription.current_period_end;
    let cancelAtPeriodEnd = false;
    let stripeCustomerId = subscription.stripe_customer_id;
    let stripeSubscriptionId = subscription.stripe_subscription_id;

    if (isStripeConfigured() && subscription.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        const live = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        );

        status = live.status;
        currentPeriodEnd =
          getSubscriptionPeriodEnd(live) ?? currentPeriodEnd;
        cancelAtPeriodEnd = Boolean(live.cancel_at_period_end);
        stripeCustomerId =
          typeof live.customer === "string"
            ? live.customer
            : live.customer.id;
        stripeSubscriptionId = live.id;

        await upsertPremiumSubscription({
          email,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          status,
          current_period_end: currentPeriodEnd,
        });
      } catch {
        // Keep the database snapshot if Stripe is temporarily unavailable.
      }
    }

    const isPremium = isPremiumFromSubscription(status, currentPeriodEnd);

    return NextResponse.json({
      isPremium,
      plan: isPremium ? "premium" : "free",
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      hasCustomerId: Boolean(stripeCustomerId),
    });
  } catch {
    return NextResponse.json({
      isPremium: false,
      plan: "free",
      hasCustomerId: false,
    });
  }
}
