"use client";

import { useState } from "react";
import { startPremiumCheckout } from "@/lib/premium/checkout";

interface PricingCheckoutButtonProps {
  source?: string;
  className?: string;
  children: React.ReactNode;
}

export function PricingCheckoutButton({
  source = "pricing_page",
  className = "",
  children,
}: PricingCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const handleClick = async () => {
    setIsLoading(true);
    setCheckoutError("");

    const result = await startPremiumCheckout(source);

    if (result.url) {
      window.location.href = result.url;
      return;
    }

    setIsLoading(false);
    setCheckoutError(
      result.error ?? "決済の開始に失敗しました。時間をおいて再度お試しください。"
    );
  };

  return (
    <>
      {checkoutError && (
        <p className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-center text-xs text-accent">
          {checkoutError}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? "決済ページへ移動中" : undefined}
        className={`disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {isLoading ? "決済ページへ移動中..." : children}
      </button>
    </>
  );
}
