import { NextResponse } from "next/server";
import {
  getSubscriptionPeriodEnd,
  isPremiumFromSubscription,
} from "@/lib/server/premium";
import { upsertPremiumSubscription, getPremiumSubscriptionByEmail } from "@/lib/server/supabase";
import { getStripe } from "@/lib/server/stripe";
import {
  isStripeConfigured,
  isSupabaseConfigured,
} from "@/lib/server/env";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function syncPremiumFromSubscription(
  email: string,
  subscription: Stripe.Subscription
): Promise<boolean> {
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const isPremium = isPremiumFromSubscription(subscription.status, periodEnd);

  if (isSupabaseConfigured()) {
    await upsertPremiumSubscription({
      email,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: periodEnd,
    });
  }

  return isPremium;
}

export async function GET(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const email =
      session.customer_details?.email?.toLowerCase() ??
      session.customer_email?.toLowerCase() ??
      null;

    if (!email) {
      return NextResponse.json({ email: null, isPremium: false });
    }

    let isPremium = false;

    if (session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      isPremium = await syncPremiumFromSubscription(email, subscription);
    } else if (isSupabaseConfigured()) {
      const subscription = await getPremiumSubscriptionByEmail(email);
      if (subscription) {
        isPremium = isPremiumFromSubscription(
          subscription.status,
          subscription.current_period_end
        );
      }
    }

    return NextResponse.json({ email, isPremium });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify checkout";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
