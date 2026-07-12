import { isValidEmail } from "@/lib/leadCapture";
import { isActivePremiumStatus } from "@/lib/server/stripe";
import type Stripe from "stripe";

export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {
  const periodEnd = (
    subscription as Stripe.Subscription & { current_period_end?: number }
  ).current_period_end;

  if (typeof periodEnd !== "number") {
    return null;
  }

  return new Date(periodEnd * 1000).toISOString();
}

export function isPremiumFromSubscription(
  status: string,
  currentPeriodEnd: string | null
): boolean {
  if (!isActivePremiumStatus(status)) {
    return false;
  }

  if (!currentPeriodEnd) {
    return true;
  }

  return new Date(currentPeriodEnd).getTime() > Date.now();
}

export function normalizePremiumEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  return isValidEmail(trimmed) ? trimmed : null;
}
