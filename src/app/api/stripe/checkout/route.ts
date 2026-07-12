import { NextResponse } from "next/server";
import { getAppUrl, isStripeConfigured } from "@/lib/server/env";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

interface CheckoutRequestBody {
  email?: string;
  source?: string;
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as CheckoutRequestBody;
    const appUrl = getAppUrl();
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
