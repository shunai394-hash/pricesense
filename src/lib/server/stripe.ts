import Stripe from "stripe";
import { getStripeConfig } from "@/lib/server/env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const config = getStripeConfig();
  if (!config) {
    throw new Error("Stripe is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.secretKey, {
      typescript: true,
    });
  }

  return stripeClient;
}

export function isActivePremiumStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
