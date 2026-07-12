import Stripe from "stripe";
import { isStripeConfigured } from "@/lib/server/env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }

  return stripeClient;
}

export function isActivePremiumStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
