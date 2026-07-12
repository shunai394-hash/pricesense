import { NextResponse } from "next/server";
import Stripe from "stripe";
import { upsertPremiumSubscription } from "@/lib/server/supabase";
import { getStripe } from "@/lib/server/stripe";
import { getSubscriptionPeriodEnd } from "@/lib/server/premium";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

async function resolveCustomerEmail(
  stripe: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<string | null> {
  if (!customer) return null;

  if (typeof customer === "object" && "email" in customer && customer.email) {
    return customer.email;
  }

  if (typeof customer === "string") {
    const fetched = await stripe.customers.retrieve(customer);
    if (!("deleted" in fetched && fetched.deleted) && fetched.email) {
      return fetched.email;
    }
  }

  return null;
}

async function syncSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<void> {
  const email = await resolveCustomerEmail(stripe, subscription.customer);

  if (!email) {
    throw new Error("Subscription customer email not found");
  }

  const periodEnd = getSubscriptionPeriodEnd(subscription);

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

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(stripe, subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const email = await resolveCustomerEmail(stripe, subscription.customer);
        if (email) {
          await upsertPremiumSubscription({
            email,
            stripe_customer_id:
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer.id,
            stripe_subscription_id: subscription.id,
            status: "canceled",
            current_period_end: getSubscriptionPeriodEnd(subscription),
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
