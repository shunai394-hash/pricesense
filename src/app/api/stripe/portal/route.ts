import { NextResponse } from "next/server";
import { getAppUrl, isStripeConfigured, isSupabaseConfigured } from "@/lib/server/env";
import { normalizePremiumEmail } from "@/lib/server/premium";
import { getPremiumSubscriptionByEmail } from "@/lib/server/supabase";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

interface PortalRequestBody {
  email?: string;
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Subscription database is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as PortalRequestBody;
    const email = normalizePremiumEmail(body.email ?? "");

    if (!email) {
      return NextResponse.json(
        { error: "有効なメールアドレスが必要です" },
        { status: 400 }
      );
    }

    const subscription = await getPremiumSubscriptionByEmail(email);

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Premium契約が見つかりません。購入時のメールアドレスをご確認ください。" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getAppUrl()}/`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "ポータルセッションの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Portal session failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
