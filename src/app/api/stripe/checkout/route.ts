import { NextResponse } from "next/server";
import {
  getAppUrl,
  getStripeConfig,
  getStripeConfigDiagnostics,
  isStripeConfigured,
} from "@/lib/server/env";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

interface CheckoutRequestBody {
  email?: string;
  source?: string;
}

export async function POST(request: Request) {
  const diagnostics = getStripeConfigDiagnostics();
  console.log("[stripe-checkout] POST /api/stripe/checkout reached", {
    isStripeConfigured: isStripeConfigured(),
    hasRawSecretKey: diagnostics.hasRawSecretKey,
    hasRawPriceId: diagnostics.hasRawPriceId,
    secretStartsWithSk: diagnostics.secretStartsWithSk,
    priceStartsWithPrice: diagnostics.priceStartsWithPrice,
    rejectReason: diagnostics.rejectReason,
  });

  if (!isStripeConfigured()) {
    console.error("[stripe-checkout] Stripe is not configured", diagnostics);
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const appUrl = getAppUrl();
    const stripe = getStripe();
    const stripeConfig = getStripeConfig();

    if (!stripeConfig) {
      console.error(
        "[stripe-checkout] getStripeConfig returned null after isStripeConfigured passed",
        diagnostics
      );
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    console.log("[stripe-checkout] Creating Stripe Checkout session", {
      priceIdLength: stripeConfig.priceId.length,
      hasEmail: Boolean(body.email),
      source: body.source ?? "unknown",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: stripeConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      ...(body.email ? { customer_email: body.email } : {}),
      metadata: {
        source: body.source ?? "unknown",
      },
      subscription_data: {
        metadata: {
          source: body.source ?? "unknown",
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout failed";

    console.error("[stripe-checkout] Checkout session creation failed", {
      message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
